import Lottie from "lottie-react";
import { useEffect, useState } from "react";

import type { ReactionType } from "@/domain/reactions";

import cryData from "./lottie/cry.json";
import favData from "./lottie/fav.json";
import middleFingerData from "./lottie/middle_finger.json";
import smileData from "./lottie/smile.json";
import thumbsUpData from "./lottie/thumbs_up.json";

const ANIMATIONS: Record<ReactionType, object> = {
  fav: favData,
  middle_finger: middleFingerData,
  thumbs_up: thumbsUpData,
  smile: smileData,
  cry: cryData,
};

const SIZE_PX = 72;
const RISE_MS = 1600;

export interface ReactionEntry {
  id: number;
  type: ReactionType;
  leftPct: number;
  bottomStartPx: number;
  bottomEndPx: number;
}

export interface ReactionLayerHandle {
  push: (type: ReactionType) => void;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function ReactionLayer({
  register,
}: {
  register: (handle: ReactionLayerHandle) => void;
}) {
  const [entries, setEntries] = useState<ReactionEntry[]>([]);

  useEffect(() => {
    let seq = 0;
    register({
      push: (type) => {
        seq += 1;
        const id = seq;
        const start = 120 + randInt(-30, 30);
        setEntries((prev) => [
          ...prev,
          {
            id,
            type,
            leftPct: randInt(5, 95),
            bottomStartPx: start,
            bottomEndPx: start + 240,
          },
        ]);
      },
    });
  }, [register]);

  const remove = (id: number) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 5,
      }}
    >
      {entries.map((e) => (
        <ReactionItem key={e.id} entry={e} onDone={() => remove(e.id)} />
      ))}
    </div>
  );
}

function ReactionItem({
  entry,
  onDone,
}: {
  entry: ReactionEntry;
  onDone: () => void;
}) {
  const [bottom, setBottom] = useState(entry.bottomStartPx);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // Kick the rise/fade transition on the next frame so the initial style applies first.
    const raf = requestAnimationFrame(() => {
      setBottom(entry.bottomEndPx);
      setOpacity(0);
    });
    const timer = window.setTimeout(onDone, RISE_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [entry.bottomEndPx, onDone]);

  return (
    <div
      style={{
        position: "absolute",
        left: `${entry.leftPct}%`,
        bottom: `${bottom}px`,
        width: SIZE_PX,
        height: SIZE_PX,
        transform: "translateX(-50%)",
        opacity,
        transition: `bottom ${RISE_MS}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${RISE_MS}ms ease-out`,
        pointerEvents: "none",
      }}
    >
      <Lottie animationData={ANIMATIONS[entry.type]} loop={false} autoplay />
    </div>
  );
}
