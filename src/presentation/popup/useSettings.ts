import { useCallback, useEffect, useState } from "react";

import { DEFAULT_SETTINGS, type Settings } from "@/domain/settings";
import { ChromeStorageSettingsRepository } from "@/infrastructure/storage/ChromeStorageSettingsRepository";

const repo = new ChromeStorageSettingsRepository();

export interface UseSettings {
  /** Current settings (defaults until the first read resolves). */
  settings: Settings;
  /** True once the initial read from chrome.storage has completed. */
  loaded: boolean;
  /** Persist a single setting (optimistically updates local state). */
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
}

/**
 * React binding over {@link ChromeStorageSettingsRepository}.
 *
 * `chrome.storage.sync` remains the single source of truth; this hook just
 * mirrors it into React state and stays in sync with changes made from any
 * extension context (other popups, content scripts) via `chrome.storage.onChanged`.
 */
export function useSettings(): UseSettings {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void repo.getAll().then((value) => {
      if (!active) return;
      setSettings(value);
      setLoaded(true);
    });
    const unsubscribe = repo.onChange((value) => {
      if (active) setSettings(value);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const update = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      await repo.set(key, value);
    },
    [],
  );

  return { settings, loaded, update };
}
