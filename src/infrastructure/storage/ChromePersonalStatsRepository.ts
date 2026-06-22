import {
  emptyStats,
  normalizeStats,
  type PersonalStats,
} from "@/domain/personalStats";
import type { ReactionType } from "@/domain/reactions";

/** `chrome.storage.sync` key holding the serialized {@link PersonalStats}. */
const STORAGE_KEY = "personal_stats";

/**
 * Reads/writes {@link PersonalStats} from `chrome.storage.sync` as a single
 * JSON object. Stored under the signed-in Chrome profile, so the figures are
 * per-account and roam across the user's devices.
 *
 * Updates are read-modify-write. A single user driving one player tab at a
 * time makes contention a non-issue in practice; writes are serialized through
 * an in-process promise chain so rapid successive increments don't clobber one
 * another within the same context.
 */
export class ChromePersonalStatsRepository {
  /** Serializes mutations so back-to-back increments don't race each other. */
  private queue: Promise<void> = Promise.resolve();

  async getAll(): Promise<PersonalStats> {
    const stored = await chrome.storage.sync.get([STORAGE_KEY]);
    return normalizeStats(stored[STORAGE_KEY]);
  }

  /** Apply a mutation to the current stats and persist the result. */
  private mutate(fn: (stats: PersonalStats) => void): Promise<void> {
    this.queue = this.queue.then(async () => {
      const stats = await this.getAll();
      if (stats.since === null) stats.since = Date.now();
      fn(stats);
      await chrome.storage.sync.set({ [STORAGE_KEY]: stats });
    });
    // Don't let one rejected write break the chain for later mutations.
    return this.queue.catch(() => undefined);
  }

  incrementRoomsCreated(): Promise<void> {
    return this.mutate((s) => (s.roomsCreated += 1));
  }

  incrementRoomsJoined(): Promise<void> {
    return this.mutate((s) => (s.roomsJoined += 1));
  }

  incrementReaction(type: ReactionType): Promise<void> {
    return this.mutate((s) => (s.reactionsByType[type] += 1));
  }

  addConnectionMs(ms: number): Promise<void> {
    if (!(ms > 0)) return Promise.resolve();
    return this.mutate((s) => (s.connectionMs += Math.round(ms)));
  }

  /** Clear all accumulated statistics back to zero. */
  async reset(): Promise<void> {
    this.queue = this.queue.then(() =>
      chrome.storage.sync.set({ [STORAGE_KEY]: emptyStats() }),
    );
    return this.queue.catch(() => undefined);
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  onChange(listener: (stats: PersonalStats) => void): () => void {
    const handler = () => {
      void this.getAll().then(listener);
    };
    chrome.storage.sync.onChanged.addListener(handler);
    return () => chrome.storage.sync.onChanged.removeListener(handler);
  }
}
