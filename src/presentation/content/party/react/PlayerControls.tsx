import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { FaSyncAlt } from "react-icons/fa";

import { ReactionIcon } from "@/components/reactionIcons";
import { EXTRA_REACTION_BY_ID } from "@/domain/extraReactions";
import { DEFAULT_REACTIONS } from "@/domain/reactions";
import type { Settings } from "@/domain/settings";

type SettingsSubscribe = (cb: (s: Settings) => void) => () => void;

export interface PlayerControlsHandlers {
  onSync: () => void;
  /** `id` はデフォルト名（`fav` 等）または エクストラ id（Noto コードポイント）。 */
  onReaction: (id: string) => void;
}

/** デフォルトリアクションごとの既存 CSS クラス（player.css の hover 配色用）。 */
const DEFAULT_BUTTON_CLASS: Record<string, string> = {
  thumbs_up: "thumbs_button",
  fav: "fav_button",
  smile: "smile_button",
  cry: "cry_button",
  middle_finger: "middle_finger_button",
};

/**
 * Mounts the player control buttons (sync + reactions) before the given anchor
 * element. Handlers are wired via React props so they take effect regardless of
 * when React commits (the legacy `getElementsByClassName` approach raced with
 * React's async render).
 */
export function mountPlayerControls(opts: {
  anchor: Element;
  initialSettings: Settings;
  subscribe: SettingsSubscribe;
  handlers: PlayerControlsHandlers;
}): void {
  const parent = opts.anchor.parentElement;
  if (!parent) return;
  if (document.getElementById("d-party-player-controls")) return;
  const host = document.createElement("div");
  host.id = "d-party-player-controls";
  host.style.display = "contents";
  parent.insertBefore(host, opts.anchor);
  createRoot(host).render(
    <PlayerControls
      subscribe={opts.subscribe}
      initialSettings={opts.initialSettings}
      handlers={opts.handlers}
    />,
  );
}

/**
 * React replacement for the legacy `addControlButtons` jQuery+FontAwesome
 * injection. Renders sync + the default reactions + the user's added extra
 * reactions as `react-icons` SVGs. The static icon (react-icons) shown here is
 * the same one offered in the popup picker; the on-screen animation is the
 * bundled Lottie keyed by reaction id. Class names (`sync_button`, `fav_button`,
 * ...) are kept for CSS parity with the original player.css.
 */
export function PlayerControls({
  subscribe,
  initialSettings,
  handlers,
}: {
  subscribe: SettingsSubscribe;
  initialSettings: Settings;
  handlers: PlayerControlsHandlers;
}) {
  const [hidden, setHidden] = useState(initialSettings.hideReactionIcon);
  const [extraIds, setExtraIds] = useState(initialSettings.extraReactions);

  useEffect(() => {
    const off = subscribe((s) => {
      setHidden(s.hideReactionIcon);
      setExtraIds(s.extraReactions);
    });
    return () => off();
  }, [subscribe]);

  const reactionStyle = hidden ? { display: "none" as const } : undefined;
  // 未知 id（カタログ外）は描画しない。
  const extraDefs = extraIds
    .map((id) => EXTRA_REACTION_BY_ID[id])
    .filter((r) => r !== undefined);

  return (
    <>
      <ControlButton
        className="sync_button controll_button"
        onClick={handlers.onSync}
      >
        <FaSyncAlt className="buttonArea_icon" />
      </ControlButton>
      {DEFAULT_REACTIONS.map((r) => (
        <ControlButton
          key={r.id}
          className={`${DEFAULT_BUTTON_CLASS[r.id] ?? "reaction_button"} controll_button`}
          style={reactionStyle}
          title={r.label}
          onClick={() => handlers.onReaction(r.id)}
        >
          <ReactionIcon
            iconKey={r.reactIcon}
            className="buttonArea_icon reaction_icon"
          />
        </ControlButton>
      ))}
      {extraDefs.map((r) => (
        <ControlButton
          key={r.id}
          className="reaction_button controll_button"
          style={reactionStyle}
          title={r.label}
          onClick={() => handlers.onReaction(r.id)}
        >
          <ReactionIcon
            iconKey={r.reactIcon}
            className="buttonArea_icon reaction_icon"
          />
        </ControlButton>
      ))}
    </>
  );
}

function ControlButton({
  className,
  style,
  title,
  onClick,
  children,
}: {
  className: string;
  style?: React.CSSProperties;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={style}
      title={title}
      role="button"
      onClick={onClick}
    >
      {children}
    </div>
  );
}
