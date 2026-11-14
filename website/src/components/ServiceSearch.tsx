"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

export type SearchItem = { slug: string; name: string; category: string; terms: string };

/** Accessible combobox that filters the service catalogue client-side. */
export function ServiceSearch({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 6);
    const words = q.split(/\s+/);
    // Match word prefixes (so "ac" finds "AC Servicing", not "machine"); rank name matches first.
    const score = (i: SearchItem) => {
      const termWords = i.terms.split(/[^a-z0-9]+/);
      if (!words.every((w) => termWords.some((t) => t.startsWith(w)))) return -1;
      const name = i.name.toLowerCase();
      return name.startsWith(q) ? 3 : name.split(/\s+/).some((n) => n.startsWith(words[0])) ? 2 : 1;
    };
    return items
      .map((i) => ({ i, s: score(i) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((x) => x.i);
  }, [query, items]);

  const go = (slug: string) => {
    setOpen(false);
    router.push(`/services/${slug}`);
  };

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="sr-only">
        Search for a service
      </label>
      <div className="flex h-14 items-center gap-3 rounded-pill border border-line-strong bg-card px-5 transition-colors focus-within:border-ink focus-within:ring-2 focus-within:ring-citrus">
        <Search className="size-5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          placeholder="Search for a service, e.g. deep cleaning"
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              go(results[active].slug);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink outline-none focus-visible:shadow-none focus-visible:outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      {open && (
        <div className="menu-in absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-lg border border-line bg-card shadow-overlay">
          {results.length > 0 ? (
            <ul id={`${id}-list`} role="listbox" aria-label="Services" className="max-h-80 overflow-y-auto p-2">
              {!query && <li role="presentation" className="px-3 pb-1 pt-2 text-xs text-muted">Popular searches</li>}
              {results.map((r, i) => (
                <li
                  key={r.slug}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(r.slug)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-sm px-3 py-2.5 ${i === active ? "bg-porcelain" : ""}`}
                >
                  <span className="text-[15px] text-ink">{r.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {r.category}
                    <ArrowRight className={`size-3.5 transition-opacity ${i === active ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div id={`${id}-list`} role="listbox" aria-label="Services" className="p-5 text-sm text-muted">
              No matching service.{" "}
              <Link
                href="/services/other-services"
                onMouseDown={(e) => e.preventDefault()}
                className="font-semibold text-ink underline underline-offset-4"
              >
                Request something else
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
