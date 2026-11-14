import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { anyPublished, apps, isPublished, platformLabel, storeUrl, type AppId } from "@/config/apps";
import { location } from "@/config/location";
import { platformFromUA } from "@/lib/platform";
import { SiteShell } from "@/components/SiteShell";
import { Container } from "@/components/Container";
import { LogoMark } from "@/components/Logo";
import { AppDownload } from "@/components/acquisition/AppDownload";
import { QrScanTracker, StoreRedirect } from "@/components/acquisition/StoreRedirect";

export const metadata: Metadata = {
  title: "Get the app",
  description: `Download the ${apps.customer.name} app for Android and iOS.`,
  alternates: { canonical: "/get-app" },
};

/**
 * STABLE DOWNLOAD URL — /get-app[?app=professional][&src=qr]
 * Phones with a published store → redirected to that store.
 * Otherwise (desktop, unknown, or unpublished platform) → both options, coming-soon states,
 * early-access form (prelaunch mode). Never redirects to an empty URL.
 */
export default function GetAppPage({ searchParams }: PageProps<"/get-app">) {
  return (
    <SiteShell>
      <Suspense fallback={<Shell app="customer" />}>
        <GetApp searchParams={searchParams} />
      </Suspense>
    </SiteShell>
  );
}

async function GetApp({ searchParams }: { searchParams: PageProps<"/get-app">["searchParams"] }) {
  const sp = await searchParams;
  const app: AppId = sp.app === "professional" ? "professional" : "customer";
  const fromQr = sp.src === "qr";
  const platform = platformFromUA((await headers()).get("user-agent"));

  if ((platform === "ios" || platform === "android") && isPublished(app, platform)) {
    const url = storeUrl(app, platform)!;
    return (
      <section className="pt-[72px]">
        <Container className="grid min-h-[60svh] place-items-center py-20 text-center">
          <div>
            <LogoMark className="mx-auto size-12" />
            <h1 className="mt-6 text-3xl font-semibold tracking-[-0.035em]">Opening {platformLabel[platform].store}…</h1>
            <p className="mt-3 text-muted">
              Not redirected?{" "}
              <a href={url} className="font-semibold text-ink underline underline-offset-4">
                Open {apps[app].name} on {platformLabel[platform].store}
              </a>
            </p>
          </div>
          <StoreRedirect url={url} app={app} platform={platform} fromQr={fromQr} />
        </Container>
      </section>
    );
  }

  return (
    <>
      {fromQr && <QrScanTracker app={app} />}
      <Shell app={app} />
    </>
  );
}

function Shell({ app }: { app: AppId }) {
  const live = anyPublished(app);
  const pro = app === "professional";
  return (
    <section className="px-2 pt-[72px] sm:px-3">
      <div className="mx-auto max-w-[1400px] rounded-xl bg-ink py-16 text-white sm:py-24">
        <Container className="max-w-3xl">
          <LogoMark className="size-12" />
          <h1 className="mt-6 text-balance text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl">
            {live ? `Get the ${apps[app].name} app` : pro ? "Join as a professional" : "Get early access"}
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/70">
            {pro
              ? `${apps.professional.name} is launching soon for home-services professionals in ${location.city}.`
              : live
                ? `Book home services in ${location.city} in a few taps.`
                : `The ${apps.customer.name} app is launching soon in ${location.city}. Leave your email or mobile number and we'll tell you the moment it's ready.`}
          </p>
          <div className="mt-8">
            <AppDownload app={app} placement="get-app-page" tone="dark" size="lg" submitLabel={pro ? "Join as a professional" : undefined} />
          </div>
        </Container>
      </div>
    </section>
  );
}
