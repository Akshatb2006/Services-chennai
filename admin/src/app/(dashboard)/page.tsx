"use client";

import { categories } from "@homecare/catalog";
import { requestStatuses, type OperationsAlert, type Overview, type RequestStatus } from "@homecare/contracts";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Inbox, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, EmptyState, ErrorBox, Input, PageHeader, Select, Spinner, cx } from "@/components/ui";
import { api, errorMessage, qs } from "@/lib/api";
import { formatDateTime, formatDay, formatSlot, serviceName, statusLabels, timeAgo } from "@/lib/format";

const tiles: { status: RequestStatus; hint: string }[] = [
  { status: "pending", hint: "Awaiting review" },
  { status: "assigned", hint: "Professional assigned, not yet confirmed" },
  { status: "confirmed", hint: "Confirmed appointments" },
  { status: "in_progress", hint: "Services in progress" },
  { status: "completed", hint: "Completed" },
  { status: "cancelled", hint: "Cancelled" },
];

export default function OverviewPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");
  const q = useQuery({
    queryKey: ["overview", from, to, category],
    queryFn: ({ signal }) => api<Overview>(`/admin/overview${qs({ from, to, category })}`, { signal }),
    refetchInterval: 30_000,
  });
  const alerts = useQuery({ queryKey: ["alerts", "open"], queryFn: ({ signal }) => api<OperationsAlert[]>("/admin/alerts?status=open", { signal }), refetchInterval: 30_000 });

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Live from the database. Counts use the request date; filters apply to everything on this page."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-[12px] font-semibold text-muted">
              From
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
            </label>
            <label className="grid gap-1 text-[12px] font-semibold text-muted">
              To
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
            </label>
            <label className="grid gap-1 text-[12px] font-semibold text-muted">
              Category
              <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-44">
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        }
      />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <div className="grid gap-5">
          {alerts.data?.length ? (
            <section aria-labelledby="needs-attention" className="rounded-lg border border-error/30 bg-error/5">
              <header className="flex items-center gap-2 border-b border-error/20 px-4 py-3">
                <TriangleAlert className="size-4 text-error" aria-hidden />
                <h2 id="needs-attention" className="text-sm font-semibold">
                  Needs attention: {alerts.data.length} booking{alerts.data.length === 1 ? "" : "s"} with an unavailable professional
                </h2>
              </header>
              <ul className="divide-y divide-error/10">
                {alerts.data.map((a) => (
                  <li key={a.id}>
                    <Link href={`/requests/${a.requestId}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-error/5">
                      <span>
                        <strong>{serviceName(a.service)}</strong> · {formatDay(a.date)} {formatSlot(a.slot).toLowerCase()} · {a.professional.fullName}
                      </span>
                      <span className="text-xs text-muted">Reassign or cancel →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {tiles.map(({ status, hint }) => (
              <Link
                key={status}
                href={`/requests${qs({ status })}`}
                className={cx(
                  "group rounded-lg border p-4 transition-colors",
                  status === "pending" && q.data.counts.pending > 0 ? "border-ink bg-ink text-white" : "border-line bg-card hover:border-ink/30",
                )}
              >
                <p className={cx("text-[13px] font-semibold", status === "pending" && q.data.counts.pending > 0 ? "text-citrus" : "text-muted")}>{statusLabels[status]}</p>
                <p className="mt-1 text-3xl font-semibold tracking-[-0.03em] tabular-nums">{q.data.counts[status]}</p>
                <p className={cx("mt-1 text-xs", status === "pending" && q.data.counts.pending > 0 ? "text-white/70" : "text-muted")}>{hint}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card title="Recent activity" padded={false} action={<Link href="/requests" className="text-[13px] font-semibold hover:underline">All requests</Link>}>
              {q.data.recentActivity.length === 0 ? (
                <EmptyState icon={Activity} title="No activity yet" body="Status changes on requests will appear here." />
              ) : (
                <ul className="divide-y divide-line">
                  {q.data.recentActivity.map((a) => (
                    <li key={a.id}>
                      <Link href={`/requests/${a.requestId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-porcelain">
                        <StatusBadge status={a.toStatus} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {serviceName(a.service)} · {a.customerName ?? "Customer"}
                          </p>
                          <p className="text-xs text-muted">
                            {a.fromStatus === a.toStatus ? "Updated" : a.fromStatus ? `${statusLabels[a.fromStatus]} → ${statusLabels[a.toStatus]}` : "Request submitted"} by {a.actorName ?? (a.actor === "customer" ? "customer" : a.actor)} ·{" "}
                            <time dateTime={a.createdAt} title={formatDateTime(a.createdAt)}>
                              {timeAgo(a.createdAt)}
                            </time>
                          </p>
                        </div>
                        <ArrowRight className="size-4 text-muted" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="grid content-start gap-5">
              <Card title="Review queue">
                {q.data.counts.pending === 0 ? (
                  <EmptyState icon={Inbox} title="Nothing awaiting review" />
                ) : (
                  <div className="grid gap-3">
                    <p className="text-sm">
                      <strong className="tabular-nums">{q.data.counts.pending}</strong> request{q.data.counts.pending === 1 ? "" : "s"} under review
                      {q.data.oldestPendingAt ? `; oldest received ${timeAgo(q.data.oldestPendingAt)}` : ""}.
                    </p>
                    <Link href="/requests?status=pending" className="inline-flex h-9 w-fit items-center gap-1.5 rounded-pill bg-citrus px-4 text-sm font-semibold hover:bg-citrus-hover">
                      Review requests <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                )}
              </Card>
              <Card title="Professionals">
                <dl className="grid grid-cols-3 gap-3 text-center">
                  {(
                    [
                      ["Verified", q.data.professionals.verified],
                      ["Ready for work", q.data.professionals.activeAndAvailable],
                      ["To verify", q.data.professionals.pendingVerification],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="rounded-md bg-porcelain p-3">
                      <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
                      <dt className="text-xs text-muted">{k}</dt>
                    </div>
                  ))}
                </dl>
              </Card>
              <p className="text-xs text-muted">
                {q.data.total} request{q.data.total === 1 ? "" : "s"} in range · statuses: {requestStatuses.map((s) => statusLabels[s]).join(" → ").replace(" → Cancelled", " · Cancelled")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
