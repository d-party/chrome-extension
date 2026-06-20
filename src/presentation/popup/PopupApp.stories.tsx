import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { STORAGE_KEYS } from "@/domain/settings";

import { PopupApp } from "./PopupApp";

type StoredValue = string | boolean;

/**
 * Provides an in-memory chrome.storage.sync / chrome.runtime so the popup can
 * render in Storybook (outside the extension context). Each story gets its own
 * isolated store seeded with `initial`.
 */
function withChromeMock(initial: Record<string, StoredValue> = {}): Decorator {
  return (Story) => {
    const store: Record<string, StoredValue> = { ...initial };
    const listeners: Array<() => void> = [];
    const mock = {
      storage: {
        sync: {
          get: (keys: string[]) => {
            const result: Record<string, StoredValue> = {};
            for (const key of keys) {
              if (key in store) result[key] = store[key];
            }
            return Promise.resolve(result);
          },
          set: (items: Record<string, StoredValue>) => {
            Object.assign(store, items);
            listeners.forEach((listener) => listener());
            return Promise.resolve();
          },
          onChanged: {
            addListener: (cb: () => void) => listeners.push(cb),
            removeListener: (cb: () => void) => {
              const index = listeners.indexOf(cb);
              if (index >= 0) listeners.splice(index, 1);
            },
          },
        },
      },
      runtime: { getManifest: () => ({ version: "1.0.0" }) },
    };
    (globalThis as { chrome?: unknown }).chrome = mock;
    return <Story />;
  };
}

const meta: Meta<typeof PopupApp> = {
  title: "Popup/PopupApp",
  component: PopupApp,
  parameters: { layout: "centered" },
};

export default meta;

type Story = StoryObj<typeof PopupApp>;

/** First-run state: defaults (display name「ユーザー」, 別タブ自動再生 ON). */
export const Default: Story = {
  decorators: [withChromeMock()],
};

/** A returning user with some settings already saved. */
export const WithSavedSettings: Story = {
  decorators: [
    withChromeMock({
      [STORAGE_KEYS.userName]: "たかし",
      [STORAGE_KEYS.autoAnotherTab]: false,
      [STORAGE_KEYS.hideReaction]: true,
      [STORAGE_KEYS.hideReactionIcon]: true,
      [STORAGE_KEYS.selfNotification]: true,
    }),
  ],
};
