/**
 * Backend connection configuration.
 *
 * Port of the old `js/common/settings.js` constants.
 *
 * 接続先はビルド時の環境変数 `D_PARTY_ENV` で切り替える。`rspack.DefinePlugin`
 * が `process.env.D_PARTY_ENV` をビルド時にリテラルへ置換する（rspack.config.ts 参照）。
 *
 *   既定（未指定）      : 開発用ローカルバックエンド（localhost / http / ws）
 *   D_PARTY_ENV=production: 本番（d-party.net / https / wss）
 *
 * 本番ビルドは `D_PARTY_ENV=production pnpm build`（CI のリリースワークフローが指定）。
 */

const IS_PRODUCTION = process.env.D_PARTY_ENV === "production";

export const BACKEND_HOST = IS_PRODUCTION ? "d-party.net/" : "localhost/";
export const BACKEND_PROTOCOL = IS_PRODUCTION ? "https://" : "http://";
export const WEBSOCKET_PROTOCOL = IS_PRODUCTION ? "wss://" : "ws://";

export const API_ENDPOINT = `${BACKEND_PROTOCOL}${BACKEND_HOST}api/v1/`;
export const HEALTH_CHECK_ENDPOINT = `${API_ENDPOINT}health`;
export const VERSION_CHECK_ENDPOINT = `${API_ENDPOINT}chrome-extension/version-check`;

/**
 * 公開サイト（ホームページ・使い方）の URL。バックエンドと同一ホストで配信されるため、
 * dev では `http://localhost/`、本番では `https://d-party.net/` を指す。
 */
export const SITE_URL = `${BACKEND_PROTOCOL}${BACKEND_HOST}`;
export const USAGE_URL = `${SITE_URL}usage`;

export const ANIMESTORE_HOST = `${BACKEND_HOST}anime-store/`;
export const WEBSOCKET_ENDPOINT = `${WEBSOCKET_PROTOCOL}${ANIMESTORE_HOST}party/`;
export const ANIMESTORE_REDIRECT_ENDPOINT = `${BACKEND_PROTOCOL}${ANIMESTORE_HOST}lobby/`;

/** Base URL (no trailing slash) used by the generated REST client. */
export const API_BASE_URL = `${BACKEND_PROTOCOL}${BACKEND_HOST}`.replace(/\/$/, "");

/** Facebook app id (required for the share button). */
export const FACEBOOK_APP_ID = "256850306460920";
