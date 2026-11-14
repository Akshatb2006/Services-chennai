import { categories, servicesByCategory, getCategory, services } from "@/config/services";
import type { NavMenu } from "@/components/Navbar";
import type { SearchItem } from "@/components/ServiceSearch";

/** Slim, serialisable data for client components (keeps client bundles small). */
export const navMenu: NavMenu = categories.map((c) => ({
  id: c.id,
  name: c.name,
  icon: c.icon,
  services: servicesByCategory(c.id).map(({ slug, name }) => ({ slug, name })),
}));

export const searchIndex: SearchItem[] = services.map((s) => ({
  slug: s.slug,
  name: s.name,
  category: getCategory(s.category).shortName,
  terms: [s.name, s.summary, getCategory(s.category).name, ...(s.keywords ?? [])].join(" ").toLowerCase(),
}));
