import { Quote } from "lucide-react";
import { testimonials } from "@/content/home";
import { Container } from "./Container";
import { Reveal } from "./Reveal";

export function Testimonials() {
  if (!testimonials.enabled) return null;
  return (
    <section aria-labelledby="testimonials-title" className="pb-20 sm:pb-28">
      <Container>
        <Reveal className="flex flex-wrap items-center gap-3">
          <h2 id="testimonials-title" className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">What customers say</h2>
          {testimonials.isDemo && (
            <span className="rounded-pill border border-line-strong px-2.5 py-1 text-xs font-semibold text-muted">Demo content · replaced after launch</span>
          )}
        </Reveal>
        <ul className="rail -mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
          {testimonials.items.map((t, i) => (
            <Reveal as="li" key={i} delay={i * 0.06} className="w-[80vw] max-w-[340px] shrink-0 snap-start rounded-lg border border-line bg-card p-5 md:w-auto md:max-w-none">
              <Quote className="size-5 text-olive" strokeWidth={1.75} aria-hidden="true" />
              <blockquote className="mt-3 text-[15px] leading-relaxed text-ink">{t.quote}</blockquote>
              <p className="mt-4 text-xs font-semibold text-muted">{t.context}</p>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
