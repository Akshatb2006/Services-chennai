import type { Metadata } from "next";
import { ArrowDown, Briefcase, CalendarDays, ListChecks } from "lucide-react";
import { anyPublished, apps } from "@/config/apps";
import { location } from "@/config/location";
import { professionals } from "@/content/home";
import { SiteShell } from "@/components/SiteShell";
import { Container } from "@/components/Container";
import { Reveal } from "@/components/Reveal";
import { Phone, ProJob, ProProfile, ProToday } from "@/components/AppShowcase";
import { AppDownload } from "@/components/acquisition/AppDownload";

export const metadata: Metadata = {
  title: "For professionals",
  description: `${professionals.body} Get the ${apps.professional.name} app.`,
  alternates: { canonical: "/professionals" },
};

const icons = [Briefcase, ListChecks, CalendarDays];

/** Separate recruitment journey — professional audience only, its own app + store states. */
export default function ProfessionalsPage() {
  const live = anyPublished("professional");
  return (
    <SiteShell audience="professional">
      <section className="px-2 pt-[72px] sm:px-3">
        <div className="mx-auto max-w-[1400px] overflow-hidden rounded-xl bg-ink text-white">
          <Container className="grid gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-24">
            <div className="lg:col-span-6">
              <p className="text-sm font-semibold text-olive">
                {apps.professional.name} · for professionals in {location.city}
              </p>
              <h1 className="hero-rise mt-4 text-balance text-[2.6rem] font-semibold leading-[1] tracking-[-0.045em] sm:text-6xl lg:text-[4.25rem]">
                {professionals.title}
              </h1>
              <p className="hero-fade mt-5 max-w-md text-lg text-white/70">{professionals.body}</p>
              <a
                href="#join"
                className="hero-fade mt-8 inline-flex h-[52px] items-center gap-2 rounded-pill bg-citrus px-6 text-[15px] font-semibold text-ink transition-[background-color,transform] duration-200 hover:bg-citrus-hover active:scale-[0.98]"
                style={{ animationDelay: "150ms" }}
              >
                {professionals.cta}
                <ArrowDown className="size-4" strokeWidth={2.25} aria-hidden="true" />
              </a>
            </div>
            <div className="rail -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-2 lg:col-span-6 lg:mx-0 lg:justify-end lg:overflow-visible lg:px-0">
              <Phone caption="Today's jobs"><ProToday /></Phone>
              <div className="hidden xl:block">
                <Phone caption="Job checklist" raised><ProJob /></Phone>
              </div>
            </div>
          </Container>
        </div>
      </section>

      <section aria-labelledby="pro-points" className="py-16 sm:py-24">
        <Container>
          <h2 id="pro-points" className="sr-only">
            What the professional app does
          </h2>
          <ul className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {professionals.points.map((p, i) => {
              const Icon = icons[i];
              return (
                <Reveal as="li" key={p.title} delay={i * 0.08} className="border-t-2 border-ink pt-5">
                  <span className="grid size-11 place-items-center rounded-pill bg-citrus text-ink">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{p.title}</h3>
                  <p className="mt-1 text-[15px] text-muted">{p.body}</p>
                </Reveal>
              );
            })}
          </ul>
          <div className="mt-12 hidden justify-center gap-8 md:flex xl:hidden">
            <Phone caption="Job checklist"><ProJob /></Phone>
            <Phone caption="Skills & availability"><ProProfile /></Phone>
          </div>
          <p className="mt-6 text-center text-xs text-muted">Illustrative preview. Final app screens may differ.</p>
        </Container>
      </section>

      <section id="join" aria-labelledby="join-title" className="px-2 pb-2 sm:px-3 sm:pb-3">
        <div className="mx-auto max-w-[1400px] rounded-xl bg-ink py-16 text-white sm:py-20">
          <Container className="max-w-3xl">
            <h2 id="join-title" className="text-balance text-[2rem] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
              {live ? `Get the ${apps.professional.name} app` : professionals.cta}
            </h2>
            <p className="mt-3 max-w-lg text-[17px] text-white/70">
              {live
                ? "Download the app to set up your profile."
                : `${apps.professional.name} is launching soon. Leave your email or mobile number and we'll contact you about joining.`}
            </p>
            <div className="mt-8">
              <AppDownload app="professional" placement="professionals-page" tone="dark" size="lg" submitLabel={professionals.cta} />
            </div>
          </Container>
        </div>
      </section>
    </SiteShell>
  );
}
