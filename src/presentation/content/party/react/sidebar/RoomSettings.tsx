import { Ban, Gauge, LogOut } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RoomSettings as RoomSettingsValue } from "@/domain/roomSettings";

/**
 * ルーム詳細設定のトグル群（単一の再利用コンポーネント）。
 *
 * ルーム作成時（`CreatePanel` のアコーディオン内）と、入室後の操作タブ
 * （`ControlPanel`、オーナーのみ編集可）の両方でこのコンポーネントを使う。
 * `disabled` のとき read-only 表示になり、値は変更できない。
 */
export function RoomSettings({
  value,
  onChange,
  disabled = false,
}: {
  value: RoomSettingsValue;
  onChange: (next: RoomSettingsValue) => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <SettingRow
        id="room-setting-one-way"
        icon={<Gauge className="size-4 text-red-600" aria-hidden />}
        title={
          <>
            <ruby>
              一方通行<rt className="text-[7px]">アクセラレーター</rt>
            </ruby>
            モード
          </>
        }
        description="オーナーだけが動画を操作できます（リアクションは可）。"
        checked={value.oneWay}
        disabled={disabled}
        onCheckedChange={(oneWay) => onChange({ ...value, oneWay })}
      />
      <SettingRow
        id="room-setting-owner-leave-delete"
        icon={<LogOut className="size-4 text-red-600" aria-hidden />}
        title="オーナー退室時にルーム自動削除"
        description="オーナーが退室すると、ルームを自動的に削除します。"
        checked={value.ownerLeaveDelete}
        disabled={disabled}
        onCheckedChange={(ownerLeaveDelete) =>
          onChange({ ...value, ownerLeaveDelete })
        }
      />
      <SettingRow
        id="room-setting-disable-reaction"
        icon={<Ban className="size-4 text-red-600" aria-hidden />}
        title="リアクションを禁止する"
        description="リアクションは送信・記録されません（自分の画面にだけ表示されます）。"
        checked={value.disableReaction}
        disabled={disabled}
        onCheckedChange={(disableReaction) =>
          onChange({ ...value, disableReaction })
        }
      />
    </div>
  );
}

function SettingRow({
  id,
  icon,
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border/60 px-2.5 py-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <Label htmlFor={id} className="text-xs font-semibold leading-tight">
          {title}
        </Label>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}
