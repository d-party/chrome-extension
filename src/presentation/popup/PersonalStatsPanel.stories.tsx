import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { emptyStats, type PersonalStats } from "@/domain/personalStats";

import { PersonalStatsPanel } from "./PersonalStatsPanel";

const STORAGE_KEY = "personal_stats";

/**
 * Provides an in-memory chrome.storage.sync so the stats panel can render in
 * Storybook (outside the extension context), seeded with `initial` stats.
 */
function withChromeMock(initial: PersonalStats | null): Decorator {
  return (Story) => {
    const store: Record<string, unknown> = {};
    if (initial) store[STORAGE_KEY] = initial;
    const listeners: Array<() => void> = [];
    const mock = {
      storage: {
        sync: {
          get: (keys: string[]) => {
            const result: Record<string, unknown> = {};
            for (const key of keys) {
              if (key in store) result[key] = store[key];
            }
            return Promise.resolve(result);
          },
          set: (items: Record<string, unknown>) => {
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
    };
    (globalThis as { chrome?: unknown }).chrome = mock;
    return (
      <div className="w-[360px] bg-background p-4 text-foreground">
        <Story />
      </div>
    );
  };
}

const populated: PersonalStats = {
  roomsCreated: 12,
  roomsJoined: 34,
  reactionsByType: {
    fav: 58,
    thumbs_up: 41,
    smile: 27,
    cry: 9,
    middle_finger: 3,
  },
  connectionMs: (5 * 60 + 42) * 60 * 1000, // 5時間42分
  since: new Date("2026-01-15").getTime(),
};

const meta: Meta<typeof PersonalStatsPanel> = {
  title: "Popup/PersonalStatsPanel",
  component: PersonalStatsPanel,
  parameters: { layout: "centered" },
};

export default meta;

type Story = StoryObj<typeof PersonalStatsPanel>;

/** A returning user with plenty of accumulated activity. */
export const Populated: Story = {
  decorators: [withChromeMock(populated)],
};

/** First run: nothing recorded yet. */
export const Empty: Story = {
  decorators: [withChromeMock(emptyStats())],
};
