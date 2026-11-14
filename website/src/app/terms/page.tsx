import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { brand } from "@/config/brand";
import { contact } from "@/config/contact";
import { location } from "@/config/location";

export const metadata: Metadata = { title: "Terms & conditions", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage
      title="Terms & conditions"
      sections={[
        { heading: "About this website", body: `This website provides information about home services offered by ${brand.name} in ${location.city}. Submitting an enquiry does not by itself create a booking or contract.` },
        { heading: "Services and pricing", body: "Availability, scope and pricing are confirmed individually for each enquiry before any work is scheduled." },
        { heading: "Changes", body: "These terms may be updated from time to time. The latest version will always be available on this page." },
        { heading: "Contact", body: `Questions about these terms can be sent to ${contact.email}.` },
      ]}
    />
  );
}
