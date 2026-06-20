import $ from "jquery";

import { ActionGuard } from "@/application/ActionGuard";
import type { SettingsProvider } from "@/application/ports";
import { RoomSession } from "@/application/RoomSession";
import { DEFAULT_SETTINGS, type Settings } from "@/domain/settings";
import { AwnNotifier } from "@/infrastructure/notifier/AwnNotifier";
import { ChromeStorageSettingsRepository } from "@/infrastructure/storage/ChromeStorageSettingsRepository";
import { WEBSOCKET_ENDPOINT } from "@/infrastructure/env";
import { PartyWebSocketClient } from "@/infrastructure/ws/PartyWebSocketClient";

import { getParam } from "../dom/utils";
import { PlayerControllerDom } from "./PlayerControllerDom";
import { mountSidebar } from "./react/mountSidebar";
import type { SidebarTab } from "./react/sidebarStore";
import { ReactionViewDom } from "./ReactionViewDom";

/**
 * Content script for the dアニメストア player page (sc_d_pc). Wires the
 * dアニメストア player and the sidebar to a {@link RoomSession}. Faithful port
 * of the original player.js wiring.
 */

const video = () => document.getElementById("video") as HTMLVideoElement;
const byClass = (cls: string) =>
  document.getElementsByClassName(cls)[0] as HTMLElement | undefined;

// --- settings (kept live) ---------------------------------------------------
const settingsRepo = new ChromeStorageSettingsRepository();
let currentSettings: Settings = DEFAULT_SETTINGS;
const settings: SettingsProvider = { current: () => currentSettings };
void settingsRepo.getAll().then((s) => (currentSettings = s));
settingsRepo.onChange((s) => (currentSettings = s));

// --- composition root -------------------------------------------------------
const guard = new ActionGuard();
const notifier = new AwnNotifier();
const reactions = new ReactionViewDom();
const player = new PlayerControllerDom(guard);
const client = new PartyWebSocketClient(WEBSOCKET_ENDPOINT);

// Mode comes from the URL (?party=create|join).
const partyParam = getParam("party");
const mode: "create" | "join" | "normal" =
  partyParam === "create" ? "create" : partyParam === "join" ? "join" : "normal";

// Mount the React sidebar (Shadow DOM) and bridge it to RoomSession.
const { store: sidebarStore, controller: sidebarController } = mountSidebar({
  onCreateRoom: () => {
    addControlButtons();
    bindPlayerEvents();
    session.createRoom(getParam("partId") ?? "");
    sidebarStore.setJoined(true);
    sidebarStore.setActiveTab("share");
    session.successHistory("ルームの作成に成功しました");
  },
  onLeave: () => {
    if (!session.inRoom) return;
    session.leave();
    sidebarStore.hide();
    byClass("awn-toast-container")?.setAttribute("style", "right:24px;");
  },
  onTabChange: (tab: SidebarTab) => {
    if (tab === "users") session.requestUserList();
  },
});

const session = new RoomSession({
  client,
  player,
  sidebar: sidebarController,
  reactions,
  notifier,
  settings,
  guard,
});

sidebarStore.setMode(mode);
if (mode === "join") sidebarStore.setJoined(true);

let playerEventsBound = false;

// --- page lifecycle ---------------------------------------------------------
window.addEventListener("load", () => {
  if (mode !== "normal") video().removeAttribute("autoplay");
  nextPageAnotherTab();
});

// Hide the sidebar in fullscreen and reposition the AWN toast container.
document.addEventListener("fullscreenchange", () => {
  const toast = byClass("awn-toast-container");
  if (document.fullscreenElement) {
    sidebarStore.hide();
    toast?.setAttribute("style", "right:24px;");
  } else {
    if (mode !== "normal") sidebarStore.show();
    toast?.setAttribute("style", "");
  }
});

// Update the page title and share title once the video has loaded.
video().addEventListener("loadeddata", () => {
  const title = document.querySelector("title");
  if (title) title.textContent = player.getTitle();
  sidebarStore.setShareTitle(shareTitle());
});

