import { createRoot } from "react-dom/client";

import { HEALTH_CHECK_ENDPOINT } from "@/infrastructure/env";
import { PortalContainerContext } from "@/lib/portalContainer";

import { Sidebar } from "./Sidebar";
import { SidebarController, SidebarStore, type SidebarTab } from "./sidebarStore";

export interface SidebarHandlers {
  onCreateRoom: () => void;
  onLeave: () => void;
  onDeleteRoom: () => void;
  onTabChange?: (tab: SidebarTab) => void;
}

export interface MountedSidebar {
  store: SidebarStore;
  controller: SidebarController;
}

const EXPANDED_WIDTH = 320;
const COLLAPSED_WIDTH = 44;

/** Public read-only sidebar widths so other UI surfaces (e.g. the toast
 * viewport) can offset themselves against the sidebar. */
export const SIDEBAR_WIDTHS = {
  expanded: EXPANDED_WIDTH,
  collapsed: COLLAPSED_WIDTH,
} as const;

/** Compute the current sidebar width (px) from a snapshot. */
export function sidebarWidth(state: {
  visible: boolean;
  collapsed: boolean;
  mode: "create" | "join" | "normal";
}): number {
  if (!state.visible || state.mode === "normal") return 0;
  return state.collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
}

/**
 * Mounts the React sidebar into a Shadow DOM host. To match the original
 * implementation the host is laid out *beside* the video (it pushes the player
 * aside) rather than overlaying it: the video wrapper is moved into a flex row
 * and the host becomes its sibling. The host width is driven by the store so
 * collapsing/expanding reflows the player. Falls back to a fixed overlay if the
 * video wrapper can't be found.
 *
 * The Shadow DOM + injected Tailwind CSS keeps the sidebar styles isolated from
 * the page (and vice versa).
 */
export function mountSidebar(handlers: SidebarHandlers): MountedSidebar {
  const store = new SidebarStore();
  const controller = new SidebarController(store);

  const host = document.createElement("div");
  host.id = "d-party-sidebar-host";

  const videoWrapper = document.querySelector<HTMLElement>(".videoWrapper");
  if (videoWrapper?.parentElement) {
    const playerWrapper = document.createElement("div");
    playerWrapper.id = "d-party-player-wrapper";
    playerWrapper.style.cssText =
      "display:flex;width:100%;height:100%;align-items:stretch;";
    videoWrapper.parentElement.insertBefore(playerWrapper, videoWrapper);
    playerWrapper.appendChild(videoWrapper);
    videoWrapper.style.flex = "1 1 auto";
    videoWrapper.style.minWidth = "0";
    host.style.cssText =
      "flex:0 0 auto;height:100%;overflow:hidden;transition:width 0.22s ease;";
    playerWrapper.appendChild(host);
  } else {
    host.style.cssText =
      "position:fixed;top:0;right:0;height:100vh;overflow:hidden;z-index:2147483000;transition:width 0.22s ease;";
    document.body.appendChild(host);
  }

  // Drive the host width from the store: 0 when hidden ("normal"/fullscreen),
  // narrow when collapsed, full when expanded. The CSS width transition is what
  // animates the player being pushed aside / pulled back.
  const applyWidth = () => {
    const state = store.getSnapshot();
    host.style.width = `${sidebarWidth(state)}px`;
  };
  applyWidth();
  store.subscribe(applyWidth);

  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  shadow.appendChild(style);
  void fetch(chrome.runtime.getURL("js/sidebar-style.css"))
    .then((response) => response.text())
    .then((css) => {
      style.textContent = css;
    });

  const mountPoint = document.createElement("div");
  mountPoint.style.height = "100%";
  shadow.appendChild(mountPoint);

  createRoot(mountPoint).render(
    <PortalContainerContext.Provider value={mountPoint}>
      <Sidebar
        store={store}
        onCreateRoom={handlers.onCreateRoom}
        onLeave={handlers.onLeave}
        onDeleteRoom={handlers.onDeleteRoom}
        onTabChange={handlers.onTabChange}
      />
    </PortalContainerContext.Provider>,
  );

  scheduleHealthCheck(store);

  return { store, controller };
}

/**
 * サイドバーが初めて表示されたとき一度だけヘルスチェックを実行する。
 * 失敗（ネットワークエラーまたは非 2xx）した場合はステータスを `"maintenance"` に
 * 変更してメンテナンス中の黄色バッジを表示する。接続が成功すれば WS 側が
 * `setConnectionStatus("connected")` を呼ぶため自動的に上書きされる。
 */
function scheduleHealthCheck(store: SidebarStore): void {
  let done = false;
  const unsubscribe = store.subscribe(() => {
    if (done) return;
    const { visible } = store.getSnapshot();
    if (!visible) return;
    done = true;
    unsubscribe();
    fetch(HEALTH_CHECK_ENDPOINT, { method: "GET" })
      .then((res) => {
        if (!res.ok) store.setConnectionStatus("maintenance");
      })
      .catch(() => {
        store.setConnectionStatus("maintenance");
      });
  });
}
