import Image from "next/image";
import { MapPin } from "lucide-react";
import temple from "@/assets/photos/chennai-temple.jpg";
import { location } from "@/config/location";
import { Container } from "./Container";
import { Reveal } from "./Reveal";
import { AppCTA } from "./acquisition/AppCTA";

export function ChennaiSection() {
  const confirmed = location.confirmedAreas;
  return (
    <section id="service-areas" aria-labelledby="areas-title" className="py-20 sm:py-28">
      <Container>
        <Reveal className="relative isolate overflow-hidden rounded-xl bg-ink">
          <div className="relative aspect-[3/4] sm:aspect-[16/10] lg:aspect-[21/9]">
            <Image src={temple} alt={`A temple gopuram in ${location.city} lit up at night`} fill placeholder="blur" sizes="(min-width:1320px) 1260px, 100vw" className="object-cover object-[60%_35%]" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent lg:bg-gradient-to-r lg:from-ink/90 lg:via-ink/40" />
          </div>
          <div className="absolute inset-0 flex flex-col justify-end gap-6 p-5 sm:p-10 lg:flex-row lg:items-end lg:justify-between lg:p-14">
            <div className="text-white">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-citrus">
                <MapPin className="size-4" strokeWidth={2} aria-hidden="true" /> {location.city}, {location.region}
              </p>
              <h2 id="areas-title" className="mt-3 max-w-lg text-balance text-[2rem] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
                Designed for homes across {location.city}.
              </h2>
            </div>
            <div className="w-full rounded-lg bg-card p-5 text-ink sm:max-w-sm sm:p-6">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted">Launch city</dt>
                  <dd className="mt-0.5 font-semibold">{location.city}</dd>
                </div>
                <div>
                  <dt className="text-muted">Neighbourhoods</dt>
                  <dd className="mt-0.5 font-semibold">{confirmed.length ? `${confirmed.length} confirmed` : "Check in the app"}</dd>
                </div>
              </dl>
              <AppCTA placement="service-areas" className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-pill bg-ink text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-ink-raised active:scale-[0.98]">
                Check my area in the app
              </AppCTA>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
