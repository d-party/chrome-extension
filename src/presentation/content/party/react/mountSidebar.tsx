import { createRoot } from "react-dom/client";

import { Sidebar } from "./Sidebar";
import { SidebarController, SidebarStore, type SidebarTab } from "./sidebarStore";

export interface SidebarHandlers {
  onCreateRoom: () => void;
  onLeave: () => void;
  onTabChange?: (tab: SidebarTab) => void;
}

export interface MountedSidebar {
  store: SidebarStore;
  controller: SidebarController;
}

/**
 * Mounts the React sidebar into a Shadow DOM host appended to the page. The
 * Shadow DOM + injected Tailwind CSS keeps the sidebar's styles fully isolated
 * from the dアニメストア page (and vice versa). Returns the store/controller so
 * the content script can drive it and bridge it to RoomSession.
 */
export function mountSidebar(handlers: SidebarHandlers): MountedSidebar {
  const store = new SidebarStore();
  const controller = new SidebarController(store);

  const host = document.createElement("div");
  host.id = "d-party-sidebar-host";
  host.style.cssText =
    "position:fixed;top:0;right:0;height:100vh;z-index:2147483000;";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Inject the compiled Tailwind CSS (emitted as a web-accessible resource).
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
    <Sidebar
      store={store}
      onCreateRoom={handlers.onCreateRoom}
      onLeave={handlers.onLeave}
      onTabChange={handlers.onTabChange}
    />,
  );

  return { store, controller };
}
