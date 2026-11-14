import Link from "next/link";
import { brand } from "@/config/brand";
import { contact, social } from "@/config/contact";
import { location } from "@/config/location";
import { footerNav } from "@/config/navigation";
import { categories, services } from "@/config/services";
import { AppCTA } from "./acquisition/AppCTA";
import { StoreBadge } from "./acquisition/StoreBadge";
import { ctaLabel } from "@/config/apps";
import { Container } from "./Container";
import { Logo } from "./Logo";

const heading = "text-sm font-semibold text-olive";
const linkCls = "link-underline inline-block py-1.5 text-[15px] text-white/75 hover:text-white";

export function Footer() {
  return (
    <footer className="mt-2 bg-ink text-white sm:mt-3">
      <Container className="pb-28 pt-16 lg:pb-12 lg:pt-20">
        {/* SEO intro + popular services (Urban Company-style) */}
        <div className="grid gap-8 border-b border-white/10 pb-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Home services in {location.city}</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/65">{brand.description}</p>
          </div>
          <ul className="flex flex-wrap content-start gap-2 lg:col-span-7" aria-label="Popular services">
            {services.map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="inline-flex h-9 items-center rounded-pill border border-white/15 px-3.5 text-[13px] font-medium text-white/80 transition-colors hover:border-citrus hover:text-citrus">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-10 pt-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-3">
            <Logo tone="light" />
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-white/65">
              Cleaning, household help, laundry and home maintenance for homes in {location.city}.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <StoreBadge app="customer" platform="ios" placement="footer" />
              <StoreBadge app="customer" platform="android" placement="footer" />
            </div>
            <AppCTA placement="footer" className="mt-3 inline-block py-1.5 text-[15px] font-semibold text-citrus hover:underline">
              {ctaLabel("customer")} →
            </AppCTA>
            <ul className="mt-6 flex gap-5">
              {social.map((s) => (
                <li key={s.name}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="About" className="lg:col-span-2">
            <h2 className={heading}>About</h2>
            <ul className="mt-4">
              {footerNav.about.map((l) => (
                <li key={l.href}><a href={l.href} className={linkCls}>{l.label}</a></li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Service categories" className="lg:col-span-2">
            <h2 className={heading}>Services</h2>
            <ul className="mt-4">
              {categories.map((c) => (
                <li key={c.id}><a href={`/#services-${c.id}`} className={linkCls}>{c.name}</a></li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-2">
            <h2 className={heading}>Service areas</h2>
            <ul className="mt-4 text-[15px] text-white/75">
              <li className="py-1.5">{location.city}, {location.region}</li>
              <li className="py-1.5 text-white/55">{location.confirmedAreas.length ? location.confirmedAreas.join(", ") : "Neighbourhoods being finalised"}</li>
              <li><Link href="/get-app" className={linkCls}>Check your area in the app</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h2 className={heading}>Contact</h2>
            <ul className="mt-4">
                            <li><span className="inline-block py-1.5 text-[15px] text-white/75">Phone: {contact.phoneDisplay}</span></li>
              <li><a href={`mailto:${contact.email}`} className={`${linkCls} break-all`}>{contact.email}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {brand.founded} {brand.displayName}. {location.city}, {location.country}.</p>
          <ul className="flex gap-6">
            {footerNav.legal.map((l) => (
              <li key={l.href}><Link href={l.href} className="link-underline py-1 hover:text-white">{l.label}</Link></li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
