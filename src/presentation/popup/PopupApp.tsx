import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_SETTINGS, type Settings } from "@/domain/settings";
import { ChromeStorageSettingsRepository } from "@/infrastructure/storage/ChromeStorageSettingsRepository";

const repo = new ChromeStorageSettingsRepository();

type ToggleKey = Exclude<keyof Settings, "userName">;

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: "autoAnotherTab", label: "動画を自動で別タブで開く" },
  { key: "hideReaction", label: "他の人のリアクションを非表示" },
  { key: "hideReactionIcon", label: "リアクションアイコンを非表示" },
  { key: "selfNotification", label: "自分の操作は通知しない" },
];

export function PopupApp(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [userName, setUserName] = useState<string>(DEFAULT_SETTINGS.userName);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void repo.getAll().then((s) => {
      setSettings(s);
      setUserName(s.userName);
    });
  }, []);

  const toggle = (key: ToggleKey) => async (checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked }));
    await repo.set(key, checked);
  };

  const submitName = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    await repo.set("userName", userName);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg font-bold">d-party</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">ユーザー設定</h2>
        <p className="text-xs text-muted-foreground">
          あなた自身に関する設定項目
        </p>
        <form className="flex items-end gap-2" onSubmit={submitName}>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="user-name">ユーザー名 (15文字以下)</Label>
            <Input
              id="user-name"
              maxLength={15}
              placeholder="Your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm">
            {saved ? "保存済" : "設定"}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">動画プレイヤー設定</h2>
        {TOGGLES.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <Label htmlFor={key} className="font-normal">
              {label}
            </Label>
            <Switch
              id={key}
              checked={settings[key]}
              onCheckedChange={toggle(key)}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
