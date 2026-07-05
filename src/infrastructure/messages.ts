/**
 * chrome.runtime メッセージの契約（content script ↔ background service worker）。
 *
 * Chrome の Local Network Access により、パブリックなページ（dアニメストア）に注入
 * された content script から localhost への直接 fetch はユーザー許可が無いと弾かれる。
 * host_permissions を持つ background service worker は LNA のページ許可ゲート対象外の
 * ため、localhost を叩く必要のあるリクエストは background へ委譲する。
 */

/** サイドバーのヘルスチェック依頼。background が代理 fetch する。 */
export interface HealthCheckRequest {
  type: "healthCheck";
}

/** ヘルスチェックの結果。`ok` はレスポンスが 2xx だったか。 */
export interface HealthCheckResponse {
  ok: boolean;
}
