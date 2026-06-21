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

import type { Settings } from "@/domain/settings";

type SettingsSubscribe = (cb: (s: Settings) => void) => () => void;

/**
 * Mounts the player control buttons (sync + 5 reactions) before the given
 * anchor element. Class names match the legacy injection so existing onclick
 * wiring in `bindPlayerEvents` keeps working.
 */
export function mountPlayerControls(opts: {
  anchor: Element;
  initialSettings: Settings;
  subscribe: SettingsSubscribe;
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
    />,
  );
}

/**
 * React replacement for the legacy `addControlButtons` jQuery+FontAwesome
 * injection. FA is no longer bundled with the extension, so the icon `<i>`
 * tags rendered nothing — buttons appeared empty on the player. Here we
 * render `react-icons/fa` SVGs instead. Class names (`sync_button`,
 * `fav_button`, etc.) are preserved so existing onclick wiring in
 * `bindPlayerEvents` keeps working unchanged.
 */
export function PlayerControls({
  subscribe,
  initialSettings,
}: {
  subscribe: SettingsSubscribe;
  initialSettings: Settings;
}) {
  const [hidden, setHidden] = useState(initialSettings.hideReactionIcon);

  useEffect(() => {
    const off = subscribe((s) => setHidden(s.hideReactionIcon));
    return () => off();
  }, [subscribe]);

  const reactionStyle = hidden ? { display: "none" as const } : undefined;

  return (
    <>
      <ControlButton className="sync_button controll_button">
        <FaSyncAlt className="buttonArea_icon" />
      </ControlButton>
      <ControlButton
        className="thumbs_button controll_button"
        style={reactionStyle}
      >
        <FaThumbsUp className="buttonArea_icon reaction_icon" />
      </ControlButton>
      <ControlButton
        className="fav_button controll_button"
        style={reactionStyle}
      >
        <FaHeart className="buttonArea_icon reaction_icon" />
      </ControlButton>
      <ControlButton
        className="smile_button controll_button"
        style={reactionStyle}
      >
        <FaSmileBeam className="buttonArea_icon reaction_icon" />
      </ControlButton>
      <ControlButton
        className="cry_button controll_button"
        style={reactionStyle}
      >
        <FaSadCry className="buttonArea_icon reaction_icon" />
      </ControlButton>
      <ControlButton
        className="middle_finger_button controll_button"
        style={reactionStyle}
      >
        <FaHandMiddleFinger className="buttonArea_icon reaction_icon" />
      </ControlButton>
    </>
  );
}

function ControlButton({
  className,
  style,
  children,
}: {
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div className={className} style={style} role="button">
      {children}
    </div>
  );
}
