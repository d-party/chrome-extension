import { ActionGuard } from "@/application/ActionGuard";
import type { SettingsProvider, StatsRecorder } from "@/application/ports";
import { RoomSession } from "@/application/RoomSession";
import { DEFAULT_SETTINGS, type Settings } from "@/domain/settings";
import type { ReactionType } from "@/domain/reactions";
import { ReactNotifier } from "@/infrastructure/notifier/ReactNotifier";
import { ChromePersonalStatsRepository } from "@/infrastructure/storage/ChromePersonalStatsRepository";
import { ChromeStorageSettingsRepository } from "@/infrastructure/storage/ChromeStorageSettingsRepository";
import { WEBSOCKET_ENDPOINT } from "@/infrastructure/env";
import { PartyWebSocketClient } from "@/infrastructure/ws/PartyWebSocketClient";

import { getParam } from "../dom/utils";
import { PlayerControllerDom } from "./PlayerControllerDom";
import { mountSidebar } from "./react/mountSidebar";
import { mountPipButton } from "./react/PipButton";
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

// --- personal stats (client-only, independent of the backend) ---------------
const statsRepo = new ChromePersonalStatsRepository();
const stats: StatsRecorder = {
  roomCreated: () => void statsRepo.incrementRoomsCreated(),
  roomJoined: () => void statsRepo.incrementRoomsJoined(),
  reactionSent: (type: ReactionType) => void statsRepo.incrementReaction(type),
  connectionEnded: (durationMs: number) =>
    void statsRepo.addConnectionMs(durationMs),
};

// --- composition root -------------------------------------------------------
const guard = new ActionGuard();
const reactions = new ReactionViewReact();
const player = new PlayerControllerDom(guard);
const client = new PartyWebSocketClient(WEBSOCKET_ENDPOINT);

// Mode comes from the URL (?party=create|join).
const partyParam = getParam("party");
const mode: "create" | "join" | "normal" =
  partyParam === "create"
    ? "create"
    : partyParam === "join"
      ? "join"
      : "normal";

// Mount the React sidebar (Shadow DOM) and bridge it to RoomSession.
const { store: sidebarStore, controller: sidebarController } = mountSidebar({
  onCreateRoom: () => {
    addControlButtons();
    bindPlayerEvents();
    // 視聴中アニメのタイトルをページ DOM から取得してルーム作成時に一度だけ送る
    // （OGP 表示用）。取得できない場合は空文字で、バックエンドは未指定でも受理する。
    // 「詳細設定」で組み立てた初期設定も渡す（create 確定後に update_setting で適用）。
    session.createRoom(
      getParam("partId") ?? "",
      shareTitle(),
      sidebarStore.getSnapshot().draftRoomSettings,
    );
  },
  onLeave: () => {
    if (!session.inRoom) return;
    session.leave();
    sidebarStore.hide();
  },
  onDeleteRoom: () => {
    // ホスト（オーナー）のみ表示されるボタンからの要求。サーバ側でも
    // 非ホストは無視されるが、念のため inRoom を確認してから送る。
    if (!session.inRoom) return;
    session.deleteRoom();
  },
  onUpdateRoomSettings: (roomSettings) => {
    // 操作タブからの詳細設定変更。オーナー以外はサーバ側で無視される。
    if (!session.inRoom) return;
    session.updateSetting(roomSettings);
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
  stats,
});

sidebarStore.setMode(mode);
if (mode === "join") sidebarStore.setJoined(true);

let playerEventsBound = false;

// --- page lifecycle ---------------------------------------------------------
window.addEventListener("load", () => {
  // create では入室前から「停止＋中央 ▶」状態を見せる。autoplay 属性を外すだけだと
  // ネイティブプレイヤーが初期(initing)状態のままで pause オーバーレイ(#pauseInfo)を
  // 描画しないため、primePausedOverlay で再生→ネイティブ一時停止を一度通す。
  // join は loadeddata 後に同期と合わせてプライミングする（下の loadeddata ハンドラ）。
  if (mode === "create") primePausedOverlay();
  nextPageAnotherTab();
});

// The PiP button is room-independent: mount it on every player page as soon as
// dアニメストア builds its control bar (the native player JS injects it after
// the video initializes, so we wait for the fullscreen button to appear).
mountPipControl();

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
    // 停止状態で ▶ を見せてから join する。プライミング中はまだ inRoom=false
    // なので、再生→一時停止で発火する playing/pause が active() を満たさず、
    // 自分の操作としてルームへブロードキャストされない（host を巻き込まない）。
    // join 後はホストの状態に応じて sync_response → onSync が再生/停止を上書きする。
    primePausedOverlay(() => session.joinRoom(getParam("room_id") ?? ""));
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
    if (!currentSettings.selfNotification)
      session.notifySentOperation(operation);
  };

  v.addEventListener("playing", () => {
    v.setAttribute("autoplay", "");
    if (active()) session.sendVideoOperation("playing");
    guard.allow();
  });
  v.addEventListener("pause", () => {
    if (active() && v.duration !== v.currentTime)
      session.sendVideoOperation("pause");
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
    if (active() && v.playbackRate !== 0)
      session.sendVideoOperation("ratechange");
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
    const prevPopup = document.getElementById("prevPopupInReTop");
    if (active() && !prevPopup?.classList.contains("show")) {
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

  for (const cls of [
    "seekArea",
    "skipButton",
    "skip10Button",
    "skip30Button",
  ]) {
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
      "KeyJ",
      "KeyL",
      "ArrowRight",
      "ArrowLeft",
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "Digit5",
      "Digit6",
      "Digit7",
      "Digit8",
      "Digit9",
      "Digit0",
      "Numpad1",
      "Numpad2",
      "Numpad3",
      "Numpad4",
      "Numpad5",
      "Numpad6",
      "Numpad7",
      "Numpad8",
      "Numpad9",
      "Numpad0",
    ];
    if (playKeys.includes(event.code)) {
      if (active()) announce(!v.paused ? "play" : "stop");
    } else if (skipKeys.includes(event.code)) {
      if (session.inRoom) announce("skip");
    }
  });
}

