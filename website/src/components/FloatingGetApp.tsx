import { Smartphone } from "lucide-react";
import { AppCTA } from "./acquisition/AppCTA";
import { ctaLabel } from "@/config/apps";

/** Thumb-reachable "Get the app" on small screens — opens the right store on the device. */
export function FloatingGetApp({ audience = "customer" }: { audience?: "customer" | "professional" }) {
  if (audience === "professional")
    return (
      <a
        href="#join"
        className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-pill bg-citrus px-5 text-sm font-semibold text-ink shadow-overlay ring-1 ring-ink/10 transition-transform duration-200 active:scale-95 lg:hidden"
      >
        Join as a professional
      </a>
    );
  return (
    <AppCTA placement="floating-mobile" className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-pill bg-citrus pl-4 pr-5 text-sm font-semibold text-ink shadow-overlay ring-1 ring-ink/10 transition-transform duration-200 active:scale-95 lg:hidden">
      <Smartphone className="size-4" strokeWidth={2} aria-hidden="true" />
      {ctaLabel("customer")}
    </AppCTA>
  );
}
