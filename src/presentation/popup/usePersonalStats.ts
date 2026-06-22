import { useCallback, useEffect, useState } from "react";

import { emptyStats, type PersonalStats } from "@/domain/personalStats";
import { ChromePersonalStatsRepository } from "@/infrastructure/storage/ChromePersonalStatsRepository";

const repo = new ChromePersonalStatsRepository();

export interface UsePersonalStats {
  /** Current stats (zeros until the first read resolves). */
  stats: PersonalStats;
  /** True once the initial read from chrome.storage has completed. */
  loaded: boolean;
  /** Clear all accumulated statistics back to zero. */
  reset: () => Promise<void>;
}

/**
 * React binding over {@link ChromePersonalStatsRepository}. Mirrors the stored
 * stats into React state and stays in sync with writes made from any extension
 * context (e.g. the player content script) via `chrome.storage` change events.
 */
export function usePersonalStats(): UsePersonalStats {
  const [stats, setStats] = useState<PersonalStats>(emptyStats);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void repo.getAll().then((value) => {
      if (!active) return;
      setStats(value);
      setLoaded(true);
    });
    const unsubscribe = repo.onChange((value) => {
      if (active) setStats(value);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const reset = useCallback(async () => {
    setStats(emptyStats());
    await repo.reset();
  }, []);

  return { stats, loaded, reset };
}
