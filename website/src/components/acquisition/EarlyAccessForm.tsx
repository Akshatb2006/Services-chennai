"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { apps, isPublished, type AppId, type Platform } from "@/config/apps";
import { CONSENT_TEXT, classifyContact } from "@/lib/early-access";
import { track } from "@/lib/analytics";

type Status = { kind: "idle" } | { kind: "submitting" } | { kind: "success" } | { kind: "error"; message: string };

type Props = {
  app: AppId;
  placement: string;
  tone?: "dark" | "light";
  submitLabel?: string;
};

export function EarlyAccessForm({ app, placement, tone = "dark", submitLabel = "Get early access" }: Props) {
  const id = useId();
  const [contact, setContact] = useState("");
  const [platform, setPlatform] = useState<Platform | "either">("either");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ contact?: string; consent?: string }>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const dark = tone === "dark";

  // Only offer platforms that aren't published yet.
  const pending = (["android", "ios"] as Platform[]).filter((p) => !isPublished(app, p));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = classifyContact(contact);
    const next: typeof errors = {};
    if (!parsed) next.contact = "Enter a valid email or 10-digit mobile number.";
    if (!consent) next.consent = "Please tick the box to agree to launch updates.";
    setErrors(next);
    if (next.contact || next.consent) {
      document.getElementById(next.contact ? `${id}-contact` : `${id}-consent`)?.focus();
      return;
    }

    setStatus({ kind: "submitting" });
    try {
      const res = await fetch(apps[app].earlyAccess.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app, contact, platform, consent, placement, company: fd.get("company") ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; field?: string; message?: string };
      if (res.ok && data.ok) {
        track("early_access_submitted", { app, method: parsed!.method, platform, placement });
        setStatus({ kind: "success" });
        return;
      }
      if (res.status === 422 && (data.field === "contact" || data.field === "consent")) {
        setErrors({ [data.field]: data.message });
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({
        kind: "error",
        message:
          data.error === "not_configured"
            ? "Early-access sign-ups aren't open just yet. Please check back soon."
            : data.message ?? "Something went wrong. Please try again.",
      });
    } catch {
      setStatus({ kind: "error", message: "We couldn't reach the server. Check your connection and try again." });
    }
  }

  if (status.kind === "success") {
    return (
      <div role="status" className={`flex items-start gap-3 rounded-lg p-4 ${dark ? "bg-white/[0.06] text-white" : "border border-line bg-card text-ink"}`}>
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-citrus [stroke:currentColor]" strokeWidth={2} aria-hidden="true" />
        <p className="text-[15px]">
          <span className="block font-semibold">You&apos;re on the list.</span>
          <span className={dark ? "text-white/70" : "text-muted"}>We&apos;ll let you know as soon as {apps[app].name} is ready to download.</span>
        </p>
      </div>
    );
  }

  const field = `h-12 w-full min-w-0 rounded-pill border px-5 text-[15px] outline-none transition-[border-color,box-shadow] focus-visible:shadow-none ${
    dark
      ? "border-white/20 bg-white/[0.06] text-white placeholder:text-white/50 focus:border-citrus focus:ring-2 focus:ring-citrus/40"
      : "border-line-strong bg-card text-ink placeholder:text-muted focus:border-ink focus:ring-2 focus:ring-citrus"
  }`;
  const submitting = status.kind === "submitting";

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby={status.kind === "error" ? `${id}-status` : undefined} className="grid gap-3">
      {/* Honeypot — hidden from people and assistive tech */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-contact`} className="sr-only">
            Email or mobile number
          </label>
          <input
            id={`${id}-contact`}
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="Email or mobile number"
            value={contact}
            onChange={(e) => {
              setContact(e.target.value);
              if (errors.contact) setErrors((x) => ({ ...x, contact: undefined }));
            }}
            aria-invalid={!!errors.contact}
            aria-describedby={errors.contact ? `${id}-contact-err` : undefined}
            className={field}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-pill bg-citrus px-6 text-[15px] font-semibold text-ink transition-[background-color,transform,opacity] duration-200 hover:bg-citrus-hover active:scale-[0.98] disabled:opacity-70"
        >
          {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Submitting…" : submitLabel}
          {!submitting && <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden="true" />}
        </button>
      </div>
      {errors.contact && (
        <p id={`${id}-contact-err`} className={`-mt-1 pl-5 text-sm ${dark ? "text-citrus" : "text-error"}`}>
          {errors.contact}
        </p>
      )}

      {pending.length > 1 && (
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className={`sr-only`}>Which phone do you use?</legend>
          <span aria-hidden="true" className={`mr-1 text-sm ${dark ? "text-white/70" : "text-muted"}`}>
            My phone:
          </span>
          {(["android", "ios", "either"] as const).map((p) => (
            <label
              key={p}
              className={`inline-flex h-9 cursor-pointer items-center rounded-pill border px-3.5 text-[13px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-citrus ${
                platform === p
                  ? "border-citrus bg-citrus text-ink"
                  : dark
                    ? "border-white/20 text-white/80 hover:border-white/50"
                    : "border-line-strong bg-card text-ink hover:border-ink/50"
              }`}
            >
              <input type="radio" name={`${id}-platform`} value={p} checked={platform === p} onChange={() => setPlatform(p)} className="sr-only" />
              {p === "android" ? "Android" : p === "ios" ? "iPhone" : "Not sure"}
            </label>
          ))}
        </fieldset>
      )}

      <label htmlFor={`${id}-consent`} className={`flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug ${dark ? "text-white/70" : "text-muted"}`}>
        <input
          id={`${id}-consent`}
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (errors.consent) setErrors((x) => ({ ...x, consent: undefined }));
          }}
          aria-invalid={!!errors.consent}
          aria-describedby={errors.consent ? `${id}-consent-err` : undefined}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#D5F36A]"
        />
        <span>
          {CONSENT_TEXT}{" "}
          <Link href="/privacy" className={`underline underline-offset-2 ${dark ? "text-white" : "text-ink"}`}>
            Privacy policy
          </Link>
        </span>
      </label>
      {errors.consent && (
        <p id={`${id}-consent-err`} className={`-mt-1 text-sm ${dark ? "text-citrus" : "text-error"}`}>
          {errors.consent}
        </p>
      )}

      <p id={`${id}-status`} role="alert" aria-live="assertive" className="empty:hidden">
        {status.kind === "error" && (
          <span className={`flex items-start gap-2 rounded-md px-3 py-2.5 text-sm ${dark ? "bg-white/[0.06] text-white" : "bg-stone text-ink"}`}>
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {status.message}
          </span>
        )}
      </p>
    </form>
  );
}
