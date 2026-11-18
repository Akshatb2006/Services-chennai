"use client";

import { weekdayLabels, type AccountStatusResult, type Professional } from "@homecare/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CalendarDays, FileLock2, PauseCircle, PlayCircle, Power, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AccountBadge, StatusBadge, VerificationBadge } from "@/components/StatusBadge";
import { Badge, Button, Card, Dialog, EmptyState, ErrorBox, KeyValue, Spinner } from "@/components/ui";
import { NoteDialog } from "@/features/requests/ActionDialogs";
import { ProfessionalForm } from "@/features/professionals/ProfessionalForm";
import { api, ApiError, errorMessage } from "@/lib/api";
import { categoryName, formatDateTime, formatDay, formatPhone, formatSlot, serviceName } from "@/lib/format";
import { useSession } from "@/lib/session";

type StatusAction = { status: "suspended" | "inactive" | "active"; label: string };

export default function ProfessionalPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useSession();
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [verify, setVerify] = useState<"verified" | "rejected" | null>(null);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["professional", id], queryFn: ({ signal }) => api<Professional>(`/admin/professionals/${id}`, { signal }) });
  const save = (p: Professional) => {
    client.setQueryData(["professional", id], p);
    void client.invalidateQueries({ queryKey: ["professionals"] });
  };
  const verifyMut = useMutation({ mutationFn: (body: object) => api<Professional>(`/admin/professionals/${id}/verification`, { method: "POST", json: body }), onSuccess: save });
  const statusMut = useMutation({
    mutationFn: (body: object) => api<AccountStatusResult>(`/admin/professionals/${id}/account-status`, { method: "POST", json: body }),
    onSuccess: (p) => {
      save(p);
      void client.invalidateQueries({ queryKey: ["alerts"] });
      setNotice(
        p.affectedBookings.length
          ? `${p.affectedBookings.length} booking${p.affectedBookings.length === 1 ? " needs" : "s need"} action. They stay booked until you reassign or cancel each one (listed below and on the Overview).`
          : null,
      );
    },
  });

  if (q.isPending) return <Spinner />;
  if (q.isError) return q.error instanceof ApiError && q.error.status === 404 ? <ErrorBox message="Professional not found." /> : <ErrorBox message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const p = q.data;

  const statusActions: StatusAction[] =
    p.accountStatus === "active"
      ? [
          { status: "suspended", label: "Suspend" },
          { status: "inactive", label: "Deactivate" },
        ]
      : [{ status: "active", label: "Reactivate" }];

  return (
    <>
      <Link href="/professionals" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Professionals
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">{p.fullName}</h1>
            <VerificationBadge status={p.verificationStatus} />
            <AccountBadge status={p.accountStatus} />
            <Badge tone={p.availabilityStatus === "available" ? "stone" : "outline"}>{p.availabilityStatus === "available" ? "Available" : "Unavailable"}</Badge>
            <Badge tone={p.appLinked ? "ink" : "outline"}>{p.appLinked ? "Uses Pro app" : "Not on Pro app"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {formatPhone(p.phone)} · registered {formatDateTime(p.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("professionals.verify") && p.verificationStatus !== "verified" ? (
            <Button variant="primary" icon={BadgeCheck} onClick={() => setVerify("verified")}>
              Verify
            </Button>
          ) : null}
          {can("professionals.verify") && p.verificationStatus !== "rejected" ? (
            <Button variant="danger" icon={XCircle} onClick={() => setVerify("rejected")}>
              {p.verificationStatus === "verified" ? "Revoke verification" : "Reject"}
            </Button>
          ) : null}
          {can("professionals.status")
            ? statusActions.map((a) => (
                <Button key={a.status} icon={a.status === "active" ? PlayCircle : a.status === "suspended" ? PauseCircle : Power} variant={a.status === "active" ? "dark" : "secondary"} onClick={() => setStatusAction(a)}>
                  {a.label}
                </Button>
              ))
            : null}
          {can("professionals.write") ? <Button onClick={() => setEditing(true)}>Edit</Button> : null}
        </div>
      </div>

      {notice ? (
        <div className="mb-5 rounded-md border border-ink/15 bg-stone px-4 py-3 text-sm" role="status">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <div className="grid content-start gap-5">
          <Card title="Work profile">
            <KeyValue
              items={[
                ["Categories", p.categories.map(categoryName).join(", ")],
                ["Pincodes", <span key="p" className="tabular-nums">{p.pincodes.join(", ")}</span>],
                ["Verified", p.verifiedAt ? formatDateTime(p.verifiedAt) : "Not verified"],
                ["Notes", p.notes ?? "—"],
              ]}
            />
          </Card>
          <Card title="Weekly availability" padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-[13px]">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="px-3 py-2 text-left font-semibold">Slot</th>
                    {weekdayLabels.map((d) => (
                      <th key={d} className="px-2 py-2 font-semibold">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["morning", "afternoon", "evening"] as const).map((slot) => (
                    <tr key={slot} className="border-b border-line last:border-0">
                      <th className="px-3 py-2 text-left font-semibold">{formatSlot(slot)}</th>
                      {weekdayLabels.map((d, w) => {
                        const on = p.availability.some((a) => a.weekday === w && a.slot === slot);
                        return (
                          <td key={d} className="px-2 py-2">
                            <span className={on ? "inline-block size-3 rounded-pill bg-ink" : "inline-block size-3 rounded-pill border border-line-strong"} aria-label={on ? "Available" : "Not available"} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <div className="grid content-start gap-5">
          {p.openAlerts.length ? (
            <Card title={`Bookings needing action (${p.openAlerts.length})`} padded={false} className="border-error/30">
              <ul className="divide-y divide-line">
                {p.openAlerts.map((a) => (
                  <li key={a.id}>
                    <Link href={`/requests/${a.requestId}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-porcelain">
                      <span>
                        <strong>{serviceName(a.service)}</strong> · {formatDay(a.date)} {formatSlot(a.slot).toLowerCase()}
                      </span>
                      <span className="text-xs text-error">Reassign or cancel</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card title="Upcoming assignments" padded={false}>
            {p.upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming assignments" />
            ) : (
              <ul className="divide-y divide-line">
                {p.upcoming.map((a) => (
                  <li key={a.requestId}>
                    <Link href={`/requests/${a.requestId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-porcelain">
                      <span>
                        <span className="block text-sm font-semibold">{serviceName(a.service)}</span>
                        <span className="text-xs text-muted">
                          {formatDay(a.date)} · {formatSlot(a.slot)}
                        </span>
                      </span>
                      <StatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Verification documents">
            <div className="flex gap-3 text-sm">
              <FileLock2 className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
              <p className="text-muted">
                {p.documents.configured
                  ? `${p.documents.count} document${p.documents.count === 1 ? "" : "s"} on file.`
                  : "Secure document storage isn't connected yet, so documents aren't uploaded or shown here. Verify identity through the agreed offline process."}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit professional" wide>
        {editing ? (
          <ProfessionalForm
            mode="edit"
            initial={{ ...p, notes: p.notes ?? "" }}
            onCancel={() => setEditing(false)}
            onSubmit={async (v) => {
              // Phone is the professional's identity and isn't editable here.
              const body = { fullName: v.fullName, categories: v.categories, pincodes: v.pincodes, availability: v.availability, availabilityStatus: v.availabilityStatus, notes: v.notes || null };
              save(await api<Professional>(`/admin/professionals/${id}`, { method: "PATCH", json: body }));
              setEditing(false);
            }}
          />
        ) : null}
      </Dialog>
      {verify ? (
        <NoteDialog
          open
          onClose={() => setVerify(null)}
          title={verify === "verified" ? "Verify professional" : "Reject verification"}
          description={verify === "verified" ? "Confirm you have checked their identity and background according to the verification process. This is recorded in the audit log." : "They won't be eligible for any requests. This is recorded in the audit log."}
          label="Note (optional)"
          confirmLabel={verify === "verified" ? "Mark verified" : "Reject"}
          danger={verify === "rejected"}
          onSubmit={(note) => verifyMut.mutateAsync({ status: verify, ...(note && { note }) })}
        />
      ) : null}
      {statusAction ? (
        <NoteDialog
          open
          onClose={() => setStatusAction(null)}
          title={`${statusAction.label} ${p.fullName}`}
          description={
            statusAction.status === "active"
              ? "They become eligible for new requests again (if verified and available). Open booking alerts for them are resolved."
              : "They stop being eligible for new requests. Their upcoming bookings are NOT cancelled: each one is flagged for you to reassign or cancel."
          }
          label="Reason"
          required
          danger={statusAction.status !== "active"}
          confirmLabel={statusAction.label}
          onSubmit={(reason) => statusMut.mutateAsync({ status: statusAction.status, reason })}
        />
      ) : null}
    </>
  );
}
