import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { popularServices, type Service } from "@/config/services";
import { Container } from "./Container";
import { SectionHeading } from "./SectionHeading";

function Tile({ service, large = false }: { service: Service; large?: boolean }) {
  return (
    <article className="group relative h-full overflow-hidden rounded-lg bg-ink-raised">
      <Image
        src={service.image}
        alt={service.alt}
        fill
        placeholder="blur"
        sizes={large ? "(min-width:1024px) 680px, 80vw" : "(min-width:1024px) 340px, 80vw"}
        style={service.focus ? { objectPosition: service.focus } : undefined}
        className="object-cover transition-transform duration-[900ms] ease-[var(--ease-standard)] group-hover:scale-[1.04]"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 sm:p-5">
        <div>
          <h3 className={`font-semibold tracking-[-0.025em] text-white ${large ? "text-2xl sm:text-[2rem]" : "text-lg sm:text-xl"}`}>
            <Link href={`/services/${service.slug}`} className="after:absolute after:inset-0 after:content-['']">
              {service.name}
            </Link>
          </h3>
          {large && <p className="mt-1 max-w-xs text-[15px] text-white/75">{service.summary}</p>}
        </div>
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-pill bg-citrus text-ink transition-transform duration-300 group-hover:-rotate-45"
        >
          <ArrowRight className="size-4" strokeWidth={2.25} />
        </span>
      </div>
    </article>
  );
}

export function PopularServices() {
  const [first, ...rest] = popularServices();
  return (
    <section aria-labelledby="popular-title" className="bg-ink py-20 text-white sm:py-28">
      <Container>
        <SectionHeading
          id="popular-title"
          title="Popular services"
          tone="dark"
          aside={
            <a href="#services" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-citrus">
              See all services <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          }
        />
        {/* Mobile: swipeable rail · Desktop: editorial bento */}
        <ul className="rail -mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 lg:mx-0 lg:mt-14 lg:grid lg:h-[620px] lg:grid-cols-4 lg:grid-rows-2 lg:gap-4 lg:overflow-visible lg:px-0">
          <li className="aspect-[3/4] w-[78vw] max-w-[340px] shrink-0 snap-start lg:col-span-2 lg:row-span-2 lg:aspect-auto lg:w-auto lg:max-w-none">
            <Tile service={first} large />
          </li>
          {rest.map((s) => (
            <li key={s.slug} className="aspect-[3/4] w-[62vw] max-w-[280px] shrink-0 snap-start lg:aspect-auto lg:w-auto lg:max-w-none">
              <Tile service={s} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
