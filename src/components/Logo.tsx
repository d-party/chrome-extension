import type React from "react";

import logoUrl from "./logo-data";

type LogoProps = React.ImgHTMLAttributes<HTMLImageElement>;

/** d-party brand logo, rendered as an inline SVG data URL so it works in
 * Storybook (no chrome.runtime) and inside the sidebar's Shadow DOM. */
export function Logo({ alt = "d-party", ...props }: LogoProps): React.JSX.Element {
  return <img src={logoUrl} alt={alt} {...props} />;
}
