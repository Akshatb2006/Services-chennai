"use client";

import type { AdminServiceRow } from "@homecare/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge, Button, Card, ErrorBox, PageHeader, Spinner } from "@/components/ui";
import { NoteDialog } from "@/features/requests/ActionDialogs";
import { api, errorMessage } from "@/lib/api";
import { categoryName, formatDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";

/** Pause/resume services. Names, ids and copy come from the shared catalogue and aren't edited here. */
export default function ServicesPage() {
  const { can } = useSession();
  const client = useQueryClient();
  const [target, setTarget] = useState<AdminServiceRow | null>(null);
  const q = useQuery({ queryKey: ["services"], queryFn: ({ signal }) => api<AdminServiceRow[]>("/admin/services", { signal }) });
  const toggle = useMutation({
    mutationFn: ({ slug, enabled, reason }: { slug: string; enabled: boolean; reason: string }) => api<AdminServiceRow>(`/admin/services/${slug}`, { method: "PATCH", json: { enabled, ...(reason && { reason }) } }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["services"] }),
  });

  return (
    <>
      <PageHeader title="Services" subtitle="Paused services disappear from the app and can't receive new requests. Existing requests are unaffected." />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line bg-porcelain/60 text-[12px] font-semibold text-muted">
                <tr>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">ID</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Last changed</th>
                  {can("services.write") ? <th className="px-4 py-2.5 text-right">Action</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {q.data.map((s) => (
                  <tr key={s.slug}>
                    <td className="px-4 py-3 font-semibold">{s.name}</td>
                    <td className="px-4 py-3">{categoryName(s.category)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{s.slug}</td>
                    <td className="px-4 py-3">
                      <Badge tone={s.enabled ? "citrus" : "outline"}>{s.enabled ? "Taking requests" : "Paused"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{s.updatedAt ? `${formatDateTime(s.updatedAt)}${s.updatedBy ? ` · ${s.updatedBy}` : ""}` : "—"}</td>
                    {can("services.write") ? (
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant={s.enabled ? "secondary" : "dark"} onClick={() => setTarget(s)}>
                          {s.enabled ? "Pause" : "Resume"}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {target ? (
        <NoteDialog
          open
          onClose={() => setTarget(null)}
          title={`${target.enabled ? "Pause" : "Resume"} ${target.name}`}
          description={target.enabled ? "Customers won't be able to send new requests for this service until it's resumed." : "Customers will be able to request this service again."}
          label="Reason (optional, for the audit log)"
          confirmLabel={target.enabled ? "Pause service" : "Resume service"}
          danger={target.enabled}
          onSubmit={(reason) => toggle.mutateAsync({ slug: target.slug, enabled: !target.enabled, reason })}
        />
      ) : null}
    </>
  );
}
