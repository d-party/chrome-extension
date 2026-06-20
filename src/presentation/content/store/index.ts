import $ from "jquery";

import { DEFAULT_SETTINGS, type Settings } from "@/domain/settings";
import { ChromeStorageSettingsRepository } from "@/infrastructure/storage/ChromeStorageSettingsRepository";

import { getParam, makeFontFace } from "../dom/utils";

/**
 * Content script for the dアニメストア episode-list pages (ci_pc / tp_pc).
 * Adds "open in another tab" (play) and "create party" (popper) icons to each
 * episode, and — when enabled — rewrites direct-play links to open in a new tab.
 *
 * Ported from the original store.js. Two robustness fixes over the original:
 *  - content scripts run at `document_idle`, frequently *after* `window.load`
 *    has fired, so a bare `load` listener never ran and no icons appeared —
 *    we run immediately when the document is already loaded;
 *  - the episode list is loaded/extended dynamically, so we (idempotently)
 *    re-decorate as new items appear via a MutationObserver.
 */

const DECORATED_ATTR = "data-dparty-decorated";

const repo = new ChromeStorageSettingsRepository();
let settings: Settings = DEFAULT_SETTINGS;
void repo.getAll().then((s) => (settings = s));
repo.onChange((s) => (settings = s));

makeFontFace();
ready(main);

function main(): void {
  decorateEpisodes();

  // Re-decorate as the (dynamically loaded) list grows. Idempotent: already
  // decorated items are skipped, and the icons we add don't match the filter.
  const observer = new MutationObserver(() => decorateEpisodes());
  observer.observe(document.body, { childList: true, subtree: true });

  // The original instantiates a (disabled) direct-play observer; preserved.
  void new MutationObserver(directPlayCallback);
  $("body").append(
    "<script type='text/javascript' class=new_window_remover>$('.directPlayReady').off('click');</script>",
  );
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
    playIcon.setAttribute("title", "別タブで再生");
    playIcon.setAttribute("href", "sc_d_pc?partId=" + partId);
    item.parentElement?.appendChild(playIcon);

    const popperIcon = document.createElement("a");
    popperIcon.textContent = "groups";
    popperIcon.setAttribute("title", "パーティールームを作成");
    popperIcon.setAttribute("class", "material-icons popper-btn");
    popperIcon.setAttribute("target", "_blank");
    popperIcon.setAttribute("href", "sc_d_pc?partId=" + partId + "&party=create");
    item.parentElement?.appendChild(popperIcon);
  }
}

function directPlayCallback(): void {
  if (!settings.autoAnotherTab) return;
  const directPlayItems = document.querySelectorAll<HTMLAnchorElement>(".directPlayReady");
  for (const item of Array.from(directPlayItems)) {
    item.setAttribute("target", "_blank");
    if (item.textContent !== "レンタルする") {
      item.setAttribute("href", "sc_d_pc?partId=" + item.getAttribute("data-partid"));
    }
  }
  $(".directPlayReady, .ui-tooltip-content").on("mousemove", function (this: HTMLElement) {
    $(".new_window_remover").remove();
    $(this).attr({ href: "sc_d_pc?partId=" + this.getAttribute("data-partid") });
    this.parentNode?.appendChild(this);
  });
  $("#streamingQuality a").one("mousemove", function () {
    $(".new_window_remover").remove();
  });
  document.querySelectorAll<HTMLAnchorElement>("#streamingQuality a").forEach((item) => {
    item.setAttribute("target", "_blank");
    if (item.textContent !== "レンタルする") {
      item.setAttribute("href", "sc_d_pc?partId=" + getParam("partId"));
    }
  });
}

/** Run `fn` now if the document has finished loading, otherwise on `load`. */
function ready(fn: () => void): void {
  if (document.readyState === "complete") {
    fn();
  } else {
    window.addEventListener("load", fn, false);
  }
}
