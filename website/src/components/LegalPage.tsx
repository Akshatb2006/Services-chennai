import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { brand } from "@/config/brand";
import { Logo } from "./Logo";

export function LegalPage({ title, sections }: { title: string; sections: { heading: string; body: string }[] }) {
  return (
    <>
      <header className="border-b border-line bg-porcelain">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label={`${brand.name} home`}>
            <Logo />
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to home
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-28">
        <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{title}</h1>
        <p className="mt-6 rounded-xl border border-line-strong bg-stone px-4 py-3 text-sm text-ink">
          Placeholder document. The final version will be published once {brand.name}&apos;s business details are confirmed.
        </p>
        <div className="mt-12 space-y-10">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-semibold tracking-[-0.02em]">{s.heading}</h2>
              <p className="mt-3 leading-relaxed text-muted">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
