import $ from "jquery";

import { DEFAULT_SETTINGS, type Settings } from "@/domain/settings";
import { ChromeStorageSettingsRepository } from "@/infrastructure/storage/ChromeStorageSettingsRepository";

import { getParam, makeFontFace } from "../dom/utils";

/**
 * Content script for the dアニメストア episode-list pages (ci_pc / tp_pc).
 * Adds "open in another tab" (play) and "create party" (popper) icons to each
 * episode, and — when enabled — rewrites direct-play links to open in a new tab.
 * Faithful port of the original store.js.
 */

const repo = new ChromeStorageSettingsRepository();
let settings: Settings = DEFAULT_SETTINGS;
void repo.getAll().then((s) => (settings = s));
repo.onChange((s) => (settings = s));

makeFontFace();
window.addEventListener("load", main, false);

function main(): void {
  const itemList = document.querySelectorAll<HTMLAnchorElement>(".itemModule.list a");

  for (const item of Array.from(itemList)) {
    const href = item.getAttribute("href");
    if (href && /cd_pc/.test(href)) {
      const partId = href.replace(/[^0-9]/g, "");
      if (item.classList.contains("watched")) {
        item.parentElement?.classList.add("watched_episode");
      }
      const playIcon = document.createElement("a");
      playIcon.textContent = "play_arrow";
      playIcon.setAttribute("class", "material-icons play-btn");
      playIcon.setAttribute("target", "_blank");
      playIcon.setAttribute("href", "sc_d_pc?partId=" + partId);
      item.parentElement?.appendChild(playIcon);

      const popperIcon = document.createElement("a");
      popperIcon.textContent = "celebration";
      popperIcon.setAttribute("class", "material-icons popper-btn");
      popperIcon.setAttribute("target", "_blank");
      popperIcon.setAttribute("href", "sc_d_pc?partId=" + partId + "&party=create");
      item.parentElement?.appendChild(popperIcon);
    }
  }

  const options: MutationObserverInit = {
    childList: true,
    characterData: false,
    characterDataOldValue: false,
    attributes: false,
    subtree: true,
  };

  function callback(): void {
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

  // The original instantiates an observer but leaves it disabled; preserved.
  void new MutationObserver(callback);
  void options;
  $("body").append(
    "<script type='text/javascript' class=new_window_remover>$('.directPlayReady').off('click');</script>",
  );
}
