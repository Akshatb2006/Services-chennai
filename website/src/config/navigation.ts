/** Primary navigation. Hash links are absolute ("/#...") so they work from every page. */
export const primaryNav = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/professionals", label: "For professionals" },
  { href: "/#faq", label: "FAQs" },
] as const;

export const footerNav = {
  about: [
    { href: "/#how-it-works", label: "How it works" },
    { href: "/get-app", label: "Get the app" },
    { href: "/professionals", label: "For professionals" },
    { href: "/#faq", label: "FAQs" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy policy" },
    { href: "/terms", label: "Terms & conditions" },
  ],
} as const;
