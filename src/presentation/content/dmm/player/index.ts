import { ActionGuard } from "@/application/ActionGuard";
import type { SettingsProvider, StatsRecorder } from "@/application/ports";
import { RoomSession } from "@/application/RoomSession";
import { DEFAULT_SETTINGS, type Settings } from "@/domain/settings";
import type { ReactionType } from "@/domain/reactions";
import { ReactNotifier } from "@/infrastructure/notifier/ReactNotifier";
import { ChromePersonalStatsRepository } from "@/infrastructure/storage/ChromePersonalStatsRepository";
import { ChromeStorageSettingsRepository } from "@/infrastructure/storage/ChromeStorageSettingsRepository";
import {
  DMM_REDIRECT_ENDPOINT,
  DMM_WEBSOCKET_ENDPOINT,
} from "@/infrastructure/env";
import { PartyWebSocketClient } from "@/infrastructure/ws/PartyWebSocketClient";

import { getParam } from "../../dom/utils";
import { mountSidebar, sidebarWidth } from "../../party/react/mountSidebar";
import { mountPlayerControls } from "../../party/react/PlayerControls";
import type { SidebarTab } from "../../party/react/sidebarStore";
import { ReactionViewReact } from "../../party/ReactionViewReact";
import {
  PlayerControllerDmm,
  dmmPartId,
  findDmmVideo,
} from "./PlayerControllerDmm";

/**
 * Content script for the DMM TV playback page
 * (`https://tv.dmm.com/vod/playback/on-demand/*`).
 *
 * dアニメストアの `content/party/index.ts` に対応する DMM 版の合成ルート。共通層
 * （{@link RoomSession}・{@link PartyWebSocketClient}・sidebar・reactions・stats・
 * settings）はそのまま再利用し、**サービス固有のプレイヤー駆動だけ**を
 * {@link PlayerControllerDmm} に差し替える。dアニメの `party/index.ts` には一切手を
 * 入れない（実サイトでしか検証できず回帰リスクがあるため、意図的に別ファイルで実装）。
 *
 * 制約（実機で要確認・PR フォロー）:
 *  - DMM は SPA。エピソード間をリロードなしで遷移した場合、この content script は
 *    再実行されない。パーティーは 1 エピソードのセッション（playback URL の初回ロード）
 *    を前提とする。
 *  - インライン操作ボタン（sync/リアクション）のマウント位置とサイドバーのレイアウトは
 *    DMM の実 DOM で最終調整する。セレクタは下の SELECTORS に集約してある。
 */

// DMM の実 DOM に依存する箇所はここへ集約（実機での微調整を一箇所で行えるように）。
const SELECTORS = {
  // 操作ボタン（sync + リアクション）を差し込むアンカー候補。先に見つかった要素の
  // 直前へ display:contents で挿入する。コントロールバーは video 初期化後に現れる。
  controlAnchors: [
    'button[name="再生・停止を切り替えるボタン"]',
    'button[aria-label="フルスクリーン"]',
    'button[aria-label="再生速度"]',
  ],
  // 共有タイトル（OGP・サイドバー表示用）に使う作品タイトル。
  title: ".grid-area-title h1",
};

// --- settings (kept live) ---------------------------------------------------
const settingsRepo = new ChromeStorageSettingsRepository();
let currentSettings: Settings = DEFAULT_SETTINGS;
const settings: SettingsProvider = { current: () => currentSettings };
void settingsRepo.getAll().then((s) => (currentSettings = s));
settingsRepo.onChange((s) => (currentSettings = s));

// --- personal stats (client-only) -------------------------------------------
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
const player = new PlayerControllerDmm(guard);
const client = new PartyWebSocketClient(DMM_WEBSOCKET_ENDPOINT);

// Mode comes from the URL (?party=create|join).
const partyParam = getParam("party");
const mode: "create" | "join" | "normal" =
  partyParam === "create"
    ? "create"
    : partyParam === "join"
      ? "join"
      : "normal";

const { store: sidebarStore, controller: sidebarController } = mountSidebar({
  onCreateRoom: () => {
    addControlButtons();
    bindPlayerEvents();
    session.createRoom(
      dmmPartId(),
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
    if (!session.inRoom) return;
    session.deleteRoom();
  },
  onUpdateRoomSettings: (roomSettings) => {
    if (!session.inRoom) return;
    session.updateSetting(roomSettings);
  },
  onTabChange: (tab: SidebarTab) => {
    if (tab === "users") session.requestUserList();
  },
});

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
  // 共有リンクは DMM 用ロビーへ（dアニメの既定ではなく DMM の redirect endpoint）。
  redirectEndpoint: DMM_REDIRECT_ENDPOINT,
});

sidebarStore.setMode(mode);
if (mode === "join") sidebarStore.setJoined(true);

