import Lottie from "lottie-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { ReactionIcon } from "@/components/reactionIcons";
import { EXTRA_REACTION_BY_ID } from "@/domain/extraReactions";
import { DEFAULT_REACTIONS } from "@/domain/reactions";
import type { ReactionDisplayMode } from "@/domain/settings";

import { EXTRA_ANIMATIONS } from "./extraAnimations";
import cryData from "./lottie/cry.json";
import favData from "./lottie/fav.json";
import middleFingerData from "./lottie/middle_finger.json";
import smileData from "./lottie/smile.json";
import thumbsUpData from "./lottie/thumbs_up.json";

/**
 * id → Lottie。デフォルト 5 種（キー＝リアクション名）に、エクストラ
 * （キー＝Noto コードポイント）を統合する。未知 id は {@link ReactionPush} で弾く。
 */
const ANIMATIONS: Record<string, object> = {
  fav: favData,
  middle_finger: middleFingerData,
  thumbs_up: thumbsUpData,
  smile: smileData,
  cry: cryData,
  ...EXTRA_ANIMATIONS,
};

/** id → react-icons キー（デフォルト∪エクストラ）。バッジ表示で使う。 */
const REACT_ICON_BY_ID: Record<string, string> = {
  ...Object.fromEntries(DEFAULT_REACTIONS.map((r) => [r.id, r.reactIcon])),
  ...Object.fromEntries(
    Object.values(EXTRA_REACTION_BY_ID).map((r) => [r.id, r.reactIcon]),
  ),
};

const SIZE_PX = 72;
/** 左寄り表示のアイコンサイズ（通常表示より小さめ）。 */
const LEFT_SIZE_PX = 44;
/** 通常表示: 上昇 → 最上部で静止 → フェアウト の各時間。 */
const RISE_MS = 1500;
const NORMAL_HOLD_MS = 900;
const NORMAL_FADE_MS = 500;
/** 左寄り表示が画面最下部→最上部を上りきるまでの時間。 */
const LEFT_TRAVEL_MS = 5000;
/** バッジ表示の表示時間。 */
const BADGE_MS = 4000;

/** play() 1 回分の入力（ReactionView 経由）。 */
export interface ReactionPush {
  /** デフォルト名 or エクストラ id。 */
  id: string;
  /** 送信者名（バッジ表示用）。 */
  userName?: string;
  /** 表示方法。 */
  mode: ReactionDisplayMode;
}

interface Entry extends ReactionPush {
  /** 一意キー。 */
  key: number;
  /** 通常表示: 開始/終了の bottom(px)、左位置(%)。 */
  leftPct: number;
  bottomStartPx: number;
  bottomEndPx: number;
  /** 左寄り表示: 基準左位置(%)・揺れ振幅(%)・周波数・位相。 */
  baseLeftPct: number;
  ampPct: number;
  cycles: number;
  phase: number;
}

export interface ReactionLayerHandle {
  push: (p: ReactionPush) => void;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

export function ReactionLayer({
  register,
}: {
  register: (handle: ReactionLayerHandle) => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let seq = 0;
    register({
      push: (p) => {
        // 未知 id（カタログ外）は描画素材が無いので無視する。
        if (!ANIMATIONS[p.id]) return;
        seq += 1;
        const start = 120 + randInt(-30, 30);
        setEntries((prev) => [
          ...prev,
          {
            ...p,
            key: seq,
            leftPct: randInt(5, 95),
            bottomStartPx: start,
            bottomEndPx: start + 240,
            // 左寄り: 既定 12% を中心に少しだけランダム。揺れは控えめに。
            baseLeftPct: 12 + rand(-3, 3),
            ampPct: rand(1.5, 3),
            cycles: rand(1.5, 2.5),
            phase: rand(0, Math.PI * 2),
          },
        ]);
      },
    });
  }, [register]);

  const remove = (key: number) =>
    setEntries((prev) => prev.filter((e) => e.key !== key));

  const floating = entries.filter((e) => e.mode !== "badge");
  const badges = entries.filter((e) => e.mode === "badge");

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
      {floating.map((e) =>
        e.mode === "left" ? (
          <LeftItem key={e.key} entry={e} onDone={() => remove(e.key)} />
        ) : (
          <NormalItem key={e.key} entry={e} onDone={() => remove(e.key)} />
        ),
      )}

      {/* バッジ表示: 右下に積み上げる。新しいものほど下に表示する（column 順 ＝
          配列の末尾＝最新が一番下）。プレイヤーのコントロールバーに重ならないよう
          少し上げる。各バッジは自前のタイマーで個別に消える（BadgeItem 参照）。 */}
      <div
        style={{
          position: "absolute",
          right: 12,
          bottom: 64,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
          maxWidth: "60%",
        }}
      >
        {badges.map((e) => (
          <BadgeItem key={e.key} entry={e} onDone={() => remove(e.key)} />
        ))}
      </div>
    </div>
  );
}

