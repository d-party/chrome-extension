import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Toast,
  ToastBody,
  ToastClose,
  ToastIcon,
  ToastViewport,
  type ToastVariant,
} from "./toast";

function Demo({ variant, html }: { variant: ToastVariant; html: string }) {
  return (
    <Toast variant={variant}>
      <ToastIcon variant={variant} />
      <ToastBody dangerouslySetInnerHTML={{ __html: html }} />
      <ToastClose />
    </Toast>
  );
}

const meta = {
  title: "UI/Toast",
  component: Demo,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#1f1f23" }] },
  },
  argTypes: {
    variant: { control: "select", options: ["success", "info", "alert"] },
  },
  args: {
    variant: "success",
    html: "操作が完了しました",
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { variant: "success", html: "ルームの作成に成功しました" },
};

export const Info: Story = {
  args: {
    variant: "info",
    html: "『たかし』さんが参加 <i class='fas fa-glass-cheers'></i>",
  },
};

export const Alert: Story = {
  args: { variant: "alert", html: "サーバーとの通信が終了" },
};

export const Stacked: Story = {
  render: () => (
    <ToastViewport className="static! flex! flex-col gap-2">
      <Toast variant="success">
        <ToastIcon variant="success" />
        <ToastBody>ルームの作成に成功しました</ToastBody>
        <ToastClose />
      </Toast>
      <Toast variant="info">
        <ToastIcon variant="info" />
        <ToastBody
          dangerouslySetInnerHTML={{
            __html: "『はなこ』さんが参加 <i class='fas fa-glass-cheers'></i>",
          }}
        />
        <ToastClose />
      </Toast>
      <Toast variant="alert">
        <ToastIcon variant="alert" />
        <ToastBody>サーバーとの通信が終了</ToastBody>
        <ToastClose />
      </Toast>
    </ToastViewport>
  ),
};
