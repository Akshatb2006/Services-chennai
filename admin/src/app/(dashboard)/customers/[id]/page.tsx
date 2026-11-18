"use client";

import type { AdminCustomerDetail } from "@homecare/contracts";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge, Card, EmptyState, ErrorBox, KeyValue, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatDay, formatPhone, formatSlot, serviceName, shortRef } from "@/lib/format";

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({ queryKey: ["customer", id], queryFn: ({ signal }) => api<AdminCustomerDetail>(`/admin/customers/${id}`, { signal }) });
  if (q.isPending) return <Spinner />;
  if (q.isError) return <ErrorBox message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const c = q.data;
  return (
    <>
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Customers
      </Link>
      <h1 className="mb-5 text-[26px] font-semibold tracking-[-0.03em]">{c.fullName ?? "Customer (profile incomplete)"}</h1>
      <div className="grid gap-5 xl:grid-cols-[minmax(300px,1fr)_minmax(0,1.6fr)]">
        <div className="grid content-start gap-5">
          <Card title="Profile">
            <KeyValue items={[["Phone", formatPhone(c.phone)], ["Email", c.email ?? "—"], ["Joined", formatDateTime(c.createdAt)], ["Requests", c.requestCount]]} />
          </Card>
          <Card title={`Saved addresses (${c.addresses.length})`} padded={false}>
            {c.addresses.length === 0 ? (
              <EmptyState icon={MapPin} title="No saved addresses" />
            ) : (
              <ul className="divide-y divide-line">
                {c.addresses.map((a) => (
                  <li key={a.id} className="px-4 py-3 text-sm">
                    <p className="flex items-center gap-2 font-semibold capitalize">
                      {a.label} {a.isDefault ? <Badge tone="citrus">Default</Badge> : null}
                    </p>
                    <p className="text-muted">{[a.line1, a.line2, a.landmark, `${a.city} ${a.pincode}`].filter(Boolean).join(", ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card title="Request history" padded={false}>
          {c.requests.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No requests yet" />
          ) : (
            <ul className="divide-y divide-line">
              {c.requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/requests/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-porcelain">
                    <span>
                      <span className="block text-sm font-semibold">{serviceName(r.service)}</span>
                      <span className="text-xs text-muted">
                        <span className="font-mono">{shortRef(r.id)}</span> · {formatDay(r.appointment?.date ?? r.preferredDate)} {formatSlot(r.appointment?.slot ?? r.preferredTime).toLowerCase()}
                      </span>
                    </span>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