// --- join flow --------------------------------------------------------------
video().addEventListener(
  "loadeddata",
  () => {
    if (mode !== "join") return;
    if (getParam("party") === "true") {
      const title = document.querySelector("title");
      if (title) title.textContent += " 🎉";
    }
    addControlButtons();
    bindPlayerEvents();
    session.joinRoom(getParam("room_id") ?? "");
  },
  { once: true },
);

function shareTitle(): string {
  const text = (cls: string) =>
    document.getElementsByClassName(cls)[0]?.textContent ?? "";
  return `${text("backInfoTxt1")} - ${text("backInfoTxt2")} - ${text("backInfoTxt3")}`;
}

// --- general player event wiring (port of general_websocket) ----------------
function bindPlayerEvents(): void {
  if (playerEventsBound) return;
  playerEventsBound = true;
  const v = video();

  const active = () => guard.available && session.inRoom;
  const announce = (operation: string, text: string) => {
    session.sendActionNotification(operation);
    if (!currentSettings.selfNotification) session.successHistory(text);
  };
  const fwd = "<i class='fas fa-forward notification-icon'></i>";
  const back = "<i class='fas fa-fast-backward notification-icon'></i>";
  const fastFwd = "<i class='fas fa-fast-forward notification-icon'></i>";

  v.addEventListener("playing", () => {
    v.setAttribute("autoplay", "");
    if (active()) session.sendVideoOperation("playing");
    guard.allow();
  });
  v.addEventListener("pause", () => {
    if (active() && v.duration !== v.currentTime) session.sendVideoOperation("pause");
    guard.allow();
  });
  v.addEventListener("loadeddata", () => {
    if (active()) session.sendVideoOperation("loaded");
    guard.allow();
  });
  v.addEventListener("seeking", () => {
    if (active()) session.sendVideoOperation("seek");
    guard.allow();
  });
  v.addEventListener("ratechange", () => {
    if (active() && v.playbackRate !== 0) session.sendVideoOperation("ratechange");
    guard.allow();
  });

  bindClick("nextThumbinner", () => {
    if (active()) {
      session.sendVideoOperation("next_thumbnail");
      announce("next", `『${fwd}』をルームに送信`);
    }
  });
  bindClass("nextButton", () => {
    if (active()) {
      session.sendVideoOperation("next");
      announce("next", `『${fwd}』をルームに送信`);
    }
  });
  bindClass("prevButton", () => {
    if (active() && !$("#prevPopupInReTop").hasClass("show")) {
      session.sendVideoOperation("prev");
    }
  });
  bindClick("prevThumbinner", () => {
    if (active()) session.sendVideoOperation("prev_thumbnail");
  });
  bindClass("sync_button", () => {
    if (active()) session.requestSync();
  });

  bindClass("backArea", () => {
    if (session.inRoom && guard.available) {
      if (!v.paused) {
        announce("play", "『<i class='fas fa-play notification-icon'></i>』をルームに送信");
      } else {
        announce("stop", "『<i class='fas fa-stop notification-icon'></i>』をルームに送信");
      }
    }
  });

  for (const cls of ["seekArea", "skipButton", "skip10Button", "skip30Button"]) {
    bindClass(cls, () => {
      if (session.inRoom) announce("skip", `『${fastFwd}』をルームに送信`);
    });
  }
  bindClass("backButton", () => {
    if (session.inRoom) announce("skip", `『${back}』をルームに送信`);
  });
  bindClass("back10Button", () => {
    if (session.inRoom)
      announce("skip", "『<i class='fas fa-step-backward notification-icon'></i>』をルームに送信");
  });
  bindClass("back30Button", () => {
    if (session.inRoom) announce("skip", `『${back}』をルームに送信`);
  });

  document.querySelectorAll<HTMLElement>("#speed span").forEach((speed) => {
    speed.onclick = () => {
      if (session.inRoom) {
        const value = speed.getAttribute("data-value");
        session.sendActionNotification("ratechange" + value);
        if (!currentSettings.selfNotification) {
          session.successHistory(`『× ${value}』をルームに送信`);
        }
      }
    };
  });

  bindReaction("fav_button", "fav");
  bindReaction("middle_finger_button", "middle_finger");
  bindReaction("thumbs_button", "thumbs_up");
  bindReaction("smile_button", "smile");
  bindReaction("cry_button", "cry");

  window.addEventListener("keydown", (event) => {
    const playKeys = ["Space", "Enter", "NumpadEnter", "KeyK"];
    const skipKeys = [
      "KeyJ", "KeyL", "ArrowRight", "ArrowLeft",
      "Digit1", "Digit2", "Digit3", "Digit4", "Digit5",
      "Digit6", "Digit7", "Digit8", "Digit9", "Digit0",
      "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5",
      "Numpad6", "Numpad7", "Numpad8", "Numpad9", "Numpad0",
    ];
    if (playKeys.includes(event.code)) {
      if (active()) {
        if (!v.paused) {
          announce("play", "『<i class='fas fa-play notification-icon'></i>』をルームに送信");
        } else {
          announce("stop", "『<i class='fas fa-stop notification-icon'></i>』をルームに送信");
        }
      }
    } else if (skipKeys.includes(event.code)) {
      if (session.inRoom) announce("skip", `『${fastFwd}』をルームに送信`);
    }
  });
}

