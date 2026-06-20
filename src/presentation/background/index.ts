/**
 * Background service worker (MV3).
 *
 * Opens the usage page exactly once — on the very first install. A persisted
 * flag in chrome.storage.local makes this idempotent so the page is never
 * reopened, even though onInstalled can fire more than once (reloading an
 * unpacked extension during development, browser/extension updates, etc.).
 */
const USAGE_OPENED_KEY = "usagePageOpened";
const USAGE_URL = "https://d-party.net/usage";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== chrome.runtime.OnInstalledReason.INSTALL) return;
  void openUsageOnce();
});

async function openUsageOnce(): Promise<void> {
  const stored = await chrome.storage.local.get(USAGE_OPENED_KEY);
  if (stored[USAGE_OPENED_KEY]) return;
  await chrome.storage.local.set({ [USAGE_OPENED_KEY]: true });
  await chrome.tabs.create({ url: USAGE_URL });
}
