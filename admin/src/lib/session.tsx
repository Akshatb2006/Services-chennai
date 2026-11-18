"use client";

import type { AdminSession, Permission, StaffProfile } from "@homecare/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, refreshSession, setAccessToken, setSessionEndHandler } from "./api";

type SessionValue = {
  status: "loading" | "signedIn" | "signedOut";
  staff: StaffProfile | null;
  can: (p: Permission) => boolean;
  signedIn: (s: AdminSession) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [status, setStatus] = useState<SessionValue["status"]>("loading");
  const [staff, setStaff] = useState<StaffProfile | null>(null);

  useEffect(() => {
    setSessionEndHandler(() => {
      setStaff(null);
      setStatus("signedOut");
      client.clear();
    });
    let cancelled = false;
    refreshSession().then((s) => {
      if (cancelled) return;
      setStaff(s?.staff ?? null);
      setStatus(s ? "signedIn" : "signedOut");
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const signedIn = useCallback((s: AdminSession) => {
    setAccessToken(s.accessToken);
    setStaff(s.staff);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    await api("/admin/auth/logout", { method: "POST" }).catch(() => {});
    setAccessToken(null);
    setStaff(null);
    setStatus("signedOut");
    client.clear();
  }, [client]);

  const value = useMemo<SessionValue>(
    () => ({ status, staff, can: (p) => !!staff?.permissions.includes(p), signedIn, signOut }),
    [status, staff, signedIn, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}
