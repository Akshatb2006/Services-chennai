"use client";

import type { AdminCustomerListItem, Paged } from "@homecare/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card, EmptyState, ErrorBox, Input, PageHeader, Pagination, Spinner } from "@/components/ui";
import { api, errorMessage, qs } from "@/lib/api";
import { formatDateTime, formatPhone } from "@/lib/format";

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const filters = { q: q.trim(), page, pageSize: 25 };
  const list = useQuery({
    queryKey: ["customers", filters],
    queryFn: ({ signal }) => api<Paged<AdminCustomerListItem>>(`/admin/customers${qs(filters)}`, { signal }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader title="Customers" subtitle="Read-only. Customers manage their own profile and addresses in the app." />
      <Card padded={false}>
        <div className="border-b border-line p-3">
          <label className="relative block max-w-md">
            <span className="sr-only">Search customers</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, email or phone" className="pl-9" />
          </label>
        </div>
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <div className="p-4">
            <ErrorBox message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
          </div>
        ) : list.data.items.length === 0 ? (
          <EmptyState icon={Users} title={q ? "No customers match" : "No customers yet"} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line bg-porcelain/60 text-[12px] font-semibold text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Phone</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5 text-right">Requests</th>
                    <th className="px-4 py-2.5 text-right">Addresses</th>
                    <th className="px-4 py-2.5">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data.items.map((c) => (
                    <tr key={c.id} className="relative hover:bg-porcelain">
                      <td className="px-4 py-3">
                        <Link href={`/customers/${c.id}`} className="font-semibold after:absolute after:inset-0">
                          {c.fullName ?? <span className="text-muted">Profile incomplete</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatPhone(c.phone)}</td>
                      <td className="px-4 py-3">{c.email ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.requestCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.addressCount}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(c.createdAt)}</td>
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
