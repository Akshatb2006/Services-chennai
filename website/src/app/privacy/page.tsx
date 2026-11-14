import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { launchMode } from "@/config/apps";
import { brand } from "@/config/brand";
import { contact } from "@/config/contact";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      sections={[
        { heading: "Information we collect", body: `When you use the ${brand.name} app or contact us by phone or email, we receive the details you choose to share, such as your name, phone number, locality and service requirements.` },
        ...(launchMode === "prelaunch" ? [{ heading: "Early-access registrations", body: "If you join an early-access list, we store the email address or mobile number you provide, the app you registered for, your phone platform preference and a record of your consent. We use it only to tell you when the app is available. You can ask us to delete it at any time." }] : []),
        { heading: "How we use it", body: "We use this information only to respond to your requests, arrange services you book, and communicate with you about them." },
        { heading: "Third-party services", body: "App downloads are handled by the Apple App Store and Google Play, under their own privacy policies. This website does not use advertising trackers." },
        { heading: "Contact", body: `For privacy questions, write to ${contact.email}.` },
      ]}
    />
  );
}
