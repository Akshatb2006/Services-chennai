import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-porcelain px-5 text-center">
      <div className="max-w-md">
        <SearchX className="mx-auto size-10 text-olive" strokeWidth={1.5} aria-hidden="true" />
        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em]">Page not found</h1>
        <p className="mt-4 text-muted">The page you&apos;re looking for doesn&apos;t exist. Browse our services instead.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/#services" className="inline-flex h-11 items-center justify-center rounded-pill bg-ink px-6 text-sm font-medium text-white">Browse services</Link>
        </div>
      </div>
    </main>
  );
}
