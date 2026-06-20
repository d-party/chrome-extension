import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  args: { placeholder: "ユーザー名" },
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = { args: { defaultValue: "たかし" } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "編集できません" } };
export const Password: Story = { args: { type: "password", defaultValue: "secret123" } };
