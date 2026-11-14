import { brand } from "@/config/brand";

/** Temporary mark: roofline on a citrus tile. Replace when the final logo exists. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true" focusable="false">
      <rect width="28" height="28" rx="8" fill="#D5F36A" />
      <path d="M7.5 14.5 14 9l6.5 5.5M10 13v6.5h8V13" fill="none" stroke="#171A17" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ tone = "dark" }: { tone?: "light" | "dark" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${tone === "light" ? "text-white" : "text-ink"}`}>
      <LogoMark />
      <span className="text-[17px] font-bold tracking-[-0.02em]">{brand.name.charAt(0) + brand.name.slice(1).toLowerCase()}</span>
    </span>
  );
}
