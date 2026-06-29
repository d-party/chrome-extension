/**
 * User-configurable settings (managed in the popup, stored in
 * `chrome.storage.sync`). The storage keys are the original snake_case keys
 * so existing users' stored values keep working.
 */

/**
 * リアクションの画面表示方法。
 * - `normal`: 現状どおり下から上へ浮上（ランダムX）。最上部で少し静止して消える。
 * - `badge`: プレイヤー右下に「ユーザー名 : リアクション」を小さく出す。新しいものが下。
 * - `left`: 左寄りに出し、sin カーブで揺れながら最下部→最上部へ移動。
 */
export type ReactionDisplayMode = "normal" | "badge" | "left";

export const REACTION_DISPLAY_MODES: readonly ReactionDisplayMode[] = [
  "normal",
  "badge",
  "left",
] as const;

export interface Settings {
  autoAnotherTab: boolean;
  autoUserNameDecision: boolean;
  enablePictureInPicture: boolean;
  hideReaction: boolean;
  hideReactionIcon: boolean;
  selfNotification: boolean;
  /** リアクションの画面表示方法（既定 `normal`）。 */
  reactionDisplay: ReactionDisplayMode;
  /**
   * ユーザーが追加したエクストラリアクションの id 配列（`extraReactions.ts` の
   * カタログ id ＝ Noto コードポイント）。プレイヤーのバーに表示され、送信できる。
   * デフォルトリアクションはここに含めない（常に有効・変更不可）。
   */
  extraReactions: string[];
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
  reactionDisplay: "normal",
  extraReactions: [],
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
  reactionDisplay: "reaction_display",
  extraReactions: "extra_reactions",
  userName: "user_name",
  userIcon: "user_icon",
} as const satisfies Record<keyof Settings, string>;
