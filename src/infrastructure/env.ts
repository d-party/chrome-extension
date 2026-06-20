/**
 * Backend connection configuration.
 *
 * Port of the old `js/common/settings.js` constants.
 *
 * Currently set to the **local development** backend (the docker-compose stack
 * served via nginx on localhost). For production, switch back to:
 *   BACKEND_HOST = "d-party.net/";
 *   BACKEND_PROTOCOL = "https://";
 *   WEBSOCKET_PROTOCOL = "wss://";
 */

export const BACKEND_HOST = "localhost/";
export const BACKEND_PROTOCOL = "http://";
export const WEBSOCKET_PROTOCOL = "ws://";

export const API_ENDPOINT = `${BACKEND_PROTOCOL}${BACKEND_HOST}api/v1/`;
export const VERSION_CHECK_ENDPOINT = `${API_ENDPOINT}chrome-extension/version-check`;

export const ANIMESTORE_HOST = `${BACKEND_HOST}anime-store/`;
export const WEBSOCKET_ENDPOINT = `${WEBSOCKET_PROTOCOL}${ANIMESTORE_HOST}party/`;
export const ANIMESTORE_REDIRECT_ENDPOINT = `${BACKEND_PROTOCOL}${ANIMESTORE_HOST}lobby/`;

/** Base URL (no trailing slash) used by the generated REST client. */
export const API_BASE_URL = `${BACKEND_PROTOCOL}${BACKEND_HOST}`.replace(/\/$/, "");

/** Facebook app id (required for the share button). */
export const FACEBOOK_APP_ID = "256850306460920";
