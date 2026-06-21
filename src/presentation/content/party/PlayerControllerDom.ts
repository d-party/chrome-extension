import type { ActionGuard } from "@/application/ActionGuard";
import type { PlayerController } from "@/application/ports";
import type { PlayerOption, SyncOption } from "@/domain/protocol";

import { getParam } from "../dom/utils";

const video = () => document.getElementById("video") as HTMLVideoElement;
const click = (selector: string) =>
  (document.querySelector(selector) as HTMLElement | null)?.click();

/**
 * Drives the dアニメストア HTML5 player by clicking its native controls and
 * setting media properties — a faithful port of the player.js control helpers.
 */
export class PlayerControllerDom implements PlayerController {
  constructor(private readonly guard: ActionGuard) { }

  getOption(): PlayerOption {
    const v = video();
    return {
      time: v.currentTime,
      src: v.getAttribute("src"),
      paused: v.paused,
      rate: v.playbackRate,
      part_id: getParam("partId") ?? "",
    };
  }

  getTitle(): string {
    const text = (cls: string) =>
      document.getElementsByClassName(cls)[0]?.textContent ?? "";
    return `${text("backInfoTxt1")} - ${text("backInfoTxt2")} - ${text("backInfoTxt3")} | dアニメストア`;
  }

  onAction(operation: string, option: SyncOption): void {
    switch (operation) {
      case "playing":
        this.playing();
        break;
      case "pause":
        this.pause();
        break;
      case "prev":
        // The original fell through prev -> prev_thumbnail.
        this.prevButton();
        this.prevThumbnailButton();
        break;
      case "prev_thumbnail":
        this.prevThumbnailButton();
        break;
      case "next":
        this.nextButton();
        break;
      case "next_thumbnail":
        this.nextThumbnailButton();
        break;
      case "back_area":
        // The original fell through back_area -> seek.
        this.backArea();
        this.seek(option);
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
    }
  }

  onSync(option: SyncOption): void {
    // drift が小さいときに毎回 seek すると音飛び・ジッタの原因になるので、
    // 0.5s 以上ズレているときだけ seek する。レートと再生/停止状態は常に合わせる。
    const v = video();
    const target = option.time;
    if (Math.abs(v.currentTime - target) > 0.5) {
      this.seek(option);
    }
    this.guard.suppress();
    this.changeRate(option);
    this.guard.suppress();
    if (option.paused === "False") {
      this.playing();
    } else {
      this.pause();
    }
  }

  private playing(): void {
    if (video().paused) this.backArea();
  }

  private pause(): void {
    if (!video().paused) this.backArea();
  }

  private backArea(): void {
    click(".backArea");
  }

  private seek(option: SyncOption): void {
    this.guard.suppress();
    video().currentTime = option.time;
  }

  private changeRate(option: SyncOption): void {
    const rate = Number(option.rate);
    if (video().playbackRate !== rate) {
      video().playbackRate = rate;
    }
    // The original also assigned `video.paused = option.paused`, which is a
    // no-op on the read-only property — omitted (it would throw in module/strict mode).
  }

  // prev / prev_thumbnail are wire-distinct operations but drive the same
  // native control on the dアニメストア player: reveal the prev popup and click
  // its thumbnail button. Kept as one helper to avoid drift between the two.
  private showPrevThumbnail(): void {
    const popup = document.getElementById("prevPopupIn");
    popup?.classList.remove("hide");
    popup?.classList.add("show");
    document.getElementById("prevThumbButton")?.click();
  }

  private prevButton(): void {
    this.showPrevThumbnail();
  }

  private prevThumbnailButton(): void {
    this.showPrevThumbnail();
  }

  private nextButton(): void {
    click(".nextButton");
  }

  private nextThumbnailButton(): void {
    document.getElementById("nextThumbButton")?.click();
  }
}
