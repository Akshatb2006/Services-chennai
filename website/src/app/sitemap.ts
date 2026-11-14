import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { services } from "@/config/services";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: brand.url, changeFrequency: "weekly", priority: 1 },
    ...services.map((s) => ({ url: `${brand.url}/services/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${brand.url}/get-app`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${brand.url}/professionals`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${brand.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${brand.url}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
