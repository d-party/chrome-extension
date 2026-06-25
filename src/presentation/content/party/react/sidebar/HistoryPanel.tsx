import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Crown,
  FastForward,
  Gauge,
  Info,
  type LucideIcon,
  Pause,
  PartyPopper,
  Play,
  RefreshCw,
  SkipForward,
  TriangleAlert,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { UserAvatar } from "@/components/UserAvatar";
import type { HistoryIcon } from "@/domain/history";
import { cn } from "@/lib/utils";

import type { HistoryEntry, SidebarState } from "../sidebarStore";
import { EmptyHint } from "./panels";

/** lucide icon for each operation/event kind. */
const HISTORY_ICONS: Record<HistoryIcon, LucideIcon> = {
  play: Play,
  pause: Pause,
  next: SkipForward,
  skip: FastForward,
  rate: Gauge,
  join: UserPlus,
  leave: UserMinus,
  sync: RefreshCw,
  host: Crown,
  party: PartyPopper,
  info: Info,
  error: TriangleAlert,
};

const ALL_FILTER = "__all__";
const SELF_FILTER = "__self__";

/** Vertical gap between rows (`gap-0.5` = 2px), needed for the fit calculation. */
const ROW_GAP_PX = 2;

export function HistoryPanel({
  state,
}: {
  state: SidebarState;
}): React.JSX.Element {
  const [filter, setFilter] = useState<string>(ALL_FILTER);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(8);
  const listRef = useRef<HTMLDivElement>(null);

  // 履歴に登場した「相手の参加者」を絞り込み候補として集める。
  const actors = useMemo(() => {
    const names = new Set<string>();
    for (const entry of state.history) if (entry.user) names.add(entry.user);
    return [...names];
  }, [state.history]);
  const hasSent = useMemo(
    () => state.history.some((entry) => entry.direction === "sent"),
    [state.history],
  );

  // 選択中の絞り込み候補が履歴から消えたら "すべて" 扱いにする（state は持ち越して
  // 候補が再び現れたら復帰させる）。
  const filterValid =
    filter === ALL_FILTER ||
    (filter === SELF_FILTER ? hasSent : actors.includes(filter));
  const activeFilter = filterValid ? filter : ALL_FILTER;

  // 新しい履歴が上に来るよう降順で並べる。
  const visible = useMemo(
    () =>
      state.history
        .filter((entry) => {
          if (activeFilter === ALL_FILTER) return true;
          if (activeFilter === SELF_FILTER) return entry.direction === "sent";
          return entry.user === activeFilter;
        })
        .reverse(),
    [state.history, activeFilter],
  );

  // サイドバーの高さに 1 ページ分の行数を合わせ、スクロールを出さない。
  const recompute = useCallback(() => {
    const container = listRef.current;
    if (!container) return;
    const containerHeight = container.clientHeight;
    const row = container.querySelector("li");
    if (!row || containerHeight <= 0) return;
    const rowHeight = row.getBoundingClientRect().height;
    if (rowHeight <= 0) return;
    const fit = Math.floor(
      (containerHeight + ROW_GAP_PX) / (rowHeight + ROW_GAP_PX),
    );
    setPerPage(Math.max(1, fit));
  }, []);

  useLayoutEffect(() => {
    recompute();
    const container = listRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => recompute());
    observer.observe(container);
    return () => observer.disconnect();
  }, [recompute, visible.length]);

  const totalPages = Math.max(1, Math.ceil(visible.length / perPage));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * perPage;
  const pageItems = visible.slice(pageStart, pageStart + perPage);

  if (state.history.length === 0) {
    return <EmptyHint text="まだ履歴はありません" />;
  }

  const showFilter = hasSent || actors.length > 0;

  return (
    <div className="flex h-full flex-col">
      {showFilter && (
        <HistoryFilter
          filter={activeFilter}
          onChange={setFilter}
          actors={actors}
          hasSent={hasSent}
        />
      )}
      {visible.length === 0 ? (
        <EmptyHint text="条件に一致する履歴はありません" />
      ) : (
        <>
          <div ref={listRef} className="min-h-0 flex-1 overflow-hidden">
            <ul className="flex flex-col gap-0.5 px-0.5">
              {pageItems.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </div>
          {totalPages > 1 && (
            <HistoryPagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

function HistoryPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}): React.JSX.Element {
  return (
    <div className="mt-1 flex shrink-0 items-center justify-center gap-3 px-0.5 pt-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page <= 0}
        aria-label="新しい履歴へ"
        className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        aria-label="古い履歴へ"
        className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function HistoryFilter({
  filter,
  onChange,
  actors,
  hasSent,
}: {
  filter: string;
  onChange: (value: string) => void;
  actors: string[];
  hasSent: boolean;
}): React.JSX.Element {
  const options = [
    { key: ALL_FILTER, label: "すべて" },
    ...(hasSent ? [{ key: SELF_FILTER, label: "あなた" }] : []),
    ...actors.map((name) => ({ key: name, label: name })),
  ];
  return (
    <div className="mb-2 flex flex-wrap gap-1 px-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-pressed={filter === option.key}
          className={cn(
            "max-w-[8rem] truncate rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
            filter === option.key
              ? "bg-red-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/70",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }): React.JSX.Element {
  const OpIcon = HISTORY_ICONS[entry.icon];
  const isSystem = entry.direction === "system";
  return (
    <li className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50">
      <DirectionBadge entry={entry} />
      <time className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
        {entry.time}
      </time>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {entry.direction === "received" && entry.user && (
          <span className="flex max-w-[5.5rem] shrink-0 items-center gap-1 text-xs font-semibold text-foreground">
            <UserAvatar
              iconKey={entry.userIcon}
              className="size-3 shrink-0 text-red-600"
            />
            <span className="truncate">{entry.user}</span>
          </span>
        )}
        {!isSystem && (
          <OpIcon
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
        <span className="truncate text-xs text-foreground">{entry.label}</span>
      </div>
    </li>
  );
}

/** Leading badge: a send/receive arrow for operations, the event icon for
 * system messages. */
function DirectionBadge({ entry }: { entry: HistoryEntry }): React.JSX.Element {
  if (entry.direction === "sent") {
    return (
      <span
        title="送信"
        aria-label="送信"
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-600"
      >
        <ArrowUpRight className="size-3" aria-hidden />
      </span>
    );
  }
  if (entry.direction === "received") {
    return (
      <span
        title="受信"
        aria-label="受信"
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600"
      >
        <ArrowDownLeft className="size-3" aria-hidden />
      </span>
    );
  }
  const SystemIcon = HISTORY_ICONS[entry.icon];
  return (
    <span
      aria-hidden
      className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
    >
      <SystemIcon className="size-3" />
    </span>
  );
}
