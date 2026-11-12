import type { EvidenceLevel } from "@/data/scenario";

/** The one easing every "grow" motion uses. */
export const GROW_EASE = "cubic-bezier(.22,.8,.2,1)";
/** Gap between rows when several check in at once. */
export const CASCADE_STEP = 30;

/** One bar segment in "How far each skill has gone": an area at one level. */
export type SegmentFocus = { theme: string; level: EvidenceLevel } | null;

/** True when a skill sits in the focused segment, so chart and list can point at each other. */
export function inSegment(focus: SegmentFocus, skill: { theme: string; level: EvidenceLevel }) {
  return !!focus && focus.theme === skill.theme && focus.level === skill.level;
}

export function sameSegment(a: SegmentFocus, b: SegmentFocus) {
  return a === b || (!!a && !!b && a.theme === b.theme && a.level === b.level);
}

/** Delay for each item in a cascade. Backwards runs the same order from the last item. */
export function cascadeDelays(count: number, direction: "forward" | "back" = "forward", step = CASCADE_STEP): number[] {
  return Array.from({ length: count }, (_, i) => (direction === "forward" ? i : count - 1 - i) * step);
}

/**
 * Applies `apply` to each item, CASCADE_STEP apart, so rows check (or uncheck) one after another.
 * With `now` (reduced motion) everything applies at once. Returns a cancel function.
 */
export function runCascade<T>(items: T[], apply: (item: T) => void, opts: { direction?: "forward" | "back"; now?: boolean; step?: number } = {}) {
  const { direction = "forward", now = false, step = CASCADE_STEP } = opts;
  if (now || items.length <= 1) {
    items.forEach(apply);
    return () => {};
  }
  const delays = cascadeDelays(items.length, direction, step);
  const timers = items.map((item, i) => setTimeout(() => apply(item), delays[i]));
  return () => timers.forEach(clearTimeout);
}

/** Confirmed skills per segment, keyed "theme|level". A count that went up is a segment to grow. */
export function confirmedBySegment(skills: { theme: string; level: EvidenceLevel; confirmed: boolean }[]) {
  const out: Record<string, number> = {};
  for (const s of skills) if (s.confirmed) out[`${s.theme}|${s.level}`] = (out[`${s.theme}|${s.level}`] ?? 0) + 1;
  return out;
}

export function grewSegments(before: Record<string, number>, after: Record<string, number>) {
  return Object.keys(after).filter((k) => (after[k] ?? 0) > (before[k] ?? 0));
}

/** The level moved: what to strike and what to slide in. Null when nothing changed. */
export function levelChange(from: EvidenceLevel, to: EvidenceLevel) {
  return from === to ? null : { from, to };
}
