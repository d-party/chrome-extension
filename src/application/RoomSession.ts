import { describeOperation } from "@/domain/history";
import type {
  IncomingMessage,
  OutgoingMessage,
  User,
} from "@/domain/protocol";
import type { ReactionType } from "@/domain/reactions";
import type { PartyWebSocketClient } from "@/infrastructure/ws/PartyWebSocketClient";
import { ANIMESTORE_REDIRECT_ENDPOINT } from "@/infrastructure/env";

import type { ActionGuard } from "./ActionGuard";
import type {
  Notifier,
  PlayerController,
  ReactionView,
  SettingsProvider,
  SidebarView,
  StatsRecorder,
} from "./ports";

export interface RoomSessionDeps {
  client: PartyWebSocketClient;
  player: PlayerController;
  sidebar: SidebarView;
  reactions: ReactionView;
  notifier: Notifier;
  settings: SettingsProvider;
  guard: ActionGuard;
  stats: StatsRecorder;
}

const SERVER_DISCONNECTED = "サーバーとの通信が終了";
const CONNECT_FAILED = "サーバーへの接続に失敗しました";

/**
 * Orchestrates a watch-together session over the party WebSocket.
 *
 * This is a faithful extraction of the sync core from the original
 * `player.js`: the same messages are sent and the same incoming messages are
 * handled, including the `available_action` guard that prevents echoed remote
 * operations from looping back to the server.
 */
export class RoomSession {
  private readonly deps: RoomSessionDeps;

  private _inRoom = false;
  private joined = false;
  private resetDelayMs = 100;
  // ホスト以外は video_operation をブロードキャストしない。create成功または
  // host_change でホストになったときに true になる。
  private isHost = false;
  // ホストが定期的に現在の再生状態をブロードキャストし、ゲストの drift を
  // 補正するハートビートタイマーのハンドル。
  private heartbeatTimer: number | null = null;
  static HEARTBEAT_MS = 5000;
  // 手動 sync ボタン押下に対する sync_response のときだけトーストを出すためのフラグ。
  // join 直後の自動 sync 時はトーストを抑制したいので必要。
  private pendingManualSyncToast = false;
  // ルームに接続（create/join 確定）してから、まだ統計へ加算していない区間の
  // 開始時刻。切断時・チェックポイント時に「now - connectedAt」を加算する。
  private connectedAt: number | null = null;
  // 接続中、経過時間を定期的に統計へ書き出すタイマー。タブを閉じる/落ちると
  // 切断ハンドラが走らないことがあるため、最大でも CHECKPOINT_MS 分しか取りこぼさない。
  private connectionCheckpointTimer: number | null = null;
  static CONNECTION_CHECKPOINT_MS = 60000;

  userId = "";
  roomId = "";

  constructor(deps: RoomSessionDeps) {
    this.deps = deps;
  }

  get inRoom(): boolean {
    return this._inRoom;
  }

  // -- connection lifecycle --------------------------------------------------

  /** Host a new room for the given part. */
  createRoom(partId: string, title = ""): void {
    this._inRoom = true;
    this.joined = false;
    this.resetDelayMs = 100;
    this.deps.sidebar.setConnectionStatus("idle");
    this.openSocket(() => {
      this.send({
        action: "create",
        user_name: this.userName,
        part_id: partId,
        title,
        request_id: now(),
      });
    });
  }

  /** Join an existing room and immediately request a sync to the host. */
  joinRoom(roomId: string): void {
    this._inRoom = true;
    this.joined = false;
    this.resetDelayMs = 200;
    this.roomId = roomId;
    this.deps.sidebar.setConnectionStatus("idle");
    this.openSocket(() => {
      this.send({
        action: "join",
        user_name: this.userName,
        room_id: roomId,
        request_id: now(),
      });
      this.deps.guard.allow();
      // sync_request は join のレスポンス受信後（dispatch の case "join"）に送る。
      // open 直後に同梱して送ると、ルーム未参加状態で sync_request がサーバ側で
      // 評価され AttributeError を引き起こすことがある。
    });
  }

  // ソケットが OPEN になる前に send() を呼ぶと InvalidStateError が出て
  // 「サーバーとの通信が終了」トーストが誤表示されるため、必ず onopen で送る。
  private openSocket(onOpen?: () => void): void {
    this.deps.client.connect({
      onOpen: () => onOpen?.(),
      onMessage: (message) => this.handleMessage(message),
      onClose: () => {
        if (this.joined) {
          this.deps.notifier.alert(SERVER_DISCONNECTED);
        } else if (this._inRoom) {
          this.deps.notifier.alert(CONNECT_FAILED);
          this.deps.sidebar.addHistory({
            direction: "system",
            icon: "error",
            label: CONNECT_FAILED,
          });
        }
        this.stopHeartbeat();
        this.endConnectionTracking();
        this.isHost = false;
        this._inRoom = false;
        this.joined = false;
        this.deps.sidebar.setJoined(false);
        this.deps.sidebar.setConnectionStatus("failed");
      },
    });
  }

