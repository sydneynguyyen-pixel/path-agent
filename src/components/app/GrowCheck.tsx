import { useEffect, useRef, useState, type CSSProperties } from "react";
import { calm } from "@/lib/motion";
import { cn } from "@/lib/utils";
import "@/styles/motion-grow.css";

/**
 * A check that strokes itself in when `on` turns true, and out when it turns false.
 * Already-on checks render still: it only moves when something really changed.
 */
export function GrowCheck({ on, label, delay = 0, className }: { on: boolean; label?: string; delay?: number; className?: string }) {
  const was = useRef(on);
  const [phase, setPhase] = useState<"still" | "draw" | "erase">("still");
  useEffect(() => {
    if (was.current === on) return;
    was.current = on;
    setPhase(calm() ? "still" : on ? "draw" : "erase");
  }, [on]);
  if (!on && phase !== "erase") return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("grow-check", phase === "draw" && "grow-check-draw", phase === "erase" && "grow-check-erase", className)}
      style={{ "--grow-delay": `${delay}ms` } as CSSProperties}
      onAnimationEnd={() => setPhase("still")}
    >
      <path d="M20 6 9 17l-5-5" pathLength={1} />
    </svg>
  );
}
