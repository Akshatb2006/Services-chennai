"use client";

import type { AuditEntry, Paged } from "@homecare/contracts";
import { staffRoleLabels } from "@homecare/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card, EmptyState, ErrorBox, PageHeader, Pagination, Select, Spinner } from "@/components/ui";
import { api, errorMessage, qs } from "@/lib/api";
import { actionLabels, formatDateTime, shortRef } from "@/lib/format";

const resourceLinks: Record<string, string> = { request: "/requests/", professional: "/professionals/" };

export default function AuditPage() {
  const [resourceType, setType] = useState("");
  const [page, setPage] = useState(1);
  const filters = { resourceType, page, pageSize: 50 };
  const q = useQuery({
    queryKey: ["audit", filters],
    queryFn: ({ signal }) => api<Paged<AuditEntry>>(`/admin/audit${qs(filters)}`, { signal }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader title="Audit log" subtitle="Append-only record of administrative actions. Entries can't be edited or deleted." />
      <Card padded={false}>
        <div className="border-b border-line p-3">
          <Select aria-label="Resource type" value={resourceType} onChange={(e) => { setType(e.target.value); setPage(1); }} className="max-w-56">
            <option value="">All resources</option>
            <option value="request">Requests</option>
            <option value="professional">Professionals</option>
            <option value="service">Services</option>
            <option value="staff">Staff</option>
          </Select>
        </div>
        {q.isPending ? (
          <Spinner />
        ) : q.isError ? (
          <div className="p-4">
            <ErrorBox message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
          </div>
        ) : q.data.items.length === 0 ? (
          <EmptyState icon={ScrollText} title="No entries" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-line bg-porcelain/60 text-[12px] font-semibold text-muted">
                  <tr>
                    <th className="px-4 py-2.5">When</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Resource</th>
                    <th className="px-4 py-2.5">By</th>
                    <th className="px-4 py-2.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {q.data.items.map((e) => (
                    <tr key={e.id} className="align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(e.createdAt)}</td>
                      <td className="px-4 py-3 font-semibold">{actionLabels[e.action] ?? e.action}</td>
                      <td className="px-4 py-3">
                        {resourceLinks[e.resourceType] ? (
                          <Link href={`${resourceLinks[e.resourceType]}${e.resourceId}`} className="hover:underline">
                            {e.resourceType} <span className="font-mono text-xs">{shortRef(e.resourceId)}</span>
                          </Link>
                        ) : (
                          <span>
                            {e.resourceType} <span className="font-mono text-xs">{e.resourceType === "service" ? e.resourceId : shortRef(e.resourceId)}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{e.actor ? `${e.actor.name} (${staffRoleLabels[e.actor.role]})` : e.professionalName ? `${e.professionalName} (professional)` : "System"}</td>
                      <td className="px-4 py-3">
                        {Object.keys(e.metadata).length ? <code className="block max-w-md text-xs break-words whitespace-pre-wrap text-muted">{JSON.stringify(e.metadata)}</code> : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={q.data.page} pageSize={q.data.pageSize} total={q.data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
