"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CategoryIcon } from "./CategoryIcon";
import type { Category } from "@/config/services";

type Chip = Pick<Category, "id" | "shortName" | "icon"> & { count: number };

/**
 * Filters a server-rendered grid by toggling `hidden` on items with data-category.
 * No re-render of the cards themselves → minimal client work.
 */
export function CategoryFilter({ chips, total, children }: { chips: Chip[]; total: number; children: React.ReactNode }) {
  const [active, setActive] = useState("all");
  const gridRef = useRef<HTMLDivElement>(null);

  const apply = useCallback((id: string) => {
    setActive(id);
    gridRef.current?.querySelectorAll<HTMLElement>("[data-category]").forEach((el) => {
      el.hidden = id !== "all" && el.dataset.category !== id;
    });
  }, []);

  // Deep links: /#services-<category>
  useEffect(() => {
    const handle = () => {
      const m = window.location.hash.match(/^#services-(\w+)$/);
      if (!m) return;
      apply(m[1]);
      document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
    };
    handle();
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, [apply]);

  const all = [{ id: "all", shortName: "All", icon: null, count: total }, ...chips];

  return (
    <>
      <div className="rail -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="group" aria-label="Filter by category" className="flex w-max gap-2">
          {all.map((c) => {
            const on = c.id === active;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => apply(c.id)}
                className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-pill border pl-3.5 pr-2.5 text-sm font-semibold transition-[background-color,border-color,transform] duration-200 active:scale-[0.97] ${
                  on ? "border-citrus bg-citrus text-ink" : "border-line-strong bg-card text-ink hover:border-ink/50"
                }`}
              >
                {c.icon && <CategoryIcon icon={c.icon} className="size-4" />}
                {c.shortName}
                <span
                  className={`grid h-5 min-w-5 place-items-center rounded-pill px-1.5 text-[11px] tabular-nums transition-colors duration-200 ${on ? "bg-ink text-citrus" : "bg-stone text-muted"}`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div ref={gridRef} aria-live="polite" className="mt-6">
        {children}
      </div>
    </>
  );
}