// --- helpers ----------------------------------------------------------------
function bindClick(id: string, handler: () => void): void {
  const el = document.getElementById(id);
  if (el) el.onclick = handler;
}

function bindClass(cls: string, handler: () => void): void {
  const el = byClass(cls);
  if (el) el.onclick = handler;
}

function bindReaction(
  buttonClass: string,
  type: "fav" | "middle_finger" | "thumbs_up" | "smile" | "cry",
): void {
  bindClass(buttonClass, () => {
    if (session.inRoom) {
      reactions.play(type);
      session.sendReaction(type);
    }
  });
}

function addControlButtons(): void {
  $(".space").before(
    "<div class='sync_button controll_button'><i class='fas fa-sync-alt buttonArea_icon'></i></div>",
  );
  $(".space").before(
    "<div class='thumbs_button controll_button'><i class='fas fa-thumbs-up buttonArea_icon reaction_icon'></i></div>",
  );
  $(".space").before(
    "<div class='fav_button controll_button'><i class='fas fa-heart buttonArea_icon reaction_icon'></i></div>",
  );
  $(".space").before(
    "<div class='smile_button controll_button'><i class='fas fa-smile-beam buttonArea_icon reaction_icon'></i></div>",
  );
  $(".space").before(
    "<div class='cry_button controll_button'><i class='fas fa-sad-cry buttonArea_icon reaction_icon'></i></div>",
  );
  $(".space").before(
    "<div class='middle_finger_button controll_button'><i class='fas fa-hand-middle-finger buttonArea_icon reaction_icon'></i></div>",
  );
  if (currentSettings.hideReactionIcon) {
    $(".reaction_icon").hide();
  } else {
    $(".reaction_icon").show();
  }
}

function nextPageAnotherTab(): void {
  const options: MutationObserverInit = {
    childList: true,
    characterData: false,
    characterDataOldValue: false,
    attributes: false,
    subtree: true,
  };
  const callback = () => {
    // (The original also injected an inline <script> here to strip the page's
    // own .recommend click handlers; that is blocked by the page CSP and has
    // been removed. We rebind onclick directly on the page elements instead.)
    document.querySelectorAll<HTMLElement>(".recommend").forEach((item) => {
      item.onclick = () => {
        const next = item.querySelector("input")?.getAttribute("value");
        if (next) window.location.href = next;
      };
    });
  };
  const target = document.querySelector("#swiper-wrapper");
  if (currentSettings.autoAnotherTab && target) {
    new MutationObserver(callback).observe(target, options);
  }
}
