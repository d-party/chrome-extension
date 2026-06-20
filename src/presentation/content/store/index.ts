import { makeFontFace } from "../dom/utils";

/**
 * Content script for the dアニメストア episode-list pages (ci_pc / tp_pc).
 * Adds "open in another tab" (play) and "create party" (popper) icons to each
 * episode.
 *
 * Ported from the original store.js. Robustness fixes over the original:
 *  - content scripts run at `document_idle`, frequently *after* `window.load`
 *    has fired, so a bare `load` listener never ran and no icons appeared —
 *    we run immediately when the document is already loaded;
 *  - the episode list is loaded/extended dynamically (Swiper), so we
 *    (idempotently) re-decorate as new items appear via a MutationObserver.
 *
 * The original also injected an inline <script> into the page to strip dアニメ
 * ストア's own click handlers; that violated the page CSP (inline scripts are
 * blocked) and never worked from the isolated world, so it has been removed.
 */

const DECORATED_ATTR = "data-dparty-decorated";

makeFontFace();
ready(main);

function main(): void {
  decorateEpisodes();
  // Re-decorate as the (dynamically loaded) list grows. Idempotent: already
  // decorated items are skipped, and the icons we add don't match the filter.
  const observer = new MutationObserver(() => decorateEpisodes());
  observer.observe(document.body, { childList: true, subtree: true });
}

/** Add the play/popper icons to every not-yet-decorated episode link. */
function decorateEpisodes(): void {
  const itemList = document.querySelectorAll<HTMLAnchorElement>(".itemModule.list a");

  for (const item of Array.from(itemList)) {
    const href = item.getAttribute("href");
    if (!href || !/cd_pc/.test(href)) continue;
    if (item.hasAttribute(DECORATED_ATTR)) continue;
    item.setAttribute(DECORATED_ATTR, "1");

    const partId = href.replace(/[^0-9]/g, "");
    if (item.classList.contains("watched")) {
      item.parentElement?.classList.add("watched_episode");
    }

    const playIcon = document.createElement("a");
    playIcon.textContent = "play_circle_filled";
    playIcon.setAttribute("class", "material-icons play-btn");
    playIcon.setAttribute("target", "_blank");
    playIcon.setAttribute("data-tooltip", "別タブで再生");
    playIcon.setAttribute("aria-label", "別タブで再生");
    playIcon.setAttribute("href", "sc_d_pc?partId=" + partId);
    item.parentElement?.appendChild(playIcon);

    const popperIcon = document.createElement("a");
    popperIcon.textContent = "groups";
    popperIcon.setAttribute("data-tooltip", "パーティールームを作成して同時視聴");
    popperIcon.setAttribute("aria-label", "パーティールームを作成して同時視聴");
    popperIcon.setAttribute("class", "material-icons popper-btn");
    popperIcon.setAttribute("target", "_blank");
    popperIcon.setAttribute("href", "sc_d_pc?partId=" + partId + "&party=create");
    item.parentElement?.appendChild(popperIcon);
  }
}

/** Run `fn` now if the document has finished loading, otherwise on `load`. */
function ready(fn: () => void): void {
  if (document.readyState === "complete") {
    fn();
  } else {
    window.addEventListener("load", fn, false);
  }
}
