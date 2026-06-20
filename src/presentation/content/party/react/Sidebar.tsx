import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  History,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  PartyPopper,
  Share2,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FaEnvelope, FaFacebookF, FaXTwitter } from "react-icons/fa6";
import { SiLine } from "react-icons/si";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FACEBOOK_APP_ID } from "@/infrastructure/env";

import {
  type SidebarState,
  type SidebarStore,
  type SidebarTab,
} from "./sidebarStore";
import type { ConnectionStatus } from "@/domain/connectionStatus";

const CONNECTION_STATUS_META: Record<
  ConnectionStatus,
  { label: string; dotClass: string }
> = {
  idle: { label: "接続前", dotClass: "bg-neutral-400" },
  connected: { label: "接続済み", dotClass: "bg-emerald-500" },
  failed: { label: "接続失敗", dotClass: "bg-red-500" },
};

function ConnectionBadge({ status }: { status: ConnectionStatus }): React.JSX.Element {
  const { label, dotClass } = CONNECTION_STATUS_META[status];
  return (
    <div
      role="status"
      aria-label={`サーバー接続状態: ${label}`}
      className="group flex cursor-default items-center rounded-full bg-white/10 px-2 py-1 text-xs text-white/90 transition-colors hover:bg-white/15"
    >
      <span className={`size-2.5 shrink-0 rounded-full ${dotClass}`} aria-hidden />
      <span className="ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,margin-left,opacity] duration-200 ease-out group-hover:ml-1.5 group-hover:max-w-[8rem] group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

function UserCountBadge({ count }: { count: number }): React.JSX.Element {
  const label = `参加者 ${count} 人`;
  return (
    <div
      role="status"
      aria-label={label}
      className="flex cursor-default items-center rounded-full bg-white/10 px-2 py-1 text-xs text-white/90"
    >
      <UserRound className="size-3 shrink-0" aria-hidden />
      <span className="ml-0.5 shrink-0 tabular-nums">{count}</span>
    </div>
  );
}

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
      <header className="flex items-center justify-between bg-neutral-950 px-3 py-2.5 text-white">
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
            <TabsContent value="history">
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

function CreatePanel({ onCreateRoom }: { onCreateRoom: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <PartyPopper className="size-8 text-red-600" aria-hidden />
      <div>
        <p className="text-sm font-semibold">パーティールームを作成</p>
        <p className="mt-1 text-xs text-muted-foreground">
          パーティーを主催して、みんなで同時に鑑賞しよう！
        </p>
      </div>
      <Button onClick={onCreateRoom} className="w-full">
        ルームを作成
      </Button>
    </div>
  );
}

function SharePanel({ state }: { state: SidebarState }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const url = state.shareUrl;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const text = `dアニメストアで『${state.shareTitle}』を一緒に見ませんか？ 拡張機能『d-party』を使ってパーティーに参加してください`;
  const open = (shareUrl: string) => window.open(shareUrl, "", "width=700,height=400");

  return (
    <div className="flex h-full flex-col justify-center gap-5 px-1">
      <p className="text-xs text-muted-foreground">
        パーティーリンクを共有して友達をルームに招待
      </p>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={copy}
            disabled={!url}
            aria-label="リンクをコピー"
            className="flex w-full items-center gap-1.5 rounded-lg border bg-muted/40 p-1.5 text-left transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex-1 truncate px-1 text-xs" title={url}>
              {url || "ルーム作成後にリンクが表示されます"}
            </span>
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {copied ? "コピーしました" : "リンクをコピー"}
        </TooltipContent>
      </Tooltip>
      <div className="flex items-center justify-center gap-3">
        <ShareIcon
          label="Xでシェア"
          disabled={!url}
          onClick={() =>
            open(
              "https://twitter.com/intent/tweet?text=" +
                encodeURIComponent(text) +
                "&url=" +
                encodeURIComponent(url) +
                "&hashtags=" +
                encodeURIComponent("dアニメストア,dパーティー"),
            )
          }
        >
          <FaXTwitter />
        </ShareIcon>
        <ShareIcon
          label="LINEでシェア"
          disabled={!url}
          onClick={() =>
            open(
              "https://social-plugins.line.me/lineit/share?url=" +
                encodeURIComponent(url),
            )
          }
        >
          <SiLine />
        </ShareIcon>
        <ShareIcon
          label="Facebookでシェア"
          disabled={!url}
          onClick={() =>
            open(
              "https://www.facebook.com/dialog/share?app_id=" +
                FACEBOOK_APP_ID +
                "&href=" +
                encodeURIComponent(url),
            )
          }
        >
          <FaFacebookF />
        </ShareIcon>
        <ShareIcon
          label="メールでシェア"
          disabled={!url}
          onClick={() =>
            open(
              "mailto:?&subject=" +
                encodeURIComponent("dアニメストアで一緒にアニメを観ませんか？") +
                "&body=" +
                encodeURIComponent(text + "\n\n") +
                encodeURIComponent(url + "\n"),
            )
          }
        >
          <FaEnvelope />
        </ShareIcon>
      </div>
    </div>
  );
}

function ShareIcon({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="size-12 rounded-full [&_svg]:size-5"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function HistoryPanel({ state }: { state: SidebarState }): React.JSX.Element {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [state.history.length]);

  if (state.history.length === 0) {
    return <EmptyHint text="まだ履歴はありません" />;
  }
  return (
    <ul className="flex flex-col gap-1 px-1">
      {state.history.map((entry) => (
        <li key={entry.id} className="flex gap-2 text-xs">
          <span className="shrink-0 font-mono text-muted-foreground">[{entry.time}]</span>
          <span className="text-foreground">{entry.text}</span>
        </li>
      ))}
      <div ref={endRef} />
    </ul>
  );
}

function UsersPanel({ state }: { state: SidebarState }): React.JSX.Element {
  if (state.users.length === 0) {
    return <EmptyHint text="参加者はいません" />;
  }
  return (
    <div className="px-1">
      <p className="mb-2 text-xs text-muted-foreground">{state.users.length}人が参加中</p>
      <ul className="flex flex-col gap-1">
        {state.users.map((user) => (
          <li
            key={user.user_id}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
          >
            <UserRound className="size-4 shrink-0 text-red-600" aria-hidden />
            <span className="truncate">{user.user_name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ControlPanel({ onLeave }: { onLeave: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 px-1">
      <div>
        <p className="text-sm font-semibold">パーティールームから退室</p>
        <p className="mt-1 text-xs text-muted-foreground">
          退室するとサイドバーが閉じます。
        </p>
      </div>
      <Button variant="destructive" className="w-full gap-1.5" onClick={onLeave}>
        <LogOut className="size-4" aria-hidden /> 退室する
      </Button>
    </div>
  );
}

function EmptyHint({ text }: { text: string }): React.JSX.Element {
  return (
    <p className="px-2 py-6 text-center text-xs text-muted-foreground">{text}</p>
  );
}
