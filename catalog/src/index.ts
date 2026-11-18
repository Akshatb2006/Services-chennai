/**
 * HOMECARE SERVICE CATALOGUE — single source of truth for the website and the mobile apps.
 *
 * Framework-independent: plain TypeScript, no images, no React. Each platform attaches its own
 * photography by slug (website: src/config/services.ts, customer app: src/features/services/media.ts).
 *
 * Business details that are not yet confirmed (pricing, durations, supplies, guarantees, coverage)
 * are deliberately NOT stated. `meta` stays undefined until the business confirms it, and every UI
 * renders a meta field only when it is present.
 */

export const serviceSlugs = [
  "home-cleaning", "deep-cleaning", "bathroom-cleaning", "kitchen-cleaning",
  "maid-services", "household-assistance", "cooking",
  "laundry", "ironing",
  "plumbing", "electrical", "ac-servicing",
  "other-services",
] as const;
export type ServiceSlug = (typeof serviceSlugs)[number];

export type CategoryId = "cleaning" | "household" | "laundry" | "maintenance" | "other";

export type Category = {
  id: CategoryId;
  name: string;
  shortName: string;
  description: string;
  /** Semantic icon key; each platform maps it to its own icon component. */
  icon: "sparkles" | "hand" | "shirt" | "wrench" | "plus";
};

export type ServiceMeta = {
  /** Display string, e.g. "₹499" */
  priceFrom?: string;
  /** 0–5 */
  rating?: number;
  reviewCount?: number;
  /** Display string, e.g. "2–3 hrs" */
  duration?: string;
};

export type Service = {
  slug: ServiceSlug;
  name: string;
  category: CategoryId;
  summary: string;
  /** 2–4 word descriptor for compact cards */
  tagline: string;
  description: string;
  includes: string[];
  goodToKnow: string[];
  /** Extra search terms */
  keywords?: string[];
  /** Business data — leave undefined until confirmed by the business. */
  meta?: ServiceMeta;
};

export const categories: readonly Category[] = [
  { id: "cleaning", name: "Cleaning", shortName: "Cleaning", description: "Routine and deep cleaning for every room.", icon: "sparkles" },
  { id: "household", name: "Daily home help", shortName: "Home help", description: "Maids, household help and cooking.", icon: "hand" },
  { id: "laundry", name: "Laundry", shortName: "Laundry", description: "Washing and ironing at home.", icon: "shirt" },
  { id: "maintenance", name: "Home repairs", shortName: "Repairs", description: "Plumbing, electrical and AC.", icon: "wrench" },
  { id: "other", name: "Other services", shortName: "Other", description: "Need something else? Just ask.", icon: "plus" },
];

/** Notes shown with every service — honest about what is confirmed per request. */
export const sharedNotes: readonly string[] = [
  "Pricing depends on your home and the scope of work, and is shared with you before anything is scheduled.",
  "Availability is confirmed for your locality when you send a request in the app.",
];

