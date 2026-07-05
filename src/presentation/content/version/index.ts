import { versionCheck } from "@/infrastructure/api/generated/d-party";

/**
 * Content script for the d-party.net lobby pages. Asks the backend whether the
 * installed extension version is supported and writes the boolean result into
 * the `.chrome_extension_field` element. Faithful, type-safe port of the
 * original version_check.js (now using the orval-generated REST client).
 */
async function run(): Promise<void> {
  const version = chrome.runtime.getManifest().version;
  let isPossible = false;
  try {
    const response = await versionCheck({ "extension-version": version });
    if (response.status === 200) {
      isPossible = response.data.is_possible;
    }
  } catch {
    isPossible = false;
  }

  writeVerdict(String(isPossible));
}

/**
 * Write the verdict into `.chrome_extension_field`. The lobby page (React) may
 * render that element client-side (after hydration), so it can be absent when
 * this script runs. Write immediately if present; otherwise observe the DOM and
 * write as soon as it appears (with a safety timeout so we don't observe forever).
 */
function writeVerdict(value: string): void {
  const tryWrite = (): boolean => {
    const field = document.getElementsByClassName(
      "chrome_extension_field",
    )[0] as HTMLElement | undefined;
    if (!field) return false;
    field.innerText = value;
    return true;
  };

  if (tryWrite()) return;

  const observer = new MutationObserver(() => {
    if (tryWrite()) observer.disconnect();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.setTimeout(() => observer.disconnect(), 15000);
}

void run();
