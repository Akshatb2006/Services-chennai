"use client";

import { apps, platformLabel, type AppId, type Platform } from "@/config/apps";
import { track } from "@/lib/analytics";
import { AppleIcon, PlayIcon } from "./icons";

type Props = { app: AppId; platform: Platform; placement: string; tone?: "dark" | "light"; size?: "md" | "lg"; recommended?: boolean };

/**
 * Store button. PUBLISHED → real link to the listing. COMING SOON → non-interactive
 * state (never a dead or guessed link).
 */
export function StoreBadge({ app, platform, placement, tone = "dark", size = "md", recommended = false }: Props) {
  const listing = apps[app].stores[platform];
  const published = listing.status === "published" && listing.url;
  const { store } = platformLabel[platform];
  const Icon = platform === "ios" ? AppleIcon : PlayIcon;

  const shell = `relative inline-flex min-w-[168px] items-center gap-3 rounded-lg border transition-[background-color,border-color,transform] duration-200 ${
    size === "lg" ? "h-[60px] px-5" : "h-[52px] px-4"
  } ${
    tone === "dark"
      ? "border-white/20 bg-white/[0.06] text-white"
      : "border-ink bg-ink text-white"
  }`;
  const label = (small: string, big: string) => (
    <span className="text-left leading-none">
      <span className="block text-[11px] font-medium">{small}</span>
      <span className={`mt-1 block font-semibold tracking-[-0.015em] ${size === "lg" ? "text-[19px]" : "text-[17px]"}`}>{big}</span>
    </span>
  );
  const rec = recommended && (
    <span className="absolute -top-2.5 left-3 rounded-pill bg-citrus px-2 py-0.5 text-[10px] font-semibold text-ink">For your device</span>
  );

  if (!published) {
    return (
      <span
        className={`relative inline-flex min-w-[168px] cursor-default items-center gap-3 rounded-lg border border-dashed ${size === "lg" ? "h-[60px] px-5" : "h-[52px] px-4"} ${
          tone === "dark" ? "border-white/30 text-white/85" : "border-ink/35 text-ink/85"
        }`}
        aria-label={`${apps[app].name} on ${store}: coming soon`}
        role="img"
      >
        {rec}
        <Icon className={size === "lg" ? "size-7" : "size-6"} />
        {label("Coming soon on", store)}
      </span>
    );
  }

  return (
    <a
      href={listing.url!}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${platform === "ios" ? "Download" : "Get"} ${apps[app].name} on ${store}`}
      onClick={() => track("store_option_selected", { app, platform, placement, status: "published" })}
      className={`${shell} ${tone === "dark" ? "hover:border-white/50 hover:bg-white/10" : "hover:bg-ink-raised"} active:scale-[0.97]`}
    >
      {rec}
      <Icon className={size === "lg" ? "size-7" : "size-6"} />
      {label(platform === "ios" ? "Download on the" : "Get it on", store)}
    </a>
  );
}