export const services: readonly Service[] = [
  // ── Cleaning ────────────────────────────────────────────
  {
    slug: "home-cleaning",
    name: "Home Cleaning",
    category: "cleaning",
    summary: "Regular upkeep for every room, done properly.",
    tagline: "Routine upkeep",
    description:
      "A thorough routine clean for your home — the dusting, sweeping, mopping and wiping that keeps everyday living comfortable. Choose the rooms and tasks that matter to you.",
    includes: ["Dusting of furniture and surfaces", "Sweeping and mopping of floors", "Wiping of switchboards, doors and handles", "Tidying of living areas and bedrooms"],
    goodToKnow: ["Let us know the number of rooms and any areas to prioritise.", "One-time and recurring visits can both be discussed."],
    keywords: ["maid", "mopping", "sweeping", "dusting", "regular cleaning"],
  },
  {
    slug: "deep-cleaning",
    name: "Deep Cleaning",
    category: "cleaning",
    summary: "A top-to-bottom reset for move-ins, festivals and guests.",
    tagline: "Top-to-bottom reset",
    description:
      "An intensive clean that goes beyond the everyday — reaching the corners, fixtures and build-up that regular cleaning misses. Ideal before festivals, after renovations or when moving in or out.",
    includes: ["Detailed cleaning of all rooms", "Kitchen and bathroom fixtures", "Doors, windows, grills and fans", "Hard-to-reach corners and surfaces"],
    goodToKnow: ["Share your home size (e.g. 2BHK) and whether it is furnished.", "Mention any specific stains or areas of concern."],
    keywords: ["full home", "move in", "move out", "festival", "intensive"],
  },
  {
    slug: "bathroom-cleaning",
    name: "Bathroom Cleaning",
    category: "cleaning",
    summary: "Tiles, fittings and fixtures, scrubbed and refreshed.",
    tagline: "Tiles, taps & fittings",
    description:
      "Focused cleaning for bathrooms — tackling tiles, grout, taps, mirrors and sanitaryware so the space feels fresh again.",
    includes: ["Wall and floor tiles", "Taps, showers and fittings", "Washbasin, mirror and cabinets", "Toilet and sanitaryware"],
    goodToKnow: ["Tell us how many bathrooms you would like cleaned.", "Mention hard-water stains or specific concerns upfront."],
    keywords: ["toilet", "washroom", "tiles"],
  },
  {
    slug: "kitchen-cleaning",
    name: "Kitchen Cleaning",
    category: "cleaning",
    summary: "Counters, hob, sink and cabinets, properly de-greased.",
    tagline: "Hob, sink & cabinets",
    description:
      "A detailed kitchen clean covering the surfaces and fixtures that see the most use — leaving your kitchen hygienic and ready for cooking.",
    includes: ["Countertops and backsplash", "Gas hob and chimney exterior", "Sink and taps", "Cabinet fronts and shelves"],
    goodToKnow: ["Let us know if appliances like the fridge or chimney need attention.", "Mention whether cabinets should be emptied and cleaned inside."],
    keywords: ["chimney", "stove", "hob", "grease"],
  },

  // ── Daily household help ───────────────────────────────
  {
    slug: "maid-services",
    name: "Maid Services",
    category: "household",
    summary: "Dependable help with daily chores at home.",
    tagline: "Daily chores, handled",
    description:
      "Help with the day-to-day tasks of running a home — cleaning, utensils and general upkeep — arranged around your routine.",
    includes: ["Sweeping and mopping", "Washing utensils", "Dusting and tidying", "General daily upkeep"],
    goodToKnow: ["Share the tasks you need and your preferred timings.", "Daily, weekly or custom schedules can be discussed."],
    keywords: ["maid", "house help", "bai", "domestic help", "daily"],
  },
  {
    slug: "household-assistance",
    name: "Household Assistance",
    category: "household",
    summary: "An extra pair of hands for organising and upkeep.",
    tagline: "Organising & upkeep",
    description:
      "Practical help around the home — organising cupboards and drawers, arranging spaces and handling the tasks that keep getting pushed to the weekend.",
    includes: ["Organising cupboards and drawers", "Arranging and decluttering rooms", "Help with household errands at home", "Support before and after events"],
    goodToKnow: ["Describe the tasks you have in mind so we can understand the scope.", "Useful for one-off projects or regular support."],
    keywords: ["organising", "decluttering", "helper", "assistant"],
  },
  {
    slug: "cooking",
    name: "Cooking",
    category: "household",
    summary: "Help with daily meals and kitchen prep.",
    tagline: "Daily meals & prep",
    description:
      "Support with everyday cooking — from chopping and prep to preparing meals the way your family likes them.",
    includes: ["Vegetable cutting and prep", "Preparing daily meals", "Kitchen clean-up after cooking", "Help for occasions and guests"],
    goodToKnow: ["Share your dietary preferences and cuisine (e.g. South Indian, vegetarian).", "Let us know the number of people and meals per day."],
    keywords: ["cook", "chef", "meals", "food", "kitchen prep"],
  },

  // ── Laundry & care ─────────────────────────────────────
  {
    slug: "laundry",
    name: "Laundry",
    category: "laundry",
    summary: "Washing and drying, sorted at home.",
    tagline: "Wash & dry at home",
    description: "Help with your laundry at home — sorting, machine or hand washing, and drying, so the pile never builds up.",
    includes: ["Sorting clothes by colour and fabric", "Machine or hand washing", "Drying and collecting", "Putting clothes away"],
    goodToKnow: ["Mention any delicate fabrics that need special care.", "Can be combined with ironing in the same visit."],
    keywords: ["washing", "clothes", "washing machine"],
  },
  {
    slug: "ironing",
    name: "Ironing",
    category: "laundry",
    summary: "Crisp, neatly pressed clothes.",
    tagline: "Crisp & neatly pressed",
    description: "Careful ironing for everyday wear, work clothes and occasion outfits.",
    includes: ["Everyday and office wear", "Sarees and occasion wear", "Bedsheets and linen", "Folding or hanging after ironing"],
    goodToKnow: ["Let us know the approximate number of garments.", "Mention fabrics that need a low-heat or steam press."],
    keywords: ["press", "iron", "steam"],
  },

  // ── Home maintenance ───────────────────────────────────
  {
    slug: "plumbing",
    name: "Plumbing",
    category: "maintenance",
    summary: "Leaks, taps, fittings and drainage.",
    tagline: "Leaks, taps & drains",
    description: "Help with plumbing repairs and installations — from leaking taps and blocked drains to new fittings.",
    includes: ["Leaking taps and pipes", "Blocked sinks and drains", "Tap, shower and fitting installation", "Flush and cistern repairs"],
    goodToKnow: ["Adding a photo of the issue in the app helps us understand it faster.", "Parts and materials, if needed, are discussed before work begins."],
    keywords: ["plumber", "leak", "tap", "drain", "pipe"],
  },
  {
    slug: "electrical",
    name: "Electrical",
    category: "maintenance",
    summary: "Switches, wiring, lights and fixtures.",
    tagline: "Switches, lights & wiring",
    description: "Help with electrical repairs and installations at home — switches, sockets, lights, fans and wiring issues.",
    includes: ["Switch and socket repairs", "Light and fan installation", "Wiring faults", "MCB and fuse issues"],
    goodToKnow: ["Describe the problem and share a photo if possible.", "Parts and materials, if needed, are discussed before work begins."],
    keywords: ["electrician", "wiring", "switch", "fan", "light"],
  },
  {
    slug: "ac-servicing",
    name: "AC Servicing",
    category: "maintenance",
    summary: "Cleaning, servicing and repairs for your AC.",
    tagline: "Service, clean & repair",
    description: "Keep your air conditioner running efficiently through Chennai's summers with servicing, cleaning and repairs.",
    includes: ["Filter and coil cleaning", "General servicing", "Cooling and performance issues", "Installation and uninstallation"],
    goodToKnow: ["Share the AC type (split or window) and the number of units.", "Mention the brand and any error codes if shown."],
    keywords: ["air conditioner", "ac repair", "cooling", "split", "window"],
  },

  // ── Other ──────────────────────────────────────────────
  {
    slug: "other-services",
    name: "Something else",
    category: "other",
    summary: "Need something that isn't listed? Tell us.",
    tagline: "Just ask",
    description:
      "Homes need all kinds of help. If your requirement isn't listed, describe it in the app and we'll let you know how we can help.",
    includes: ["Describe what you need in the app", "We review your requirement", "We get back to you with next steps"],
    goodToKnow: ["The more detail you share, the better we can help."],
    keywords: ["other", "custom", "misc"],
  },
];

