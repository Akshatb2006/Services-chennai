import { brand } from "@/config/brand";
import { location } from "@/config/location";

export const hero = {
  title: "Your home, taken care of.",
  body: "Everyday help, deep cleaning and home services. All in one place.",
};

/** "Why customers choose us" — short, no unverifiable claims. */
export const reasons = [
  { title: "Everything in one place", body: "Cleaning, help, laundry and repairs." },
  { title: "Book in a few taps", body: "Request any service from the app." },
  { title: "On your schedule", body: "One-time or recurring, your call." },
  { title: "Clear before we start", body: "Scope and price agreed upfront." },
];

export const steps = [
  { title: "Get the app", body: "Download it on Android or iOS." },
  { title: "Pick a service", body: "Choose what you need and when." },
  { title: "Send your request", body: "We confirm price and timing." },
];

/**
 * Testimonials — DEMO CONTENT ONLY. No real names, ratings or claims.
 * Replace with verified feedback after launch and set `isDemo: false`.
 */
export const testimonials = {
  enabled: true,
  isDemo: true,
  items: [
    { quote: "Placeholder — a short line of genuine customer feedback goes here.", context: "Deep cleaning" },
    { quote: "Placeholder — verified feedback about household help will appear here.", context: "Maid services" },
    { quote: "Placeholder — feedback from a repair or AC servicing visit goes here.", context: "AC servicing" },
  ],
};

export const faqs = [
  { q: "What services are available?", a: `Cleaning (home, deep, bathroom, kitchen), daily home help (maids, household assistance, cooking), laundry and ironing, and home repairs (plumbing, electrical, AC). Need something else? Ask us.` },
  { q: "How do I request a service?", a: `Download the ${brand.displayName} app for Android or iOS, pick a service, add your locality and preferred time, and send your request.` },
  { q: `Which areas of ${location.city} do you cover?`, a: `${location.city} is our launch city and neighbourhood coverage is being finalised. Enter your locality in the app to check availability.` },
  { q: "How is pricing decided?", a: "It depends on the service, your home and the scope. You'll get a clear price before anything is scheduled." },
  { q: "Can I book recurring help?", a: "Yes. Choose the days and times that work for you in the app and we'll set up a routine." },
  { q: "How do I change my request?", a: "Open the request in the app to update or cancel it." },
  { q: "Where can I get the app?", a: `Download the ${brand.displayName} app from the App Store on iPhone or Google Play on Android, then book any service in ${location.city}.` },
];

export const professionals = {
  title: "Build your work around better opportunities.",
  body: `Join our home-services professional network in ${location.city}.`,
  cta: "Join as a professional",
  points: [
    { title: "See your jobs for the day", body: "Times, tasks and notes in one place." },
    { title: "Clear checklists", body: "Know exactly what each job includes." },
    { title: "Your skills, your hours", body: "Set the services you offer and when you work." },
  ],
};
