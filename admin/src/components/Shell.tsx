"use client";

import type { Permission } from "@homecare/contracts";
import { staffRoleLabels } from "@homecare/contracts";
import { ClipboardList, LayoutDashboard, LogOut, Menu, ScrollText, Shapes, ShieldCheck, UserRoundCog, Users, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useSession } from "@/lib/session";
import { cx } from "./ui";

const nav: { href: string; label: string; icon: LucideIcon; permission: Permission }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, permission: "overview.read" },
  { href: "/requests", label: "Requests", icon: ClipboardList, permission: "requests.read" },
  { href: "/professionals", label: "Professionals", icon: UserRoundCog, permission: "professionals.read" },
  { href: "/customers", label: "Customers", icon: Users, permission: "customers.read" },
  { href: "/services", label: "Services", icon: Shapes, permission: "services.read" },
  { href: "/audit", label: "Audit log", icon: ScrollText, permission: "audit.read" },
  { href: "/staff", label: "Staff", icon: ShieldCheck, permission: "staff.manage" },
];

function Mark() {
  return (
    <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
      <rect width="28" height="28" rx="8" fill="#D5F36A" />
      <path d="M7.5 14.5 14 9l6.5 5.5M10 13v6.5h8V13" fill="none" stroke="#171A17" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { staff, can, signOut } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col bg-ink px-3 py-4 text-white">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2" onClick={() => setOpen(false)}>
        <Mark />
        <span className="font-bold tracking-[-0.02em]">Homecare</span>
        <span className="ml-1 rounded-pill border border-white/15 px-2 py-0.5 text-[11px] font-semibold text-olive">Ops</span>
      </Link>
      <ul className="grid gap-0.5">
        {nav
          .filter((n) => can(n.permission))
          .map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active(href) ? "page" : undefined}
                className={cx(
                  "relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  active(href) ? "bg-ink-raised text-white" : "text-white/70 hover:bg-ink-raised hover:text-white",
                )}
              >
                {active(href) ? <span className="absolute inset-y-2 left-0 w-1 rounded-pill bg-citrus" aria-hidden /> : null}
                <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden />
                {label}
              </Link>
            </li>
          ))}
      </ul>
      <div className="mt-auto border-t border-white/10 px-2 pt-4">
        <p className="truncate text-sm font-semibold">{staff?.fullName}</p>
        <p className="text-xs text-white/60">{staff ? staffRoleLabels[staff.role] : ""}</p>
        <button onClick={() => void signOut()} className="mt-3 flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-white/70 hover:bg-ink-raised hover:text-white">
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh lg:block">{sidebar}</aside>
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-porcelain/95 px-4 lg:hidden">
        <button onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-md hover:bg-stone" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <Mark />
        <span className="font-bold">Homecare Ops</span>
      </header>
      {open ? (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            {sidebar}
            <button onClick={() => setOpen(false)} className="absolute right-2 top-3 grid size-9 place-items-center rounded-md text-white hover:bg-ink-raised" aria-label="Close menu">
              <X className="size-5" />
            </button>
          </div>
        </div>
      ) : null}
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
