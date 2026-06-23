import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  Info,
  type LucideIcon,
  MonitorPlay,
  Pencil,
  PictureInPicture2,
  Settings as SettingsIcon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Settings } from "@/domain/settings";

import { InfoPanel } from "./InfoPanel";
import { PersonalStatsPanel } from "./PersonalStatsPanel";
import { useSettings } from "./useSettings";

type ToggleKey = Exclude<keyof Settings, "userName">;

interface Toggle {
  key: ToggleKey;
  label: string;
  description: string;
  icon: LucideIcon;
  /**
   * When true, the switch shows the inverse of the stored value so that
   * "ON = feature enabled" holds even for negatively-named storage keys
   * (e.g. `hideReaction`). The storage keys stay backward-compatible.
   */
  invert?: boolean;
}

/** Watch-party settings: reactions and operation notifications. */
const SYNC_TOGGLES: Toggle[] = [
  {
    key: "hideReaction",
    label: "リアクションを表示",
    description: "他の人のリアクション演出を表示する",
    icon: Eye,
    invert: true,
  },
  {
    key: "hideReactionIcon",
    label: "リアクションボタンを表示",
    description: "プレイヤーのリアクションボタンを表示する",
    icon: Smile,
    invert: true,
  },
  {
    key: "selfNotification",
    label: "自分の操作を通知",
    description: "自分の再生操作を通知する",
    icon: Bell,
    invert: true,
  },
];

/** Utility settings independent of the watch party. */
const UTILITY_TOGGLES: Toggle[] = [
  {
    key: "autoAnotherTab",
    label: "動画は全て別タブで開く",
    description: "再生を常に新しいタブで開く",
    icon: ExternalLink,
  },
  {
    key: "enablePictureInPicture",
    label: "ピクチャーインピクチャーを有効",
    description: "プレイヤーに PiP ボタンを表示する",
    icon: PictureInPicture2,
  },
];

function appVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "";
  }
}

/**
 * Inactive panels stay laid out but invisible, so the popup never jumps when
 * switching tabs.
 */
const HIDDEN_WHEN_INACTIVE =
  "data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none";

/**
 * The 統計 panel stays in normal flow and fixes the popup's height (a stable
 * reference). The other panels overlay it absolutely and scroll internally when
 * their content is taller — e.g. when every 設定 toggle section is expanded —
 * instead of stretching the window.
 */
const REFERENCE_PANEL = HIDDEN_WHEN_INACTIVE;
const OVERLAY_PANEL = `absolute inset-0 overflow-y-auto ${HIDDEN_WHEN_INACTIVE}`;

export function PopupApp(): React.JSX.Element {
  const { settings, update } = useSettings();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Only one settings section is expanded at a time (accordion); opening one
  // collapses any other that is already open.
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (id: string): void =>
    setOpenSection((current) => (current === id ? null : id));
  const reduce = useReducedMotion();

  const startEditing = (): void => {
    setDraftName(settings.userName);
    setEditing(true);
  };

  // Focus the field as soon as editing starts.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const submitName = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    await update("userName", draftName);
    setEditing(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const renderToggle = ({
    key,
    label,
    description,
    icon: Icon,
    invert,
  }: Toggle) => (
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
        checked={invert ? !settings[key] : settings[key]}
        onCheckedChange={(checked) =>
          void update(key, invert ? !checked : checked)
        }
      />
    </label>
  );

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex min-h-[480px] flex-col bg-background text-foreground"
    >
      {/* Header */}
      <header className="border-b-2 border-red-600 bg-neutral-950 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Users className="size-5 text-red-600" aria-hidden />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold tracking-tight text-red-600">
              d-party
            </h1>
            <p className="text-xs text-white/70">
              dアニメストア 同時視聴の設定
            </p>
          </div>
        </div>
      </header>

      <Tabs defaultValue="settings" className="gap-0">
        <TabsList className="mx-4 mt-3 w-auto">
          <TabsTrigger value="settings">
            <SettingsIcon className="size-3.5" aria-hidden />
            設定
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="size-3.5" aria-hidden />
            統計
          </TabsTrigger>
          <TabsTrigger value="info">
            <Info className="size-3.5" aria-hidden />
            情報
          </TabsTrigger>
        </TabsList>

        <div className="relative">
          <TabsContent value="settings" forceMount className={OVERLAY_PANEL}>
            <main className="space-y-3 p-4">
              {/* User settings */}
              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <User className="size-4 text-red-600" aria-hidden />
                  <h2 className="text-sm font-semibold">ユーザー設定</h2>
                </div>
                {editing ? (
                  <form className="flex flex-col gap-1.5" onSubmit={submitName}>
                    <Label
                      htmlFor="user-name"
                      className="text-xs text-muted-foreground"
                    >
                      表示名（15文字以下）
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        ref={inputRef}
                        id="user-name"
                        className="flex-1"
                        maxLength={15}
                        placeholder="あなたの名前"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                      />
                      <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:text-red-600"
                        aria-label="表示名を確定"
                      >
                        <Check className="size-5" aria-hidden />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      表示名
                    </span>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 truncate text-sm font-medium">
                        {settings.userName || (
                          <span className="text-muted-foreground">未設定</span>
                        )}
                      </p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={startEditing}
                        aria-label={saved ? "保存しました" : "表示名を編集"}
                      >
                        {saved ? (
                          <Check className="size-5 text-red-600" aria-hidden />
                        ) : (
                          <Pencil className="size-5" aria-hidden />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* Watch-party settings */}
              <ToggleSection
                title="同時視聴設定"
                icon={MonitorPlay}
                toggles={SYNC_TOGGLES}
                renderToggle={renderToggle}
                open={openSection === "sync"}
                onToggle={() => toggleSection("sync")}
              />

              {/* Utility settings (kept last) */}
              <ToggleSection
                title="ユーティリティ設定"
                icon={SlidersHorizontal}
                toggles={UTILITY_TOGGLES}
                renderToggle={renderToggle}
                open={openSection === "utility"}
                onToggle={() => toggleSection("utility")}
              />
            </main>
          </TabsContent>

          <TabsContent value="stats" forceMount className={REFERENCE_PANEL}>
            <main className="p-4">
              <PersonalStatsPanel />
            </main>
          </TabsContent>

          <TabsContent value="info" forceMount className={OVERLAY_PANEL}>
            <main className="p-4">
              <InfoPanel />
            </main>
          </TabsContent>
        </div>
      </Tabs>

      <footer className="mt-auto px-4 pb-3 pt-3 text-center text-[11px] text-muted-foreground">
        v{appVersion()} · powered by U-Not
      </footer>
    </motion.div>
  );
}

/**
 * A settings section that expands on click. Open state is controlled by the
 * parent so the sections behave as an accordion — opening one collapses any
 * other that is already open.
 */
function ToggleSection({
  title,
  icon: Icon,
  toggles,
  renderToggle,
  open,
  onToggle,
}: {
  title: string;
  icon: LucideIcon;
  toggles: Toggle[];
  renderToggle: (toggle: Toggle) => React.JSX.Element;
  open: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const reduce = useReducedMotion();
  return (
    <section className="rounded-xl border bg-card p-2 shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/70"
      >
        <Icon className="size-4 text-red-600" aria-hidden />
        <h2 className="text-sm font-semibold">{title}</h2>
        <ChevronDown
          className={`ml-auto size-4 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }
            }
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-0.5">{toggles.map(renderToggle)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
