"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { formatPhone, sendOtpSchema, type AdminSession, type SendOtpResult } from "@homecare/contracts";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button, ErrorBox, Field, Input } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";

/** Staff sign-in: mobile number → one-time code. No passwords. Only numbers registered as staff receive a code. */
export default function LoginPage() {
  const { status, signedIn } = useSession();
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({ resolver: zodResolver(sendOtpSchema), defaultValues: { phone: "" } });

  useEffect(() => {
    if (status === "signedIn") router.replace("/");
  }, [status, router]);

  const send = form.handleSubmit(async ({ phone }) => {
    setBusy(true);
    setError(null);
    try {
      await api<SendOtpResult>("/admin/auth/send-otp", { method: "POST", json: { phone } });
      setPhone(phone);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  });

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setBusy(true);
    setError(null);
    try {
      const session = await api<AdminSession>("/admin/auth/verify-otp", { method: "POST", json: { phone, code } });
      signedIn(session);
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-xl bg-porcelain p-6 shadow-overlay">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-citrus">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Homecare Ops</h1>
            <p className="text-[13px] text-muted">Staff sign-in</p>
          </div>
        </div>

        {!phone ? (
          <form onSubmit={send} className="grid gap-4" noValidate>
            <Field label="Mobile number" htmlFor="phone" error={form.formState.errors.phone?.message}>
              <Input id="phone" inputMode="tel" autoComplete="tel" placeholder="98400 12345" autoFocus {...form.register("phone")} />
            </Field>
            {error ? <ErrorBox message={error} /> : null}
            <Button type="submit" variant="primary" loading={busy}>
              Send code <ArrowRight className="size-4" aria-hidden />
            </Button>
            <p className="text-[13px] text-muted">Only numbers registered as Homecare staff receive a code.</p>
          </form>
        ) : (
          <form onSubmit={verify} className="grid gap-4">
            <p className="text-sm text-muted">
              Code sent to {formatPhone(phone)} if it&apos;s a staff number.{" "}
              <button type="button" className="font-semibold text-ink underline" onClick={() => setPhone(null)}>
                Change
              </button>
            </p>
            <Field label="6-digit code" htmlFor="code">
              <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
            </Field>
            {error ? <ErrorBox message={error} /> : null}
            <Button type="submit" variant="primary" loading={busy} disabled={code.length !== 6}>
              Sign in
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
