/**
 * User-configurable settings (managed in the popup, stored in
 * `chrome.storage.sync`). The storage keys are the original snake_case keys
 * so existing users' stored values keep working.
 */

export interface Settings {
  autoAnotherTab: boolean;
  autoUserNameDecision: boolean;
  hideReaction: boolean;
  hideReactionIcon: boolean;
  selfNotification: boolean;
  userName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  autoAnotherTab: true,
  autoUserNameDecision: false,
  hideReaction: false,
  hideReactionIcon: false,
  selfNotification: false,
  userName: "ユーザー",
};

/** Mapping between domain fields and `chrome.storage` keys. */
export const STORAGE_KEYS = {
  autoAnotherTab: "auto_another_tab",
  autoUserNameDecision: "auto_user_name_decision",
  hideReaction: "hide_reaction",
  hideReactionIcon: "hide_reaction_icon",
  selfNotification: "self_notification",
  userName: "user_name",
} as const satisfies Record<keyof Settings, string>;
