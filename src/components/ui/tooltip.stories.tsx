import type { Meta, StoryObj } from "@storybook/react-vite";
import { Copy } from "lucide-react";

import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={150}>
        <div className="p-10">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip open>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" aria-label="リンクをコピー">
          <Copy />
        </Button>
      </TooltipTrigger>
      <TooltipContent>リンクをコピー</TooltipContent>
    </Tooltip>
  ),
};

export const Bottom: Story = {
  render: () => (
    <Tooltip open>
      <TooltipTrigger asChild>
        <Button>ホバー or 表示</Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">下側に表示</TooltipContent>
    </Tooltip>
  ),
};
