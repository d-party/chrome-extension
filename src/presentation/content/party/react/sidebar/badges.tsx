import { UserRound } from "lucide-react";

import type { ConnectionStatus } from "@/domain/connectionStatus";

const CONNECTION_STATUS_META: Record<
  ConnectionStatus,
  { label: string; dotClass: string }
> = {
  idle: { label: "接続前", dotClass: "bg-neutral-400" },
  connected: { label: "接続済み", dotClass: "bg-emerald-500" },
  failed: { label: "接続失敗", dotClass: "bg-red-500" },
  maintenance: { label: "メンテナンス中", dotClass: "bg-yellow-400" },
};

export function ConnectionBadge({
  status,
}: {
  status: ConnectionStatus;
}): React.JSX.Element {
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

export function UserCountBadge({ count }: { count: number }): React.JSX.Element {
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
