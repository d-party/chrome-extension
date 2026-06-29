import { Check } from "lucide-react";
import { useState } from "react";

import { ReactionIcon } from "@/components/reactionIcons";
import { Input } from "@/components/ui/input";
import { EXTRA_REACTIONS } from "@/domain/extraReactions";
import { cn } from "@/lib/utils";

/**
 * Grid of selectable extra reactions (the curated Noto×react-icons catalog).
 * Mirrors {@link IconPicker}: selected entries are highlighted, clicking one
 * toggles it via {@link onToggle}. A search box filters by label. The parent
 * persists the choice to settings (`extraReactions`).
 */
export function ReactionPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}): React.JSX.Element {
  const [query, setQuery] = useState("");
  const selectedSet = new Set(selected);
  const q = query.trim();
  const items = q
    ? EXTRA_REACTIONS.filter((r) => r.label.includes(q))
    : EXTRA_REACTIONS;

  return (
    <div className="flex flex-col gap-2">
      <Input
        type="search"
        placeholder="リアクションを検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-8"
      />
      <div
        role="group"
        aria-label="追加できるリアクション"
        className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto rounded-lg border bg-muted/30 p-2"
      >
        {items.map((r) => {
          const isSelected = selectedSet.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={r.label}
              title={r.label}
              onClick={() => onToggle(r.id)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-md transition-colors",
                isSelected
                  ? "bg-red-600 text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <ReactionIcon iconKey={r.reactIcon} className="size-4" />
              {isSelected && (
                <Check
                  className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-white text-red-600"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
        {items.length === 0 && (
          <p className="col-span-8 py-3 text-center text-xs text-muted-foreground">
            該当するリアクションがありません
          </p>
        )}
      </div>
    </div>
  );
}
