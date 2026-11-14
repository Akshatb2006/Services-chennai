import Image from "next/image";
import {
  ArrowLeft, Bell, Briefcase, CalendarDays, Check, ChevronDown, Clock, House, LayoutGrid,
  MapPin, MessageCircle, Search, Smartphone, User,
} from "lucide-react";
import { brand } from "@/config/brand";
import { location } from "@/config/location";
import { categories, getService, popularServices } from "@/config/services";
import { Container } from "./Container";
import { CategoryIcon } from "./CategoryIcon";
import { Reveal } from "./Reveal";
import { anyPublished, apps } from "@/config/apps";
import { AppDownload } from "./acquisition/AppDownload";

/* Mock screens use the exact shared tokens (ink, citrus, porcelain, stone, Manrope, Lucide 1.75)
   at roughly 0.64× of a 390pt device so type sizes map to real app sizes. */

export function Phone({ children, caption, raised = false }: { children: React.ReactNode; caption: string; raised?: boolean }) {
  return (
    <figure className={`w-[248px] shrink-0 snap-center ${raised ? "lg:-translate-y-8" : ""}`}>
      <div className="rounded-[40px] bg-[#0E100E] p-[6px] ring-1 ring-white/10">
        <div inert className="relative h-[520px] overflow-hidden rounded-[34px] bg-porcelain text-ink">
          <div aria-hidden="true" className="absolute left-1/2 top-2 z-20 h-[20px] w-[76px] -translate-x-1/2 rounded-pill bg-[#0E100E]" />
          {children}
        </div>
      </div>
      <figcaption className="mt-4 text-center text-sm font-medium text-white/70">{caption}</figcaption>
    </figure>
  );
}

const StatusBar = ({ dark = false }: { dark?: boolean }) => (
  <div className={`flex h-10 items-end justify-between px-6 pb-1 text-[10px] font-semibold ${dark ? "text-white" : "text-ink"}`}>
    <span>9:41</span>
    <span className="h-[9px] w-[18px] rounded-[3px] border border-current p-px"><span className="block h-full w-3/4 rounded-[1px] bg-current" /></span>
  </div>
);

function TabBar({ items, active }: { items: { icon: typeof House; label: string }[]; active: number }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-line bg-card px-3 pb-5 pt-2">
      {items.map(({ icon: Icon, label }, i) => (
        <span key={label} className="flex flex-col items-center gap-0.5 text-[9px] font-semibold">
          <span className={`grid h-6 w-10 place-items-center rounded-pill ${i === active ? "bg-citrus" : ""}`}>
            <Icon className="size-[15px]" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className={i === active ? "text-ink" : "text-muted"}>{label}</span>
        </span>
      ))}
    </div>
  );
}

const customerTabs = [{ icon: House, label: "Home" }, { icon: LayoutGrid, label: "Services" }, { icon: MessageCircle, label: "Requests" }, { icon: User, label: "Account" }];
const proTabs = [{ icon: Briefcase, label: "Jobs" }, { icon: CalendarDays, label: "Schedule" }, { icon: User, label: "Profile" }];

/* ── Customer app ───────────────────────────────────────── */

