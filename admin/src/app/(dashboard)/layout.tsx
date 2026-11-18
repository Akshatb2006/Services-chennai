"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { Spinner } from "@/components/ui";
import { useSession } from "@/lib/session";

/** Everything under (dashboard) requires a staff session (the API enforces it too). */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "signedOut") router.replace("/login");
  }, [status, router]);
  if (status !== "signedIn") return <Spinner label="Checking your session" />;
  return <Shell>{children}</Shell>;
}
