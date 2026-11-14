import { contact } from "@/config/contact";
import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { AppCTA } from "./acquisition/AppCTA";
import { anyPublished, ctaLabel } from "@/config/apps";
import { Smartphone } from "lucide-react";

/** Signature moment: the one full Electric Citrus surface on the page. */
export function FinalCTA() {
  return (
    <section aria-labelledby="cta-title" className="px-2 pb-2 sm:px-3 sm:pb-3">
      <div className="mx-auto max-w-[1400px] rounded-xl bg-citrus py-20 text-ink sm:py-28">
        <Container>
          <Reveal className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <h2 id="cta-title" className="max-w-3xl text-balance text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-6xl lg:text-[5rem]">
              Let&apos;s make home feel effortless.
            </h2>
            <div className="flex flex-col gap-4 lg:items-end">
              <p className="max-w-xs text-[17px] leading-relaxed lg:text-right">{anyPublished("customer") ? "Get the app and book your first service in minutes." : "The app is launching soon in Chennai. Be first in line."}</p>
              <AppCTA
                placement="final-cta"
                className="inline-flex h-14 items-center gap-2.5 rounded-pill bg-ink px-7 text-base font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-ink-raised active:scale-[0.98]"
              >
                <Smartphone className="size-5 text-citrus" strokeWidth={2} aria-hidden="true" />
                {ctaLabel("customer")}
              </AppCTA>
              <a href={`mailto:${contact.email}`} className="link-underline text-sm font-medium">or email {contact.email}</a>
            </div>
          </Reveal>
        </Container>
      </div>
    </section>
  );
}
