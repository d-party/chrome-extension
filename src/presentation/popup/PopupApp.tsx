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
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type ReactionDisplayMode,
  type Settings,
} from "@/domain/settings";

import { IconPicker } from "./IconPicker";
import { InfoPanel } from "./InfoPanel";
import { PersonalStatsPanel } from "./PersonalStatsPanel";
import { ReactionsPanel } from "./ReactionsPanel";
import { useSettings } from "./useSettings";

type ToggleKey = Exclude<
  keyof Settings,
  "userName" | "userIcon" | "extraReactions" | "reactionDisplay"
>;

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

/** リアクションの表示方法の選択肢（設定タブ）。 */
const REACTION_DISPLAY_OPTIONS: {
  value: ReactionDisplayMode;
  label: string;
  description: string;
}[] = [
  {
    value: "normal",
    label: "通常表示",
    description: "下から上へ浮かび上がる（現状）",
  },
  {
    value: "badge",
    label: "バッジ表示",
    description: "右下に「名前 : リアクション」を小さく表示",
  },
  {
    value: "left",
    label: "左寄り表示",
    description: "左側を揺れながら下から上へ移動",
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
  // The active tab drives which trigger shows its text label (the others stay
  // icon-only so four tabs fit the 360px popup).
  const [tab, setTab] = useState("settings");
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

      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <TooltipProvider delayDuration={300}>
          <TabsList className="mx-4 mt-3 w-auto">
            <IconTab
              value="settings"
              label="設定"
              icon={SettingsIcon}
              active={tab === "settings"}
            />
            <IconTab
              value="reaction"
              label="リアクション"
              icon={Smile}
              active={tab === "reaction"}
            />
            <IconTab
              value="stats"
              label="統計"
              icon={BarChart3}
              active={tab === "stats"}
            />
            <IconTab
              value="info"
              label="情報"
              icon={Info}
              active={tab === "info"}
            />
          </TabsList>
        </TooltipProvider>

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
                  // 編集モード: 鉛筆ボタンから入り、表示名とアイコンをまとめて編集する。
                  // 名前は ✓ で確定、アイコンは選択した時点で即保存する。
                  <form className="flex flex-col gap-3" onSubmit={submitName}>
                    <div className="flex flex-col gap-1.5">
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
                          aria-label="表示名とアイコンを確定"
                        >
                          <Check className="size-5" aria-hidden />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        アイコン
                      </span>
                      <IconPicker
                        value={settings.userIcon}
                        onChange={(key) => void update("userIcon", key)}
                      />
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      表示名・アイコン
                    </span>
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        iconKey={settings.userIcon}
                        className="size-5 shrink-0 text-red-600"
                      />
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
                        aria-label={
                          saved ? "保存しました" : "表示名とアイコンを編集"
                        }
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

              {/* Watch-party settings (reaction display method lives here) */}
              <ToggleSection
                title="同時視聴設定"
                icon={MonitorPlay}
                toggles={SYNC_TOGGLES}
                renderToggle={renderToggle}
                open={openSection === "sync"}
                onToggle={() => toggleSection("sync")}
                extra={
                  <ReactionDisplaySelect
                    value={settings.reactionDisplay}
                    onChange={(mode) => void update("reactionDisplay", mode)}
                  />
                }
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

          <TabsContent value="reaction" forceMount className={OVERLAY_PANEL}>
            <main className="p-4">
              <ReactionsPanel
                value={settings.extraReactions}
                onChange={(ids) => void update("extraReactions", ids)}
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
 * A tab trigger that shows the label only while active so four tabs fit the
 * 360px popup without crowding: inactive tabs collapse to their icon, the
 * active one expands to icon + label. Inactive tabs surface the label as a
 * tooltip on hover/focus; the active tab already shows it, so it needs no
 * tooltip. The label stays available to assistive tech via aria-label.
 */
function IconTab({
  value,
  label,
  icon: Icon,
  active,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}): React.JSX.Element {
  const reduce = useReducedMotion();
  // Keep the tree structure identical whether or not the tab is active: always
  // render the same Tooltip wrapper so React never remounts the subtree (a
  // remount would discard AnimatePresence and kill the label transition). The
  // active tab already shows its label, so its tooltip is forced closed.
  //
  // The tooltip stays *controlled* for the component's whole lifetime (open is
  // always a boolean) to avoid React's controlled/uncontrolled switch warning:
  // when active we pin it closed, otherwise we follow hover/focus ourselves.
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={active ? false : open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        {/* Wrapping in TooltipTrigger makes Radix Tooltip stamp its own
            data-state on the button, clobbering Tabs' data-state="active" — so
            the data-[state=active] styles in TabsTrigger no longer fire. Drive
            the active styling from our own `active` prop instead. */}
        <TabsTrigger
          value={value}
          aria-label={label}
          className={
            active ? "bg-card text-foreground shadow-sm" : undefined
          }
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {/* The label slides/fades open when the tab becomes active instead of
              popping in abruptly. */}
          <AnimatePresence initial={false}>
            {active && (
              <motion.span
                key="label"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={
                  reduce ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }
                }
                className="inline-block overflow-hidden whitespace-nowrap"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </TabsTrigger>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
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
  extra,
}: {
  title: string;
  icon: LucideIcon;
  toggles: Toggle[];
  renderToggle: (toggle: Toggle) => React.JSX.Element;
  open: boolean;
  onToggle: () => void;
  /** トグル群の下に差し込む追加コンテンツ（例: リアクション表示方法セレクタ）。 */
  extra?: React.ReactNode;
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
            {extra}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/**
 * リアクションの表示方法を選ぶコントロール（同時視聴設定の中に置く）。ボタンを押す
 * と選択肢が開き、選ぶと閉じる。
 */
function ReactionDisplaySelect({
  value,
  onChange,
}: {
  value: ReactionDisplayMode;
  onChange: (mode: ReactionDisplayMode) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const current =
    REACTION_DISPLAY_OPTIONS.find((o) => o.value === value) ??
    REACTION_DISPLAY_OPTIONS[0];

  return (
    <div className="mt-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/70"
      >
        <span className="flex items-center gap-3">
          <Sparkles
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="flex flex-col text-left">
            <span className="text-sm font-medium leading-tight">
              リアクションの表示方法
            </span>
            <span className="text-xs text-muted-foreground">
              {current.label}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {open && (
        <div role="radiogroup" className="mt-1 flex flex-col gap-1 px-1 pb-1">
          {REACTION_DISPLAY_OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex items-start gap-2 rounded-lg border p-2 text-left transition-colors ${
                  selected
                    ? "border-red-600 bg-red-600/5"
                    : "border-border hover:bg-muted/70"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-red-600" : "border-muted-foreground/40"
                  }`}
                >
                  {selected && (
                    <span className="size-2 rounded-full bg-red-600" />
                  )}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {opt.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