/** Editorial pick for "Popular services" (not usage data). */
export const popularSlugs: readonly ServiceSlug[] = ["deep-cleaning", "maid-services", "cooking", "bathroom-cleaning", "home-cleaning"];

export const isServiceSlug = (value: string): value is ServiceSlug => (serviceSlugs as readonly string[]).includes(value);
export const getService = (slug: string) => services.find((s) => s.slug === slug);
export const getCategory = (id: CategoryId) => categories.find((c) => c.id === id)!;
export const servicesByCategory = (id: CategoryId) => services.filter((s) => s.category === id);

/**
 * Word-prefix search, ranked: name starts with the query (3) › a name word starts with the
 * first query word (2) › any other match (1). "ac" finds "AC Servicing" but not "machine".
 */
export function searchServices<T extends Service>(query: string, list: readonly T[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...list];
  const words = q.split(/\s+/);
  const scored: { item: T; score: number }[] = [];
  for (const item of list) {
    const terms = [item.name, item.summary, item.tagline, getCategory(item.category).name, ...(item.keywords ?? [])]
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/);
    if (!words.every((w) => terms.some((t) => t.startsWith(w)))) continue;
    const name = item.name.toLowerCase();
    const score = name.startsWith(q) ? 3 : name.split(/\s+/).some((n) => n.startsWith(words[0])) ? 2 : 1;
    scored.push({ item, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
}

// Guard: the slug list and the catalogue must match exactly (fails at build/test time).
if (services.map((s) => s.slug).join() !== serviceSlugs.join()) {
  throw new Error("@homecare/catalog: serviceSlugs is out of sync with services");
}
