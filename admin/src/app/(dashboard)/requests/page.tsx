"use client";

import { categories, services } from "@homecare/catalog";
import { requestStatuses, type AdminRequestListItem, type Paged, type RequestStatus } from "@homecare/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ClipboardList, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, EmptyState, ErrorBox, Input, PageHeader, Pagination, Select, Spinner } from "@/components/ui";
import { api, errorMessage, qs } from "@/lib/api";
import { formatDateTime, formatDay, formatPhone, formatSlot, serviceName, shortRef, statusLabels } from "@/lib/format";

export default function RequestsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Requests />
    </Suspense>
  );
}

function Requests() {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RequestStatus | "">((params.get("status") as RequestStatus) ?? "");
  const [category, setCategory] = useState("");
  const [service, setService] = useState("");
  const [dateField, setDateField] = useState<"created" | "preferred">("created");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const filters = { q: q.trim(), status, category, service, dateField, from, to, page, pageSize: 25 };

  const list = useQuery({
    queryKey: ["requests", filters],
    queryFn: ({ signal }) => api<Paged<AdminRequestListItem>>(`/admin/requests${qs(filters)}`, { signal }),
    placeholderData: keepPreviousData,
  });
  const set = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Requests" subtitle="Search by reference (#3F2A…), customer name or phone." />
      <Card padded={false}>
        <div className="grid gap-2 border-b border-line p-3 md:grid-cols-[minmax(200px,1.4fr)_repeat(3,minmax(140px,1fr))] xl:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(140px,1fr))_auto_auto_auto]">
          <label className="relative">
            <span className="sr-only">Search requests</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => set(setQ)(e.target.value)} placeholder="Reference, customer or phone" className="pl-9" />
          </label>
          <Select aria-label="Status" value={status} onChange={(e) => set(setStatus)(e.target.value as RequestStatus | "")}>
            <option value="">All statuses</option>
            {requestStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </Select>
          <Select aria-label="Category" value={category} onChange={(e) => { set(setCategory)(e.target.value); setService(""); }}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Service" value={service} onChange={(e) => set(setService)(e.target.value)}>
            <option value="">All services</option>
            {services
              .filter((s) => !category || s.category === category)
              .map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
          </Select>
          <Select aria-label="Date applies to" value={dateField} onChange={(e) => set(setDateField)(e.target.value as "created" | "preferred")} className="xl:w-40">
            <option value="created">Received</option>
            <option value="preferred">Preferred date</option>
          </Select>
          <Input aria-label="From date" type="date" value={from} onChange={(e) => set(setFrom)(e.target.value)} className="xl:w-40" />
          <Input aria-label="To date" type="date" value={to} onChange={(e) => set(setTo)(e.target.value)} className="xl:w-40" />
        </div>

        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <div className="p-4">
            <ErrorBox message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
          </div>
        ) : list.data.items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No requests match" body="Try clearing a filter or searching differently." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-line bg-porcelain/60 text-[12px] font-semibold text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Request</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Preferred</th>
                    <th className="px-4 py-2.5">Pincode</th>
                    <th className="px-4 py-2.5">Professional</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data.items.map((r) => (
                    <tr key={r.id} className="relative hover:bg-porcelain">
                      <td className="px-4 py-3">
                        <Link href={`/requests/${r.id}`} className="font-semibold after:absolute after:inset-0">
                          {serviceName(r.service)}
                        </Link>
                        <p className="font-mono text-xs text-muted">{shortRef(r.id)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{r.customer.fullName ?? "—"}</p>
                        <p className="text-xs text-muted">{formatPhone(r.customer.phone)}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.appointment ? (
                          <>
                            <p>{formatDay(r.appointment.date)}</p>
                            <p className="text-xs text-muted">{formatSlot(r.appointment.slot)} · scheduled</p>
                          </>
                        ) : (
                          <>
                            <p>{formatDay(r.preferredDate)}</p>
                            <p className="text-xs text-muted">{formatSlot(r.preferredTime)}</p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{r.address.pincode}</td>
                      <td className="px-4 py-3">{r.professional?.fullName ?? <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
