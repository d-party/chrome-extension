/**
 * Reaction kinds. Values mirror the backend `streamer.models.ReactionType`
 * names and the strings exchanged over the WebSocket.
 */
export const REACTION_TYPES = [
  "fav",
  "middle_finger",
  "thumbs_up",
  "smile",
  "cry",
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

/** Display label and emoji for each reaction kind (used by the popup stats). */
export const REACTION_META: Record<
  ReactionType,
  { label: string; emoji: string }
> = {
  fav: { label: "お気に入り", emoji: "❤️" },
  thumbs_up: { label: "いいね", emoji: "👍" },
  smile: { label: "笑顔", emoji: "😄" },
  cry: { label: "涙", emoji: "😢" },
  middle_finger: { label: "ブーイング", emoji: "🖕" },
};

/**
 * デフォルトリアクション（変更不可・統計対象）。`id` は WS の `reaction_type`、
 * `reactIcon` は {@link REACTION_ICONS} のキー（プレイヤーのバー／ポップアップの
 * 静的アイコン）。並びは表示順。Lottie は同梱の既定アニメ（`reactions/lottie/`）。
 */
export interface ReactionDef {
  id: string;
  label: string;
  reactIcon: string;
}

export const DEFAULT_REACTIONS: ReactionDef[] = [
  {
    id: "thumbs_up",
    label: REACTION_META.thumbs_up.label,
    reactIcon: "FaThumbsUp",
  },
  { id: "fav", label: REACTION_META.fav.label, reactIcon: "FaHeart" },
  { id: "smile", label: REACTION_META.smile.label, reactIcon: "FaFaceSmileBeam" },
  { id: "cry", label: REACTION_META.cry.label, reactIcon: "FaFaceSadCry" },
  {
    id: "middle_finger",
    label: REACTION_META.middle_finger.label,
    reactIcon: "FaHandMiddleFinger",
  },
];

/**
 * `id` がデフォルトリアクション（＝統計対象）かを判定する。エクストラ
 * リアクションの id（Noto コードポイント）はここで false になり、統計に含めない。
 */
export function isDefaultReaction(id: string): id is ReactionType {
  return (REACTION_TYPES as readonly string[]).includes(id);
}
