"use client";

import { type AdminRequestDetail, type RequestAction } from "@homecare/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CalendarClock, CircleCheck, Play, Repeat, UserPlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge, Button, Card, ErrorBox, KeyValue, Spinner, cx } from "@/components/ui";
import { NoteDialog, RescheduleDialog } from "@/features/requests/ActionDialogs";
import { AssignDialog } from "@/features/requests/AssignDialog";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatDateTime, formatDay, formatPhone, formatSlot, serviceName, shortRef, statusLabels } from "@/lib/format";

const actionMeta: Record<RequestAction, { label: string; icon: LucideIcon; variant: "primary" | "secondary" | "danger" | "dark" }> = {
  assign: { label: "Assign professional", icon: UserPlus, variant: "primary" },
  reassign: { label: "Reassign", icon: Repeat, variant: "secondary" },
  confirm: { label: "Confirm appointment", icon: CircleCheck, variant: "primary" },
  reschedule: { label: "Reschedule", icon: CalendarClock, variant: "secondary" },
  start: { label: "Mark started", icon: Play, variant: "dark" },
  complete: { label: "Mark completed", icon: CircleCheck, variant: "primary" },
  cancel: { label: "Cancel request", icon: Ban, variant: "danger" },
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const client = useQueryClient();
  const [dialog, setDialog] = useState<RequestAction | null>(null);
  const q = useQuery({ queryKey: ["request", id], queryFn: ({ signal }) => api<AdminRequestDetail>(`/admin/requests/${id}`, { signal }) });

  const act = useMutation({
    mutationFn: ({ action, body }: { action: RequestAction; body?: object }) => api<AdminRequestDetail>(`/admin/requests/${id}/${action}`, { method: "POST", json: body ?? {} }),
    onSuccess: (d) => {
      client.setQueryData(["request", id], d);
      void client.invalidateQueries({ queryKey: ["requests"] });
      void client.invalidateQueries({ queryKey: ["overview"] });
    },
  });
  const run = (action: RequestAction) => (body?: object) => act.mutateAsync({ action, body });

  if (q.isPending) return <Spinner />;
  if (q.isError)
    return q.error instanceof ApiError && q.error.status === 404 ? <ErrorBox message="Request not found." /> : <ErrorBox message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;

  const d = q.data;
  const r = d.request;
  const active = d.assignments.find((a) => a.status === "active");

  return (
    <>
      <Link href="/requests" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Requests
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">{serviceName(r.service)}</h1>
            <StatusBadge status={r.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            <span className="font-mono">{shortRef(r.id)}</span> · received {formatDateTime(r.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {d.allowedActions.length === 0 ? (
            <Badge tone="outline">No actions available{r.status === "completed" || r.status === "cancelled" ? " (closed)" : " for your role"}</Badge>
          ) : (
            d.allowedActions.map((a) => {
              const m = actionMeta[a];
              return (
                <Button key={a} variant={m.variant} icon={m.icon} onClick={() => setDialog(a)}>
                  {m.label}
                </Button>
              );
            })
          )}
        </div>
      </div>

      {d.alerts.filter((a) => a.status === "open").map((a) => (
        <div key={a.id} role="alert" className="mb-5 rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm">
          <strong className="text-error">Action needed:</strong> {a.message} The booking stays as it is until you reassign or cancel it (or the professional is reactivated).
        </div>
      ))}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="grid content-start gap-5">
          <Card title="Customer requirements">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{r.details}</p>
          </Card>
          <Card title="Schedule & location">
            <KeyValue
              items={[
                ["Preferred", `${formatDay(r.preferredDate)} · ${formatSlot(r.preferredTime)}`],
                [
                  "Appointment",
                  r.appointment ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {formatDay(r.appointment.date)} · {formatSlot(r.appointment.slot)}
                      <Badge tone={r.appointment.confirmed ? "citrus" : "outline"}>{r.appointment.confirmed ? "Confirmed with customer" : "Not yet confirmed"}</Badge>
                    </span>
                  ) : (
                    <span className="text-muted">Not scheduled</span>
                  ),
                ],
                [
                  "Address (as sent)",
                  <span key="a">
                    {[r.address.line1, r.address.line2, r.address.landmark].filter(Boolean).join(", ")}
                    <br />
                    {r.address.city}, {r.address.state} <strong className="tabular-nums">{r.address.pincode}</strong>{" "}
                    <span className="text-muted">({r.address.label})</span>
                  </span>,
                ],
                ...(r.cancelReason ? ([["Cancellation reason", r.cancelReason]] as [string, string][]) : []),
              ]}
            />
          </Card>
          <Card title="Status history" padded={false}>
            <ol className="px-4 py-3">
              {d.events.map((e, i) => (
                <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < d.events.length - 1 ? <span className="absolute left-[5px] top-4 bottom-0 w-0.5 bg-line" aria-hidden /> : null}
                  <span className={cx("mt-1.5 size-3 shrink-0 rounded-pill", i === d.events.length - 1 ? "bg-ink" : "bg-line-strong")} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {e.fromStatus === null ? "Request submitted" : e.fromStatus === e.toStatus ? `Updated (${statusLabels[e.toStatus]})` : `${statusLabels[e.fromStatus]} → ${statusLabels[e.toStatus]}`}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(e.createdAt)} · {e.actorName ?? (e.actor === "customer" ? "Customer" : e.actor)}
                    </p>
                    {e.note && e.note !== "Request submitted" ? <p className="mt-0.5 text-sm">{e.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Customer notifications" padded={false}>
            {d.notifications.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">None yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {d.notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <span className="text-xs text-muted">{formatDateTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {n.deliveries.map((dl) => (
                        <Badge key={dl.channel} tone={dl.status === "sent" || dl.status === "available" ? "stone" : dl.status === "failed" ? "error" : "outline"}>
                          <span title={dl.detail ?? undefined}>
                            {dl.channel === "in_app" ? "In-app" : dl.channel.toUpperCase()}: {dl.status === "available" ? "in notification list" : dl.status}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-5">
          <Card title="Customer" action={<Link href={`/customers/${d.customer.id}`} className="text-[13px] font-semibold hover:underline">Profile</Link>}>
            <KeyValue
              items={[
                ["Name", d.customer.fullName ?? "—"],
                ["Phone", <a key="p" href={`tel:${d.customer.phone}`} className="hover:underline">{formatPhone(d.customer.phone)}</a>],
                ["Email", d.customer.email ?? "—"],
                ["Requests", d.customer.requestCount],
                ["Customer since", formatDateTime(d.customer.createdAt)],
              ]}
            />
          </Card>
          <Card title="Assignment">
            {active ? (
              <div className="grid gap-1">
                <Link href={`/professionals/${active.professional.id}`} className="font-semibold hover:underline">
                  {active.professional.fullName}
                </Link>
                <p className="text-sm text-muted">{formatPhone(active.professional.phone)}</p>
                <p className="text-sm">
                  {formatDay(active.date)} · {formatSlot(active.slot)}
                </p>
                <p className="text-xs text-muted">Assigned by {active.assignedBy ?? "—"}</p>
                <p className="mt-1">
                  {active.acknowledgedAt ? <Badge tone="stone">Seen by professional · {formatDateTime(active.acknowledgedAt)}</Badge> : <Badge tone="outline">Not yet acknowledged in the Pro app</Badge>}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">{r.status === "pending" ? "No professional assigned yet." : "No active assignment."}</p>
            )}
            {d.assignments.length > (active ? 1 : 0) ? (
              <details className="mt-3 border-t border-line pt-3">
                <summary className="cursor-pointer text-[13px] font-semibold">Assignment history ({d.assignments.length})</summary>
                <ul className="mt-2 grid gap-2">
                  {d.assignments.map((a) => (
                    <li key={a.id} className="text-[13px]">
                      <span className="font-semibold">{a.professional.fullName}</span> · {formatDay(a.date)} {formatSlot(a.slot).toLowerCase()} · <Badge tone={a.status === "active" ? "citrus" : "outline"}>{a.status}</Badge>
                      <span className="block text-muted">
                        by {a.assignedBy ?? "—"}, {formatDateTime(a.createdAt)}
                        {a.endReason ? ` · ended: ${a.endReason}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Card>
        </div>
      </div>

      {dialog === "assign" || dialog === "reassign" ? (
        <AssignDialog open onClose={() => setDialog(null)} detail={d} mode={dialog} onSubmit={run(dialog)} />
      ) : null}
      {dialog === "reschedule" && r.appointment ? (
        <RescheduleDialog open onClose={() => setDialog(null)} initial={{ date: r.appointment.date, slot: r.appointment.slot }} onSubmit={run("reschedule")} />
      ) : null}
      {dialog === "confirm" ? (
        <NoteDialog
          open
          onClose={() => setDialog(null)}
          title="Confirm appointment"
          description={`Confirm only after the customer has agreed to ${r.appointment ? `${formatDay(r.appointment.date)}, ${formatSlot(r.appointment.slot).toLowerCase()}` : "the appointment"}. They'll be notified.`}
          label="Note (optional)"
          confirmLabel="Confirm appointment"
          onSubmit={(note) => run("confirm")(note ? { note } : {})}
        />
      ) : null}
      {dialog === "start" || dialog === "complete" ? (
        <NoteDialog
          open
          onClose={() => setDialog(null)}
          title={dialog === "start" ? "Mark service started" : "Mark service completed"}
          description={dialog === "start" ? "Use when the professional has begun work." : "The customer will be told the service is complete."}
          label="Note (optional)"
          confirmLabel={dialog === "start" ? "Mark started" : "Mark completed"}
          onSubmit={(note) => run(dialog)(note ? { note } : {})}
        />
      ) : null}
      {dialog === "cancel" ? (
        <NoteDialog
          open
          onClose={() => setDialog(null)}
          title="Cancel this request"
          description="The customer is notified and any assigned professional is released. This can't be undone."
          label="Reason (shared with the customer)"
          required
          danger
          confirmLabel="Cancel request"
          onSubmit={(reason) => run("cancel")({ reason })}
        />
      ) : null}
    </>
  );
}