/**
 * 通常表示: 下から上へ浮上し、最上部で少し静止してからフェードアウトする。
 * 上昇(bottom)は最初から、フェード(opacity)は静止後に始める。
 */
function NormalItem({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const [bottom, setBottom] = useState(entry.bottomStartPx);
  const [opacity, setOpacity] = useState(1);
  // onDone を ref で保持し、タイマーはマウント時1回だけ設定する。
  // こうすると、他のリアクション追加で親が再レンダーしても
  // タイマーがリセットされない。
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    // 上昇を開始（フェードはまだしない＝最上部で静止して見える）。
    const raf = requestAnimationFrame(() => setBottom(entry.bottomEndPx));
    // 上昇しきって静止したあとにフェードアウトを開始。
    const fade = window.setTimeout(
      () => setOpacity(0),
      RISE_MS + NORMAL_HOLD_MS,
    );
    const done = window.setTimeout(
      () => onDoneRef.current(),
      RISE_MS + NORMAL_HOLD_MS + NORMAL_FADE_MS,
    );
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fade);
      clearTimeout(done);
    };
    // entry は追加後に変わらないため deps から除外して安全。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        transition: `bottom ${RISE_MS}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${NORMAL_FADE_MS}ms ease-out`,
        pointerEvents: "none",
      }}
    >
      <Lottie animationData={ANIMATIONS[entry.id]} loop={false} autoplay />
    </div>
  );
}

/**
 * 左寄り表示: 画面左側を、最下部→最上部へゆっくり上りながら sin カーブで左右に
 * 揺れる。sin の連続更新が要るので rAF で毎フレーム位置を更新する。
 */
function LeftItem({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // 位置・不透明度は ref で直接書き換える。これらを JSX の `style` に置くと、
  // 別のリアクション追加で親が再レンダーするたびに React が style を再適用して
  // 位置がリセットされてしまう（＝全アイコンが最下部に戻る）。JSX style には
  // 静的プロパティだけを置き、アニメ対象は React に管理させない。
  // onDone も ref 経由にして、追加時のマウントのみでタイマーを設定する。
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const startedAt = performance.now();
    let raf = 0;
    const apply = (t: number): void => {
      const bottomPct = t * 100; // 最下部 → 最上部
      const x =
        entry.baseLeftPct +
        entry.ampPct * Math.sin(t * entry.cycles * Math.PI * 2 + entry.phase);
      const fadeIn = Math.min(1, t / 0.06);
      const fadeOut = t > 0.85 ? Math.max(0, 1 - (t - 0.85) / 0.15) : 1;
      el.style.bottom = `${bottomPct}%`;
      el.style.left = `${x}%`;
      el.style.opacity = String(Math.min(fadeIn, fadeOut));
    };
    apply(0); // 初期位置を paint 前に確定（チラつき防止）。
    const tick = (now: number): void => {
      const t = (now - startedAt) / LEFT_TRAVEL_MS; // 0 → 1
      if (t >= 1) {
        onDoneRef.current();
        return;
      }
      apply(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // entry は追加後に変わらないため deps から除外して安全。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        width: LEFT_SIZE_PX,
        height: LEFT_SIZE_PX,
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }}
    >
      <Lottie animationData={ANIMATIONS[entry.id]} loop autoplay />
    </div>
  );
}

/** バッジ表示: 「ユーザー名 : リアクション」を右下に小さく出す。 */
function BadgeItem({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const [opacity, setOpacity] = useState(0);
  // onDone を ref で保持してマウント時のみタイマーを設定する。
  // これにより新バッジが追加されて親が再レンダーしても、既存バッジのタイマーが
  // リセットされず、それぞれ独立して消えていく。
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const rafIn = requestAnimationFrame(() => setOpacity(1));
    const fadeOut = window.setTimeout(() => setOpacity(0), BADGE_MS - 400);
    const done = window.setTimeout(() => onDoneRef.current(), BADGE_MS);
    return () => {
      cancelAnimationFrame(rafIn);
      clearTimeout(fadeOut);
      clearTimeout(done);
    };
    // マウント時1回のみ実行する（onDone は ref 経由で常に最新）。

  }, []);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        maxWidth: "100%",
        padding: "4px 8px",
        borderRadius: 8,
        background: "rgba(17, 17, 17, 0.85)",
        color: "#fff",
        fontSize: 12,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
        opacity,
        transition: "opacity 300ms ease",
      }}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 160,
        }}
      >
        {entry.userName || "ゲスト"}
      </span>
      <span style={{ opacity: 0.6 }}>:</span>
      <span style={{ display: "inline-flex", fontSize: 16 }}>
        <ReactionIcon iconKey={REACT_ICON_BY_ID[entry.id]} />
      </span>
    </div>
  );
}
