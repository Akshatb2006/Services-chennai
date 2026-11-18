import { useEffect, useState } from "react";

/** Seconds remaining until `until` (epoch ms). Re-renders once per second while counting. */
export function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  const active = until !== null && until > now;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, until]);
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
}
