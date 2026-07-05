/**
 * Background service worker (MV3).
 *
 * Opens the usage page exactly once — on the very first install. A persisted
 * flag in chrome.storage.local makes this idempotent so the page is never
 * reopened, even though onInstalled can fire more than once (reloading an
 * unpacked extension during development, browser/extension updates, etc.).
 *
 * Also proxies the sidebar health check: the content script cannot fetch
 * localhost directly under Chrome's Local Network Access, so it delegates the
 * probe here (see `src/infrastructure/messages.ts`).
 */
import { HEALTH_CHECK_ENDPOINT } from "@/infrastructure/env";
import type {
  HealthCheckRequest,
  HealthCheckResponse,
} from "@/infrastructure/messages";

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

chrome.runtime.onMessage.addListener(
  (
    message: HealthCheckRequest,
    _sender,
    sendResponse: (response: HealthCheckResponse) => void,
  ) => {
    if (message?.type !== "healthCheck") return undefined;
    // background は host_permissions を持つため LNA に阻まれず localhost を叩ける。
    fetch(HEALTH_CHECK_ENDPOINT, { method: "GET" })
      .then((res) => sendResponse({ ok: res.ok }))
      .catch(() => sendResponse({ ok: false }));
    return true; // 非同期に sendResponse するためチャネルを開いたままにする。
  },
);
