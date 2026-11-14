import { CalendarCheck, LayoutGrid, Smartphone } from "lucide-react";
import { steps } from "@/content/home";
import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { AppCTA } from "./acquisition/AppCTA";
import { ctaLabel } from "@/config/apps";

const icons = [Smartphone, LayoutGrid, CalendarCheck];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="border-y border-line bg-card py-20 sm:py-28">
      <Container>
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h2 id="how-title" className="text-[2rem] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
            How it works
          </h2>
          <AppCTA
            placement="how-it-works"
            className="inline-flex h-[52px] items-center gap-2 self-start rounded-pill bg-ink px-6 text-[15px] font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-ink-raised active:scale-[0.98] md:self-auto"
          >
            <Smartphone className="size-4 text-citrus" strokeWidth={2} aria-hidden="true" />
            {ctaLabel("customer")}
          </AppCTA>
        </Reveal>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6 lg:mt-14">
          {steps.map((s, i) => {
            const Icon = icons[i];
            return (
              <Reveal as="li" key={s.title} delay={i * 0.1} className="border-t-2 border-ink pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-5xl font-semibold leading-none tracking-[-0.05em] text-ink/15 tabular-nums">{i + 1}</span>
                  <span className={`grid size-11 place-items-center rounded-pill ${i === 0 ? "bg-citrus" : "bg-stone"} text-ink`}>
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-1 text-[15px] text-muted">{s.body}</p>
              </Reveal>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
