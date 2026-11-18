import type { StaticImageData } from "next/image";
import homeCleaning from "@/assets/photos/home-cleaning.jpg";
import deepCleaning from "@/assets/photos/deep-cleaning.jpg";
import bathroomCleaning from "@/assets/photos/bathroom-cleaning.jpg";
import kitchenCleaning from "@/assets/photos/kitchen-cleaning.jpg";
import maidServices from "@/assets/photos/maid-services.jpg";
import householdAssistance from "@/assets/photos/household-assistance.jpg";
import cooking from "@/assets/photos/cooking.jpg";
import laundry from "@/assets/photos/laundry.jpg";
import ironing from "@/assets/photos/ironing.jpg";
import plumbing from "@/assets/photos/plumbing.jpg";
import electrical from "@/assets/photos/electrical.jpg";
import acServicing from "@/assets/photos/ac-servicing.jpg";
import otherServices from "@/assets/photos/other-services.jpg";
import popDeep from "@/assets/photos/popular-deep-cleaning.jpg";
import popMaid from "@/assets/photos/popular-maid-services.jpg";
import popCooking from "@/assets/photos/popular-cooking.jpg";
import popBathroom from "@/assets/photos/popular-bathroom-cleaning.jpg";
import popHome from "@/assets/photos/popular-home-cleaning.jpg";

import {
  services as catalogServices,
  type Service as CatalogService,
  type ServiceSlug,
} from "@homecare/catalog";

/**
 * Website view of the shared catalogue (`/catalog`, package `@homecare/catalog`).
 * Service names, copy and categories live there — edit them there, not here.
 * This file only attaches the website's photography to each service.
 */
export { categories, sharedNotes, getCategory } from "@homecare/catalog";
export type { Category, CategoryId, ServiceMeta } from "@homecare/catalog";

type Media = { image: StaticImageData; alt: string; /** CSS object-position for the crop */ focus?: string };
export type Service = CatalogService & Media;

const media: Record<ServiceSlug, Media> = {
  "home-cleaning": { image: homeCleaning, alt: "Woman in yellow gloves cleaning a table in a bright living room" },
  "deep-cleaning": { image: deepCleaning, alt: "Vacuuming a bright, modern living room" },
  "bathroom-cleaning": { image: bathroomCleaning, alt: "Steam cleaner sanitising a tiled bathroom wall" },
  "kitchen-cleaning": { image: kitchenCleaning, alt: "Scrubbing a pan at a bright white kitchen sink" },
  "maid-services": { image: maidServices, alt: "Housekeeper carrying a cleaning caddy and broom up the stairs of a home" },
  "household-assistance": { image: householdAssistance, alt: "Person organising cutlery in a kitchen drawer" },
  "cooking": { image: cooking, alt: "Stirring a pot of food on the stove in a bright home kitchen" },
  "laundry": { image: laundry, alt: "Woman carrying a laundry basket next to a washing machine" },
  "ironing": { image: ironing, alt: "Steaming a shirt on a hanger in a bright room" },
  "plumbing": { image: plumbing, alt: "Technician working on bathroom plumbing fittings" },
  "electrical": { image: electrical, alt: "Technician fitting an electrical fixture on a wall at home" },
  "ac-servicing": { image: acServicing, alt: "Wall-mounted air conditioner in a bright room", focus: "50% 0%" },
  "other-services": { image: otherServices, alt: "Feather duster cleaning a marble kitchen counter" },
};

export const services: Service[] = catalogServices.map((s) => ({ ...s, ...media[s.slug] }));

export const servicesByCategory = (id: CatalogService["category"]) => services.filter((s) => s.category === id);
export const getService = (slug: string) => services.find((s) => s.slug === slug);


/** Curated for the "Popular services" showcase (editorial pick, not usage data). */
/** Each popular pick uses its own photograph so imagery never repeats the catalogue. */
export const popular: { slug: ServiceSlug; image: StaticImageData; alt: string }[] = [
  { slug: "deep-cleaning", image: popDeep, alt: "Cleaning the floor of a bright living room" },
  { slug: "maid-services", image: popMaid, alt: "Wiping down a wooden surface with yellow gloves" },
  { slug: "cooking", image: popCooking, alt: "Chopping fresh vegetables in a home kitchen" },
  { slug: "bathroom-cleaning", image: popBathroom, alt: "Gloved hands wiping a white surface clean" },
  { slug: "home-cleaning", image: popHome, alt: "Dusting shelves in a bright home with yellow gloves" },
];
export const popularServices = () => popular.map((p) => ({ ...getService(p.slug)!, image: p.image, alt: p.alt, focus: undefined }));
