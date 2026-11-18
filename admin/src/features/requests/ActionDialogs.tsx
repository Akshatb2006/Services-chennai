"use client";

import { timeSlots, todayInIndia, type TimeSlot } from "@homecare/contracts";
import { useState } from "react";
import { Button, Dialog, ErrorBox, Field, Input, Select, Textarea } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { formatSlot } from "@/lib/format";

/** Confirm-style action with an optional (or required) note. */
export function NoteDialog({
  open,
  onClose,
  title,
  description,
  label,
  required,
  confirmLabel,
  danger,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  label: string;
  required?: boolean;
  confirmLabel: string;
  danger?: boolean;
  onSubmit: (text: string) => Promise<unknown>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(text.trim());
      setText("");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="grid gap-4">
        <p className="text-sm text-muted">{description}</p>
        <Field label={label} htmlFor="action-note">
          <Textarea id="action-note" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} autoFocus />
        </Field>
        {error ? <ErrorBox message={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Back</Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} disabled={required && text.trim().length < 3} onClick={() => void submit()}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function RescheduleDialog({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial: { date: string; slot: TimeSlot };
  onSubmit: (body: { date: string; slot: TimeSlot; reason: string }) => Promise<unknown>;
}) {
  const [date, setDate] = useState(initial.date);
  const [slot, setSlot] = useState<TimeSlot>(initial.slot);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ date, slot, reason: reason.trim() });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Reschedule appointment">
      <div className="grid gap-4">
        <p className="text-sm text-muted">Same professional; the new slot is checked against their availability and bookings. The customer is notified.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="New date" htmlFor="rs-date">
            <Input id="rs-date" type="date" min={todayInIndia()} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Slot" htmlFor="rs-slot">
            <Select id="rs-slot" value={slot} onChange={(e) => setSlot(e.target.value as TimeSlot)}>
              {timeSlots.map((s) => (
                <option key={s} value={s}>
                  {formatSlot(s)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Reason" htmlFor="rs-reason">
          <Textarea id="rs-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
        </Field>
        {error ? <ErrorBox message={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Back</Button>
          <Button variant="primary" loading={busy} disabled={reason.trim().length < 3} onClick={() => void submit()}>
            Reschedule
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
