import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
import { location } from "@/config/location";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — Home services in ${location.city}`,
    short_name: brand.name,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: "#171A17",
    theme_color: "#171A17",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
