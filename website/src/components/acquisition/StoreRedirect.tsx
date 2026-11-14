"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Used by /get-app when the visitor's store is published. Records intent only (not an install). */
export function StoreRedirect({ url, app, platform, fromQr }: { url: string; app: string; platform: string; fromQr: boolean }) {
  useEffect(() => {
    if (fromQr) track("qr_code_scanned", { app });
    track("app_store_redirected", { app, platform });
    const t = setTimeout(() => window.location.replace(url), 150);
    return () => clearTimeout(t);
  }, [url, app, platform, fromQr]);
  return null;
}

export function QrScanTracker({ app }: { app: string }) {
  useEffect(() => {
    track("qr_code_scanned", { app });
  }, [app]);
  return null;
}
