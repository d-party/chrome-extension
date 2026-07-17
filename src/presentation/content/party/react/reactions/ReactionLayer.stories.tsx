import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useRef } from "react";

import type { ReactionDisplayMode } from "@/domain/settings";

import { ReactionLayer, type ReactionLayerHandle } from "./ReactionLayer";

/** デフォルト 5 種のリアクション id（ANIMATIONS のキーと一致）。 */
const REACTION_IDS = [
  "smile",
  "cry",
  "thumbs_up",
  "fav",
  "middle_finger",
] as const;

/**
 * リアクションのオーバーレイ本体（React コンポーネント）。プレイヤー要素へ重ねる
 * `ReactionViewReact` アダプタ（dアニメの `.videoWrapper` / DMM の `#vodWrapper` に
 * マウント）が内部で描画する。`register` で受け取る imperative handle の `push()` を
 * 呼ぶとアニメーションが 1 つ再生される。
 *
 * Storybook では実プレイヤーが無いので、黒いプレイヤー相当の枠を用意し、ボタンから
 * `push()` を叩いて各表示モード（通常 / 左寄り / バッジ）を確認できるようにする。
 */
const meta: Meta<typeof ReactionLayer> = {
  title: "Party/ReactionLayer",
  component: ReactionLayer,
  parameters: { layout: "centered" },
};

export default meta;

type Story = StoryObj<typeof ReactionLayer>;

/** プレイヤー相当の枠に `ReactionLayer` を重ね、ボタンで `push()` を発火する。 */
function Stage({ mode }: { mode: ReactionDisplayMode }) {
  const handleRef = useRef<ReactionLayerHandle | null>(null);
  // register の同一性を保ち、再レンダーでの再登録（seq リセット）を避ける。
  const register = useCallback((handle: ReactionLayerHandle) => {
    handleRef.current = handle;
  }, []);
  const push = (id: string) =>
    handleRef.current?.push({ id, mode, userName: "ゲスト" });

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="relative aspect-video w-[480px] overflow-hidden rounded-lg bg-black">
        <ReactionLayer register={register} />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {REACTION_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
            onClick={() => push(id)}
          >
            {id}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 通常表示: 下から浮上 → 最上部で静止 → フェードアウト。 */
export const Normal: Story = { render: () => <Stage mode="normal" /> };

/** 左寄り表示: 画面左下から左上へ、控えめに揺れながら上りきる。 */
export const Left: Story = { render: () => <Stage mode="left" /> };

/** バッジ表示: 送信者名つきで右下に積み上げ、一定時間で個別に消える。 */
export const Badge: Story = { render: () => <Stage mode="badge" /> };
