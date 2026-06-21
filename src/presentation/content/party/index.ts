import $ from "jquery";

import { ActionGuard } from "@/application/ActionGuard";
import type { SettingsProvider } from "@/application/ports";
import { RoomSession } from "@/application/RoomSession";
import { DEFAULT_SETTINGS, type Settings } from "@/domain/settings";
import { ReactNotifier } from "@/infrastructure/notifier/ReactNotifier";
import { ChromeStorageSettingsRepository } from "@/infrastructure/storage/ChromeStorageSettingsRepository";
import { WEBSOCKET_ENDPOINT } from "@/infrastructure/env";
import { PartyWebSocketClient } from "@/infrastructure/ws/PartyWebSocketClient";

import { getParam } from "../dom/utils";
import { PlayerControllerDom } from "./PlayerControllerDom";
import { mountSidebar } from "./react/mountSidebar";
import { mountPlayerControls } from "./react/PlayerControls";
import type { SidebarTab } from "./react/sidebarStore";
import { ReactionViewReact } from "./ReactionViewReact";

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
const reactions = new ReactionViewReact();
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
  },
  onLeave: () => {
    if (!session.inRoom) return;
    session.leave();
    sidebarStore.hide();
  },
  onTabChange: (tab: SidebarTab) => {
    if (tab === "users") session.requestUserList();
  },
});

// Toast viewport offsets itself against the sidebar so notifications land on
// the player area to the left of the sidebar (not on top of it).
const notifier = new ReactNotifier(sidebarStore);

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

// Hide the sidebar in fullscreen. The React toast viewport mounts to its own
// Shadow DOM host and doesn't need repositioning.
document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) {
    sidebarStore.hide();
  } else {
    if (mode !== "normal") sidebarStore.show();
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
  // ルームへ操作を通知し、自己通知が有効でなければ履歴／トーストへ送信エントリを残す。
  // ラベル・アイコンは operation キーから一元的に解決する（domain/history）。
  const announce = (operation: string) => {
    session.sendActionNotification(operation);
    if (!currentSettings.selfNotification) session.notifySentOperation(operation);
  };

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
      announce("next");
    }
  });
  bindClass("nextButton", () => {
    if (active()) {
      session.sendVideoOperation("next");
      announce("next");
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
  // sync_button / *_button (reactions) は React コンポーネント側で onClick を結線済み。

  bindClass("backArea", () => {
    if (session.inRoom && guard.available) {
      announce(!v.paused ? "play" : "stop");
    }
  });

  for (const cls of ["seekArea", "skipButton", "skip10Button", "skip30Button"]) {
    bindClass(cls, () => {
      if (session.inRoom) announce("skip");
    });
  }
  bindClass("backButton", () => {
    if (session.inRoom) announce("skip");
  });
  bindClass("back10Button", () => {
    if (session.inRoom) announce("skip");
  });
  bindClass("back30Button", () => {
    if (session.inRoom) announce("skip");
  });

  document.querySelectorAll<HTMLElement>("#speed span").forEach((speed) => {
    speed.onclick = () => {
      if (session.inRoom) {
        const value = speed.getAttribute("data-value");
        announce("ratechange" + value);
      }
    };
  });

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
      if (active()) announce(!v.paused ? "play" : "stop");
    } else if (skipKeys.includes(event.code)) {
      if (session.inRoom) announce("skip");
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

function addControlButtons(): void {
  const space = document.getElementsByClassName("space")[0];
  if (!space) return;
  mountPlayerControls({
    anchor: space,
    initialSettings: currentSettings,
    subscribe: (cb) => settingsRepo.onChange(cb),
    handlers: {
      onSync: () => {
        if (guard.available && session.inRoom) session.requestSync();
      },
      onReaction: (type) => {
        if (!session.inRoom) return;
        reactions.play(type);
        session.sendReaction(type);
      },
    },
  });
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
