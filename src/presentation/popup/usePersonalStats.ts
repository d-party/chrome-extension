import { useCallback, useEffect, useState } from "react";
import { useMountedState } from "react-use";

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
  const isMounted = useMountedState();

  useEffect(() => {
    void repo.getAll().then((value) => {
      if (!isMounted()) return;
      setStats(value);
      setLoaded(true);
    });
    return repo.onChange((value) => {
      if (isMounted()) setStats(value);
    });
  }, [isMounted]);

  const reset = useCallback(async () => {
    setStats(emptyStats());
    await repo.reset();
  }, []);

  return { stats, loaded, reset };
}
