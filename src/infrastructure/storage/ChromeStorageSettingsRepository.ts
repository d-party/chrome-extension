import {
  DEFAULT_SETTINGS,
  REACTION_DISPLAY_MODES,
  STORAGE_KEYS,
  type ReactionDisplayMode,
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
      autoAnotherTab: bool(
        stored[STORAGE_KEYS.autoAnotherTab],
        DEFAULT_SETTINGS.autoAnotherTab,
      ),
      autoUserNameDecision: bool(
        stored[STORAGE_KEYS.autoUserNameDecision],
        DEFAULT_SETTINGS.autoUserNameDecision,
      ),
      enablePictureInPicture: bool(
        stored[STORAGE_KEYS.enablePictureInPicture],
        DEFAULT_SETTINGS.enablePictureInPicture,
      ),
      hideReaction: bool(
        stored[STORAGE_KEYS.hideReaction],
        DEFAULT_SETTINGS.hideReaction,
      ),
      hideReactionIcon: bool(
        stored[STORAGE_KEYS.hideReactionIcon],
        DEFAULT_SETTINGS.hideReactionIcon,
      ),
      selfNotification: bool(
        stored[STORAGE_KEYS.selfNotification],
        DEFAULT_SETTINGS.selfNotification,
      ),
      reactionDisplay: reactionDisplay(
        stored[STORAGE_KEYS.reactionDisplay],
        DEFAULT_SETTINGS.reactionDisplay,
      ),
      extraReactions: strArray(
        stored[STORAGE_KEYS.extraReactions],
        DEFAULT_SETTINGS.extraReactions,
      ),
      userName: str(stored[STORAGE_KEYS.userName], DEFAULT_SETTINGS.userName),
      userIcon: str(stored[STORAGE_KEYS.userIcon], DEFAULT_SETTINGS.userIcon),
    };
  }

  async set<K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ): Promise<void> {
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

function strArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((v): v is string => typeof v === "string");
  return items;
}

function reactionDisplay(
  value: unknown,
  fallback: ReactionDisplayMode,
): ReactionDisplayMode {
  return REACTION_DISPLAY_MODES.includes(value as ReactionDisplayMode)
    ? (value as ReactionDisplayMode)
    : fallback;
}
