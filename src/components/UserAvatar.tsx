import { DEFAULT_USER_ICON, USER_ICONS } from "./userIcons";

/**
 * Renders a participant's avatar from a stored react-icons (FA6) key, falling
 * back to the default user icon for missing/unknown keys. Defined at module
 * scope so call sites can render `<UserAvatar .../>` without resolving an icon
 * component during their own render (which the lint rules disallow).
 *
 * The icon is selected by direct map lookup (a stable reference) rather than via
 * a function call, mirroring the `HISTORY_ICONS[...]` pattern, so it is not
 * treated as "creating a component during render".
 */
export function UserAvatar({
  iconKey,
  className,
}: {
  iconKey?: string;
  className?: string;
}): React.JSX.Element {
  const Icon =
    (iconKey && USER_ICONS[iconKey]) || USER_ICONS[DEFAULT_USER_ICON];
  return <Icon className={className} aria-hidden />;
}
