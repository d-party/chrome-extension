import { getParam, makeFontFace } from "../dom/utils";
import { ChromeStorageSettingsRepository } from "@/infrastructure/storage/ChromeStorageSettingsRepository";
import { DEFAULT_SETTINGS, type Settings } from "@/domain/settings";

/**
 * Content script for the dアニメストア episode-list pages (ci_pc / tp_pc).
 * Adds "open in another tab" (play) and "create party" (popper) icons to each
 * episode.
 *
 * It also decorates the episode detail modal (opened on ci_pc): depending on the
 * "動画は全て別タブで開く" (autoAnotherTab) setting, either the page's own 視聴する
 * button is hijacked to open the player in a new tab, or an extra "別タブで開く"
 * icon button is shown next to it.
 *
 * Ported from the original store.js. Robustness fixes over the original:
 *  - content scripts run at `document_idle`, frequently *after* `window.load`
 *    has fired, so a bare `load` listener never ran and no icons appeared —
 *    we run immediately when the document is already loaded;
 *  - the episode list is loaded/extended dynamically (Swiper), so we
 *    (idempotently) re-decorate as new items appear via a MutationObserver.
 *
 * The original also injected an inline <script> into the page to strip dアニメ
 * ストア's own click handlers; that violated the page CSP (inline scripts are
 * blocked) and never worked from the isolated world, so it has been removed.
 *
 * Layout: the buttons are added as an absolutely-positioned overlay on top of
 * the card (see public/css/style.css). We deliberately do NOT restructure
 * dアニメストア's native list layout (no flexbox / width overrides on the
 * <section>/<a>). The previous approach shrank the real link to 80% and made
 * the icons flex siblings at height:100%, which stretched the row and drew a
 * line between the thumbnail and its frame — worse when an episode carried a
 * NEW tag (`optionIconContainer`) that changed the card height.
 */

const DECORATED_ATTR = "data-dparty-decorated";
const MODAL_DECORATED_ATTR = "data-dparty-modal-decorated";
const PLAYLINK_ATTR = "data-dparty-playlink";

const settingsRepo = new ChromeStorageSettingsRepository();
/**
 * Cached settings, kept in sync with chrome.storage. The 視聴する click handler
 * reads this live, so toggling the setting takes effect without reloading; the
 * extra button's visibility is refreshed on each `decorate()`.
 */
let currentSettings: Settings = DEFAULT_SETTINGS;

makeFontFace();
ready(main);
void loadSettings();

function main(): void {
  decorate();
  // Re-decorate as the (dynamically loaded) list grows and as the detail modal
  // opens/navigates. Idempotent: already decorated nodes are skipped.
  const observer = new MutationObserver(() => decorate());
  observer.observe(document.body, { childList: true, subtree: true });
}

function decorate(): void {
  decorateEpisodes();
  decorateModal();
  decoratePlaylinks();
}

async function loadSettings(): Promise<void> {
  currentSettings = await settingsRepo.getAll();
  decorate();
  settingsRepo.onChange((next) => {
    currentSettings = next;
    decorate();
  });
}

/** Add the play/popper icons to every not-yet-decorated episode link. */
function decorateEpisodes(): void {
  const itemList = document.querySelectorAll<HTMLAnchorElement>(".itemModule.list a");

  for (const item of Array.from(itemList)) {
    const href = item.getAttribute("href");
    if (!href || !/cd_pc/.test(href)) continue;
    if (item.hasAttribute(DECORATED_ATTR)) continue;
    item.setAttribute(DECORATED_ATTR, "1");

    const partId = href.replace(/[^0-9]/g, "");
    if (item.classList.contains("watched")) {
      item.parentElement?.classList.add("watched_episode");
    }

    const overlay = document.createElement("div");
    overlay.className = "dparty-overlay";
    overlay.appendChild(
      createButton({
        icon: "play_circle_filled",
        variant: "play",
        tooltip: "別タブで再生",
        href: "sc_d_pc?partId=" + partId,
      }),
    );
    overlay.appendChild(
      createButton({
        icon: "groups",
        variant: "party",
        tooltip: "パーティールームを作成",
        href: "sc_d_pc?partId=" + partId + "&party=create",
      }),
    );
    item.parentElement?.appendChild(overlay);
  }
}

