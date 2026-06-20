// Ambient declarations for third-party packages that ship no TypeScript types.
declare module "awesome-notifications";

declare module "flickity" {
  interface FlickityOptions {
    draggable?: boolean;
    [key: string]: unknown;
  }
  export default class Flickity {
    constructor(element: Element | string, options?: FlickityOptions);
    selectedElement: Element;
    selectedIndex: number;
    select(index: number, isWrapped?: boolean, isInstant?: boolean): void;
    on(event: string, listener: (...args: unknown[]) => void): void;
    off(event: string, listener: (...args: unknown[]) => void): void;
    resize(): void;
    destroy(): void;
  }
}
