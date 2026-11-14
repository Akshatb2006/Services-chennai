import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock, Smartphone, Star } from "lucide-react";
import type { Service, ServiceMeta } from "@/config/services";
import { AppCTA } from "./acquisition/AppCTA";

/** Renders only the business fields that actually exist — nothing is invented. */
function MetaRow({ meta }: { meta: ServiceMeta }) {
  const items: React.ReactNode[] = [];
  if (meta.rating != null)
    items.push(
      <span key="r" className="inline-flex items-center gap-1">
        <Star className="size-3 fill-ink" aria-hidden="true" />
        {meta.rating.toFixed(1)}
        {meta.reviewCount != null && <span className="text-muted">({meta.reviewCount})</span>}
      </span>,
    );
  if (meta.duration)
    items.push(
      <span key="d" className="inline-flex items-center gap-1 text-muted">
        <Clock className="size-3" aria-hidden="true" />
        {meta.duration}
      </span>,
    );
  if (meta.priceFrom) items.push(<span key="p">From {meta.priceFrom}</span>);
  if (!items.length) return null;
  return <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-ink">{items}</p>;
}

/** Compact, scannable catalogue card (marketplace density). */
export function ProductCard({ service, sizes }: { service: Service; sizes?: string }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-card transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-standard)] focus-within:border-ink hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised active:translate-y-0">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone">
        <Image
          src={service.image}
          alt={service.alt}
          fill
          placeholder="blur"
          sizes={sizes ?? "(min-width:1280px) 210px, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"}
          style={service.focus ? { objectPosition: service.focus } : undefined}
          className="object-cover transition-transform duration-500 ease-[var(--ease-standard)] group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3.5 pt-3 sm:px-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14px] font-semibold leading-snug tracking-[-0.015em] text-ink sm:text-[15px]">
            <Link href={`/services/${service.slug}`} className="outline-none after:absolute after:inset-0 after:z-0 after:rounded-lg after:content-[''] focus-visible:shadow-none focus-visible:after:shadow-[inset_0_0_0_2px_var(--color-ink),inset_0_0_0_4px_var(--color-citrus)]">
              {service.name}
            </Link>
          </h3>
          <ArrowUpRight
            className="mt-0.5 size-4 shrink-0 text-olive transition-[color,transform] duration-200 group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-ink"
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted">{service.tagline}</p>
        {service.meta && <MetaRow meta={service.meta} />}
      </div>
    </article>
  );
}

/** "Something else" — compact full-width banner below the grid. */
export function CustomRequestCard() {
  return (
    <article className="flex flex-col gap-4 rounded-lg bg-ink px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h3 className="text-[17px] font-semibold tracking-[-0.02em]">Need something else?</h3>
        <p className="mt-0.5 text-sm text-white/70">Describe it in the app — we&apos;ll let you know how we can help.</p>
      </div>
      <AppCTA placement="catalogue-custom" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-pill bg-citrus px-5 text-sm font-semibold text-ink transition-[background-color,transform] duration-200 hover:bg-citrus-hover active:scale-[0.97] sm:self-auto">
        <Smartphone className="size-4" strokeWidth={2} aria-hidden="true" />
        Request in the app
      </AppCTA>
    </article>
  );
}