  // create/join 確定時に接続時間の計測を開始する。
  private startConnectionTracking(): void {
    this.connectedAt = now();
    if (this.connectionCheckpointTimer !== null) return;
    this.connectionCheckpointTimer = window.setInterval(() => {
      this.checkpointConnection();
    }, RoomSession.CONNECTION_CHECKPOINT_MS);
  }

  // 未加算区間を統計へ書き出し、計測の起点を現在時刻へ進める（接続は継続）。
  private checkpointConnection(): void {
    if (this.connectedAt === null) return;
    const at = now();
    this.deps.stats.connectionEnded(at - this.connectedAt);
    this.connectedAt = at;
  }

  // 切断時に残りの経過時間を加算し、計測を完全に停止する。connectedAt が null
  // （未接続/加算済み）のときは何もしないので、leave()→onClose の二重計上を防ぐ。
  private endConnectionTracking(): void {
    this.checkpointConnection();
    this.connectedAt = null;
    if (this.connectionCheckpointTimer !== null) {
      window.clearInterval(this.connectionCheckpointTimer);
      this.connectionCheckpointTimer = null;
    }
  }

  // -- outgoing intents (called by DOM event handlers) -----------------------

  // 仕様: ホスト/ゲストいずれも自分のプレイヤー操作（再生・停止・シーク等）を
  // ルームへブロードキャストできる（相互にコントロール可）。フィードバックループは
  // ActionGuard（suppress/allow）で抑止する。
  sendVideoOperation(operation: string): void {
    this.send({
      action: "video_operation",
      user_id: this.userId,
      operation,
      option: this.deps.player.getOption(),
      request_id: now(),
    });
    this.deps.guard.allow();
  }

  requestSync(opts: { manual?: boolean } = {}): void {
    // 初回参加時の自動シンクと、ユーザーが手動で sync ボタンを押した
    // ときを区別して、手動のときだけ sync_response 受信でトーストを出す。
    // 初回参加のシンクは「ルームに参加」通知と同時に出てしまうため。
    if (opts.manual ?? true) this.pendingManualSyncToast = true;
    this.send({ action: "sync_request", request_id: now() });
    this.deps.guard.allow();
  }

  private sendSyncResponse(toUser: User): void {
    this.send({
      action: "sync_response",
      to_user: toUser,
      option: this.deps.player.getOption(),
      request_id: now(),
    });
    this.deps.guard.allow();
  }

  sendActionNotification(operation: string): void {
    this.send({
      action: "operation_notification",
      operation,
      user_name: this.userName,
      request_id: now(),
    });
  }

  requestUserList(): void {
    this.send({ action: "user_list", request_id: now() });
  }

  sendReaction(reactionType: ReactionType): void {
    this.send({ action: "reaction", reaction_type: reactionType, request_id: now() });
    this.deps.stats.reactionSent(reactionType);
  }

  /** Leave the room (caller is responsible for any UI teardown). */
  leave(): void {
    this.send({ action: "leave", user_name: this.userName, request_id: now() });
    this.stopHeartbeat();
    this.endConnectionTracking();
    this.isHost = false;
    this._inRoom = false;
  }

