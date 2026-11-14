/**
 * Plain list of service slugs (no image imports) so the lightweight proxy can
 * return a real 404 for unknown /services/* URLs. Kept in sync with services.ts —
 * a mismatch throws at build time.
 */
export const serviceSlugs = [
  "home-cleaning", "deep-cleaning", "bathroom-cleaning", "kitchen-cleaning",
  "maid-services", "household-assistance", "cooking",
  "laundry", "ironing",
  "plumbing", "electrical", "ac-servicing",
  "other-services",
] as const;