// DMM は React SPA でプレイヤーがビューポート基準（w-full / h-dvh / fixed のコントローラ）
// なので DOM は再配置しない。サイドバーは「プレイヤー領域の右横」にだけ並べたいので:
//   1) プレイヤー要素だけ幅を詰めて動画を左へ寄せる（html 全体ではなくプレイヤーだけを
//      詰めるので、動画下の説明・エピソード一覧は全幅のまま影響しない）。padding ではなく
//      width を使うのは、ヘッダー等の overlay が position:absolute; w-full で #vodWrapper の
//      padding box を参照し padding では縮まないため（width なら abspos の overlay も縮む）。
//   2) サイドバー本体を position:absolute でプレイヤーの document 座標に合わせて置く
//      （fixed だとスクロールしても付いてきて下の要素にも被るため、absolute にして
//       プレイヤーの高さぶんだけ表示し、スクロールで一緒に流れて消えるようにする）。
// 固定コントローラ（上部/下部バー）の右寄せだけは CSS（dmm-player.css）が担当する。
const getPlayerContainer = (): HTMLElement | null =>
  document.getElementById("vodWrapper") ??
  findDmmVideo()?.parentElement ??
  null;

// DMM のルート <html> font-size が 16px でないと、サイドバー本体（Tailwind v4）の
// rem/spacing 基準がズレて w-80 などが細くなる（rem・spacing は Shadow DOM でも
// ドキュメントルートの font-size を参照する）。対策を Shadow DOM へ一度だけ注入する:
//   - `--spacing` を 4px（= 0.25rem@16px）に固定。Tailwind v4 の幅/余白/アイコン等は
//     `calc(var(--spacing) * n)` なので、これでルート font-size に依存しなくなり w-80 が
//     本来の 320px になる（16px のページでは 0.25rem=4px で従来どおり）。カスタム
//     プロパティは Shadow 境界を越えて継承されるため、host に載せれば中身へ効く。
//   - 保険として w-80 のルートを width:100% にしてホスト幅を満たす（万一 w-80 が
//     spacing 由来でなく固定 rem でも、ホスト幅に合わせる）。
let sidebarNormalized = false;
const normalizeSidebarScale = (host: HTMLElement): void => {
  if (sidebarNormalized || !host.shadowRoot) return;
  sidebarNormalized = true;
  // spacing 系（幅/余白/アイコン size-* 等）を 16px 相当の px へ固定。
  host.style.setProperty("--spacing", "4px");
  // フォントサイズ（text-*）は Tailwind v4 で `var(--text-*)`（= rem）を使うため、
  // spacing とは別に px（16px 相当）へ固定する。これをしないと DMM の小さいルート
  // font-size で文字だけ小さいままになる（幅は直っても中身が縮んで見える）。
  const textVars: Record<string, string> = {
    "--text-xs": "12px",
    "--text-sm": "14px",
    "--text-base": "16px",
    "--text-lg": "18px",
    "--text-xl": "20px",
    "--text-2xl": "24px",
  };
  for (const [name, value] of Object.entries(textVars)) {
    host.style.setProperty(name, value);
  }
  const style = document.createElement("style");
  style.textContent = `[class~="w-80"]{width:100%!important;}`;
  host.shadowRoot.appendChild(style);
};

const layoutDmmSidebar = (): void => {
  const host = document.getElementById("d-party-sidebar-host");
  const player = getPlayerContainer();
  const width = sidebarWidth(sidebarStore.getSnapshot());

  // CSS var + 開閉クラスは固定コントローラの右寄せ（dmm-player.css）に使う。
  document.documentElement.style.setProperty(
    "--d-party-sidebar-width",
    `${width}px`,
  );
  document.documentElement.classList.toggle(
    "d-party-dmm-sidebar-open",
    width > 0,
  );

  if (!host || !player) return;
  normalizeSidebarScale(host);

  // ホスト幅はサイドバーの本来幅（px 定数）。中身は上の normalize で必ずこの幅を満たす。
  host.style.width = `${width}px`;

  // 1) プレイヤーだけ幅を詰める（border-box）。abspos; w-full のヘッダー overlay も
  //    #vodWrapper の幅を参照するので width なら一緒に縮む（padding だと縮まない）。
  player.style.boxSizing = "border-box";
  if (width > 0) {
    player.style.width = `calc(100% - ${width}px)`;
    player.style.right = "auto"; // abspos で right:0 のときも左寄せを保つ
  } else {
    player.style.width = "";
    player.style.right = "";
  }

  // 2) サイドバーをプレイヤーの document 座標へ absolute で配置（スクロール追従しない）。
  //    left を「詰めたあとのプレイヤーの右端（rect.right）」に合わせる。余白幅もホスト幅も
  //    同じ値から導くので、隙間・はみ出しなく収まる。
  const rect = player.getBoundingClientRect();
  host.style.position = "absolute";
  host.style.top = `${rect.top + window.scrollY}px`;
  host.style.left = `${rect.right + window.scrollX}px`;
  host.style.right = "auto";
  host.style.bottom = "auto";
  host.style.height = `${rect.height || window.innerHeight}px`;

  // 固定コントローラ（下部バー等）の右端を「詰めたあとの動画の右端(rect.right)」へ
  // 合わせるための、ビューポート右からのオフセット。--d-party-sidebar-width だと
  // スクロールバー等の差で動画とわずかにズレるため、実測の右端を基準にする
  // （clientWidth も rect もスクロールバーを除く座標なので整合する）。
  document.documentElement.style.setProperty(
    "--d-party-player-right",
    `${Math.max(0, Math.round(document.documentElement.clientWidth - rect.right))}px`,
  );
};
layoutDmmSidebar();
sidebarStore.subscribe(layoutDmmSidebar);
window.addEventListener("resize", layoutDmmSidebar);

