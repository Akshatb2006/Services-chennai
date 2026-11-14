import { SiteShell } from "@/components/SiteShell";
import { Hero } from "@/components/Hero";
import { ServiceCatalogue } from "@/components/ServiceCatalogue";
import { PopularServices } from "@/components/PopularServices";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { HowItWorks } from "@/components/HowItWorks";
import { AppShowcase } from "@/components/AppShowcase";
import { ChennaiSection } from "@/components/ChennaiSection";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { brand } from "@/config/brand";
import { contact } from "@/config/contact";
import { location } from "@/config/location";
import { services } from "@/config/services";
import { faqs } from "@/content/home";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "HomeAndConstructionBusiness",
      "@id": `${brand.url}/#business`,
      name: brand.name,
      description: brand.description,
      url: brand.url,
      email: contact.email,
      address: { "@type": "PostalAddress", addressLocality: location.city, addressRegion: location.region, addressCountry: "IN" },
      areaServed: { "@type": "City", name: location.city },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Home services",
        itemListElement: services.map((s) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: s.name, description: s.summary, url: `${brand.url}/services/${s.slug}` },
        })),
      },
    },
    { "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ],
};

export default function Home() {
  return (
    <SiteShell>
      <Hero />
      <ServiceCatalogue />
      <AppShowcase />
      <PopularServices />
      <WhyChooseUs />
      <HowItWorks />
      <ChennaiSection />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </SiteShell>
  );
}
