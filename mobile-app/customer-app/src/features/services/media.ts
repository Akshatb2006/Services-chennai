import type { Service as CatalogService, ServiceSlug } from "@homecare/catalog";
import type { ImageSource } from "expo-image";
import type { Service } from "@/types/service";

/**
 * App photography per service (same licensed photos as the website, resized to 1000px for mobile).
 * Every service has its own photo; "popular" picks use separate photos so a screen never repeats one.
 */
type Media = { image: ImageSource; alt: string };

const media: Record<ServiceSlug, Media> = {
  "home-cleaning": { image: require("@/assets/images/services/home-cleaning.jpg"), alt: "Woman in yellow gloves cleaning a table in a bright living room" },
  "deep-cleaning": { image: require("@/assets/images/services/deep-cleaning.jpg"), alt: "Vacuuming a bright, modern living room" },
  "bathroom-cleaning": { image: require("@/assets/images/services/bathroom-cleaning.jpg"), alt: "Steam cleaner sanitising a tiled bathroom wall" },
  "kitchen-cleaning": { image: require("@/assets/images/services/kitchen-cleaning.jpg"), alt: "Scrubbing a pan at a bright white kitchen sink" },
  "maid-services": { image: require("@/assets/images/services/maid-services.jpg"), alt: "Housekeeper carrying a cleaning caddy and broom up the stairs of a home" },
  "household-assistance": { image: require("@/assets/images/services/household-assistance.jpg"), alt: "Person organising cutlery in a kitchen drawer" },
  cooking: { image: require("@/assets/images/services/cooking.jpg"), alt: "Stirring a pot of food on the stove in a bright home kitchen" },
  laundry: { image: require("@/assets/images/services/laundry.jpg"), alt: "Woman carrying a laundry basket next to a washing machine" },
  ironing: { image: require("@/assets/images/services/ironing.jpg"), alt: "Steaming a shirt on a hanger in a bright room" },
  plumbing: { image: require("@/assets/images/services/plumbing.jpg"), alt: "Technician working on bathroom plumbing fittings" },
  electrical: { image: require("@/assets/images/services/electrical.jpg"), alt: "Technician fitting an electrical fixture on a wall at home" },
  "ac-servicing": { image: require("@/assets/images/services/ac-servicing.jpg"), alt: "Wall-mounted air conditioner in a bright room" },
  "other-services": { image: require("@/assets/images/services/other-services.jpg"), alt: "Feather duster cleaning a marble kitchen counter" },
};

/** Alternate photos for the Home "Popular" rail. */
export const popularMedia: Partial<Record<ServiceSlug, Media>> = {
  "deep-cleaning": { image: require("@/assets/images/services/popular-deep-cleaning.jpg"), alt: "Cleaning the floor of a bright living room" },
  "maid-services": { image: require("@/assets/images/services/popular-maid-services.jpg"), alt: "Wiping down a wooden surface with yellow gloves" },
  cooking: { image: require("@/assets/images/services/popular-cooking.jpg"), alt: "Chopping fresh vegetables in a home kitchen" },
  "bathroom-cleaning": { image: require("@/assets/images/services/popular-bathroom-cleaning.jpg"), alt: "Gloved hands wiping a white surface clean" },
  "home-cleaning": { image: require("@/assets/images/services/popular-home-cleaning.jpg"), alt: "Dusting shelves in a bright home with yellow gloves" },
};

export const withMedia = (s: CatalogService): Service => ({ ...s, ...media[s.slug] });
