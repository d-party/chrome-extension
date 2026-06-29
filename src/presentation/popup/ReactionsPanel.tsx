import { Lock, Plus, X } from "lucide-react";
import { useState } from "react";

import { ReactionIcon } from "@/components/reactionIcons";
import { Button } from "@/components/ui/button";
import { EXTRA_REACTION_BY_ID } from "@/domain/extraReactions";
import { DEFAULT_REACTIONS } from "@/domain/reactions";

import { ReactionPicker } from "./ReactionPicker";

/**
 * リアクションタブの本体。デフォルトリアクション（変更不可）を 1 列で見せ、その下
 * に「追加」ボタンとユーザーが追加したエクストラリアクションの一覧を出す。追加分は
 * `extraReactions`（カタログ id 配列）として保存され、プレイヤーのバーに反映される。
 * 統計はデフォルトのみが対象で、ここでの追加は集計に影響しない。
 */
export function ReactionsPanel({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}): React.JSX.Element {
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggle = (id: string): void => {
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  };

  // 未知 id（カタログ外）は無視する。
  const added = value
    .map((id) => EXTRA_REACTION_BY_ID[id])
    .filter((r) => r !== undefined);

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      {/* デフォルト（変更不可） */}
      <div className="mb-1 flex items-center gap-1.5">
        <Lock className="size-3.5 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold">デフォルト</h2>
        <span className="text-xs text-muted-foreground">（変更不可）</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-2">
        {DEFAULT_REACTIONS.map((r) => (
          <span
            key={r.id}
            title={r.label}
            className="flex size-7 items-center justify-center rounded-md text-foreground"
          >
            <ReactionIcon iconKey={r.reactIcon} className="size-4" />
          </span>
        ))}
      </div>

      {/* 追加分 */}
      <div className="mt-3 mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold">追加したリアクション</h2>
        <Button
          type="button"
          size="sm"
          variant={pickerOpen ? "secondary" : "outline"}
          className="h-7 gap-1 px-2 text-xs"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((o) => !o)}
        >
          <Plus className="size-3.5" aria-hidden />
          追加
        </Button>
      </div>

      {added.length === 0 ? (
        <p className="rounded-lg bg-muted/40 px-2 py-2 text-xs text-muted-foreground">
          「追加」からリアクションを選ぶと、プレイヤーで使えるようになります。
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {added.map((r) => (
            <button
              key={r.id}
              type="button"
              title={`${r.label} を削除`}
              aria-label={`${r.label} を削除`}
              onClick={() => toggle(r.id)}
              className="group flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-1 text-muted-foreground transition-colors hover:border-red-600/40 hover:text-foreground"
            >
              <ReactionIcon iconKey={r.reactIcon} className="size-4" />
              <X className="size-3 text-muted-foreground group-hover:text-red-600" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {pickerOpen && (
        <div className="mt-2">
          <ReactionPicker selected={value} onToggle={toggle} />
        </div>
      )}
    </section>
  );
}
