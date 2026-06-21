/**
 * Shared model for the sidebar history log and operation notifications.
 *
 * History entries used to be plain HTML strings that embedded Font Awesome
 * `<i>` markup (e.g. `『<i class='fas fa-play'></i>』をルームに送信`). The sidebar
 * strips HTML before display, which erased the icon and left empty quotes
 * (`『』をルームに送信`); the toasts render that HTML in their own Shadow DOM,
 * where the Font Awesome stylesheet is not loaded, so they showed the same
 * empty quotes. We now model events structurally and let the UI render the
 * icons with lucide, so nothing depends on Font Awesome being present.
 */

/** Who performed the event, from the local user's point of view. */
export type HistoryDirection = "sent" | "received" | "system";

/** Icon key resolved to a concrete lucide icon by the presentation layer. */
export type HistoryIcon =
  | "play"
  | "pause"
  | "next"
  | "skip"
  | "rate"
  | "join"
  | "leave"
  | "sync"
  | "host"
  | "party"
  | "info"
  | "error";

export interface HistoryEntryInput {
  direction: HistoryDirection;
  icon: HistoryIcon;
  /** Human-readable description of the operation/event (plain text, no markup). */
  label: string;
  /**
   * The participant responsible for the event. Set for received operations and
   * room membership changes; omitted for the local user's own and pure system
   * events. Used both for display and for the participant filter.
   */
  user?: string;
}

export interface OperationMeta {
  icon: HistoryIcon;
  label: string;
}

/**
 * Resolves a wire `operation` (as carried by `operation_notification` and as
 * passed to {@link RoomSession.sendActionNotification}) to an icon and a label.
 * Returns null for operations that should not surface in the UI.
 */
export function describeOperation(operation: string): OperationMeta | null {
  if (operation.startsWith("ratechange")) {
    const value = operation.slice("ratechange".length);
    return { icon: "rate", label: `×${value} 倍速` };
  }
  switch (operation) {
    case "next":
      return { icon: "next", label: "次のエピソード" };
    case "play":
      return { icon: "play", label: "再生" };
    case "stop":
      return { icon: "pause", label: "停止" };
    case "skip":
      return { icon: "skip", label: "スキップ" };
    default:
      return null;
  }
}
