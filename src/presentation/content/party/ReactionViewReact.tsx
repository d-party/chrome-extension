import { createRoot } from "react-dom/client";

import type { ReactionPlayOptions, ReactionView } from "@/application/ports";

import {
  ReactionLayer,
  type ReactionLayerHandle,
  type ReactionPush,
} from "./react/reactions/ReactionLayer";

/**
 * React-based reaction overlay. Mounts a transparent layer over the
 * `.videoWrapper` and renders Lottie animations for each `play()` call.
 *
 * Replaces the legacy jQuery + Font Awesome `ReactionViewDom`.
 */
export class ReactionViewReact implements ReactionView {
  private handle: ReactionLayerHandle | null = null;
  private mounted = false;
  private pending: ReactionPush[] = [];

  /**
   * `resolveContainer` はリアクションを重ねるプレイヤー要素を返す。既定は dアニメの
   * `.videoWrapper`。DMM など別サイトでは異なる要素（例: `#vodWrapper`）を渡す。
   */
  constructor(
    private readonly resolveContainer: () => HTMLElement | null = () =>
      (document.getElementsByClassName("videoWrapper")[0] as
        | HTMLElement
        | undefined) ?? null,
  ) { }

  play(id: string, opts?: ReactionPlayOptions): void {
    const push: ReactionPush = {
      id,
      userName: opts?.userName,
      mode: opts?.mode ?? "normal",
    };
    this.ensureMounted();
    if (this.handle) {
      this.handle.push(push);
    } else {
      // Mount is asynchronous (React effect); queue until the layer registers.
      this.pending.push(push);
    }
  }

  private ensureMounted(): void {
    if (this.mounted) return;
    const wrapper = this.resolveContainer();
    if (!wrapper) return;
    // 重ねる要素は絶対配置オーバーレイの位置基準が必要（static なら relative にする）。
    if (getComputedStyle(wrapper).position === "static") {
      wrapper.style.position = "relative";
    }
    const host = document.createElement("div");
    host.style.position = "absolute";
    host.style.inset = "0";
    host.style.pointerEvents = "none";
    wrapper.appendChild(host);
    this.mounted = true;
    const root = createRoot(host);
    root.render(
      <ReactionLayer
        register={(h) => {
          this.handle = h;
          for (const p of this.pending) h.push(p);
          this.pending = [];
        }}
      />,
    );
  }
}
