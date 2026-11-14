import { HandHelping, Plus, Shirt, Sparkles, Wrench, type LucideProps } from "lucide-react";
import type { Category } from "@/config/services";

const map = { sparkles: Sparkles, hand: HandHelping, shirt: Shirt, wrench: Wrench, plus: Plus } as const;

/** Category icons — Lucide, 1.75 stroke (design-system icon spec). */
export function CategoryIcon({ icon, ...props }: { icon: Category["icon"] } & LucideProps) {
  const Icon = map[icon];
  return <Icon strokeWidth={1.75} aria-hidden="true" {...props} />;
}
