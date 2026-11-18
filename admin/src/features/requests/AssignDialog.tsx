"use client";

import { categories, getService } from "@homecare/catalog";
import { ineligibilityLabels, timeSlots, todayInIndia, type AdminRequestDetail, type EligibilityResult, type TimeSlot } from "@homecare/contracts";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, UserRoundX } from "lucide-react";
import { useState } from "react";
import { VerificationBadge } from "@/components/StatusBadge";
import { Badge, Button, Dialog, EmptyState, ErrorBox, Field, Input, Select, Spinner, Textarea, cx } from "@/components/ui";
import { api, errorMessage, qs } from "@/lib/api";
import { categoryName, formatPhone, formatSlot } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  detail: AdminRequestDetail;
  mode: "assign" | "reassign";
  onSubmit: (body: { professionalId: string; date: string; slot: TimeSlot; note?: string; reason?: string }) => Promise<unknown>;
};

/** Eligible-professional picker. Eligibility is computed by the API; ineligible people show their reasons. */
export function AssignDialog({ open, onClose, detail, mode, onSubmit }: Props) {
  const r = detail.request;
  const [date, setDate] = useState(r.appointment?.date ?? (r.preferredDate < todayInIndia() ? todayInIndia() : r.preferredDate));
  const [slot, setSlot] = useState<TimeSlot>(r.appointment?.slot ?? (r.preferredTime === "flexible" ? "morning" : r.preferredTime));
  const [category, setCategory] = useState<string>(getService(r.service)?.category ?? "other");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const eligibility = useQuery({
    queryKey: ["eligibility", r.id, date, slot, category, showAll],
    queryFn: ({ signal }) => api<EligibilityResult>(`/admin/requests/${r.id}/eligible-professionals${qs({ date, slot, category, includeIneligible: showAll })}`, { signal }),
    enabled: open,
  });
  const current = detail.assignments.find((a) => a.status === "active");

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ professionalId: selected, date, slot, ...(mode === "reassign" ? { reason: text } : text ? { note: text } : {}) });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={mode === "assign" ? "Assign a professional" : "Reassign"} wide>
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Date" htmlFor="assign-date">
            <Input id="assign-date" type="date" min={todayInIndia()} value={date} onChange={(e) => { setDate(e.target.value); setSelected(null); }} />
          </Field>
          <Field label="Slot" htmlFor="assign-slot">
            <Select id="assign-slot" value={slot} onChange={(e) => { setSlot(e.target.value as TimeSlot); setSelected(null); }}>
              {timeSlots.map((s) => (
                <option key={s} value={s}>
                  {formatSlot(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Service category" htmlFor="assign-cat">
            <Select id="assign-cat" value={category} onChange={(e) => { setCategory(e.target.value); setSelected(null); }}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
          <span>
            Customer preferred {formatSlot(r.preferredTime).toLowerCase()} on {r.preferredDate} · pincode <strong className="text-ink">{r.address.pincode}</strong>
            {current ? ` · currently ${current.professional.fullName}, ${current.date} ${formatSlot(current.slot).toLowerCase()}` : ""}
          </span>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="size-4 accent-[#171A17]" />
            Show ineligible
          </label>
        </div>

        <div className="max-h-[42vh] overflow-y-auto rounded-md border border-line bg-card" role="radiogroup" aria-label="Professionals">
          {eligibility.isPending ? (
            <Spinner label="Checking eligibility" />
          ) : eligibility.isError ? (
            <div className="p-3">
              <ErrorBox message={errorMessage(eligibility.error)} />
            </div>
          ) : eligibility.data.candidates.length === 0 ? (
            <EmptyState
              icon={UserRoundX}
              title="No eligible professionals"
              body={`Nobody verified and available serves ${categoryName(category)} at pincode ${r.address.pincode} on that slot. Try another date or slot, or show ineligible to see why.`}
            />
          ) : (
            <ul className="divide-y divide-line">
              {eligibility.data.candidates.map(({ professional: p, eligible, reasons }) => (
                <li key={p.id}>
                  <label className={cx("flex items-start gap-3 px-4 py-3", eligible ? "cursor-pointer hover:bg-porcelain" : "opacity-70")}>
                    <input
                      type="radio"
                      name="professional"
                      disabled={!eligible}
                      checked={selected === p.id}
                      onChange={() => setSelected(p.id)}
                      className="mt-1 size-4 accent-[#171A17]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{p.fullName}</span>
                        {eligible ? (
                          <Badge tone="citrus">
                            <CircleCheck className="size-3.5" aria-hidden /> Eligible
                          </Badge>
                        ) : (
                          <VerificationBadge status={p.verificationStatus} />
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {formatPhone(p.phone)} · {p.categories.map(categoryName).join(", ")} · {p.pincodes.length} pincode{p.pincodes.length === 1 ? "" : "s"}
                      </span>
                      {reasons.length ? (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {reasons.map((x) => (
                            <Badge key={x} tone="error">
                              {ineligibilityLabels[x]}
                            </Badge>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Field label={mode === "reassign" ? "Reason for reassignment" : "Note (optional)"} htmlFor="assign-note">
          <Textarea id="assign-note" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder={mode === "reassign" ? "E.g. professional unwell" : "Visible in the request history"} />
        </Field>
        <p className="text-[13px] text-muted">Assigning doesn&apos;t confirm the appointment: confirm it with the customer as a separate step.</p>
        {error ? <ErrorBox message={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!selected || (mode === "reassign" && text.trim().length < 3)} loading={busy} onClick={() => void submit()}>
            {mode === "assign" ? "Assign" : "Reassign"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
