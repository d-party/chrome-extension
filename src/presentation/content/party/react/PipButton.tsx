import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MdPictureInPicture, MdPictureInPictureAlt } from "react-icons/md";

import type { Settings } from "@/domain/settings";

type SettingsSubscribe = (cb: (s: Settings) => void) => () => void;

/**
 * Mounts the Picture-in-Picture toggle into the dアニメストア control bar, just
 * before the native fullscreen (最大化) button — the rightmost `.mainButton`.
 *
 * Unlike the sync/reaction buttons this is room-independent: it is shown on
 * every player page whenever the user has the feature enabled, regardless of
 * whether (or how many) rooms they are in. PiP is a local viewing preference
 * and is intentionally not synced over the room WebSocket.
 */
export function mountPipButton(opts: {
  /** The native `.fullscreen.mainButton`; the PiP button is inserted before it. */
  fullscreenButton: Element;
  initialSettings: Settings;
  subscribe: SettingsSubscribe;
  onToggle: () => void;
}): void {
  const parent = opts.fullscreenButton.parentElement;
  if (!parent) return;
  if (document.getElementById("d-party-pip-button")) return;
  const host = document.createElement("div");
  host.id = "d-party-pip-button";
  host.style.display = "contents";
  parent.insertBefore(host, opts.fullscreenButton);
  createRoot(host).render(
    <PipButton
      initialSettings={opts.initialSettings}
      subscribe={opts.subscribe}
      onToggle={opts.onToggle}
    />,
  );
}

export function PipButton({
  initialSettings,
  subscribe,
  onToggle,
}: {
  initialSettings: Settings;
  subscribe: SettingsSubscribe;
  onToggle: () => void;
}) {
  const [enabled, setEnabled] = useState(initialSettings.enablePictureInPicture);
  const inPip = usePipState();

  useEffect(() => {
    const off = subscribe((s) => setEnabled(s.enablePictureInPicture));
    return () => off();
  }, [subscribe]);

  if (!enabled) return null;

  return (
    <div
      className="pip_main_button"
      role="button"
      title={
        inPip ? "ピクチャーインピクチャーを終了" : "ピクチャーインピクチャーで再生"
      }
      onClick={onToggle}
    >
      {inPip ? <MdPictureInPicture /> : <MdPictureInPictureAlt />}
    </div>
  );
}

/**
 * Tracks whether the player `<video>` is currently in Picture-in-Picture so the
 * button can swap its icon/label.
 */
function usePipState(): boolean {
  const [inPip, setInPip] = useState(false);
  useEffect(() => {
    const v = document.getElementById("video") as HTMLVideoElement | null;
    if (!v) return;
    const update = () => setInPip(document.pictureInPictureElement === v);
    v.addEventListener("enterpictureinpicture", update);
    v.addEventListener("leavepictureinpicture", update);
    update();
    return () => {
      v.removeEventListener("enterpictureinpicture", update);
      v.removeEventListener("leavepictureinpicture", update);
    };
  }, []);
  return inPip;
}
