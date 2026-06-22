import { BookOpen, ExternalLink, Heart, Home } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { FaChrome } from "react-icons/fa6";

import { SITE_URL, USAGE_URL } from "@/infrastructure/env";

interface InfoLink {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Highlight the link (e.g. the sponsor call-to-action). */
  accent?: boolean;
}

/** External destinations shown in the popup's「情報」tab. */
const LINKS: InfoLink[] = [
  {
    href: SITE_URL,
    label: "ホームページ",
    description: "d-party の公式サイト",
    icon: Home,
  },
  {
    href: USAGE_URL,
    label: "使い方",
    description: "同時視聴の始め方ガイド",
    icon: BookOpen,
  },
  {
    href: "https://chrome.google.com/webstore/detail/d-party/ibmlcfpijglpfbfgaleaeooebgdgcbpc?hl=ja",
    label: "Chrome ウェブストア",
    description: "拡張機能ページ・レビュー投稿",
    icon: FaChrome,
  },
  {
    href: "https://github.com/sponsors/d-party",
    label: "寄付（GitHub Sponsors）",
    description: "開発を支援して d-party を応援する",
    icon: Heart,
    accent: true,
  },
];

export function InfoPanel(): React.JSX.Element {
  return (
    <section className="rounded-xl border bg-card p-2 shadow-sm">
      <ul className="space-y-0.5">
        {LINKS.map(({ href, label, description, icon: Icon, accent }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/70"
            >
              <Icon
                className={`size-4 shrink-0 ${
                  accent ? "text-red-600" : "text-muted-foreground"
                }`}
                aria-hidden
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium leading-tight">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </span>
              <ExternalLink
                className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
