import { popularSlugs } from "@homecare/catalog";
import { useQuery } from "@tanstack/react-query";
import { fetchServices } from "@/services/api/services";
import { queryKeys } from "@/services/api/query-client";
import { popularMedia } from "./media";

export function useServices() {
  return useQuery({ queryKey: queryKeys.services, queryFn: fetchServices, staleTime: Infinity });
}

export function useService(slug: string | undefined) {
  const query = useServices();
  return { ...query, data: query.data?.find((s) => s.slug === slug) };
}

export function usePopularServices() {
  const query = useServices();
  const data = popularSlugs
    .map((slug) => query.data?.find((s) => s.slug === slug))
    .filter((s) => s !== undefined)
    .map((s) => ({ ...s, ...(popularMedia[s.slug] ?? {}) }));
  return { ...query, data };
}
