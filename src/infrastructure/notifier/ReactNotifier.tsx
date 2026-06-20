import { useEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";

import type { Notifier } from "@/application/ports";
import {
  Toast,
  ToastBody,
  ToastClose,
  ToastIcon,
  ToastViewport,
  type ToastVariant,
} from "@/components/ui/toast";

import {
  sidebarWidth,
} from "@/presentation/content/party/react/mountSidebar";
import type { SidebarStore } from "@/presentation/content/party/react/sidebarStore";

interface ToastItemData {
  id: number;
  variant: ToastVariant;
  /** Pre-rendered HTML. Existing call sites pass small fragments like
   * `<i class='fas...'></i>` mixed with text, so we render as innerHTML. */
  html: string;
}

const DEFAULT_DURATION_MS = 3000;
const EXIT_ANIMATION_MS = 180;

class ToastStore {
  private toasts: ToastItemData[] = [];
  private seq = 0;
  private listeners = new Set<() => void>();

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = (): ToastItemData[] => this.toasts;

  push(variant: ToastVariant, html: string): number {
    const id = ++this.seq;
    this.toasts = [...this.toasts, { id, variant, html }];
    this.emit();
    return id;
  }

  remove(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastItemData;
  onClose: () => void;
}): React.JSX.Element {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setLeaving(true), DEFAULT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(onClose, EXIT_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [leaving, onClose]);

  return (
    <Toast
      variant={toast.variant}
      className={leaving ? "translate-x-2 opacity-0" : "translate-x-0 opacity-100"}
    >
      <ToastIcon variant={toast.variant} />
      <ToastBody dangerouslySetInnerHTML={{ __html: toast.html }} />
      <ToastClose onClick={() => setLeaving(true)} />
    </Toast>
  );
}

function Toaster({
  store,
  sidebarStore,
}: {
  store: ToastStore;
  sidebarStore?: SidebarStore;
}): React.JSX.Element {
  const toasts = useSyncExternalStore(store.subscribe, store.getSnapshot);
  // Offset the viewport right edge to align with the sidebar's left edge so
  // toasts appear over the player area, not on top of the sidebar.
  const sbState = useSyncExternalStore(
    sidebarStore?.subscribe ?? (() => () => {}),
    sidebarStore?.getSnapshot ?? (() => null),
  );
  const offset = sbState ? sidebarWidth(sbState) : 0;
  return (
    <ToastViewport style={{ right: `calc(${offset}px + 1rem)` }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => store.remove(t.id)} />
      ))}
    </ToastViewport>
  );
}

/** Notifier backed by a shadcn-style React toast viewport mounted in its own
 * Shadow DOM. Replaces awesome-notifications. Keeps the same HTML-string API
 * so existing call sites (which embed Font Awesome `<i>` icons) keep working.
 *
 * Pass `sidebarStore` so the viewport offsets itself by the current sidebar
 * width and the toasts land on the player area to the left of the sidebar. */
export class ReactNotifier implements Notifier {
  private readonly store = new ToastStore();

  constructor(private readonly sidebarStore?: SidebarStore) {
    if (typeof document === "undefined") return;
    this.mount();
  }

  success(html: string): void {
    this.store.push("success", html);
  }

  info(html: string): void {
    this.store.push("info", html);
  }

  alert(html: string): void {
    this.store.push("alert", html);
  }

  private mount(): void {
    const host = document.createElement("div");
    host.id = "d-party-toast-host";
    host.style.cssText =
      "position:fixed;top:0;right:0;z-index:2147483646;pointer-events:none;";
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    shadow.appendChild(style);
    void fetch(chrome.runtime.getURL("js/sidebar-style.css"))
      .then((r) => r.text())
      .then((css) => {
        style.textContent = css;
      });

    const mountPoint = document.createElement("div");
    shadow.appendChild(mountPoint);
    createRoot(mountPoint).render(
      <Toaster store={this.store} sidebarStore={this.sidebarStore} />,
    );
  }
}