let playerEventsBound = false;

// DMM は SPA なので video 要素は後から描画される。要素が現れてから join を発火する。
whenVideoReady((video) => {
  sidebarStore.setShareTitle(shareTitle());
  // プレイヤーが現れ／サイズが確定したのでサイドバー配置を再計算し、以後の
  // プレイヤーサイズ変化（DMM は初期化後にリサイズすることがある）にも追従する。
  layoutDmmSidebar();
  const playerEl = getPlayerContainer();
  if (playerEl) new ResizeObserver(layoutDmmSidebar).observe(playerEl);
  if (mode === "join") {
    addControlButtons();
    bindPlayerEvents();
    session.joinRoom(getParam("room_id") ?? "");
  }
  // create は「ルーム作成」ボタン（onCreateRoom）で発火する。normal は何もしない。
  video.addEventListener("loadeddata", () => {
    sidebarStore.setShareTitle(shareTitle());
  });
});

// フルスクリーン中はサイドバーを隠す（dアニメと同じ挙動）。
document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) {
    sidebarStore.hide();
  } else if (mode !== "normal") {
    sidebarStore.show();
  }
});

/** 作品タイトル（サイドバー共有表示・OGP 用）。取得できなければ document.title。 */
function shareTitle(): string {
  return (
    document.querySelector(SELECTORS.title)?.textContent?.trim() ||
    document.title
  );
}

// --- player event wiring ----------------------------------------------------
// DMM の主プレイヤーは標準 HTMLVideoElement なので、ネイティブのメディアイベントを
// そのまま購読して同期する（dアニメのようにコントロール class をフックしない）。
function bindPlayerEvents(): void {
  if (playerEventsBound) return;
  const v = findDmmVideo();
  if (!v) return;
  playerEventsBound = true;

  const active = () => guard.available && session.inRoom;

  v.addEventListener("playing", () => {
    if (active()) session.sendVideoOperation("playing");
    guard.allow();
  });
  v.addEventListener("pause", () => {
    if (active() && v.duration !== v.currentTime)
      session.sendVideoOperation("pause");
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
}

/**
 * sync + リアクションのインライン操作ボタンを DMM のコントロールバーへ差し込む。
 * バーは video 初期化後に描画されるため、アンカーが見つかるまで MutationObserver で待つ。
 */
function addControlButtons(): void {
  const mount = (anchor: Element): void => {
    // DMM: 再生ボタンは grid（grid-flow-col）の 1 セル（.group）に入っている。
    // そのボタン自体の前（セル内の block）に差し込むと display:contents の子が縦積み
    // になるのでセルをアンカーにし（マウント後に grid 末尾へ移動する）、CSS で
    // ホストを flex 行にして他コントロールと同じ行に横並びで入れる（dmm-player.css）。
    const cell = anchor.closest("div.group") ?? anchor;
    mountPlayerControls({
      anchor: cell,
      initialSettings: currentSettings,
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
    // 既存の左寄せボタン（play/10←/10→/音量）が並ぶ grid の末尾へ移動し、
    // 音量ボタンのすぐ右に横並びで表示する（mountPlayerControls の既定挿入は
    // アンカーの直前＝一番左になるため）。
    const controls = document.getElementById("d-party-player-controls");
    const leftGrid = cell.parentElement;
    if (controls && leftGrid) leftGrid.appendChild(controls);
  };

  const find = (): Element | null => {
    for (const selector of SELECTORS.controlAnchors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }
    return null;
  };

  const existing = find();
  if (existing) {
    mount(existing);
    return;
  }
  const observer = new MutationObserver(() => {
    const el = find();
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

/**
 * DMM の主プレイヤー video 要素が現れたら一度だけ `cb` を呼ぶ。SPA なので初回描画を
 * MutationObserver で待つ（既に存在すれば即時）。
 */
function whenVideoReady(cb: (video: HTMLVideoElement) => void): void {
  const existing = findDmmVideo();
  if (existing) {
    cb(existing);
    return;
  }
  const observer = new MutationObserver(() => {
    const v = findDmmVideo();
    if (v) {
      observer.disconnect();
      cb(v);
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
