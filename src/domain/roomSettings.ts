/**
 * ルームごとの詳細設定（サーバ側 `Setting` と 1:1 対応）。
 *
 * ここでの型はフロント内部の camelCase 表現。ワイヤ表現（snake_case）への変換は
 * {@link toWire} / {@link fromWire} で行う。バックエンドは設定を送らないクライアントを
 * すべて既定値（false）として扱うため、これらは後方互換の既定として使う。
 */
export interface RoomSettings {
  /**
   * 一方通行（アクセラレーター）モード。オーナーのみが動画を操作できる。
   * ルームの自動削除とは独立（`ownerLeaveDelete` を含意しない）。
   */
  oneWay: boolean;
  /** オーナー退室時にルームを自動削除する。`oneWay` とは独立して設定できる。 */
  ownerLeaveDelete: boolean;
  /** リアクションを禁止する（送信も記録もしない。自分の画面にだけ表示）。 */
  disableReaction: boolean;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  oneWay: false,
  ownerLeaveDelete: false,
  disableReaction: false,
};

/** 既定値（すべて false）と等しいか。create 時に不要な update 送信を避けるのに使う。 */
export function isDefaultRoomSettings(settings: RoomSettings): boolean {
  return (
    !settings.oneWay && !settings.ownerLeaveDelete && !settings.disableReaction
  );
}

/**
 * 各設定の表示名。オーナーが詳細設定を変更したとき、ルーム内の参加者へ出す
 * 「『◯◯』を有効化しました」通知の `◯◯` に使う。
 */
export const ROOM_SETTING_LABELS: Record<keyof RoomSettings, string> = {
  oneWay: "一方通行モード",
  ownerLeaveDelete: "オーナー退室時の自動削除",
  disableReaction: "リアクション禁止",
};

/** {@link diffRoomSettings} が返す、変化した 1 設定の内容。 */
export interface RoomSettingChange {
  key: keyof RoomSettings;
  /** 表示名（{@link ROOM_SETTING_LABELS}）。 */
  label: string;
  /** 変更後の値。true なら有効化、false なら無効化。 */
  enabled: boolean;
}

/**
 * 2 つの設定を比較し、値が変化したフィールドだけを列挙する。`room_setting` 受信時に
 * 「何が有効化/無効化されたか」の通知を組み立てるために使う。変化が無ければ空配列。
 */
export function diffRoomSettings(
  previous: RoomSettings,
  next: RoomSettings,
): RoomSettingChange[] {
  const keys: (keyof RoomSettings)[] = [
    "oneWay",
    "ownerLeaveDelete",
    "disableReaction",
  ];
  return keys
    .filter((key) => previous[key] !== next[key])
    .map((key) => ({
      key,
      label: ROOM_SETTING_LABELS[key],
      enabled: next[key],
    }));
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
