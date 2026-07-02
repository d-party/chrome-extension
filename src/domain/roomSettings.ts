/**
 * ルームごとの詳細設定（サーバ側 `Setting` と 1:1 対応）。
 *
 * ここでの型はフロント内部の camelCase 表現。ワイヤ表現（snake_case）への変換は
 * {@link toWire} / {@link fromWire} で行う。バックエンドは設定を送らないクライアントを
 * すべて既定値（false）として扱うため、これらは後方互換の既定として使う。
 */
export interface RoomSettings {
  /** 一方通行（アクセラレーター）モード。オーナーのみが動画操作でき、退室で自動削除。 */
  oneWay: boolean;
  /** オーナー退室時にルームを自動削除する。 */
  ownerLeaveDelete: boolean;
  /** リアクションを禁止する（送信も記録もしない。自分の画面にだけ表示）。 */
  disableReaction: boolean;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  oneWay: false,
  ownerLeaveDelete: false,
  disableReaction: false,
};

/** 一方通行モードはオーナー退室時自動削除を含意する（UI/挙動の実効値）。 */
export function effectiveOwnerLeaveDelete(settings: RoomSettings): boolean {
  return settings.ownerLeaveDelete || settings.oneWay;
}

/** 既定値（すべて false）と等しいか。create 時に不要な update 送信を避けるのに使う。 */
export function isDefaultRoomSettings(settings: RoomSettings): boolean {
  return (
    !settings.oneWay && !settings.ownerLeaveDelete && !settings.disableReaction
  );
}

/** サーバ受信（snake_case）→ 内部表現。 */
export function fromWire(wire: {
  one_way?: boolean;
  owner_leave_delete?: boolean;
  disable_reaction?: boolean;
}): RoomSettings {
  return {
    oneWay: wire.one_way ?? false,
    ownerLeaveDelete: wire.owner_leave_delete ?? false,
    disableReaction: wire.disable_reaction ?? false,
  };
}
