import type { Meta, StoryObj } from "@storybook/react-vite";
import { History, LogOut, Share2, Users } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-80 rounded-lg border bg-card p-2 text-card-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="share" className="gap-2">
      <TabsList>
        <TabsTrigger value="share">
          <Share2 className="size-3.5" aria-hidden /> シェア
        </TabsTrigger>
        <TabsTrigger value="history">
          <History className="size-3.5" aria-hidden /> 履歴
        </TabsTrigger>
        <TabsTrigger value="users">
          <Users className="size-3.5" aria-hidden /> 参加者
        </TabsTrigger>
        <TabsTrigger value="control">
          <LogOut className="size-3.5" aria-hidden /> 操作
        </TabsTrigger>
      </TabsList>
      <TabsContent value="share" className="px-1 py-2 text-sm text-muted-foreground">
        パーティーリンクを共有して友達をルームに招待
      </TabsContent>
      <TabsContent value="history" className="px-1 py-2 text-sm text-muted-foreground">
        まだ履歴はありません
      </TabsContent>
      <TabsContent value="users" className="px-1 py-2 text-sm text-muted-foreground">
        参加者はいません
      </TabsContent>
      <TabsContent value="control" className="px-1 py-2 text-sm text-muted-foreground">
        操作パネル
      </TabsContent>
    </Tabs>
  ),
};
