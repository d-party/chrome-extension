/**
 * Shared shadcn-like icon button + body-level tooltip for the page decorators.
 *
 * Extracted from `content/store/index.ts` so both the dアニメストア episode-list
 * decorator and the DMM TV detail-page decorator inject an identical button
 * (styling/behaviour live in `public/css/style.css` の `dparty-*`). Keeping this
 * in one place is the "共通化すべきコード" for page decoration; each site's
 * *where/what to inject* stays in its own decorator ("個別で書くべきコード").
 */

/**
 * Build a shadcn-like icon `<button>`.
 *
 * We deliberately use a `<button>`, not an `<a>`: dアニメストア styles
 * `.itemModule .list a` directly (hover underline, `position`, its own click
 * handlers), and those rules outrank ours, so as an `<a>` the underline showed
 * through and our `position: relative` (needed to anchor the tooltip) was
 * overridden. A `<button>` matches none of those `a` selectors. Navigation is
 * done by the caller in `onClick`, so we don't need anchor semantics.
 */
export function iconButton(opts: {
  icon: string;
  className: string;
  tooltip: string;
  onClick: () => void;
}): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = opts.className;
  button.setAttribute("aria-label", opts.tooltip);

  // Host pages attach their own click handlers; run on the capture phase and
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
  // tooltip is clipped by a carousel/scroll container's overflow:hidden and
  // can't escape via z-index when an ancestor transform traps position:fixed.
  button.addEventListener("mouseenter", () =>
    showTooltip(button, opts.tooltip),
  );
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
 * document.body so it is never clipped by a carousel's overflow:hidden and
 * always paints on top. Positioned with position:fixed using the button's
 * viewport rect.
 */
let tooltipEl: HTMLDivElement | null = null;

export function showTooltip(target: HTMLElement, text: string): void {
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

export function hideTooltip(): void {
  tooltipEl?.classList.remove("dparty-tooltip--visible");
}
