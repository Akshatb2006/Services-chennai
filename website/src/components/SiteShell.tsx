import { navMenu } from "@/lib/catalog";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { FloatingGetApp } from "./FloatingGetApp";
import { AppDialog } from "./acquisition/AppDialog";

/** audience="professional" swaps every acquisition CTA to the professional journey. */
export function SiteShell({ children, audience = "customer" }: { children: React.ReactNode; audience?: "customer" | "professional" }) {
  return (
    <>
      <Navbar menu={navMenu} audience={audience} />
      <main id="main">{children}</main>
      <Footer />
      <FloatingGetApp audience={audience} />
      <AppDialog />
    </>
  );
}
