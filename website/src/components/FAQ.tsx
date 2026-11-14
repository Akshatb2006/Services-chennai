"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { faqs } from "@/content/home";
import { contact } from "@/config/contact";

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();

  return (
    <section id="faq" aria-labelledby="faq-title" className="border-t border-line bg-card py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8">
        <div className="lg:col-span-4">
          <h2 id="faq-title" className="text-balance text-[2rem] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
            Questions, answered.
          </h2>
          <p className="mt-5 max-w-xs text-[17px] leading-relaxed text-muted">
            Can&apos;t find what you&apos;re looking for?{" "}
            <a
              href={`mailto:${contact.email}`}
              className="font-medium text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink"
            >
              Email us
            </a>
            .
          </p>
        </div>

        <ul className="border-b border-line lg:col-span-7 lg:col-start-6">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q} className="group border-t border-line">
                <h3>
                  <button
                    id={`${base}-q${i}`}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`${base}-a${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-semibold tracking-[-0.02em] text-ink sm:py-6 sm:text-xl"
                  >
                    {f.q}
                    <span
                      aria-hidden="true"
                      className={`grid size-9 shrink-0 place-items-center rounded-pill border transition-[transform,background-color,border-color,color] duration-300 ease-[var(--ease-standard)] ${
                        isOpen ? "rotate-45 border-citrus bg-citrus text-ink" : "border-line-strong text-ink group-hover:border-ink"
                      }`}
                    >
                      <Plus className="size-4" strokeWidth={1.75} />
                    </span>
                  </button>
                </h3>
                <div
                  id={`${base}-a${i}`}
                  role="region"
                  aria-labelledby={`${base}-q${i}`}
                  className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-standard)] ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden" inert={!isOpen}>
                    <p className="max-w-[60ch] pb-6 pr-12 leading-relaxed text-muted">{f.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
