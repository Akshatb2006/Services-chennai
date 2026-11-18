"use client";

import { categories } from "@homecare/catalog";
import { timeSlots, weekdayLabels, type AvailabilityStatus, type TimeSlot } from "@homecare/contracts";
import { useState } from "react";
import { Button, ErrorBox, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { formatSlot } from "@/lib/format";

export type ProfessionalFormValues = {
  fullName: string;
  phone: string;
  categories: string[];
  pincodes: string[];
  availability: { weekday: number; slot: TimeSlot }[];
  availabilityStatus: AvailabilityStatus;
  notes: string;
};

const parsePincodes = (s: string) => [...new Set(s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))];

/** Register / edit a professional. Field rules mirror the API contract; the API validates again. */
export function ProfessionalForm({
  initial,
  mode,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ProfessionalFormValues>;
  mode: "create" | "edit";
  onSubmit: (v: ProfessionalFormValues) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [v, setV] = useState<ProfessionalFormValues>({
    fullName: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    categories: initial?.categories ?? [],
    pincodes: initial?.pincodes ?? [],
    availability: initial?.availability ?? [],
    availabilityStatus: initial?.availabilityStatus ?? "available",
    notes: initial?.notes ?? "",
  });
  const [pinText, setPinText] = useState((initial?.pincodes ?? []).join(", "));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const has = (weekday: number, slot: TimeSlot) => v.availability.some((a) => a.weekday === weekday && a.slot === slot);
  const toggle = (weekday: number, slot: TimeSlot) =>
    setV((x) => ({ ...x, availability: has(weekday, slot) ? x.availability.filter((a) => !(a.weekday === weekday && a.slot === slot)) : [...x.availability, { weekday, slot }] }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pincodes = parsePincodes(pinText);
    const errs: Record<string, string> = {};
    if (v.fullName.trim().length < 2) errs.fullName = "Enter the full name";
    if (mode === "create" && !/^(\+?91)?[\s-]*[6-9](\s?\d){9}$/.test(v.phone.trim().replace(/[\s-]/g, ""))) errs.phone = "Enter a valid 10-digit Indian mobile number";
    if (!v.categories.length) errs.categories = "Choose at least one category";
    if (!pincodes.length) errs.pincodes = "Add at least one pincode";
    else if (pincodes.some((p) => !/^[1-9]\d{5}$/.test(p))) errs.pincodes = "Pincodes must be 6 digits";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...v, pincodes });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" htmlFor="pf-name" error={errors.fullName}>
          <Input id="pf-name" value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} autoComplete="off" />
        </Field>
        {mode === "create" ? (
          <Field label="Mobile number" htmlFor="pf-phone" error={errors.phone}>
            <Input id="pf-phone" inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} placeholder="98400 12345" />
          </Field>
        ) : (
          <Field label="Availability" htmlFor="pf-avail">
            <Select id="pf-avail" value={v.availabilityStatus} onChange={(e) => setV({ ...v, availabilityStatus: e.target.value as AvailabilityStatus })}>
              <option value="available">Available for work</option>
              <option value="unavailable">Unavailable (on leave)</option>
            </Select>
          </Field>
        )}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[13px] font-semibold">Service categories</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = v.categories.includes(c.id);
            return (
              <label key={c.id} className={cx("inline-flex h-9 cursor-pointer items-center gap-2 rounded-pill border px-3.5 text-[13px] font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-citrus", on ? "border-citrus bg-citrus" : "border-line-strong bg-card")}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => setV({ ...v, categories: on ? v.categories.filter((x) => x !== c.id) : [...v.categories, c.id] })} />
                {c.name}
              </label>
            );
          })}
        </div>
        {errors.categories ? <p className="text-[13px] text-error">{errors.categories}</p> : null}
      </fieldset>

      <Field label="Serviceable pincodes" htmlFor="pf-pins" error={errors.pincodes} hint="Comma or space separated. Only pincodes this professional has agreed to cover.">
        <Textarea id="pf-pins" value={pinText} onChange={(e) => setPinText(e.target.value)} placeholder="600020, 600041" className="min-h-14" />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold">Weekly availability</legend>
        <div className="overflow-x-auto rounded-md border border-line bg-card">
          <table className="w-full text-center text-[13px]">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="px-2 py-2 text-left font-semibold">Slot</th>
                {weekdayLabels.map((d) => (
                  <th key={d} className="px-2 py-2 font-semibold">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot) => (
                <tr key={slot} className="border-b border-line last:border-0">
                  <th className="px-2 py-1.5 text-left font-semibold">{formatSlot(slot)}</th>
                  {weekdayLabels.map((d, weekday) => (
                    <td key={d} className="px-1 py-1.5">
                      <input type="checkbox" aria-label={`${d} ${slot}`} checked={has(weekday, slot)} onChange={() => toggle(weekday, slot)} className="size-4 accent-[#171A17]" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <Field label="Internal notes (optional)" htmlFor="pf-notes">
        <Textarea id="pf-notes" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} maxLength={500} className="min-h-14" />
      </Field>

      {mode === "create" ? <p className="text-[13px] text-muted">New professionals start as pending verification and can&apos;t be assigned until someone with verification rights verifies them.</p> : null}
      {error ? <ErrorBox message={error} /> : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" variant="primary" loading={busy}>
          {mode === "create" ? "Register professional" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
