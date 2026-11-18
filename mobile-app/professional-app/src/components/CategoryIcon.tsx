import type { Category } from "@homecare/catalog";
import { HandHelping, Plus, Shirt, Sparkles, Wrench, type LucideIcon } from "@/components/icons";

const icons: Record<Category["icon"], LucideIcon> = {
  sparkles: Sparkles,
  hand: HandHelping,
  shirt: Shirt,
  wrench: Wrench,
  plus: Plus,
};

export function CategoryIcon({ icon, size, color, strokeWidth = 1.75 }: { icon: Category["icon"]; size: number; color: string; strokeWidth?: number }) {
  const Icon = icons[icon];
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
