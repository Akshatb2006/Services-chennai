"use client";

import { allPublished, anyPublished, isPublished, platformLabel, type AppId, type Platform } from "@/config/apps";
import { EarlyAccessForm } from "./EarlyAccessForm";
import { StoreBadge } from "./StoreBadge";
import { usePlatform } from "./usePlatform";

type Props = {
  app?: AppId;
  placement: string;
  tone?: "dark" | "light";
  /** Show the early-access form while any platform is unpublished (default true) */
  showForm?: boolean;
  submitLabel?: string;
  size?: "md" | "lg";
  align?: "start" | "center";
};

/**
 * Smart download block.
 *  Android → Google Play first · iOS → App Store first · Desktop/unknown → both.
 *  Every platform is always reachable manually; unpublished ones show "Coming soon".
 */
export function AppDownload({ app = "customer", placement, tone = "dark", showForm = true, submitLabel, size = "md", align = "start" }: Props) {
  const platform = usePlatform();
  const mobile = platform === "ios" || platform === "android";
  const order: Platform[] = platform === "android" ? ["android", "ios"] : ["ios", "android"];
  const formVisible = showForm && !allPublished(app);
  const partial = anyPublished(app) && !allPublished(app);
  const missing = order.find((p) => !isPublished(app, p));

  return (
    <div className={`grid gap-5 ${align === "center" ? "justify-items-center text-center" : ""}`}>
      {formVisible && (
        <div className="w-full max-w-xl text-left">
          {partial && missing && (
            <p className={`mb-3 text-sm font-semibold ${tone === "dark" ? "text-white" : "text-ink"}`}>
              Not on {platformLabel[missing].store} yet — get notified when it launches.
            </p>
          )}
          <EarlyAccessForm app={app} placement={placement} tone={tone} submitLabel={submitLabel} />
        </div>
      )}

      <div className={`flex flex-wrap items-center gap-x-8 gap-y-5 ${align === "center" ? "justify-center" : ""}`}>
        <div className="flex flex-wrap gap-3 pt-2">
          {order.map((p) => (
            <StoreBadge
              key={p}
              app={app}
              platform={p}
              placement={placement}
              tone={tone}
              size={size}
              recommended={mobile && p === platform && isPublished(app, p)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