/**
 * Build a single shadcn-like icon button.
 *
 * We deliberately use a <button>, not an <a>: dアニメストア styles `.itemModule
 * .list a` directly (hover underline, `position`, its own click handlers), and
 * those rules outrank ours, so as an <a> the underline showed through and our
 * `position: relative` (needed to anchor the tooltip) was overridden. A <button>
 * matches none of those `a` selectors, so all of it goes away at once. Navigation
 * is done by us via window.open below, so we don't need anchor semantics.
 */
function createButton(opts: {
  icon: string;
  variant: "play" | "party";
  tooltip: string;
  href: string;
}): HTMLButtonElement {
  // Resolve the relative href against the current page so window.open gets an
  // absolute URL (a <button> can't resolve it for us like an <a> would).
  const url = new URL(opts.href, window.location.href).href;
  return iconButton({
    icon: opts.icon,
    className: `dparty-btn dparty-btn--${opts.variant}`,
    tooltip: opts.tooltip,
    onClick: () => window.open(url, "_blank", "noopener"),
  });
}

/**
 * Build a shadcn-like icon <button>.
 *
 * We deliberately use a <button>, not an <a>: dアニメストア styles `.itemModule
 * .list a` directly (hover underline, `position`, its own click handlers), and
 * those rules outrank ours, so as an <a> the underline showed through and our
 * `position: relative` (needed to anchor the tooltip) was overridden. A <button>
 * matches none of those `a` selectors. Navigation is done by us in `onClick`, so
 * we don't need anchor semantics.
 */
function iconButton(opts: {
  icon: string;
  className: string;
  tooltip: string;
  onClick: () => void;
}): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = opts.className;
  button.setAttribute("aria-label", opts.tooltip);

  // dアニメストア attaches its own click handlers; run on the capture phase and
  // stop the event before the page's handlers see it, so a single click acts.
  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideTooltip();
      opts.onClick();
    },
    true,
  );

  // Tooltip is rendered at document.body level (see showTooltip): a CSS pseudo
  // tooltip is clipped by the Swiper container's overflow:hidden (the right-most
  // card's tooltip gets cut off at the carousel edge) and can't escape via
  // z-index, since the swiper-wrapper's transform also traps position:fixed.
  button.addEventListener("mouseenter", () => showTooltip(button, opts.tooltip));
  button.addEventListener("mouseleave", hideTooltip);
  button.addEventListener("focus", () => showTooltip(button, opts.tooltip));
  button.addEventListener("blur", hideTooltip);

  // The icon font lives in an inner span so material-icons' font/size styling
  // can't leak onto the button box (and break its layout).
  const glyph = document.createElement("span");
  glyph.className = "material-icons";
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = opts.icon;
  button.appendChild(glyph);

  return button;
}

/**
 * A single tooltip element shared by every injected button, appended to
 * document.body so it is never clipped by the Swiper carousel's overflow:hidden
 * and always paints on top. Positioned with position:fixed using the button's
 * viewport rect.
 */
let tooltipEl: HTMLDivElement | null = null;

function showTooltip(target: HTMLElement, text: string): void {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "dparty-tooltip";
    document.body.appendChild(tooltipEl);
  }
  tooltipEl.textContent = text;
  const rect = target.getBoundingClientRect();
  // Anchor the bubble's bottom-center 8px above the button (offset via CSS transform).
  tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
  tooltipEl.style.top = `${rect.top}px`;
  tooltipEl.classList.add("dparty-tooltip--visible");
}

function hideTooltip(): void {
  tooltipEl?.classList.remove("dparty-tooltip--visible");
}

