"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Menu, Smartphone, X } from "lucide-react";
import { brand } from "@/config/brand";
import { primaryNav } from "@/config/navigation";
import type { Category } from "@/config/services";
import { Logo } from "./Logo";
import { CategoryIcon } from "./CategoryIcon";
import { AppCTA } from "./acquisition/AppCTA";
import { anyPublished, ctaLabel } from "@/config/apps";

export type NavMenu = (Pick<Category, "id" | "name" | "icon"> & { services: { slug: string; name: string }[] })[];

export function Navbar({ menu, audience = "customer" }: { menu: NavMenu; audience?: "customer" | "professional" }) {
  const pro = audience === "professional";
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const megaRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMega = useCallback((returnFocus = false) => {
    setMegaOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Escape + click-outside for the mega menu
  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMega(true);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!megaRef.current?.contains(t) && !triggerRef.current?.contains(t)) closeMega();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [megaOpen, closeMega]);

  // Lock scroll + Escape for the mobile menu
  useEffect(() => {
    document.documentElement.style.overflow = mobileOpen ? "hidden" : "";
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const hoverOpen = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setMegaOpen(true), 80);
  };
  const hoverClose = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setMegaOpen(false), 180);
  };

  const solid = scrolled || megaOpen || mobileOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b bg-porcelain transition-[border-color,box-shadow] duration-300 ${
        solid ? "border-line" : "border-transparent"
      }`}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center" aria-label={`${brand.name} home`} onClick={() => setMobileOpen(false)}>
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          <li onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={megaOpen}
              aria-controls="mega-menu"
              onClick={() => setMegaOpen((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMegaOpen(true);
                  requestAnimationFrame(() => megaRef.current?.querySelector<HTMLAnchorElement>("a")?.focus());
                }
              }}
              className="flex h-10 items-center gap-1.5 rounded-pill px-4 text-[15px] font-medium text-ink transition-colors hover:bg-stone aria-expanded:bg-stone"
            >
              Services
              <ChevronDown
                className={`size-4 transition-transform duration-300 ${megaOpen ? "rotate-180" : ""}`}
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
          </li>
          {primaryNav.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="flex h-10 items-center rounded-pill px-4 text-[15px] font-medium text-ink transition-colors hover:bg-stone">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            {pro ? (
              <a
                href="#join"
                className="inline-flex h-10 items-center rounded-pill bg-citrus px-4 text-sm font-semibold text-ink transition-[background-color,transform] duration-200 hover:bg-citrus-hover active:scale-[0.97]"
              >
                Join as a professional
              </a>
            ) : (
              <AppCTA
                placement="navbar"
                className="inline-flex h-10 items-center gap-2 rounded-pill bg-ink px-4 text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-ink-raised active:scale-[0.97]"
              >
                <Smartphone className="size-4 text-citrus" strokeWidth={2} aria-hidden="true" />
                {ctaLabel("customer")}
              </AppCTA>
            )}
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="grid size-11 place-items-center rounded-pill text-ink transition hover:bg-stone lg:hidden"
          >
            {mobileOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* ── Desktop mega menu ─────────────────────────── */}
      {megaOpen && (
        <div
          ref={megaRef}
          id="mega-menu"
          onMouseEnter={hoverOpen}
          onMouseLeave={hoverClose}
          className="menu-in absolute inset-x-0 top-full hidden lg:block"
        >
          <div className="mx-auto max-w-[1400px] px-6 pt-2">
            <div className="grid grid-cols-[1fr_260px] overflow-hidden rounded-xl border border-line bg-card shadow-overlay">
              <div className="grid grid-cols-5 gap-6 p-8">
                {menu.map((cat) => (
                  <div key={cat.id}>
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <span className="grid size-7 place-items-center rounded-sm bg-stone text-ink">
                        <CategoryIcon icon={cat.icon} className="size-4" />
                      </span>
                      {cat.name}
                    </p>
                    <ul className="mt-4 grid gap-1">
                      {cat.services.map((s) => (
                        <li key={s.slug}>
                          <Link
                            href={`/services/${s.slug}`}
                            onClick={() => closeMega()}
                            className="block rounded-xs py-1.5 text-[14px] text-muted transition-colors hover:text-ink"
                          >
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-between bg-ink p-6 text-white">
                <div>
                  <p className="text-lg font-semibold tracking-[-0.02em]">{anyPublished("customer") ? "Book in the app" : "Get early access"}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {anyPublished("customer") ? "Every service, one tap away. On Android and iOS." : "Launching soon on Android and iOS."}
                  </p>
                </div>
                <div className="mt-6 grid gap-3">
                  <AppCTA
                    placement="mega-menu"
                    onNavigate={() => closeMega()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-citrus px-4 text-sm font-semibold text-ink transition-colors hover:bg-citrus-hover"
                  >
                    <Smartphone className="size-4" strokeWidth={2} aria-hidden="true" />
                    {ctaLabel("customer")}
                  </AppCTA>
                  <Link
                    href="/#services"
                    onClick={() => closeMega()}
                    className="inline-flex items-center justify-center gap-1.5 text-sm text-white/80 hover:text-white"
                  >
                    Browse all services <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile menu ───────────────────────────────── */}
      <div
        id="mobile-nav"
        className={`fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-porcelain transition-[opacity,visibility] duration-300 lg:hidden ${
          mobileOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="px-4 pb-28 pt-2 sm:px-6">
          <p className="pt-4 text-sm font-semibold text-muted">Services</p>
          <ul className="mt-2">
            {menu.map((cat) => (
              <li key={cat.id} className="border-b border-line">
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between py-3 text-lg font-semibold tracking-[-0.02em] text-ink [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-sm bg-stone"><CategoryIcon icon={cat.icon} className="size-[18px]" /></span>
                      {cat.name}
                    </span>
                    <ChevronDown className="size-5 text-muted transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <ul className="grid pb-3 pl-12">
                    {cat.services.map((s) => (
                      <li key={s.slug}>
                        <Link
                          href={`/services/${s.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className="block py-2.5 text-[15px] text-muted active:text-ink"
                        >
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>

          <ul className="mt-4">
            {primaryNav.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setMobileOpen(false)} className="block py-3 text-2xl font-semibold tracking-[-0.03em] text-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          {pro ? (
            <a
              href="#join"
              onClick={() => setMobileOpen(false)}
              className="mt-8 flex h-[52px] w-full items-center justify-center rounded-pill bg-citrus text-[15px] font-semibold text-ink active:scale-[0.98]"
            >
              Join as a professional
            </a>
          ) : (
            <AppCTA
            placement="mobile-menu"
            onNavigate={() => setMobileOpen(false)}
            className="mt-8 flex h-[52px] w-full items-center justify-center gap-2 rounded-pill bg-ink text-[15px] font-semibold text-white active:scale-[0.98]"
          >
            <Smartphone className="size-4 text-citrus" strokeWidth={2} aria-hidden="true" />
            {ctaLabel("customer")}
          </AppCTA>
          )}
        </div>
      </div>
    </header>
  );
}
