import type { Service as CatalogService } from "@homecare/catalog";
import type { ImageSource } from "expo-image";

export type { Category, CategoryId, ServiceMeta, ServiceSlug } from "@homecare/catalog";

/** A catalogue service with the app's photography attached. */
export type Service = CatalogService & { image: ImageSource; alt: string };
