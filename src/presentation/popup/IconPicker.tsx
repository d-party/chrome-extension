import { Check } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import { USER_ICON_KEYS } from "@/components/userIcons";
import { cn } from "@/lib/utils";

/**
 * Grid of selectable avatar icons (curated react-icons / FA6 set). The selected
 * key is highlighted; clicking one calls {@link onChange} with its key. The
 * parent persists the choice to settings (`userIcon`).
 */
export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label="表示アイコンを選択"
      className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto rounded-lg border bg-muted/30 p-2"
    >
      {USER_ICON_KEYS.map((key) => {
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={key}
            title={key}
            onClick={() => onChange(key)}
            className={cn(
              "relative flex aspect-square items-center justify-center rounded-md transition-colors",
              selected
                ? "bg-red-600 text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <UserAvatar iconKey={key} className="size-4" />
            {selected && (
              <Check
                className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-white text-red-600"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
