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
} from "./ports";

export interface RoomSessionDeps {
  client: PartyWebSocketClient;
  player: PlayerController;
  sidebar: SidebarView;
  reactions: ReactionView;
  notifier: Notifier;
  settings: SettingsProvider;
  guard: ActionGuard;
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
  createRoom(partId: string): void {
    this._inRoom = true;
    this.joined = false;
    this.resetDelayMs = 100;
    this.deps.sidebar.setConnectionStatus("idle");
    this.openSocket();
    window.setTimeout(() => {
      this.send({
        action: "create",
        user_name: this.userName,
        part_id: partId,
        request_id: now(),
      });
    }, 500);
  }

  /** Join an existing room and immediately request a sync to the host. */
  joinRoom(roomId: string): void {
    this._inRoom = true;
    this.joined = false;
    this.resetDelayMs = 200;
    this.roomId = roomId;
    this.deps.sidebar.setConnectionStatus("idle");
    this.openSocket();
    window.setTimeout(() => {
      this.send({
        action: "join",
        user_name: this.userName,
        room_id: roomId,
        request_id: now(),
      });
      this.deps.guard.allow();
      this.requestSync();
    }, 200);
  }

  private openSocket(): void {
    this.deps.client.connect({
      onMessage: (message) => this.handleMessage(message),
      onClose: () => {
        if (this.joined) {
          this.deps.notifier.alert(SERVER_DISCONNECTED);
        } else if (this._inRoom) {
          this.deps.notifier.alert(CONNECT_FAILED);
          this.deps.sidebar.addHistory(CONNECT_FAILED);
        }
        this._inRoom = false;
        this.joined = false;
        this.deps.sidebar.setJoined(false);
        this.deps.sidebar.setConnectionStatus("failed");
      },
    });
  }

  // -- outgoing intents (called by DOM event handlers) -----------------------

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

  requestSync(): void {
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
  }

  /** Leave the room (caller is responsible for any UI teardown). */
  leave(): void {
    this.send({ action: "leave", user_name: this.userName, request_id: now() });
    this._inRoom = false;
  }

  private send(message: OutgoingMessage): void {
    try {
      if (this._inRoom) this.deps.client.send(message);
    } catch {
      this.deps.notifier.alert(SERVER_DISCONNECTED);
      this.deps.sidebar.addHistory(SERVER_DISCONNECTED);
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
        sidebar.setShareLink(ANIMESTORE_REDIRECT_ENDPOINT + this.roomId);
        sidebar.setJoined(true);
        sidebar.setConnectionStatus("connected");
        sidebar.showSharePanel();
        this.successHistory("ルームの作成に成功しました");
        break;
      case "join":
        this.userId = message.user.user_id;
        this.roomId = message.room_id;
        this.joined = true;
        sidebar.setShareLink(ANIMESTORE_REDIRECT_ENDPOINT + this.roomId);
        sidebar.setJoined(true);
        sidebar.setConnectionStatus("connected");
        notifier.success("ルームに参加");
        break;
      case "server_message":
        if (message.message_type === "host_change") {
          this.infoHistory("ルームのホスト権限を獲得");
        }
        break;
      case "user_add":
        notifier.info(
          `『${message.user.user_name}』さんが参加 <i class='fas fa-glass-cheers'></i>`,
        );
        sidebar.addHistoryUser(message.user.user_name);
        break;
      case "user_list":
        sidebar.updateUserList(message.user_list);
        break;
      case "leave":
        notifier.info(
          `『${message.user.user_name}』さんが退室 <i class='fas fa-sign-out-alt'></i>`,
        );
        sidebar.leaveHistoryUser(message.user.user_name);
        break;
      case "sync_request":
        this.sendSyncResponse(message.user);
        break;
      case "sync_response":
        this.deps.guard.suppress();
        player.onAction("sync", message.option);
        this.infoHistory("再生状況をホストにシンク");
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

  private notifyOperation(operation: string, userName: string): void {
    const icon = OPERATION_ICONS[operation];
    if (icon) {
      this.infoHistory(`『${userName}』さんから『${icon}』を受信`);
    }
  }

  // -- notifications ---------------------------------------------------------

  successHistory(text: string): void {
    this.deps.notifier.success(text);
    this.deps.sidebar.addHistory(text);
  }

  private infoHistory(text: string): void {
    this.deps.notifier.info(text);
    this.deps.sidebar.addHistory(text);
  }

  private get userName(): string {
    return this.deps.settings.current().userName;
  }
}

function now(): number {
  return new Date().getTime();
}

/** Maps `operation_notification` operations to the original icon/label markup. */
const OPERATION_ICONS: Record<string, string> = {
  next: "<i class='fas fa-forward notification-icon'></i>",
  play: "<i class='fas fa-play notification-icon'></i>",
  stop: "<i class='fas fa-stop notification-icon'></i>",
  skip: "<i class='fas fa-fast-forward notification-icon'></i>",
  "ratechange0.5": "× 0.5",
  "ratechange0.75": "× 0.75",
  ratechange1: "× 1",
  "ratechange1.25": "× 1.25",
  "ratechange1.5": "× 1.5",
  ratechange2: "× 2",
};
