import { Check, Copy, Timer } from "lucide-react";
import { useState } from "react";
import { FaEnvelope, FaFacebookF, FaXTwitter } from "react-icons/fa6";
import { SiLine } from "react-icons/si";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FACEBOOK_APP_ID } from "@/infrastructure/env";

import type { SidebarState } from "../sidebarStore";

/** タイマー画面はロビー URL に `?timer=true` を付けたもの（新規 URL は発行しない）。 */
function timerUrl(shareUrl: string): string {
  if (!shareUrl) return "";
  return shareUrl.includes("?") ? `${shareUrl}&timer=true` : `${shareUrl}?timer=true`;
}

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

      {/* 共有 URL の下に「タイマーのみのURL」を折りたたみで用意する。押下で URL 欄を表示。 */}
      <TimerUrlAccordion url={timerUrl(url)} />

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

/**
 * 「タイマーのみのURL」アコーディオン。展開するとタイマー画面の URL 欄（コピー可）を表示する。
 * 拡張機能・dアニメストア不要で、ロビー URL に `?timer=true` を付けるだけで人力同期の
 * タイマー画面を開ける（新規 URL は発行しない）。
 */
function TimerUrlAccordion({ url }: { url: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="timer" className="border-b-0">
        <AccordionTrigger className="text-muted-foreground hover:text-foreground hover:no-underline">
          <Timer className="size-4" aria-hidden />
          タイマーのみのURL
        </AccordionTrigger>
        <AccordionContent>
          <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">
            拡張機能なし・dアニメストア不要で、再生中の動画のタイトルと時間だけを表示します。
          </p>
          <button
            type="button"
            onClick={copy}
            disabled={!url}
            aria-label="タイマーURLをコピー"
            className="flex w-full items-center gap-1.5 rounded-lg border bg-muted/40 p-1.5 text-left transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex-1 truncate px-1 text-xs" title={url}>
              {url || "ルーム作成後にURLが表示されます"}
            </span>
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </span>
          </button>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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
