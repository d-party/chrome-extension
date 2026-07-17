import type { ActionGuard } from "@/application/ActionGuard";
import type { PlayerController } from "@/application/ports";
import type { PlayerOption, SyncOption } from "@/domain/protocol";

import { getParam } from "../../dom/utils";

/**
 * DMM TV のオンデマンドプレイヤーを駆動する {@link PlayerController} 実装。
 *
 * dアニメストア（{@link ../../party/PlayerControllerDom}）がネイティブのコントロール
 * class をクリックして操作するのに対し、DMM は主プレイヤーが標準の
 * ``HTMLVideoElement``（`video[aria-label="OnDemandPlayerV2"]`、MSE の blob 再生）
 * なので、**video 要素を直接操作**するのが最も確実。再生/停止・シーク・速度はいずれも
 * 標準 API（play/pause・currentTime・playbackRate）で駆動する。
 *
 * サービス固有なのはこの「プレイヤー駆動」部分だけで、同期のオーケストレーション
 * （{@link RoomSession}）・WS・プロトコルは dアニメと完全共通。
 */

// 主プレイヤーの安定セレクタ。詳細ページの装飾用 `<video class="hidden">` 等を拾わない
// よう aria-label を第一候補にし、フォールバックで #vodWrapper 配下 → 任意の video。
const VIDEO_SELECTORS = [
  'video[aria-label="OnDemandPlayerV2"]',
  "#vodWrapper video",
  "video",
];

export function findDmmVideo(): HTMLVideoElement | null {
  for (const selector of VIDEO_SELECTORS) {
    const el = document.querySelector<HTMLVideoElement>(selector);
    if (el) return el;
  }
  return null;
}

/**
 * DMM のエピソード識別子。再生ページ URL は `?season=..&content=..` の**両方**で
 * 再生対象が決まるため、part_id には `season/content` をまとめて載せる（join 時に
 * バックエンドがこれを分解して再生ページの URL を復元する）。season が無ければ content のみ。
 */
export function dmmPartId(): string {
  const season = getParam("season");
  const content = getParam("content") ?? "";
  return season ? `${season}/${content}` : content;
}

export class PlayerControllerDmm implements PlayerController {
  constructor(private readonly guard: ActionGuard) {}

  private video(): HTMLVideoElement | null {
    return findDmmVideo();
  }

  getOption(): PlayerOption {
    const v = this.video();
    return {
      time: v?.currentTime ?? 0,
      src: v?.currentSrc ?? v?.getAttribute("src") ?? null,
      paused: v?.paused ?? true,
      rate: v?.playbackRate ?? 1,
      // DMM は `season/content` でエピソードを識別する（join 復元のため両方を載せる）。
      part_id: dmmPartId(),
    };
  }

  getTitle(): string {
    // トップコントローラのタイトル（`.grid-area-title h1`）を優先し、無ければ document.title。
    const h1 =
      document.querySelector(".grid-area-title h1") ??
      document.querySelector("#main-layout h1");
    const title = h1?.textContent?.trim() || document.title;
    return `${title} | DMM TV`;
  }

  onAction(operation: string, option: SyncOption): void {
    switch (operation) {
      case "playing":
        this.play();
        break;
      case "pause":
        this.pause();
        break;
      case "seek":
        this.seek(option);
        break;
      case "ratechange":
        this.changeRate(option);
        break;
      case "sync":
        this.onSync(option);
        break;
      // next/prev（エピソード遷移）は DMM ではページ遷移を伴うため PR では扱わない。
      // 同一エピソード内の再生/停止/シーク/速度の同期を担う。
    }
  }

  onSync(option: SyncOption): void {
    const v = this.video();
    if (!v) return;
    // drift が小さいときに毎回 seek すると音飛び・ジッタの原因になるので、0.5s 以上
    // ズレているときだけ seek する。レートと再生/停止状態は常に合わせる。
    if (Math.abs(v.currentTime - option.time) > 0.5) {
      this.seek(option);
    }
    this.guard.suppress();
    this.changeRate(option);
    this.guard.suppress();
    if (option.paused === "False") {
      this.play();
    } else {
      this.pause();
    }
  }

  private play(): void {
    const v = this.video();
    if (!v || !v.paused) return;
    this.guard.suppress();
    // MSE/自動再生ポリシーで reject されることがあるため握りつぶす（ユーザーは
    // create/join 時点で操作済みなので通常は許可される）。
    void v.play().catch(() => {});
  }

  private pause(): void {
    const v = this.video();
    if (!v || v.paused) return;
    this.guard.suppress();
    v.pause();
  }

  private seek(option: SyncOption): void {
    const v = this.video();
    if (!v) return;
    this.guard.suppress();
    v.currentTime = option.time;
  }

  private changeRate(option: SyncOption): void {
    const v = this.video();
    if (!v) return;
    const rate = Number(option.rate);
    if (!Number.isNaN(rate) && v.playbackRate !== rate) {
      v.playbackRate = rate;
    }
  }
}
