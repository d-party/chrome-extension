import {
  BellOff,
  Check,
  ExternalLink,
  EyeOff,
  type LucideIcon,
  SlidersHorizontal,
  Smile,
  User,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type Settings } from "@/domain/settings";

import { useSettings } from "./useSettings";

type ToggleKey = Exclude<keyof Settings, "userName">;

const TOGGLES: {
  key: ToggleKey;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    key: "autoAnotherTab",
    label: "別タブで自動再生",
    description: "動画を新しいタブで開く",
    icon: ExternalLink,
  },
  {
    key: "hideReaction",
    label: "リアクションを非表示",
    description: "他の人のリアクション演出を隠す",
    icon: EyeOff,
  },
  {
    key: "hideReactionIcon",
    label: "リアクションボタンを非表示",
    description: "プレイヤーのリアクションボタンを隠す",
    icon: Smile,
  },
  {
    key: "selfNotification",
    label: "自分の操作を通知しない",
    description: "自分の再生操作の通知を抑制する",
    icon: BellOff,
  },
];

function appVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "";
  }
}

export function PopupApp(): React.JSX.Element {
  const { settings, loaded, update } = useSettings();
  const [draftName, setDraftName] = useState("");
  const [saved, setSaved] = useState(false);
  const seeded = useRef(false);

  // Seed the editable name field once settings have loaded.
  useEffect(() => {
    if (loaded && !seeded.current) {
      seeded.current = true;
      setDraftName(settings.userName);
    }
  }, [loaded, settings.userName]);

  const submitName = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    await update("userName", draftName);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="bg-background text-foreground">
      {/* Header */}
      <header className="bg-gradient-to-br from-red-800 to-red-900 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Users className="size-5" aria-hidden />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold tracking-tight">d-party</h1>
            <p className="text-xs text-white/80">dアニメストア 同時視聴の設定</p>
          </div>
        </div>
      </header>

      <main className="space-y-3 p-4">
        {/* User settings */}
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <User className="size-4 text-red-600" aria-hidden />
            <h2 className="text-sm font-semibold">ユーザー設定</h2>
          </div>
          <form className="flex items-end gap-2" onSubmit={submitName}>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="user-name" className="text-xs text-muted-foreground">
                表示名（15文字以下）
              </Label>
              <Input
                id="user-name"
                maxLength={15}
                placeholder="あなたの名前"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" className="gap-1">
              {saved ? (
                <>
                  <Check className="size-4" aria-hidden /> 保存済
                </>
              ) : (
                "保存"
              )}
            </Button>
          </form>
        </section>

        {/* Player settings */}
        <section className="rounded-xl border bg-card p-2 shadow-sm">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <SlidersHorizontal className="size-4 text-red-600" aria-hidden />
            <h2 className="text-sm font-semibold">プレイヤー設定</h2>
          </div>
          <div className="mt-1 space-y-0.5">
            {TOGGLES.map(({ key, label, description, icon: Icon }) => (
              <label
                key={key}
                htmlFor={key}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/70"
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">{label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </span>
                </span>
                <Switch
                  id={key}
                  checked={settings[key]}
                  onCheckedChange={(checked) => void update(key, checked)}
                />
              </label>
            ))}
          </div>
        </section>
      </main>

      <footer className="px-4 pb-3 text-center text-[11px] text-muted-foreground">
        v{appVersion()} · powered by U-Not
      </footer>
    </div>
  );
}
