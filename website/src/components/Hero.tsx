import Image from "next/image";
import { ArrowDown, MapPin, Smartphone } from "lucide-react";
import heroImg from "@/assets/photos/hero.jpg";
import { hero } from "@/content/home";
import { location } from "@/config/location";
import { categories } from "@/config/services";
import { CategoryIcon } from "./CategoryIcon";
import { AppCTA } from "./acquisition/AppCTA";
import { ctaLabel } from "@/config/apps";

export function Hero() {
  const [lead, accent] = hero.title.split(", ");
  return (
    <section id="top" aria-labelledby="hero-title" className="px-2 pt-[72px] sm:px-3">
      <div className="mx-auto grid max-w-[1400px] overflow-hidden rounded-xl bg-ink lg:min-h-[min(74svh,680px)] lg:grid-cols-12">
        {/* Photo — dominant, first on mobile */}
        <div className="hero-image relative aspect-[16/10] sm:aspect-[16/9] lg:order-2 lg:col-span-6 lg:aspect-auto">
          <Image
            src={heroImg}
            alt="A home professional mopping the floor of a bright, airy living room"
            fill
            preload
            placeholder="blur"
            sizes="(min-width: 1400px) 700px, (min-width: 1024px) 50vw, 100vw"
            className="object-cover object-[45%_50%]"
          />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-pill bg-white/90 px-3 py-1.5 text-[13px] font-semibold text-ink lg:left-auto lg:right-5 lg:top-5">
            <MapPin className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
            Now in {location.city}
          </span>
        </div>

        {/* Copy */}
        <div className="flex flex-col justify-end p-6 pb-7 sm:p-10 lg:order-1 lg:col-span-6 lg:justify-between lg:p-12 xl:p-14">
          {/* Category shortcuts — product first */}
          <ul aria-label="Browse by category" className="hero-fade hidden flex-wrap gap-2 lg:flex">
            {categories.slice(0, 4).map((c) => (
              <li key={c.id}>
                <a
                  href={`#services-${c.id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-pill border border-white/15 pl-3 pr-4 text-sm font-semibold text-white/85 transition-colors duration-200 hover:border-citrus hover:text-citrus"
                >
                  <CategoryIcon icon={c.icon} className="size-4" />
                  {c.shortName}
                </a>
              </li>
            ))}
          </ul>
          <div>
          <h1
            id="hero-title"
            className="hero-rise text-[clamp(2.75rem,11vw,4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-white lg:text-[clamp(3.4rem,5.3vw,4.9rem)]"
          >
            {lead},
            <br />
            <span className="text-citrus">{accent}</span>
          </h1>
          <p className="hero-fade mt-5 max-w-sm text-[17px] leading-relaxed text-white/70 sm:text-lg" style={{ animationDelay: "120ms" }}>
            {hero.body}
          </p>
          <div className="hero-fade mt-8 flex flex-col gap-2.5 sm:flex-row" style={{ animationDelay: "220ms" }}>
            <AppCTA
              placement="hero"
              className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-pill bg-citrus px-6 text-[15px] font-semibold text-ink transition-[background-color,transform] duration-200 hover:bg-citrus-hover active:scale-[0.98]"
            >
              <Smartphone className="size-4" strokeWidth={2.25} aria-hidden="true" />
              {ctaLabel("customer")}
            </AppCTA>
            <a
              href="#services"
              className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-pill border border-white/25 px-6 text-[15px] font-semibold text-white transition-[border-color,background-color,transform] duration-200 hover:border-white/60 hover:bg-white/5 active:scale-[0.98]"
            >
              Explore services
              <ArrowDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" strokeWidth={2.25} aria-hidden="true" />
            </a>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
