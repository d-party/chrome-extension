import { describeOperation } from "@/domain/history";
import type { IncomingMessage, OutgoingMessage, User } from "@/domain/protocol";
import { isDefaultReaction } from "@/domain/reactions";
import {
  type RoomSettings,
  DEFAULT_ROOM_SETTINGS,
  diffRoomSettings,
  fromWire,
  isDefaultRoomSettings,
} from "@/domain/roomSettings";
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
  /**
   * 共有リンク（ロビー）の解決先ベース URL。`<endpoint>/<room_id>` を共有リンクとして
   * サイドバーに表示する。省略時は dアニメストア用（後方互換）。DMM TV は
   * `DMM_REDIRECT_ENDPOINT` を渡してサービスごとの正しいロビーへ誘導する。
   */
  redirectEndpoint?: string;
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
  // ルーム削除など、意図的にソケットを閉じるときに true にして、onClose の
  // 「サーバーとの通信が終了」誤アラートと UI 上書きを抑止する。
  private intentionalTeardown = false;
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

  // サーバから通知された現在のルーム詳細設定。一方通行モードの動画操作抑止や
  // リアクション禁止の判定に使う。room_setting イベントで更新される。
  private roomSettings: RoomSettings = DEFAULT_ROOM_SETTINGS;
  // create/join 直後にサーバが配る最初の room_setting は「現在値の初期同期」であり
  // 設定変更ではない。これを有効化/無効化の通知と区別するため、最初の 1 通を受信済みか
  // を持つ。以降の room_setting（オーナーが操作タブで変更したとき）だけ通知する。
  private roomSettingsInitialized = false;
  // ルーム作成時に指定された初期設定。create 確定後に update_setting で適用する。
  private pendingSettings: RoomSettings | null = null;
  // 一方通行モードで非オーナーが操作を試みたときの「操作できません」通知を、
  // seek/ratechange 等の多発イベントで連射しないようスロットルするための時刻。
  private lastOneWayNoticeAt = 0;
  static ONE_WAY_NOTICE_THROTTLE_MS = 3000;
  // 受信した動画操作/シンクをプレイヤーへ適用した時刻。適用は複数の DOM メディア
  // イベント（seek→playing 等）を誘発し、最初のイベントで guard が再開すると後続が
  // 送信経路へ漏れる。この時刻から直後の「エコー」を見分け、一方通行の非オーナーでも
  // オーナー操作の受信を自分の操作と誤認して通知しないようにする。
  private lastRemoteApplyAt = 0;
  static REMOTE_APPLY_ECHO_MS = 500;

  userId = "";
  roomId = "";

  // 共有リンクのベース URL。deps 省略時は dアニメストア用（後方互換）。
  private readonly redirectEndpoint: string;

  constructor(deps: RoomSessionDeps) {
    this.deps = deps;
    this.redirectEndpoint =
      deps.redirectEndpoint ?? ANIMESTORE_REDIRECT_ENDPOINT;
  }

  get inRoom(): boolean {
    return this._inRoom;
  }

  // -- connection lifecycle --------------------------------------------------

  /**
   * Host a new room for the given part.
   *
   * `settings` は「詳細設定」の初期値。create メッセージ自体は変更せず（後方互換）、
   * create 確定後に `update_setting` で適用する。既定値のときは送信を省く。
   */
  createRoom(partId: string, title = "", settings?: RoomSettings): void {
    this._inRoom = true;
    this.joined = false;
    this.resetDelayMs = 100;
    this.roomSettingsInitialized = false;
    this.pendingSettings = settings ?? null;
    this.deps.sidebar.setConnectionStatus("idle");
    this.openSocket(() => {
      this.send({
        action: "create",
        user_name: this.userName,
        user_icon: this.userIcon,
        part_id: partId,
        title,
        request_id: now(),
      });
    });
  }

  /**
   * ルーム詳細設定を更新する（オーナー限定。ホスト以外が呼んでもサーバ側で無視される）。
   * 入室後の操作タブからの変更で使う。
   */
  updateSetting(settings: RoomSettings): void {
    this.roomSettings = settings;
    this.send({
      action: "update_setting",
      one_way: settings.oneWay,
      owner_leave_delete: settings.ownerLeaveDelete,
      disable_reaction: settings.disableReaction,
      request_id: now(),
    });
  }

  /** Join an existing room and immediately request a sync to the host. */
  joinRoom(roomId: string): void {
    this._inRoom = true;
    this.joined = false;
    this.resetDelayMs = 200;
    this.roomSettingsInitialized = false;
    this.roomId = roomId;
    this.deps.sidebar.setConnectionStatus("idle");
    this.openSocket(() => {
      this.send({
        action: "join",
        user_name: this.userName,
        user_icon: this.userIcon,
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
        // room_deleted などで自分から閉じた場合は専用ハンドラ側で UI を
        // 処理済みなので、ここでの誤アラート・状態上書きを行わない。
        if (this.intentionalTeardown) {
          this.intentionalTeardown = false;
          return;
        }
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
        this.roomSettings = DEFAULT_ROOM_SETTINGS;
        this.pendingSettings = null;
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
  /** 一方通行(アクセラレーター)モードで、非オーナーは動画を操作できない。 */
  private get operationBlocked(): boolean {
    return this.roomSettings.oneWay && !this.isHost;
  }

  /**
   * 一方通行モードで非オーナーが操作を試みたとき、送信者にだけ「操作できません」を
   * 表示する。オーナーや他の参加者には何も送らない（operation_notification を出さない）。
   * seek/ratechange 等でイベントが多発するためスロットルする。
   */
  private noticeOneWayBlocked(): void {
    const t = now();
    if (t - this.lastOneWayNoticeAt < RoomSession.ONE_WAY_NOTICE_THROTTLE_MS)
      return;
    this.lastOneWayNoticeAt = t;
    this.deps.notifier.alert("一方通行モードでは操作できません");
  }

  sendVideoOperation(operation: string): void {
    // 一方通行(アクセラレーター)モードでは、オーナー以外は動画を操作できない。
    // サーバへ送らない（サーバ側でも非オーナーの操作はブロックされる）だけだと、
    // ローカルのプレイヤーは操作されたままルームからズレてしまう。そこでホストへ
    // sync_request を投げて現在の再生状態を取り戻し、操作を取り消す。sync_response の
    // 適用は guard.suppress() 下で行われるため送信ループにはならない（join 時の
    // 自動シンクと同じ経路）。送信者にだけ「操作できません」を表示する。
    if (this.operationBlocked) {
      // ただし、直前に受信した動画操作/シンクを適用した「エコー」イベント
      // （複数 DOM イベントの後続が guard 再開後に漏れたもの）は、オーナー操作の
      // 受信であって自分の操作ではない。プレイヤーは既にホスト状態なので、通知も
      // 巻き戻しもせず黙って無視する。
      if (now() - this.lastRemoteApplyAt < RoomSession.REMOTE_APPLY_ECHO_MS) {
        return;
      }
      this.noticeOneWayBlocked();
      this.requestSync({ manual: false });
      return;
    }
    this.send({
      action: "video_operation",
      user_id: this.userId,
      operation,
      option: this.deps.player.getOption(),
      // タイマー画面がエピソード切替に追従できるよう、現在のタイトルを毎回同梱する。
      title: this.deps.player.getTitle(),
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
    // 一方通行モードで非オーナーは操作できないため、他の参加者へ操作通知を配信しない。
    // 送信者にだけ「操作できません」を表示する。
    if (this.operationBlocked) {
      this.noticeOneWayBlocked();
      return;
    }
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

  /**
   * ホスト（オーナー）専用: ルームの削除を要求する。サーバはルーム内全員へ
   * `room_deleted` をブロードキャストする（自分自身も受信して UI をリセットする）。
   * ホスト以外が呼んでもサーバ側で無視される。
   */
  deleteRoom(): void {
    this.send({ action: "delete_room", request_id: now() });
  }

  sendReaction(reactionId: string): void {
    // リアクション禁止設定では、サーバへ送らない（＝他者へ配信されず記録もされない）。
    // 自分の画面への表示は呼び出し側（onReaction）が全モード共通でローカル再生して
    // いるため、ここで再生すると二重表示になる。送信を止めるだけにする。
    if (this.roomSettings.disableReaction) {
      return;
    }
    this.send({
      action: "reaction",
      reaction_type: reactionId,
      request_id: now(),
    });
    // 統計はデフォルトリアクションのみ対象。エクストラ（Noto コードポイント id）は
    // 集計しない。
    if (isDefaultReaction(reactionId)) {
      this.deps.stats.reactionSent(reactionId);
    }
  }

  /** Leave the room (caller is responsible for any UI teardown). */
  leave(): void {
    this.send({ action: "leave", user_name: this.userName, request_id: now() });
    this.stopHeartbeat();
    this.endConnectionTracking();
    this.isHost = false;
    this._inRoom = false;
    this.roomSettings = DEFAULT_ROOM_SETTINGS;
    this.pendingSettings = null;
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
        // ハートビートにもタイトルを載せ、タイマー画面のドリフト補正と同時に
        // 現在のエピソードタイトルも 5 秒ごとに追従させる。
        title: this.deps.player.getTitle(),
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
        this.lastRemoteApplyAt = now();
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
        sidebar.setShareLink(this.redirectEndpoint + this.roomId);
        sidebar.setJoined(true);
        sidebar.setConnectionStatus("connected");
        sidebar.showSharePanel();
        notifier.success("ルームの作成に成功しました");
        sidebar.addHistory({
          direction: "system",
          icon: "party",
          label: "ルームを作成しました",
        });
        // 「詳細設定」で指定した初期設定を、create 確定後に適用する。既定値なら送らない
        // （create メッセージ自体は不変に保ち、旧バックエンド互換を維持するため）。
        if (
          this.pendingSettings &&
          !isDefaultRoomSettings(this.pendingSettings)
        ) {
          this.updateSetting(this.pendingSettings);
        }
        this.pendingSettings = null;
        break;
      case "join":
        this.userId = message.user.user_id;
        this.roomId = message.room_id;
        this.joined = true;
        this.startConnectionTracking();
        this.deps.stats.roomJoined();
        sidebar.setSelfUserId(this.userId);
        sidebar.setShareLink(this.redirectEndpoint + this.roomId);
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
        } else if (message.message_type === "room_deleted") {
          this.handleRoomDeleted();
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
          userIcon: message.user.user_icon,
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
          userIcon: message.user.user_icon,
        });
        break;
      case "sync_request":
        this.sendSyncResponse(message.user);
        break;
      case "sync_response":
        this.deps.guard.suppress();
        this.lastRemoteApplyAt = now();
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
        this.notifyOperation(
          message.operation,
          message.user.user_name,
          message.user.user_icon,
        );
        break;
      case "reaction":
        if (!settings.current().hideReaction) {
          // id はデフォルト名/エクストラ id の両対応（未知 id は ReactionLayer で無視）。
          reactions.play(message.reaction_type, {
            userName: message.user?.user_name,
            mode: settings.current().reactionDisplay,
          });
        }
        break;
      case "room_setting": {
        // サーバから配布される現在のルーム詳細設定を反映する。一方通行モードの
        // 動画操作抑止やリアクション禁止の判定に使う。旧バックエンドは送らないため
        // 未受信なら既定値（すべて false）のままで現行挙動になる。
        const previousSettings = this.roomSettings;
        this.roomSettings = fromWire(message);
        sidebar.setRoomSettings(this.roomSettings);
        // 最初の 1 通は入室時の現在値同期なので通知しない。以降のオーナーによる変更
        // だけを通知する。変更したオーナー本人（ホスト）は操作タブのトグルで把握できる
        // ため、通知対象は非オーナーの参加者に限る。
        if (this.roomSettingsInitialized && !this.isHost) {
          this.notifyRoomSettingChanges(previousSettings, this.roomSettings);
        }
        this.roomSettingsInitialized = true;
        break;
      }
    }
  }

  /**
   * ホストがルームを削除したときの処理（削除実行者自身もこの経路を通る）。
   * 通知を出し、セッションを片付けてソケットを閉じ、サイドバーを
   * 「ルーム作成」段階へ戻す。
   */
  private handleRoomDeleted(): void {
    this.intentionalTeardown = true;
    this.joined = false;
    this._inRoom = false;
    this.stopHeartbeat();
    this.endConnectionTracking();
    this.isHost = false;
    this.roomSettings = DEFAULT_ROOM_SETTINGS;
    this.pendingSettings = null;
    this.deps.client.close();
    this.deps.notifier.alert("ルームが削除されました");
    this.deps.sidebar.resetToCreate();
  }

  // 他の参加者の操作通知 (operation_notification) を受信したとき、トーストと
  // 履歴に「受信」エントリとして表示する。
  private notifyOperation(
    operation: string,
    userName: string,
    userIcon?: string,
  ): void {
    const meta = describeOperation(operation);
    if (!meta) return;
    this.deps.notifier.info(`『${userName}』さんが${meta.label}`);
    this.deps.sidebar.addHistory({
      direction: "received",
      icon: meta.icon,
      label: meta.label,
      user: userName,
      userIcon,
    });
  }

  // オーナーが操作タブで詳細設定を変更した（room_setting の差分がある）とき、
  // 変化した設定ごとに「『◯◯』を有効化しました／無効化しました」をトースト＋履歴で
  // ルーム内の参加者へ知らせる。
  private notifyRoomSettingChanges(
    previous: RoomSettings,
    next: RoomSettings,
  ): void {
    for (const change of diffRoomSettings(previous, next)) {
      const label = `『${change.label}』を${
        change.enabled ? "有効化" : "無効化"
      }しました`;
      this.deps.notifier.info(label);
      this.deps.sidebar.addHistory({
        direction: "system",
        icon: "info",
        label,
      });
    }
  }

  // -- notifications ---------------------------------------------------------

  /**
   * 自分のプレイヤー操作をルームへ通知した直後（selfNotification が無効なとき）に
   * トーストと履歴へ「送信」エントリを残す。`operation` は
   * {@link sendActionNotification} に渡したものと同じワイヤ表現。
   */
  notifySentOperation(operation: string): void {
    // 一方通行モードで非オーナーは操作できないため、送信履歴も残さない。
    if (this.operationBlocked) return;
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

  private get userIcon(): string {
    return this.deps.settings.current().userIcon;
  }
}

function now(): number {
  return new Date().getTime();
}