// --- helpers ----------------------------------------------------------------

/**
 * 同期前の動画を「停止＋中央 ▶ オーバーレイ」状態で見せる。
 *
 * ネイティブプレイヤーの ▶ オーバーレイ(#pauseInfo)は「再生中 → 一時停止」の
 * 状態遷移でしか描画されない。autoplay を抑止して最初から止めると initing 状態の
 * ままで ▶ が出ないため、いったんミュートで再生してから .backArea のネイティブ
 * 一時停止を通し、プレイヤー自身を正規の paused 状態へ遷移させる。
 *
 * 重要（ルーム入室時の安全性）: `.backArea` クリックで発火する pause イベントは
 * 非同期に届く。`done`（= join 等で inRoom を true にする処理）をクリック直後に
 * 同期実行すると、この「プライミングの一時停止」が自分の操作としてルームへ
 * ブロードキャストされ、ホストを巻き込んで停止させてしまう。これを避けるため、
 * pause イベントを実際に観測してから（＝ inRoom が false のうちにプライミングの
 * メディアイベントを消化してから）`done` を呼ぶ。
 *
 * 音漏れを避けるためプライミング中だけミュートし、終了時に元の状態へ戻す。
 * 再生できない（自動再生ブロック等）場合は初期状態のまま `done` を呼ぶ。
 * @param done 一時停止が確定した後（または再生不能時）に一度だけ呼ばれる。
 */
function primePausedOverlay(done?: () => void): void {
  const v = video();
  const wasMuted = v.muted;
  v.muted = true;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    v.muted = wasMuted;
    done?.();
  };
  const pauseNow = () => {
    if (v.paused) {
      finish();
      return;
    }
    // pause イベントを観測してから finish（= done）する。これで done 実行時には
    // プライミング由来の pause が既に消化済みになり、ルームへ漏れない。
    const onPaused = () => {
      v.removeEventListener("pause", onPaused);
      finish();
    };
    v.addEventListener("pause", onPaused);
    byClass("backArea")?.click(); // ネイティブ一時停止 → ▶ を描画
    // フォールバック: 何らかの理由で pause イベントが来なくても join は必ず行う。
    window.setTimeout(finish, 800);
  };
  if (!v.paused) {
    // autoplay が先行して既に再生中なら、待たずにそのまま一時停止へ進む。
    pauseNow();
    return;
  }
  const onPlaying = () => {
    v.removeEventListener("playing", onPlaying);
    pauseNow();
  };
  v.addEventListener("playing", onPlaying);
  void v.play().catch(() => finish());
}

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
    // Deliver the stored value immediately (the settings load is async and may
    // not have resolved by mount time), then keep it live on changes. Without
    // the eager getAll the added extra reactions wouldn't appear until the next
    // settings change.
    subscribe: (cb) => {
      void settingsRepo.getAll().then(cb);
      return settingsRepo.onChange(cb);
    },
    handlers: {
      onSync: () => {
        if (guard.available && session.inRoom) session.requestSync();
      },
      onReaction: (type) => {
        if (!session.inRoom) return;
        reactions.play(type, {
          userName: currentSettings.userName,
          mode: currentSettings.reactionDisplay,
        });
        session.sendReaction(type);
      },
    },
  });
}

/**
 * Toggle native Picture-in-Picture for the player video. Local-only: PiP is a
 * per-viewer preference and is not propagated over the room WebSocket.
 */
async function togglePictureInPicture(): Promise<void> {
  const v = video();
  if (!document.pictureInPictureEnabled || v.disablePictureInPicture) {
    notifier.alert(
      "このブラウザ／動画ではピクチャーインピクチャーを利用できません",
    );
    return;
  }
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await v.requestPictureInPicture();
    }
  } catch {
    notifier.alert("ピクチャーインピクチャーの切り替えに失敗しました");
  }
}

/**
 * Mount the PiP button into the dアニメストア control bar, immediately left of
 * the native fullscreen (最大化) button. The control bar is injected by the
 * page's player JS after the video initializes, so we wait for the fullscreen
 * button to appear before mounting.
 */
function mountPipControl(): void {
  const mount = (fullscreenButton: Element): void => {
    mountPipButton({
      fullscreenButton,
      initialSettings: currentSettings,
      // Deliver the stored value immediately (the settings load is async and
      // may not have resolved by mount time), then keep it live on changes.
      subscribe: (cb) => {
        void settingsRepo.getAll().then(cb);
        return settingsRepo.onChange(cb);
      },
      onToggle: () => void togglePictureInPicture(),
    });
  };

  // `.fullscreen` alone is also toggled on containers while in fullscreen mode,
  // so match the control-bar button precisely as `.fullscreen.mainButton`.
  const findButton = () => document.querySelector(".fullscreen.mainButton");

  const existing = findButton();
  if (existing) {
    mount(existing);
    return;
  }
  const observer = new MutationObserver(() => {
    const el = findButton();
    if (el) {
      observer.disconnect();
      mount(el);
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
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
