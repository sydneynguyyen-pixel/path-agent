import { Briefcase, ChartPie, HandHeart, Landmark, Library, ScanEye, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Each career gets its own icon and color, so a goal reads at a glance everywhere it shows up. */
const LOOK: Record<string, { icon: LucideIcon; color: string }> = {
  ux: { icon: ScanEye, color: "#8B6CF0" },
  policy: { icon: Landmark, color: "#3B8FE6" },
  market: { icon: ChartPie, color: "#E59A2F" },
  museum: { icon: Library, color: "#2FB5A0" },
  nonprofit: { icon: HandHeart, color: "#E0609A" },
};
const FALLBACK = { icon: Briefcase, color: "#7A8794" };

export function careerLook(id: string) {
  return LOOK[id] ?? FALLBACK;
}

/** The career's color, as a CSS variable a parent can tint with. */
export function careerStyle(id: string): CSSProperties {
  return { "--career": careerLook(id).color } as CSSProperties;
}

/** A soft tinted tile with the career's icon. */
export function CareerMark({ id, size = "md", className }: { id: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const { icon: Icon, color } = careerLook(id);
  const box = size === "sm" ? "size-6 rounded-md" : size === "lg" ? "size-12 rounded-2xl" : "size-9 rounded-xl";
  const glyph = size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4.5";
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center", box, className)} style={{ background: `color-mix(in oklab, ${color} 16%, white)`, color: `color-mix(in oklab, ${color} 82%, black)` }}>
      <Icon className={glyph} strokeWidth={2} />
    </span>
  );
}
