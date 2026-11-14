import Image from "next/image";
import { CalendarDays, LayoutGrid, MessageCircle, ReceiptText } from "lucide-react";
import livingRoom from "@/assets/photos/living-room.jpg";
import { reasons } from "@/content/home";
import { Container } from "./Container";
import { Reveal } from "./Reveal";

const icons = [LayoutGrid, MessageCircle, CalendarDays, ReceiptText];

export function WhyChooseUs() {
  return (
    <section id="why-choose-us" aria-labelledby="why-title" className="py-20 sm:py-28">
      <Container className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <Reveal className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone lg:col-span-6 lg:aspect-[5/6]">
          <Image src={livingRoom} alt="A calm, well-kept living room" fill placeholder="blur" sizes="(min-width:1024px) 620px, 100vw" className="object-cover" />
        </Reveal>
        <div className="lg:col-span-6">
          <Reveal>
            <h2 id="why-title" className="text-balance text-[2rem] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
              Why customers choose us
            </h2>
          </Reveal>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:gap-x-8 lg:mt-12">
            {reasons.map((r, i) => {
              const Icon = icons[i];
              return (
                <Reveal as="li" key={r.title} delay={i * 0.06}>
                  <span className="grid size-11 place-items-center rounded-pill bg-citrus text-ink">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{r.title}</h3>
                  <p className="mt-1 text-[15px] text-muted">{r.body}</p>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}
