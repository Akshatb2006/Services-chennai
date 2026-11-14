import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Info, Smartphone } from "lucide-react";
import { brand } from "@/config/brand";
import { location } from "@/config/location";
import { getCategory, getService, services, servicesByCategory, sharedNotes } from "@/config/services";
import { SiteShell } from "@/components/SiteShell";
import { Container } from "@/components/Container";
import { ProductCard } from "@/components/ProductCard";
import { AppCTA } from "@/components/acquisition/AppCTA";
import { anyPublished, ctaLabel } from "@/config/apps";
import { FinalCTA } from "@/components/FinalCTA";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) return {};
  const title = `${s.name} in ${location.city}`;
  return {
    title,
    description: `${s.summary} ${s.description}`.slice(0, 158),
    alternates: { canonical: `/services/${s.slug}` },
    openGraph: { title: `${title} · ${brand.name}`, description: s.summary, images: [{ url: s.image.src, width: s.image.width, height: s.image.height, alt: s.alt }] },
  };
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const category = getCategory(service.category);
  const related = [...servicesByCategory(service.category), ...services]
    .filter((s, i, arr) => s.slug !== service.slug && s.category !== "other" && arr.indexOf(s) === i)
    .slice(0, 4);

  return (
    <SiteShell>
      <section className="pt-[72px]">
        <Container className="pb-16 pt-6 sm:pb-24">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
              <li><Link href="/" className="hover:text-ink">Home</Link></li>
              <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
              <li><a href={`/#services-${category.id}`} className="hover:text-ink">{category.name}</a></li>
              <li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
              <li aria-current="page" className="font-semibold text-ink">{service.name}</li>
            </ol>
          </nav>

          <div className="mt-5 grid gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="hero-image relative aspect-[4/3] overflow-hidden rounded-xl bg-stone lg:col-span-7 lg:aspect-[5/6] lg:max-h-[760px]">
              <Image src={service.image} alt={service.alt} fill preload placeholder="blur" sizes="(min-width:1024px) 700px, 100vw" style={service.focus ? { objectPosition: service.focus } : undefined} className="object-cover" />
            </div>

            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-24">
                <span className="inline-flex rounded-pill bg-stone px-3 py-1 text-[13px] font-semibold">{category.name}</span>
                <h1 className="hero-rise mt-4 text-[2.6rem] font-semibold leading-[1] tracking-[-0.045em] sm:text-6xl">{service.name}</h1>
                <p className="hero-fade mt-4 text-[17px] leading-relaxed text-muted">{service.description}</p>
                <div className="hero-fade mt-7 rounded-lg border border-line bg-card p-4" style={{ animationDelay: "120ms" }}>
                  <p className="text-[15px] font-semibold">Book {service.name} in the {brand.displayName} app</p>
                  <p className="mt-0.5 text-sm text-muted">{anyPublished("customer") ? "Available on Android and iOS." : "Launching soon on Android and iOS."}</p>
                  <AppCTA
                    placement={`service:${service.slug}`}
                    className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-ink text-[15px] font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-ink-raised active:scale-[0.98]"
                  >
                    <Smartphone className="size-4 text-citrus" strokeWidth={2} aria-hidden="true" />
                    {ctaLabel("customer")}
                  </AppCTA>
                </div>

                <div className="mt-9 border-t border-line pt-7">
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">What&apos;s included</h2>
                  <ul className="mt-4 grid gap-3">
                    {service.includes.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[15px]">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-pill bg-citrus">
                          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-muted">Final scope is agreed with you before the visit.</p>
                </div>

                <div className="mt-7 rounded-lg bg-stone p-5">
                  <h2 className="text-[15px] font-semibold">Good to know</h2>
                  <ul className="mt-3 grid gap-2.5 text-sm leading-relaxed text-ink/80">
                    {[...service.goodToKnow, ...sharedNotes].map((n) => (
                      <li key={n} className="flex gap-2.5">
                        <Info className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section aria-labelledby="related-title" className="border-t border-line bg-card py-16 sm:py-24">
        <Container>
          <h2 id="related-title" className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">You might also need</h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 lg:grid-cols-4">
            {related.map((s) => (
              <li key={s.slug}><ProductCard service={s} /></li>
            ))}
          </ul>
        </Container>
      </section>

      <FinalCTA />
    </SiteShell>
  );
}
