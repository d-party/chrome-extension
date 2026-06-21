import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { FaEnvelope, FaFacebookF, FaXTwitter } from "react-icons/fa6";
import { SiLine } from "react-icons/si";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FACEBOOK_APP_ID } from "@/infrastructure/env";

import type { SidebarState } from "../sidebarStore";

export function SharePanel({ state }: { state: SidebarState }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const url = state.shareUrl;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const text = `dアニメストアで『${state.shareTitle}』を一緒に見ませんか？ 拡張機能『d-party』を使ってパーティーに参加してください`;
  const open = (shareUrl: string) => window.open(shareUrl, "", "width=700,height=400");

  return (
    <div className="flex h-full flex-col justify-center gap-5 px-1">
      <p className="text-xs text-muted-foreground">
        パーティーリンクを共有して友達をルームに招待
      </p>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={copy}
            disabled={!url}
            aria-label="リンクをコピー"
            className="flex w-full items-center gap-1.5 rounded-lg border bg-muted/40 p-1.5 text-left transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex-1 truncate px-1 text-xs" title={url}>
              {url || "ルーム作成後にリンクが表示されます"}
            </span>
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {copied ? "コピーしました" : "リンクをコピー"}
        </TooltipContent>
      </Tooltip>
      <div className="flex items-center justify-center gap-3">
        <ShareIcon
          label="Xでシェア"
          disabled={!url}
          onClick={() =>
            open(
              "https://twitter.com/intent/tweet?text=" +
              encodeURIComponent(text) +
              "&url=" +
              encodeURIComponent(url) +
              "&hashtags=" +
              encodeURIComponent("dアニメストア,dパーティー"),
            )
          }
        >
          <FaXTwitter />
        </ShareIcon>
        <ShareIcon
          label="LINEでシェア"
          disabled={!url}
          onClick={() =>
            open(
              "https://social-plugins.line.me/lineit/share?url=" +
              encodeURIComponent(url),
            )
          }
        >
          <SiLine />
        </ShareIcon>
        <ShareIcon
          label="Facebookでシェア"
          disabled={!url}
          onClick={() =>
            open(
              "https://www.facebook.com/dialog/share?app_id=" +
              FACEBOOK_APP_ID +
              "&href=" +
              encodeURIComponent(url),
            )
          }
        >
          <FaFacebookF />
        </ShareIcon>
        <ShareIcon
          label="メールでシェア"
          disabled={!url}
          onClick={() =>
            open(
              "mailto:?&subject=" +
              encodeURIComponent("dアニメストアで一緒にアニメを観ませんか？") +
              "&body=" +
              encodeURIComponent(text + "\n\n") +
              encodeURIComponent(url + "\n"),
            )
          }
        >
          <FaEnvelope />
        </ShareIcon>
      </div>
    </div>
  );
}

function ShareIcon({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="size-12 rounded-full [&_svg]:size-5"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
