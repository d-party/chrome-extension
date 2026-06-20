import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  type Settings,
} from "@/domain/settings";

/**
 * Reads/writes {@link Settings} from `chrome.storage.sync`, translating between
 * the domain shape and the stored snake_case keys.
 */
export class ChromeStorageSettingsRepository {
  async getAll(): Promise<Settings> {
    const stored = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
    return {
      autoAnotherTab: bool(stored[STORAGE_KEYS.autoAnotherTab], DEFAULT_SETTINGS.autoAnotherTab),
      autoUserNameDecision: bool(stored[STORAGE_KEYS.autoUserNameDecision], DEFAULT_SETTINGS.autoUserNameDecision),
      hideReaction: bool(stored[STORAGE_KEYS.hideReaction], DEFAULT_SETTINGS.hideReaction),
      hideReactionIcon: bool(stored[STORAGE_KEYS.hideReactionIcon], DEFAULT_SETTINGS.hideReactionIcon),
      selfNotification: bool(stored[STORAGE_KEYS.selfNotification], DEFAULT_SETTINGS.selfNotification),
      userName: str(stored[STORAGE_KEYS.userName], DEFAULT_SETTINGS.userName),
    };
  }

  async set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    await chrome.storage.sync.set({ [STORAGE_KEYS[key]]: value });
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  onChange(listener: (settings: Settings) => void): () => void {
    const handler = () => {
      void this.getAll().then(listener);
    };
    chrome.storage.sync.onChanged.addListener(handler);
    return () => chrome.storage.sync.onChanged.removeListener(handler);
  }
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
