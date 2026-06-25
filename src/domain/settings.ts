/**
 * User-configurable settings (managed in the popup, stored in
 * `chrome.storage.sync`). The storage keys are the original snake_case keys
 * so existing users' stored values keep working.
 */

export interface Settings {
  autoAnotherTab: boolean;
  autoUserNameDecision: boolean;
  enablePictureInPicture: boolean;
  hideReaction: boolean;
  hideReactionIcon: boolean;
  selfNotification: boolean;
  userName: string;
  /**
   * 表示アイコン。react-icons (Font Awesome 6) のキー文字列（例: "FaCat"）。
   * ルーム参加時に user_name と同様にバックエンドへ送る。未設定や未知のキーは
   * 既定の素朴なユーザーアイコンにフォールバックする（UserAvatar が解決）。
   */
  userIcon: string;
}

export const DEFAULT_SETTINGS: Settings = {
  autoAnotherTab: true,
  autoUserNameDecision: false,
  enablePictureInPicture: true,
  hideReaction: false,
  hideReactionIcon: false,
  selfNotification: false,
  userName: "ユーザー",
  userIcon: "FaRegUser",
};

/** Mapping between domain fields and `chrome.storage` keys. */
export const STORAGE_KEYS = {
  autoAnotherTab: "auto_another_tab",
  autoUserNameDecision: "auto_user_name_decision",
  enablePictureInPicture: "enable_picture_in_picture",
  hideReaction: "hide_reaction",
  hideReactionIcon: "hide_reaction_icon",
  selfNotification: "self_notification",
  userName: "user_name",
  userIcon: "user_icon",
} as const satisfies Record<keyof Settings, string>;
