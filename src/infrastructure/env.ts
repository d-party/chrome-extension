/**
 * Backend connection configuration.
 *
 * Port of the old `js/common/settings.js` constants. To target a local backend
 * for development, change these to e.g. `localhost/`, `http://`, `ws://`.
 */

export const BACKEND_HOST = "d-party.net/";
export const BACKEND_PROTOCOL = "https://";
export const WEBSOCKET_PROTOCOL = "wss://";

export const API_ENDPOINT = `${BACKEND_PROTOCOL}${BACKEND_HOST}api/v1/`;
export const VERSION_CHECK_ENDPOINT = `${API_ENDPOINT}chrome-extension/version-check`;

export const ANIMESTORE_HOST = `${BACKEND_HOST}anime-store/`;
export const WEBSOCKET_ENDPOINT = `${WEBSOCKET_PROTOCOL}${ANIMESTORE_HOST}party/`;
export const ANIMESTORE_REDIRECT_ENDPOINT = `${BACKEND_PROTOCOL}${ANIMESTORE_HOST}lobby/`;

/** Base URL (no trailing slash) used by the generated REST client. */
export const API_BASE_URL = `${BACKEND_PROTOCOL}${BACKEND_HOST}`.replace(/\/$/, "");

/** Facebook app id (required for the share button). */
export const FACEBOOK_APP_ID = "256850306460920";
