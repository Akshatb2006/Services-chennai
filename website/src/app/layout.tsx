import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { brand } from "@/config/brand";
import { location } from "@/config/location";
import "@/styles/globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });

const title = `${brand.name} — Home services in ${location.city}`;

export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: { default: title, template: `%s · ${brand.name}` },
  description: brand.description,
  keywords: [
    "home cleaning Chennai",
    "deep cleaning Chennai",
    "maid service Chennai",
    "cooking help Chennai",
    "laundry and ironing Chennai",
    "bathroom cleaning Chennai",
    "kitchen cleaning Chennai",
    "plumber Chennai",
    "electrician Chennai",
    "AC service Chennai",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: brand.name,
    title,
    description: brand.description,
  },
  twitter: { card: "summary_large_image", title, description: brand.description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#171A17",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${manrope.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-citrus focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
