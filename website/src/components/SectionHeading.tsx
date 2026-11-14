import { Reveal } from "./Reveal";

type Props = {
  id?: string;
  title: string;
  body?: string;
  aside?: React.ReactNode;
  tone?: "light" | "dark";
};

/** Compact section header: big headline left, optional one-liner + action right. */
export function SectionHeading({ id, title, body, aside, tone = "light" }: Props) {
  const dark = tone === "dark";
  return (
    <Reveal className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
      <h2 id={id} className={`max-w-2xl text-balance text-[2rem] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl ${dark ? "text-white" : "text-ink"}`}>
        {title}
      </h2>
      {(body || aside) && (
        <div className="flex flex-col gap-4 md:max-w-sm md:items-end md:text-right">
          {body && <p className={`text-base leading-relaxed sm:text-[17px] ${dark ? "text-white/70" : "text-muted"}`}>{body}</p>}
          {aside}
        </div>
      )}
    </Reveal>
  );
}
