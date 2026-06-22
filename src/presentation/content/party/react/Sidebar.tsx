import { AnimatePresence, motion } from "framer-motion";
import {
  History,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  Share2,
  Users,
} from "lucide-react";
import { useSyncExternalStore } from "react";

import { Logo } from "@/components/Logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  type SidebarState,
  type SidebarStore,
  type SidebarTab,
} from "./sidebarStore";
import { ConnectionBadge, UserCountBadge } from "./sidebar/badges";
import { HistoryPanel } from "./sidebar/HistoryPanel";
import { ControlPanel, CreatePanel, UsersPanel } from "./sidebar/panels";
import { SharePanel } from "./sidebar/SharePanel";

export interface SidebarProps {
  store: SidebarStore;
  /** Host the room (create-mode CTA). */
  onCreateRoom: () => void;
  /** Leave the room. */
  onLeave: () => void;
  /** Called when the active tab changes (used to refresh the user list). */
  onTabChange?: (tab: SidebarTab) => void;
}

export function Sidebar({
  store,
  onCreateRoom,
  onLeave,
  onTabChange,
}: SidebarProps): React.JSX.Element | null {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  if (!state.visible || state.mode === "normal") return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative h-full overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {state.collapsed ? (
            <motion.div
              key="handle"
              initial={{ x: 32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 32, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex h-full items-start justify-end p-2 text-foreground"
            >
              <button
                type="button"
                onClick={() => store.setCollapsed(false)}
                aria-label="サイドバーを開く"
                className="flex items-center gap-1 rounded-l-lg bg-red-800 px-2 py-3 text-white shadow-lg hover:bg-red-900"
              >
                <PanelRightOpen className="size-4" aria-hidden />
                <span className="[writing-mode:vertical-rl] text-xs font-bold tracking-wide">
                  d-party
                </span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="panel"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="h-full"
            >
              <Panel
                state={state}
                store={store}
                onCreateRoom={onCreateRoom}
                onLeave={onLeave}
                onTabChange={onTabChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

function Panel({
  state,
  store,
  onCreateRoom,
  onLeave,
  onTabChange,
}: SidebarProps & { state: SidebarState }): React.JSX.Element {
  return (
    <div className="flex h-full w-80 flex-col bg-card text-card-foreground shadow-2xl ring-1 ring-border">
      <header className="flex items-center justify-between bg-neutral-950/50 px-3 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <Logo className="size-5" aria-hidden />
          <span className="text-sm font-bold tracking-tight text-[#cc0033]">d-party</span>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionBadge status={state.connectionStatus} />
          <UserCountBadge count={state.users.length} />
          <button
            type="button"
            onClick={() => store.setCollapsed(true)}
            aria-label="サイドバーを縮小"
            className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <PanelRightClose className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      {state.mode === "create" && !state.joined ? (
        <CreatePanel onCreateRoom={onCreateRoom} />
      ) : (
        <Tabs
          value={state.activeTab}
          onValueChange={(value) => {
            const tab = value as SidebarTab;
            store.setActiveTab(tab);
            onTabChange?.(tab);
          }}
          className="min-h-0 flex-1 gap-0 p-2"
        >
          <TabsList>
            <TabsTrigger value="share">
              <Share2 className="size-3.5" aria-hidden /> シェア
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="size-3.5" aria-hidden /> 履歴
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="size-3.5" aria-hidden /> 参加者
            </TabsTrigger>
            <TabsTrigger value="control">
              <LogOut className="size-3.5" aria-hidden /> 操作
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto pt-3">
            <TabsContent value="share" className="h-full">
              <SharePanel state={state} />
            </TabsContent>
            <TabsContent value="history" className="h-full">
              <HistoryPanel state={state} />
            </TabsContent>
            <TabsContent value="users">
              <UsersPanel state={state} />
            </TabsContent>
            <TabsContent value="control">
              <ControlPanel onLeave={onLeave} />
            </TabsContent>
          </div>
        </Tabs>
      )}
      <footer className="shrink-0 border-t border-border px-3 py-1.5 text-center text-[10px] text-muted-foreground">
        powered by <span className="font-semibold">U-Not</span>
      </footer>
    </div>
  );
}
