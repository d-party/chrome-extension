import { iconButton } from "./iconButton";
import { makeFontFace } from "./utils";

/**
 * DMM TV の「お気に入り / シェア」が並ぶアクション行へ「パーティー作成」アイコンを冪等に
 * 注入する共有ユーティリティ。詳細ページ（`/vod/detail`）と再生ページ（`/vod/playback`）の
 * 両方に同じ形のアクション行があるため、注入処理を一箇所に集約する。
 *
 * DMM は React の SPA でアクション行が後から現れる/作品遷移で作り替わるため、body の変化を
 * MutationObserver で監視して再注入する。`shouldRun` で対象ページを URL 等で絞れる。
 * クリック時の挙動（別ページへ遷移する／その場でサイドバーを開く 等）は `onClick` で渡す。
 */

const DECORATED_ATTR = "data-dparty-dmm-party";

export function mountDmmPartyButton(opts: {
    onClick: () => void;
    shouldRun?: () => boolean;
}): void {
    // Material Icons（"groups" グリフ）を読み込む。
    makeFontFace();

    const decorate = (): void => {
        if (opts.shouldRun && !opts.shouldRun()) return;
        const row = findActionRow();
        if (!row) return;
        if (row.querySelector(`[${DECORATED_ATTR}]`)) return;

        const button = iconButton({
            icon: "groups",
            // dparty-btn--dmm で DMM のアクションボタン（お気に入り/シェア）に合わせた円形・
            // 暗い半透明・白アイコンにする（一覧用の白い角丸四角スタイルを上書き）。
            className: "dparty-btn dparty-btn--party dparty-btn--dmm",
            tooltip: "パーティールームを作成",
            onClick: opts.onClick,
        });
        button.setAttribute(DECORATED_ATTR, "1");
        // DMM のアクションボタンと縦位置を揃えるため、行に直接 append する。
        row.appendChild(button);
    };

    decorate();
    const observer = new MutationObserver(() => decorate());
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * お気に入り / シェアが並ぶアクション行を探す。DMM の Tailwind クラスは不安定なので、
 * aria-label（`お気に入りボタン` / `シェアボタン`）を起点に最も近い横並び行（`div.grid`）を辿る。
 */
function findActionRow(): HTMLElement | null {
    const anchor =
        document.querySelector('button[aria-label="お気に入りボタン"]') ??
        document.querySelector('[aria-label="シェアボタン"]');
    if (!anchor) return null;
    const row = anchor.closest("div.grid");
    if (row instanceof HTMLElement) return row;
    // フォールバック: 起点の 2 つ上の親（お気に入りボタンのラッパの親）に寄せる。
    const fallback = anchor.parentElement?.parentElement;
    return fallback instanceof HTMLElement ? fallback : null;
}