/**
 * Decorate the episode detail modal's 視聴する button (opened on ci_pc).
 *
 * - autoAnotherTab ON  : clicking 視聴する opens the player in a new tab instead
 *   of playing inline.
 * - autoAnotherTab OFF : 視聴する keeps its native behavior and an extra
 *   "別タブで視聴する" icon button overlays its right edge.
 *
 * We do NOT reparent or resize 視聴する. The extra button is appended INSIDE the
 * 視聴する pill and absolutely positioned just past its right edge (see css). This
 * matters: #streamingQuality is a flex "quality list", so a button placed as its
 * direct child counts as a second list item and the page's rules shrink 視聴する
 * to half width. Nested in 視聴する, it is out of that flex flow, so 視聴する keeps
 * its native centered width and our button sits in the empty space beside it.
 * The 視聴する handler reads the setting live, and the extra button's visibility
 * is refreshed every run, so toggling the setting takes effect immediately.
 */
function decorateModal(): void {
  const quality = document.querySelector("#streamingQuality");
  const watchButton = quality?.querySelector<HTMLElement>("a.normal");
  if (!quality || !watchButton) return;

  if (!quality.hasAttribute(MODAL_DECORATED_ATTR)) {
    quality.setAttribute(MODAL_DECORATED_ATTR, "1");

    // Hijack 視聴する only while "open all in new tab" is on (checked live).
    watchButton.addEventListener(
      "click",
      (event) => {
        if (!currentSettings.autoAnotherTab) return; // keep native inline play
        if (!openPlayerInNewTab()) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true,
    );

    // Extra button for the OFF case, anchored to 視聴する's right edge (CSS).
    const openButton = iconButton({
      icon: "open_in_new",
      className: "dparty-btn dparty-btn--play dparty-modal-open",
      tooltip: "別タブで視聴する",
      onClick: () => openPlayerInNewTab(),
    });
    // Anchor for the absolutely-positioned button; relative with no offsets does
    // not move or resize 視聴する itself.
    watchButton.style.position = "relative";
    watchButton.appendChild(openButton);
  }

  const openButton = quality.querySelector(".dparty-modal-open");
  openButton?.classList.toggle("dparty-hidden", currentSettings.autoAnotherTab);
}

/**
 * Hijack the "今すぐ視聴する" links in the hover popups shown across dアニメストア
 * (top page, genre/series lists, etc.): when "動画は全て別タブで開く" is on, open
 * the player in a new tab instead of playing inline. Otherwise leave them alone.
 * These links carry the partId directly in `data-partid`.
 */
function decoratePlaylinks(): void {
  const links = document.querySelectorAll<HTMLElement>("a.playlink[data-partid]");

  for (const link of Array.from(links)) {
    if (link.hasAttribute(PLAYLINK_ATTR)) continue;
    link.setAttribute(PLAYLINK_ATTR, "1");

    link.addEventListener(
      "click",
      (event) => {
        if (!currentSettings.autoAnotherTab) return; // keep native inline play
        const partId = link.getAttribute("data-partid");
        if (!partId) return;
        event.preventDefault();
        event.stopPropagation();
        const url = new URL("sc_d_pc?partId=" + partId, window.location.href).href;
        window.open(url, "_blank", "noopener");
      },
      true,
    );
  }
}

/**
 * Open the currently-shown episode in the player in a new tab. Returns false if
 * the partId could not be resolved (so callers can fall back to native behavior).
 */
function openPlayerInNewTab(): boolean {
  const partId = currentPartId();
  if (!partId) return false;
  const url = new URL("sc_d_pc?partId=" + partId, window.location.href).href;
  window.open(url, "_blank", "noopener");
  return true;
}

/**
 * The partId of the episode currently shown in the modal. Read from the modal
 * thumbnail's filename (`.../28724001_1_1.png`) so it stays correct as the user
 * pages prev/next; falls back to the page URL's partId.
 */
function currentPartId(): string | null {
  const img = document.querySelector<HTMLImageElement>("#modalThumbImg");
  const src = img?.getAttribute("src") ?? img?.getAttribute("data-src") ?? "";
  const match = src.match(/\/(\d+)_\d+_\d+\.(?:png|jpe?g)/i);
  return match ? match[1] : getParam("partId");
}

/** Run `fn` now if the document has finished loading, otherwise on `load`. */
function ready(fn: () => void): void {
  if (document.readyState === "complete") {
    fn();
  } else {
    window.addEventListener("load", fn, false);
  }
}
