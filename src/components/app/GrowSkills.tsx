import { useCallback, useRef, useState } from "react";
import { calm } from "@/lib/motion";
import { inSegment, runCascade, sameSegment, type SegmentFocus } from "@/lib/motionGrow";
import type { PortfolioSkill } from "@/lib/portfolio";
import "@/styles/motion-grow.css";

/**
 * Shared hover/focus state for the Skills tab: the chart and the skill rows point at each other.
 * Pass `focus`/`onFocusChange` to SkillsChart, spread `bind(skill)` on each row and add `lit(skill)` to its className.
 */
export function useSegmentFocus() {
  const [focus, setFocus] = useState<SegmentFocus>(null);
  const onFocusChange = useCallback((f: SegmentFocus) => setFocus((cur) => (sameSegment(cur, f) ? cur : f)), []);
  const bind = (s: Pick<PortfolioSkill, "theme" | "level">) => {
    const enter = () => onFocusChange({ theme: s.theme, level: s.level });
    const leave = () => onFocusChange(null);
    return { onMouseEnter: enter, onMouseLeave: leave, onFocus: enter, onBlur: leave };
  };
  const lit = (s: Pick<PortfolioSkill, "theme" | "level">) => (inSegment(focus, s) ? "grow-lit" : "grow-unlit");
  return { focus, onFocusChange, bind, lit };
}

/** Confirm many skills 30 ms apart; Undo unconfirms them in reverse. Reduced motion: all at once. */
export function useConfirmCascade(review: (key: string, patch: { confirmed: boolean }) => void) {
  const cancel = useRef<() => void>(() => {});
  // No cancel on unmount: leaving mid-cascade must still confirm every row.
  return useCallback(
    (skills: Pick<PortfolioSkill, "reviewKeys">[], confirmed: boolean) => {
      cancel.current();
      cancel.current = runCascade(skills, (s) => s.reviewKeys.forEach((k) => review(k, { confirmed })), { direction: confirmed ? "forward" : "back", now: calm() });
    },
    [review],
  );
}
