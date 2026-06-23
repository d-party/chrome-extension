import { Clock, DoorOpen, RotateCcw, Smile, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { totalReactions } from "@/domain/personalStats";
import { REACTION_TYPES, REACTION_META } from "@/domain/reactions";

import { usePersonalStats } from "./usePersonalStats";

/**
 * Format a millisecond duration as a compact Japanese string.
 *
 * Under an hour it reads "X分" (or "1分未満"); once it reaches an hour it shows
 * whole hours only ("X時間"), dropping the trailing minutes. Hours never roll
 * over into days — the count keeps accumulating as hours.
 */
function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "1分未満";
  const hours = Math.floor(totalMinutes / 60);
  if (hours === 0) return `${totalMinutes}分`;
  return `${hours}時間`;
}

/** Format the "measuring since" epoch as a YYYY/M/D date. */
function formatSince(since: number | null): string | null {
  if (since === null) return null;
  const d = new Date(since);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums leading-none">
        {value}
      </p>
    </div>
  );
}

/**
 * The "統計" tab: per-account usage figures accumulated entirely on the client
 * (independent of the backend). Mirrors, on a personal scale, the aggregate
 * dashboard the frontend `/stats` page shows for the whole service.
 */
export function PersonalStatsPanel(): React.JSX.Element {
  const { stats, reset } = usePersonalStats();
  const [confirming, setConfirming] = useState(false);

  const reactionTotal = totalReactions(stats);
  const maxReaction = Math.max(
    1,
    ...REACTION_TYPES.map((t) => stats.reactionsByType[t]),
  );
  const since = formatSince(stats.since);

  const doReset = async (): Promise<void> => {
    await reset();
    setConfirming(false);
  };

  return (
    <div className="space-y-3">
      {/* Headline figures */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Sparkles}
          label="作成したルーム"
          value={stats.roomsCreated.toLocaleString()}
        />
        <StatCard
          icon={DoorOpen}
          label="参加したルーム"
          value={stats.roomsJoined.toLocaleString()}
        />
        <StatCard
          icon={Smile}
          label="送ったリアクション"
          value={reactionTotal.toLocaleString()}
        />
        <StatCard
          icon={Clock}
          label="接続時間"
          value={formatDuration(stats.connectionMs)}
        />
      </div>

      {/* Reaction breakdown by kind */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">リアクション内訳</h2>
        {reactionTotal === 0 ? (
          <p className="text-xs text-muted-foreground">
            まだリアクションを送っていません。
          </p>
        ) : (
          <ul className="space-y-2">
            {REACTION_TYPES.map((type) => {
              const count = stats.reactionsByType[type];
              const meta = REACTION_META[type];
              return (
                <li key={type} className="flex items-center gap-2">
                  <span
                    className="shrink-0 text-sm"
                    aria-label={meta.label}
                    title={meta.label}
                  >
                    {meta.emoji}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-red-600 transition-all"
                      style={{ width: `${(count / maxReaction) * 100}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-xs tabular-nums">
                    {count.toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Reset + measuring-since footnote */}
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] text-muted-foreground">
          {since ? `${since} から計測` : "ブラウザに保存されます"}
        </p>
        {confirming ? (
          <span className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setConfirming(false)}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 bg-red-600 px-2 text-xs text-white hover:bg-red-700"
              onClick={() => void doReset()}
            >
              リセットする
            </Button>
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setConfirming(true)}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            リセット
          </Button>
        )}
      </div>
    </div>
  );
}