export function CustomerHome() {
  const picks = popularServices().slice(0, 3);
  return (
    <>
      <StatusBar />
      <div className="px-4 pt-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10.5px] font-semibold">
            <MapPin className="size-3" strokeWidth={2.25} aria-hidden="true" /> {location.city} <ChevronDown className="size-3" aria-hidden="true" />
          </span>
          <Bell className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="mt-3 text-[21px] font-semibold leading-[1.05] tracking-[-0.04em]">Your home,<br />taken care of.</p>
        <div className="mt-3 flex h-9 items-center gap-2 rounded-pill border border-line bg-card px-3 text-[10.5px] text-muted">
          <Search className="size-3.5" aria-hidden="true" /> Search for a service
        </div>
        <div className="mt-4 grid grid-cols-4 gap-1.5">
          {categories.slice(0, 4).map((c) => (
            <span key={c.id} className="flex flex-col items-center gap-1">
              <span className="grid size-11 place-items-center rounded-md bg-stone"><CategoryIcon icon={c.icon} className="size-[18px]" /></span>
              <span className="text-[9px] font-semibold">{c.shortName}</span>
            </span>
          ))}
        </div>
        <p className="mt-4 text-[12px] font-semibold tracking-[-0.01em]">Popular</p>
        <div className="mt-2 flex gap-2">
          {picks.map((s) => (
            <span key={s.slug} className="w-[92px] shrink-0">
              <span className="relative block aspect-[4/5] overflow-hidden rounded-sm">
                <Image src={s.image} alt="" fill sizes="92px" className="object-cover" style={s.focus ? { objectPosition: s.focus } : undefined} />
              </span>
              <span className="mt-1 block truncate text-[9.5px] font-semibold">{s.name}</span>
            </span>
          ))}
        </div>
      </div>
      <TabBar items={customerTabs} active={0} />
    </>
  );
}

