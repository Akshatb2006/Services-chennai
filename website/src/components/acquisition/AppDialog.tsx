"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { anyPublished, apps } from "@/config/apps";
import { LogoMark } from "../Logo";
import { AppDownload } from "./AppDownload";
import { OPEN_APP_DIALOG } from "./AppCTA";

/** Single, site-wide download dialog (native <dialog>: focus trap, Esc, inert background). */
export function AppDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [placement, setPlacement] = useState("dialog");

  useEffect(() => {
    const open = (e: Event) => {
      setPlacement(`dialog:${(e as CustomEvent<{ placement: string }>).detail?.placement ?? "unknown"}`);
      ref.current?.showModal();
    };
    window.addEventListener(OPEN_APP_DIALOG, open);
    return () => window.removeEventListener(OPEN_APP_DIALOG, open);
  }, []);

  const live = anyPublished("customer");

  return (
    <dialog
      ref={ref}
      aria-labelledby="app-dialog-title"
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="menu-in m-auto w-[min(560px,calc(100vw-24px))] rounded-xl bg-ink p-0 text-white shadow-overlay backdrop:bg-ink/60 backdrop:backdrop-blur-[2px]"
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-pill text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        <LogoMark className="size-11" />
        <h2 id="app-dialog-title" className="mt-5 text-[1.75rem] font-semibold leading-tight tracking-[-0.035em]">
          {live ? `Get the ${apps.customer.name} app` : "Get early access"}
        </h2>
        <p className="mt-2 text-[15px] text-white/70">
          {live
            ? "Book home services in a few taps, on Android and iOS."
            : `The ${apps.customer.name} app is launching soon in Chennai. Be the first to know.`}
        </p>
        <div className="mt-6">
          <AppDownload placement={placement} tone="dark" />
        </div>
      </div>
    </dialog>
  );
}
