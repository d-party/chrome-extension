import { getParam } from "../../dom/utils";
import { mountDmmPartyButton } from "../../dom/dmmPartyButton";

/**
 * Content script for DMM TV pages (`https://tv.dmm.com/*`、再生ページは exclude)。
 *
 * 作品詳細ページ（`/vod/detail`）のアクション行（お気に入り/シェアの隣）へ
 * 「パーティールームを作成」アイコンを注入する（注入・SPA 再注入は共有の
 * `mountDmmPartyButton` が担う）。DMM は React の SPA で、トップ/一覧から詳細ページへ
 * クライアント遷移した場合 content script は再実行されないため、manifest の match を
 * `tv.dmm.com/*` へ広げて常駐させ、pathname が /vod/detail のときだけ注入する。
 *
 * クリックすると再生ページ（`/vod/playback/on-demand/?season=..&content=..&party=create`）へ
 * **同じタブで**遷移し、再生ページの content script（content/dmm/player）が party=create を
 * 読み取って作成 UI を出す。
 */

mountDmmPartyButton({ onClick: openCreateParty, shouldRun: isDetailPage });

/** 詳細ページ（/vod/detail）のときだけ注入する（match を tv.dmm.com/* に広げているため）。 */
function isDetailPage(): boolean {
  return window.location.pathname.startsWith("/vod/detail");
}

/**
 * 現在の作品でパーティールーム作成を開始する。DMM の再生ページへ `party=create` を付けて
 * **同じタブで**遷移する（別タブでは開かない）。season/content は詳細ページ URL から引き継ぐ。
 * content が取れない場合は最初のエピソードリンクから補完する。
 */
function openCreateParty(): void {
  const season = getParam("season");
  const content = getParam("content") ?? firstEpisodeContentId();
  const url = new URL("/vod/playback/on-demand/", window.location.origin);
  if (season) url.searchParams.set("season", season);
  if (content) url.searchParams.set("content", content);
  url.searchParams.set("party", "create");
  window.location.href = url.href;
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
