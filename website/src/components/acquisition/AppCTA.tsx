"use client";

import { apps, ctaLabel, isPublished, storeUrl, type AppId } from "@/config/apps";
import { track } from "@/lib/analytics";
import { detectClientPlatform } from "@/lib/platform";

export const OPEN_APP_DIALOG = "homecare:open-app-dialog";

type Props = { app?: AppId; placement: string; className?: string; children?: React.ReactNode; onNavigate?: () => void };

/**
 * Primary acquisition CTA. A real link to the stable /get-app route (works without JS).
 * With JS: phone + published store → straight to that store; otherwise → download dialog.
 */
export function AppCTA({ app = "customer", placement, className, children, onNavigate }: Props) {
  const href = apps[app].getAppPath;
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        track("download_cta_clicked", { app, placement });
        onNavigate?.();
        const p = detectClientPlatform();
        if ((p === "ios" || p === "android") && isPublished(app, p)) {
          e.preventDefault();
          track("store_option_selected", { app, platform: p, placement, status: "published" });
          window.location.href = storeUrl(app, p)!;
          return;
        }
        if (app === "customer") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent(OPEN_APP_DIALOG, { detail: { placement } }));
        }
      }}
    >
      {children ?? ctaLabel(app)}
    </a>
  );
}
