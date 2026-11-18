"use client";

import { categories } from "@homecare/catalog";
import { accountStatuses, verificationStatuses, type Paged, type Professional, type ProfessionalSummary } from "@homecare/contracts";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, UserRoundCog } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountBadge, VerificationBadge } from "@/components/StatusBadge";
import { Badge, Button, Card, Dialog, EmptyState, ErrorBox, Input, PageHeader, Pagination, Select, Spinner } from "@/components/ui";
import { ProfessionalForm } from "@/features/professionals/ProfessionalForm";
import { api, errorMessage, qs } from "@/lib/api";
import { categoryName, formatDateTime, formatPhone } from "@/lib/format";
import { useSession } from "@/lib/session";

export default function ProfessionalsPage() {
  const { can } = useSession();
  const router = useRouter();
  const client = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [pincode, setPincode] = useState("");
  const [verificationStatus, setVerification] = useState("");
  const [accountStatus, setAccount] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const filters = { q: q.trim(), category, pincode: /^\d{6}$/.test(pincode) ? pincode : "", verificationStatus, accountStatus, page, pageSize: 25 };

  const list = useQuery({
    queryKey: ["professionals", filters],
    queryFn: ({ signal }) => api<Paged<ProfessionalSummary>>(`/admin/professionals${qs(filters)}`, { signal }),
    placeholderData: keepPreviousData,
  });
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Professionals"
        subtitle="Only verified, active and available professionals who serve the request's category and pincode can be assigned."
        actions={can("professionals.write") ? <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>Register professional</Button> : null}
      />
      <Card padded={false}>
        <div className="grid gap-2 border-b border-line p-3 md:grid-cols-[minmax(200px,1.4fr)_repeat(4,minmax(130px,1fr))]">
          <label className="relative">
            <span className="sr-only">Search professionals</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => reset(setQ)(e.target.value)} placeholder="Name or phone" className="pl-9" />
          </label>
          <Select aria-label="Category" value={category} onChange={(e) => reset(setCategory)(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input aria-label="Pincode" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => reset(setPincode)(e.target.value.replace(/\D/g, ""))} placeholder="Pincode" />
          <Select aria-label="Verification" value={verificationStatus} onChange={(e) => reset(setVerification)(e.target.value)}>
            <option value="">Any verification</option>
            {verificationStatuses.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
          <Select aria-label="Account status" value={accountStatus} onChange={(e) => reset(setAccount)(e.target.value)}>
            <option value="">Any account status</option>
            {accountStatuses.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <div className="p-4">
            <ErrorBox message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
          </div>
        ) : list.data.items.length === 0 ? (
          <EmptyState
            icon={UserRoundCog}
            title={list.data.total === 0 && !q && !category && !verificationStatus && !accountStatus && !pincode ? "No professionals yet" : "No professionals match"}
            body="Register professionals here once they've applied and been interviewed."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-line bg-porcelain/60 text-[12px] font-semibold text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Professional</th>
                    <th className="px-4 py-2.5">Categories</th>
                    <th className="px-4 py-2.5">Pincodes</th>
                    <th className="px-4 py-2.5">Verification</th>
                    <th className="px-4 py-2.5">Account</th>
                    <th className="px-4 py-2.5">Availability</th>
                    <th className="px-4 py-2.5">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data.items.map((p) => (
                    <tr key={p.id} className="relative hover:bg-porcelain">
                      <td className="px-4 py-3">
                        <Link href={`/professionals/${p.id}`} className="font-semibold after:absolute after:inset-0">
                          {p.fullName}
                        </Link>
                        <p className="text-xs text-muted">{formatPhone(p.phone)}</p>
                      </td>
                      <td className="px-4 py-3">{p.categories.map(categoryName).join(", ")}</td>
                      <td className="px-4 py-3 tabular-nums" title={p.pincodes.join(", ")}>
                        {p.pincodes.slice(0, 3).join(", ")}
                        {p.pincodes.length > 3 ? ` +${p.pincodes.length - 3}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <VerificationBadge status={p.verificationStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <AccountBadge status={p.accountStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={p.availabilityStatus === "available" ? "stone" : "outline"}>{p.availabilityStatus === "available" ? "Available" : "Unavailable"}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <Dialog open={creating} onClose={() => setCreating(false)} title="Register a professional" wide>
        <ProfessionalForm
          mode="create"
          onCancel={() => setCreating(false)}
          onSubmit={async (v) => {
            const p = await api<Professional>("/admin/professionals", { method: "POST", json: { ...v, notes: v.notes || null } });
            void client.invalidateQueries({ queryKey: ["professionals"] });
            setCreating(false);
            router.push(`/professionals/${p.id}`);
          }}
        />
      </Dialog>
    </>
  );
}
