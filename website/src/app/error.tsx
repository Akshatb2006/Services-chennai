"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-porcelain px-5 text-center">
      <div className="max-w-md">
        <p className="text-sm font-semibold text-muted">Something went wrong</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">We couldn&apos;t load this page.</h1>
        <p className="mt-4 text-muted">Please try again. If the problem continues, return to the home page.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-ink px-6 text-sm font-medium text-white">
            <RotateCcw className="size-4" aria-hidden="true" /> Try again
          </button>
          <Link href="/" className="inline-flex h-12 items-center justify-center rounded-pill border border-line-strong px-6 text-sm font-medium">Go home</Link>
        </div>
      </div>
    </main>
  );
}
