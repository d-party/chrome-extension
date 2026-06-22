/**
 * Personal usage statistics, accumulated entirely on the client.
 *
 * These are private, per-account figures (stored in `chrome.storage.sync`, so
 * they follow the signed-in Chrome profile) and are **independent of the
 * backend** — nothing here is reported to or fetched from the server. They
 * mirror, on a personal scale, the aggregate figures the frontend `/stats`
 * dashboard shows for the whole service.
 */

import { REACTION_TYPES, type ReactionType } from "./reactions";

export interface PersonalStats {
  /** Number of rooms the user has hosted (created). */
  roomsCreated: number;
  /** Number of rooms the user has joined as a guest. */
  roomsJoined: number;
  /** Reactions the user has sent, broken down by kind. */
  reactionsByType: Record<ReactionType, number>;
  /** Total time spent connected to a room, in milliseconds. */
  connectionMs: number;
  /** Epoch ms of the first recorded activity, or null before any. */
  since: number | null;
}

function zeroReactions(): Record<ReactionType, number> {
  return Object.fromEntries(REACTION_TYPES.map((t) => [t, 0])) as Record<
    ReactionType,
    number
  >;
}

export function emptyStats(): PersonalStats {
  return {
    roomsCreated: 0,
    roomsJoined: 0,
    reactionsByType: zeroReactions(),
    connectionMs: 0,
    since: null,
  };
}

/** Total reactions sent across all kinds. */
export function totalReactions(stats: PersonalStats): number {
  return REACTION_TYPES.reduce(
    (sum, t) => sum + (stats.reactionsByType[t] ?? 0),
    0,
  );
}

/**
 * Coerce an unknown stored value into a valid {@link PersonalStats}, filling in
 * any missing/invalid fields with zeros. Keeps old stored data forward-compatible.
 */
export function normalizeStats(value: unknown): PersonalStats {
  const base = emptyStats();
  if (!value || typeof value !== "object") return base;
  const v = value as Record<string, unknown>;

  const num = (x: unknown): number =>
    typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : 0;

  const reactions = zeroReactions();
  const stored = v.reactionsByType;
  if (stored && typeof stored === "object") {
    for (const t of REACTION_TYPES) {
      reactions[t] = num((stored as Record<string, unknown>)[t]);
    }
  }

  return {
    roomsCreated: num(v.roomsCreated),
    roomsJoined: num(v.roomsJoined),
    reactionsByType: reactions,
    connectionMs: num(v.connectionMs),
    since: typeof v.since === "number" && v.since > 0 ? v.since : null,
  };
}
