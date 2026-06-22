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
