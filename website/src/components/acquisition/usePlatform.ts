"use client";

import { useSyncExternalStore } from "react";
import { detectClientPlatform, type DetectedPlatform } from "@/lib/platform";

const noop = () => () => {};
/** Server render → "unknown" (shows both options); client → real platform. No hydration mismatch. */
export function usePlatform(): DetectedPlatform {
  return useSyncExternalStore(noop, detectClientPlatform, () => "unknown");
}
