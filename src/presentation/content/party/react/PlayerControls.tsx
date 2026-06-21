import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  FaHandMiddleFinger,
  FaHeart,
  FaSadCry,
  FaSmileBeam,
  FaSyncAlt,
  FaThumbsUp,
} from "react-icons/fa";

import type { ReactionType } from "@/domain/reactions";
import type { Settings } from "@/domain/settings";

type SettingsSubscribe = (cb: (s: Settings) => void) => () => void;

export interface PlayerControlsHandlers {
  onSync: () => void;
  onReaction: (type: ReactionType) => void;
}

/**
 * Mounts the player control buttons (sync + 5 reactions) before the given
 * anchor element. Handlers are wired via React props so they take effect
 * regardless of when React commits (the legacy `getElementsByClassName`
 * approach raced with React's async render).
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
 * injection. Renders sync + 5 reaction buttons as `react-icons/fa` SVGs.
 * Class names (`sync_button`, `fav_button`, ...) are kept for CSS parity
 * with the original player.css.
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

  useEffect(() => {
    const off = subscribe((s) => setHidden(s.hideReactionIcon));
    return () => off();
  }, [subscribe]);

  const reactionStyle = hidden ? { display: "none" as const } : undefined;

  return (
    <>
      <ControlButton
        className="sync_button controll_button"
        onClick={handlers.onSync}
      >
        <FaSyncAlt className="buttonArea_icon" />
      </ControlButton>
      <ControlButton
        className="thumbs_button controll_button"
        style={reactionStyle}
        onClick={() => handlers.onReaction("thumbs_up")}
      >
        <FaThumbsUp className="buttonArea_icon reaction_icon" />
      </ControlButton>
      <ControlButton
        className="fav_button controll_button"
        style={reactionStyle}
        onClick={() => handlers.onReaction("fav")}
      >
        <FaHeart className="buttonArea_icon reaction_icon" />
      </ControlButton>
      <ControlButton
        className="smile_button controll_button"
        style={reactionStyle}
        onClick={() => handlers.onReaction("smile")}
      >
        <FaSmileBeam className="buttonArea_icon reaction_icon" />
      </ControlButton>
      <ControlButton
        className="cry_button controll_button"
        style={reactionStyle}
        onClick={() => handlers.onReaction("cry")}
      >
        <FaSadCry className="buttonArea_icon reaction_icon" />
      </ControlButton>
      <ControlButton
        className="middle_finger_button controll_button"
        style={reactionStyle}
        onClick={() => handlers.onReaction("middle_finger")}
      >
        <FaHandMiddleFinger className="buttonArea_icon reaction_icon" />
      </ControlButton>
    </>
  );
}

function ControlButton({
  className,
  style,
  onClick,
  children,
}: {
  className: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={className} style={style} role="button" onClick={onClick}>
      {children}
    </div>
  );
}
