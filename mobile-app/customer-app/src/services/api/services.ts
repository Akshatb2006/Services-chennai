import { services as catalogServices, type Service as CatalogService } from "@homecare/catalog";
import { withMedia } from "@/features/services/media";
import type { Service } from "@/types/service";
import { apiRequest } from "./client";
import { isApiConfigured } from "./config";

/**
 * Bookable services. The API returns the shared catalogue minus services operations has paused;
 * copy and ids still come from @homecare/catalog. If the API can't be reached, the bundled catalogue
 * is shown (the API still rejects requests for paused services with a clear message).
 */
export async function fetchServices(): Promise<Service[]> {
  if (!isApiConfigured) return catalogServices.map(withMedia);
  try {
    const { services } = await apiRequest<{ services: CatalogService[] }>("/services", { auth: false });
    const live = new Set(services.map((s) => s.slug));
    return catalogServices.filter((s) => live.has(s.slug)).map(withMedia);
  } catch {
    return catalogServices.map(withMedia);
  }
}
