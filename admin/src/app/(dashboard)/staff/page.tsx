"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createStaffSchema, rolePermissions, staffRoleLabels, staffRoles, type StaffProfile, type StaffRole } from "@homecare/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Badge, Button, Card, Dialog, ErrorBox, Field, Input, PageHeader, Select, Spinner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatPhone } from "@/lib/format";
import { useSession } from "@/lib/session";

export default function StaffPage() {
  const { staff: me } = useSession();
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ["staff"], queryFn: ({ signal }) => api<StaffProfile[]>("/admin/staff", { signal }) });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api<StaffProfile>(`/admin/staff/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["staff"] }),
  });

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Dashboard access by role. Staff sign in with an OTP to their registered number; disabling someone ends their sessions immediately."
        actions={<Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Add staff</Button>}
      />
      {update.error ? (
        <div className="mb-4">
          <ErrorBox message={errorMessage(update.error)} />
        </div>
      ) : null}
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorBox message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-porcelain/60 text-[12px] font-semibold text-muted">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Added</th>
                  <th className="px-4 py-2.5 text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {q.data.map((s) => {
                  const self = s.id === me?.id;
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-semibold">
                        {s.fullName} {self ? <Badge tone="outline">You</Badge> : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatPhone(s.phone)}</td>
                      <td className="px-4 py-3">
                        <Select aria-label={`Role for ${s.fullName}`} value={s.role} disabled={self || update.isPending} onChange={(e) => update.mutate({ id: s.id, body: { role: e.target.value } })} className="h-9 w-48">
                          {staffRoles.map((r) => (
                            <option key={r} value={r}>
                              {staffRoleLabels[r]}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={s.status === "active" ? "stone" : "error"}>{s.status === "active" ? "Active" : "Disabled"}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(s.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {self ? null : (
                          <Button size="sm" variant={s.status === "active" ? "danger" : "dark"} onClick={() => update.mutate({ id: s.id, body: { status: s.status === "active" ? "disabled" : "active" } })}>
                            {s.status === "active" ? "Disable" : "Enable"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card title="What each role can do" className="mt-5">
        <dl className="grid gap-3 md:grid-cols-2">
          {staffRoles.map((r) => (
            <div key={r} className="rounded-md bg-porcelain p-3">
              <dt className="text-sm font-semibold">{staffRoleLabels[r]}</dt>
              <dd className="mt-1 text-xs text-muted">{rolePermissions[r].join(" · ")}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Dialog open={adding} onClose={() => setAdding(false)} title="Add staff member">
        {adding ? <AddStaff onDone={() => { setAdding(false); void client.invalidateQueries({ queryKey: ["staff"] }); }} /> : null}
      </Dialog>
    </>
  );
}

function AddStaff({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(createStaffSchema), defaultValues: { fullName: "", phone: "", role: "operations_staff" as StaffRole } });
  const submit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await api("/admin/staff", { method: "POST", json: v });
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  const e = form.formState.errors;
  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <Field label="Full name" htmlFor="st-name" error={e.fullName?.message}>
        <Input id="st-name" {...form.register("fullName")} />
      </Field>
      <Field label="Mobile number" htmlFor="st-phone" error={e.phone?.message}>
        <Input id="st-phone" inputMode="tel" placeholder="98400 12345" {...form.register("phone")} />
      </Field>
      <Field label="Role" htmlFor="st-role">
        <Select id="st-role" {...form.register("role")}>
          {staffRoles.map((r) => (
            <option key={r} value={r}>
              {staffRoleLabels[r]}
            </option>
          ))}
        </Select>
      </Field>
      {error ? <ErrorBox message={error} /> : null}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={form.formState.isSubmitting}>
          Add staff member
        </Button>
      </div>
    </form>
  );
}
