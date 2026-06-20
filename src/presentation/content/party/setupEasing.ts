import $ from "jquery";

/**
 * Registers the `easeOutQuart` easing the original code relied on (previously
 * provided by the jquery.easing plugin), so jQuery animations keep their feel
 * without pulling in an extra dependency.
 */
const easing = $.easing as Record<string, (p: number) => number>;
if (!easing.easeOutQuart) {
  easing.easeOutQuart = (p: number) => 1 - Math.pow(1 - p, 4);
}
