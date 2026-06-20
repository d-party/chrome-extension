/** DOM/URL helpers shared by the content scripts (port of the old utils.js). */

/** Read a query-string parameter (defaults to the current page URL). */
export function getParam(name: string, url: string = window.location.href): string | null {
  const escaped = name.replace(/[[\]]/g, "\\$&");
  const regex = new RegExp("[?&]" + escaped + "(=([^&#]*)|&|#|$)");
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/** Inject the Material Icons stylesheet. */
export function makeFontFace(): void {
  const link = document.createElement("link");
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");
  link.setAttribute("href", "https://fonts.googleapis.com/icon?family=Material+Icons");
  document.head.appendChild(link);
}

/** Inclusive random integer in [min, max]. */
export function getRandomIntInclusive(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min);
}
