/**
 * Connection state of the party WebSocket.
 *
 * `idle`      — no connection attempt yet (before clicking create/join)
 * `connected` — the server has acknowledged `create` or `join`
 * `failed`    — the WebSocket closed (either before ack, or after a previous
 *               successful connect)
 */
export type ConnectionStatus = "idle" | "connected" | "failed";
