import { createContext, useContext } from "react";

/**
 * The element that Radix portals (Tooltip, etc.) should render into. When the
 * UI is mounted inside a Shadow DOM, portals must stay inside the shadow root
 * (otherwise they escape to document.body and lose their injected styles). In
 * Storybook this is null, so Radix falls back to document.body.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | null {
  return useContext(PortalContainerContext);
}
