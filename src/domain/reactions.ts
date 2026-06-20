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
