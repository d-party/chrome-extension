import { getParam, makeFontFace } from "../../dom/utils";
import { iconButton } from "../../dom/iconButton";

/**
 * Content script for the DMM TV title detail page (`https://tv.dmm.com/vod/detail/*`).
 *
 * Adds a "パーティールームを作成" icon to the pre-playback detail header — the
 * action row next to the native お気に入り / シェア buttons — mirroring the
 * "create party" icon the store decorator adds to each dアニメストア episode.
 *
 * DMM TV は React の SPA でルート遷移が動的（ヘッダ/エピソード一覧が後から差し込まれる）
 * なので、store/index.ts と同様に MutationObserver で冪等に再注入する。
 *
 * NOTE（PR2 で確定）: 実際の再生プレイヤーの同期（PlayerControllerDmm / SiteAdapter）と、
 * 詳細→プレイヤー遷移後にパーティーを起動する content script は、DMM 再生ページの DOM
 * 確定後に追加する。本 content script は詳細ページに導線（アイコン）を出し、`party=create`
 * マーカー付きの視聴 URL を構築するところまでを担う。
 */

const DECORATED_ATTR = "data-dparty-dmm-party";

makeFontFace();
ready(main);

function main(): void {
  decorate();
  // ヘッダ/アクション行は SPA で後から現れる・作品遷移で作り替わるため、body の
  // 変化を監視して冪等に再注入する（既に注入済みならスキップ）。
  const observer = new MutationObserver(() => decorate());
  observer.observe(document.body, { childList: true, subtree: true });
}

/** アクション行にパーティーアイコンを一度だけ注入する。 */
function decorate(): void {
  const row = findActionRow();
  if (!row) return;
  if (row.querySelector(`[${DECORATED_ATTR}]`)) return;

  const button = iconButton({
    icon: "groups",
    className: "dparty-btn dparty-btn--party",
    tooltip: "パーティールームを作成",
    onClick: openCreatePartyInNewTab,
  });
  button.setAttribute(DECORATED_ATTR, "1");

  // DMM のアクションボタン（お気に入り/シェア）と縦位置を揃えるため、行に直接 append する。
  row.appendChild(button);
}

/**
 * お気に入り / シェアが並ぶアクション行を探す。DMM の Tailwind クラスは不安定なので、
 * aria-label（`お気に入りボタン` / `シェアボタン`）を起点に最も近い横並び行を辿る。
 */
function findActionRow(): HTMLElement | null {
  const anchor =
    document.querySelector('button[aria-label="お気に入りボタン"]') ??
    document.querySelector('[aria-label="シェアボタン"]');
  if (!anchor) return null;
  // アイコンが横並びする grid 行（`<div class="grid grid-flow-col gap-3 items-center">`）。
  const row = anchor.closest("div.grid");
  if (row instanceof HTMLElement) return row;
  // フォールバック: 起点の 2 つ上の親（お気に入りボタンのラッパの親）に寄せる。
  const fallback = anchor.parentElement?.parentElement;
  return fallback instanceof HTMLElement ? fallback : null;
}

/**
 * 現在の作品でパーティールーム作成を開始する。DMM の再生ページ
 * （`/vod/playback/on-demand/?season=..&content=..`）へ `party=create` を付けて
 * 新規タブで開く。再生ページの content script（`content/dmm/player`）が
 * `party=create` を読み取ってルーム作成 UI を出す。
 *
 * season/content は詳細ページ URL から引き継ぐ。content が取れない場合は最初の
 * エピソードリンクから補完する。
 */
function openCreatePartyInNewTab(): void {
  const season = getParam("season");
  const content = getParam("content") ?? firstEpisodeContentId();
  const url = new URL("/vod/playback/on-demand/", window.location.origin);
  if (season) url.searchParams.set("season", season);
  if (content) url.searchParams.set("content", content);
  url.searchParams.set("party", "create");
  window.open(url.href, "_blank", "noopener");
}

/** 詳細ページの最初のエピソードリンク（`?...&content=..`）から content id を得る。 */
function firstEpisodeContentId(): string | null {
  const link = document.querySelector<HTMLAnchorElement>(
    'a[href*="/vod/detail/"][href*="content="]',
  );
  if (!link) return null;
  const href = link.getAttribute("href") ?? "";
  return getParam("content", new URL(href, window.location.origin).href);
}

/** Run `fn` now if the document has finished loading, otherwise on `load`. */
function ready(fn: () => void): void {
  if (document.readyState === "complete") {
    fn();
  } else {
    window.addEventListener("load", fn, false);
  }
}