export function CustomerDetail() {
  const s = getService("deep-cleaning")!;
  return (
    <>
      <div className="relative h-[200px]">
        <Image src={s.image} alt="" fill sizes="240px" className="object-cover" />
        <span className="absolute left-4 top-10 grid size-7 place-items-center rounded-pill bg-card"><ArrowLeft className="size-3.5" aria-hidden="true" /></span>
      </div>
      <div className="relative -mt-4 rounded-t-lg bg-porcelain px-4 pt-4">
        <span className="rounded-pill bg-stone px-2 py-0.5 text-[9px] font-semibold">Cleaning</span>
        <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em]">{s.name}</p>
        <p className="mt-0.5 text-[10px] leading-snug text-muted">{s.summary}</p>
        <p className="mt-3.5 text-[11px] font-semibold">What&apos;s included</p>
        <ul className="mt-1.5 grid gap-1.5">
          {s.includes.slice(0, 4).map((i) => (
            <li key={i} className="flex items-center gap-2 text-[10px]">
              <span className="grid size-3.5 place-items-center rounded-pill bg-citrus"><Check className="size-2.5" strokeWidth={3} aria-hidden="true" /></span>
              {i}
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-card px-4 pb-6 pt-3">
        <span className="flex h-10 items-center justify-center gap-2 rounded-pill bg-ink text-[11px] font-semibold text-white">
          <Smartphone className="size-3.5 text-citrus" strokeWidth={2} aria-hidden="true" /> Request this service
        </span>
      </div>
    </>
  );
}

export function CustomerRequest() {
  const s = getService("deep-cleaning")!;
  const slots = ["Morning", "Afternoon", "Evening"];
  return (
    <>
      <StatusBar />
      <div className="px-4 pt-1.5">
        <span className="grid size-7 place-items-center rounded-pill border border-line bg-card"><ArrowLeft className="size-3.5" aria-hidden="true" /></span>
        <p className="mt-3 text-[19px] font-semibold tracking-[-0.035em]">Your request</p>
        <div className="mt-3 flex items-center gap-2.5 rounded-md border border-line bg-card p-2">
          <span className="relative size-10 shrink-0 overflow-hidden rounded-sm"><Image src={s.image} alt="" fill sizes="40px" className="object-cover" /></span>
          <span>
            <span className="block text-[11px] font-semibold">{s.name}</span>
            <span className="block text-[9.5px] text-muted">Price shared before scheduling</span>
          </span>
        </div>
        <p className="mb-1 mt-3.5 text-[10px] font-semibold">Locality</p>
        <p className="flex items-center gap-1.5 rounded-sm border border-line bg-card px-3 py-2.5 text-[10px] text-muted"><MapPin className="size-3" aria-hidden="true" /> Enter your locality</p>
        <p className="mb-1 mt-3 text-[10px] font-semibold">Preferred time</p>
        <div className="flex gap-1.5">
          {slots.map((t, i) => (
            <span key={t} className={`rounded-pill px-2.5 py-1.5 text-[9.5px] font-semibold ${i === 0 ? "bg-ink text-white" : "border border-line-strong bg-card"}`}>{t}</span>
          ))}
        </div>
        <p className="mb-1 mt-3 text-[10px] font-semibold">Notes</p>
        <p className="h-12 rounded-sm border border-line bg-card px-3 py-2 text-[10px] text-muted">e.g. 2BHK, furnished</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-6">
        <span className="flex h-10 items-center justify-center gap-2 rounded-pill bg-citrus text-[11px] font-semibold text-ink">
          Send request
        </span>
      </div>
    </>
  );
}

/* ── Professional app ───────────────────────────────────── */

export function ProToday() {
  const jobs = [
    { time: "9:30 AM", name: "Deep Cleaning", meta: "2BHK · Est. 4 hrs", status: "Next" },
    { time: "2:00 PM", name: "Bathroom Cleaning", meta: "2 bathrooms", status: "Confirmed" },
    { time: "5:30 PM", name: "Kitchen Cleaning", meta: "Chimney + hob", status: "Confirmed" },
  ];
  return (
    <>
      <div className="bg-ink pb-4 text-white">
        <StatusBar dark />
        <div className="px-4 pt-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-white/70">Good morning</span>
            <span className="flex items-center gap-1.5 rounded-pill bg-white/10 py-1 pl-2 pr-1 text-[9.5px] font-semibold">
              Available <span className="flex h-3.5 w-6 items-center justify-end rounded-pill bg-citrus px-0.5"><span className="size-2.5 rounded-pill bg-ink" /></span>
            </span>
          </div>
          <p className="mt-2 text-[20px] font-semibold tracking-[-0.035em]">Today</p>
          <p className="text-[10px] text-white/60">3 jobs scheduled</p>
        </div>
      </div>
      <ul className="grid gap-2 px-4 pt-3">
        {jobs.map((j, i) => (
          <li key={j.time} className={`rounded-md border bg-card p-3 ${i === 0 ? "border-ink" : "border-line"}`}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[9.5px] font-semibold text-muted"><Clock className="size-3" aria-hidden="true" />{j.time}</span>
              <span className={`rounded-pill px-2 py-0.5 text-[8.5px] font-semibold ${i === 0 ? "bg-citrus" : "bg-stone"}`}>{j.status}</span>
            </div>
            <p className="mt-1.5 text-[12px] font-semibold tracking-[-0.01em]">{j.name}</p>
            <p className="flex items-center gap-1 text-[9.5px] text-muted"><MapPin className="size-2.5" aria-hidden="true" />{location.city} · {j.meta}</p>
          </li>
        ))}
      </ul>
      <TabBar items={proTabs} active={0} />
    </>
  );
}

export function ProJob() {
  const s = getService("deep-cleaning")!;
  return (
    <>
      <StatusBar />
      <div className="px-4 pt-1.5">
        <div className="flex items-center justify-between">
          <span className="grid size-7 place-items-center rounded-pill border border-line bg-card"><ArrowLeft className="size-3.5" aria-hidden="true" /></span>
          <span className="rounded-pill bg-citrus px-2 py-0.5 text-[9px] font-semibold">9:30 AM</span>
        </div>
        <p className="mt-3 text-[19px] font-semibold tracking-[-0.035em]">{s.name}</p>
        <p className="text-[10px] text-muted">2BHK · furnished</p>
        <div className="mt-3 rounded-md border border-line bg-card p-3">
          <p className="text-[10px] font-semibold">Checklist</p>
          <ul className="mt-2 grid gap-2">
            {s.includes.map((t, i) => (
              <li key={t} className="flex items-center gap-2 text-[10px]">
                <span className={`grid size-4 place-items-center rounded-[5px] ${i < 2 ? "bg-ink text-citrus" : "border border-line-strong"}`}>
                  {i < 2 && <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className={i < 2 ? "text-muted line-through" : ""}>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-2.5 rounded-md bg-stone p-3 text-[9.5px] leading-snug text-ink">Customer note: please start with the kitchen.</div>
      </div>
      <div className="absolute inset-x-0 bottom-0 px-4 pb-6">
        <span className="flex h-10 items-center justify-center rounded-pill bg-ink text-[11px] font-semibold text-white">Mark job complete</span>
      </div>
    </>
  );
}

export function ProProfile() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <>
      <StatusBar />
      <div className="px-4 pt-1.5">
        <p className="text-[19px] font-semibold tracking-[-0.035em]">Profile</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-pill bg-ink text-[15px] font-semibold text-citrus">P</span>
          <span>
            <span className="block text-[12px] font-semibold">Your name</span>
            <span className="block text-[9.5px] text-muted">{brand.displayName} professional · {location.city}</span>
          </span>
        </div>
        <p className="mb-1.5 mt-4 text-[10px] font-semibold">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {["Home cleaning", "Deep cleaning", "Kitchen", "Laundry"].map((t, i) => (
            <span key={t} className={`rounded-pill px-2.5 py-1 text-[9.5px] font-semibold ${i < 3 ? "bg-ink text-white" : "border border-line-strong bg-card"}`}>{t}</span>
          ))}
        </div>
        <p className="mb-1.5 mt-4 text-[10px] font-semibold">Weekly availability</p>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => (
            <span key={i} className={`grid h-8 place-items-center rounded-sm text-[10px] font-semibold ${i < 5 ? "bg-citrus" : "border border-line bg-card text-muted"}`}>{d}</span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-md border border-line bg-card px-3 py-2.5 text-[10px]">
          <span className="font-semibold">Working hours</span>
          <span className="text-muted">8:00 AM – 6:00 PM</span>
        </div>
      </div>
      <TabBar items={proTabs} active={2} />
    </>
  );
}

export function AppShowcase() {
  return (
    <section id="get-app" aria-labelledby="app-title" className="overflow-hidden bg-ink py-20 text-white sm:py-28">
      <span id="download" className="block" aria-hidden="true" />
      <Container>
        <Reveal className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-olive">
            <Smartphone className="size-4" strokeWidth={1.75} aria-hidden="true" /> {apps.customer.name} app · Android & iOS
          </p>
          <h2 id="app-title" className="mt-3 text-balance text-[2rem] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
            Your home. Your schedule. Your app.
          </h2>
        </Reveal>

        <div className="rail -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-4 pt-10 lg:mx-0 lg:justify-center lg:gap-10 lg:overflow-visible lg:px-0 lg:pt-16">
          <Phone caption="Discover services"><CustomerHome /></Phone>
          <Phone caption="Service details" raised><CustomerDetail /></Phone>
          <Phone caption="Send a request"><CustomerRequest /></Phone>
        </div>
        <p className="mt-2 text-center text-xs text-white/55">Illustrative preview. Final app screens may differ.</p>

        <div className="mx-auto mt-10 max-w-3xl rounded-xl bg-ink-raised p-6 sm:p-10">
          <div className="text-center">
            <p className="text-2xl font-semibold tracking-[-0.03em] sm:text-[1.75rem]">
              {anyPublished("customer") ? `Get the ${apps.customer.name} app` : `Be first to get the ${apps.customer.name} app`}
            </p>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-white/70">
              {anyPublished("customer") ? "Browse services and send requests in a few taps." : "Launching soon in Chennai. Join the early-access list."}
            </p>
          </div>
          <div className="mt-7">
            <AppDownload placement="app-showcase" tone="dark" size="lg" align="center" />
          </div>
        </div>
      </Container>
    </section>
  );
}
