import { versionCheck } from "@/infrastructure/api/generated/d-party";

/**
 * Content script for the d-party.net lobby pages. Asks the backend whether the
 * installed extension version is supported and writes the boolean result into
 * the `.chrome_extension_field` element. Faithful, type-safe port of the
 * original version_check.js (now using the orval-generated REST client).
 */
async function run(): Promise<void> {
  const field = document.getElementsByClassName(
    "chrome_extension_field",
  )[0] as HTMLElement | undefined;

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

  if (field) field.innerText = String(isPossible);
}

void run();
