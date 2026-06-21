import type { SidebarView } from "@/application/ports";
import type { ConnectionStatus } from "@/domain/connectionStatus";
import type { HistoryEntryInput } from "@/domain/history";
import type { User } from "@/domain/protocol";

export type SidebarTab = "share" | "history" | "users" | "control";

export interface HistoryEntry extends HistoryEntryInput {
  id: number;
  time: string;
}

export interface SidebarState {
  /** Whether the sidebar is shown at all (hidden in "normal" mode / fullscreen). */
  visible: boolean;
  /** Collapsed (minimised) to a thin handle. */
  collapsed: boolean;
  mode: "create" | "join" | "normal";
  /** True once a room has been created/joined (switches the create CTA to tabs). */
  joined: boolean;
  /** WebSocket connection status (drives the header badge). */
  connectionStatus: ConnectionStatus;
  activeTab: SidebarTab;
  shareUrl: string;
  shareTitle: string;
  users: User[];
  /** user_id of the local user, used to mark them as "you" in the list. */
  selfUserId: string;
  history: HistoryEntry[];
}

const INITIAL_STATE: SidebarState = {
  visible: false,
  collapsed: false,
  mode: "normal",
  joined: false,
  connectionStatus: "idle",
  activeTab: "share",
  shareUrl: "",
  shareTitle: "",
  users: [],
  selfUserId: "",
  history: [],
};

/**
 * Framework-agnostic external store for the sidebar. React subscribes via
 * `useSyncExternalStore`; the application layer mutates it through
 * {@link SidebarController}. Snapshots are immutable, so getSnapshot returns a
 * stable reference between changes.
 */
export class SidebarStore {
  private state: SidebarState = INITIAL_STATE;
  private seq = 0;
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): SidebarState => this.state;

  private patch(next: Partial<SidebarState>): void {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((listener) => listener());
  }

  setMode(mode: SidebarState["mode"]): void {
    this.patch({ mode, visible: mode !== "normal" });
  }
  setJoined(joined: boolean): void {
    this.patch({ joined });
  }
  setConnectionStatus(status: ConnectionStatus): void {
    this.patch({ connectionStatus: status });
  }
  setActiveTab(activeTab: SidebarTab): void {
    this.patch({ activeTab });
  }
  setShareLink(shareUrl: string): void {
    this.patch({ shareUrl });
  }
  setShareTitle(shareTitle: string): void {
    this.patch({ shareTitle });
  }
  updateUsers(users: User[]): void {
    this.patch({ users });
  }
  setSelfUserId(selfUserId: string): void {
    this.patch({ selfUserId });
  }
  show(): void {
    this.patch({ visible: true });
  }
  hide(): void {
    this.patch({ visible: false });
  }
  setCollapsed(collapsed: boolean): void {
    this.patch({ collapsed });
  }
  toggleCollapsed(): void {
    this.patch({ collapsed: !this.state.collapsed });
  }

  addHistory(entry: HistoryEntryInput): void {
    this.patch({
      history: [
        ...this.state.history,
        { ...entry, id: ++this.seq, time: formatTime() },
      ],
    });
  }
}

/**
 * Adapts the {@link SidebarView} application port onto a {@link SidebarStore},
 * so RoomSession stays unaware of React.
 */
export class SidebarController implements SidebarView {
  constructor(private readonly store: SidebarStore) {}

  setShareLink(roomUrl: string): void {
    this.store.setShareLink(roomUrl);
  }
  setJoined(joined: boolean): void {
    this.store.setJoined(joined);
  }
  setSelfUserId(userId: string): void {
    this.store.setSelfUserId(userId);
  }
  setConnectionStatus(status: ConnectionStatus): void {
    this.store.setConnectionStatus(status);
  }
  showSharePanel(): void {
    this.store.setActiveTab("share");
  }
  addHistory(entry: HistoryEntryInput): void {
    this.store.addHistory(entry);
  }
  updateUserList(users: User[]): void {
    this.store.updateUsers(users);
  }
  hideSidebar(): void {
    this.store.hide();
  }
}

function formatTime(): string {
  const now = new Date();
  const pad = (value: number) => ("0" + value).slice(-2);
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
