import { searchServices } from "@homecare/catalog";
import type { CategoryId, Service } from "@/types/service";

export type ServiceFilter = { category: CategoryId | "all"; query: string };

/** Category filter + shared word-prefix search (same ranking as the website). Pure, so it's unit-tested. */
export function filterServices(list: readonly Service[], { category, query }: ServiceFilter): Service[] {
  const inCategory = category === "all" ? list : list.filter((s) => s.category === category);
  return searchServices(query, inCategory);
}