  // ホスト専用: 5 秒ごとに現在の再生状態を video_operation("sync") として
  // ブロードキャストし、ゲストの drift を継続的に補正する。
  private startHeartbeat(): void {
    if (this.heartbeatTimer !== null) return;
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.isHost || !this._inRoom || !this.joined) return;
      this.send({
        action: "video_operation",
        user_id: this.userId,
        operation: "sync",
        option: this.deps.player.getOption(),
        request_id: now(),
      });
    }, RoomSession.HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private send(message: OutgoingMessage): void {
    try {
      if (this._inRoom) this.deps.client.send(message);
    } catch {
      this.deps.notifier.alert(SERVER_DISCONNECTED);
      this.deps.sidebar.addHistory({
        direction: "system",
        icon: "error",
        label: SERVER_DISCONNECTED,
      });
      this._inRoom = false;
    }
  }

  // -- incoming messages -----------------------------------------------------

  private handleMessage(message: IncomingMessage): void {
    this.dispatch(message);
    window.setTimeout(() => {
      this.deps.guard.allow();
    }, this.resetDelayMs);
  }

  private dispatch(message: IncomingMessage): void {
    const { player, sidebar, reactions, notifier, settings } = this.deps;
    switch (message.action) {
      case "video_operation":
        this.deps.guard.suppress();
        player.onAction(message.operation, message.option);
        break;
      case "create":
        this.userId = message.user.user_id;
        this.roomId = message.room_id;
        this.joined = true;
        this.isHost = true;
        this.startConnectionTracking();
        this.deps.stats.roomCreated();
        this.startHeartbeat();
        sidebar.setSelfUserId(this.userId);
        sidebar.setShareLink(ANIMESTORE_REDIRECT_ENDPOINT + this.roomId);
        sidebar.setJoined(true);
        sidebar.setConnectionStatus("connected");
        sidebar.showSharePanel();
        notifier.success("ルームの作成に成功しました");
        sidebar.addHistory({
          direction: "system",
          icon: "party",
          label: "ルームを作成しました",
        });
        break;
      case "join":
        this.userId = message.user.user_id;
        this.roomId = message.room_id;
        this.joined = true;
        this.startConnectionTracking();
        this.deps.stats.roomJoined();
        sidebar.setSelfUserId(this.userId);
        sidebar.setShareLink(ANIMESTORE_REDIRECT_ENDPOINT + this.roomId);
        sidebar.setJoined(true);
        sidebar.setConnectionStatus("connected");
        notifier.success("ルームに参加");
        // join 確定後にホストの再生状態を要求する。openSocket の onopen 直後に
        // 投げると、サーバ側で anime_user が未生成のまま sync_request が走り
        // AttributeError → close code 1011 を踏むため、ここまで遅延させる。
        // 初回シンクは「ルームに参加」と同時にトーストが出るのを避けるため manual:false。
        this.requestSync({ manual: false });
        break;
      case "server_message":
        if (message.message_type === "host_change") {
          this.isHost = true;
          this.startHeartbeat();
          notifier.info("ルームのホスト権限を獲得");
          sidebar.addHistory({
            direction: "system",
            icon: "host",
            label: "ホスト権限を獲得しました",
          });
        } else if (message.message_type === "failed_join") {
          // ルームが既に存在しない/終了済み。サーバはこの直後に close するので、
          // onClose 側の誤った SERVER_DISCONNECTED ではなく明確なメッセージを出す。
          this.joined = false;
          notifier.alert("ルームに参加できませんでした");
          sidebar.addHistory({
            direction: "system",
            icon: "error",
            label: "ルームに参加できませんでした",
          });
          sidebar.setConnectionStatus("failed");
        }
        break;
      case "user_add":
        notifier.info(`『${message.user.user_name}』さんが参加 🎉`);
        sidebar.addHistory({
          direction: "system",
          icon: "join",
          label: `『${message.user.user_name}』さんが入室`,
          user: message.user.user_name,
        });
        break;
      case "user_list":
        sidebar.updateUserList(message.user_list);
        break;
      case "leave":
        notifier.info(`『${message.user.user_name}』さんが退室`);
        sidebar.addHistory({
          direction: "system",
          icon: "leave",
          label: `『${message.user.user_name}』さんが退室`,
          user: message.user.user_name,
        });
        break;
      case "sync_request":
        this.sendSyncResponse(message.user);
        break;
      case "sync_response":
        this.deps.guard.suppress();
        player.onAction("sync", message.option);
        // 手動 sync リクエストに対する返信のときだけトーストを出す。
        // join 直後の自動シンクをも黙って適用したいため。
        if (this.pendingManualSyncToast) {
          this.pendingManualSyncToast = false;
          this.deps.notifier.info("再生状況をホストにシンク");
          this.deps.sidebar.addHistory({
            direction: "system",
            icon: "sync",
            label: "再生状況をホストにシンクしました",
          });
        }
        break;
      case "operation_notification":
        this.notifyOperation(message.operation, message.user.user_name);
        break;
      case "reaction":
        if (!settings.current().hideReaction) {
          reactions.play(message.reaction_type as ReactionType);
        }
        break;
    }
  }

  // 他の参加者の操作通知 (operation_notification) を受信したとき、トーストと
  // 履歴に「受信」エントリとして表示する。
  private notifyOperation(operation: string, userName: string): void {
    const meta = describeOperation(operation);
    if (!meta) return;
    this.deps.notifier.info(`『${userName}』さんが${meta.label}`);
    this.deps.sidebar.addHistory({
      direction: "received",
      icon: meta.icon,
      label: meta.label,
      user: userName,
    });
  }

  // -- notifications ---------------------------------------------------------

  /**
   * 自分のプレイヤー操作をルームへ通知した直後（selfNotification が無効なとき）に
   * トーストと履歴へ「送信」エントリを残す。`operation` は
   * {@link sendActionNotification} に渡したものと同じワイヤ表現。
   */
  notifySentOperation(operation: string): void {
    const meta = describeOperation(operation);
    if (!meta) return;
    this.deps.notifier.success(meta.label);
    this.deps.sidebar.addHistory({
      direction: "sent",
      icon: meta.icon,
      label: meta.label,
    });
  }

  private get userName(): string {
    return this.deps.settings.current().userName;
  }
}

function now(): number {
  return new Date().getTime();
}
