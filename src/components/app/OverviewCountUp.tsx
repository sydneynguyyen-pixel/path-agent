import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { calm } from "@/lib/motion";
import { countAt, countUpPlan, EASE, formatLike, readNumber, readStore, writeStore, type CountUpPlan } from "@/lib/motionOverview";
import "@/styles/motion-overview.css";

const KEY = "trellis:home-units-seen";
const COUNT_MS = 600;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
// The count from zero belongs to the first time Home shows up in this visit, not every return to it.
let countedThisVisit = false;

/**
 * Wraps the units tile. The number counts up while the bar fills, and a "+N" floats up once
 * when units grew since her last visit. It works on the tile's own DOM, so the tile stays as it is.
 */
export function OverviewCountUp({ value, children }: { value: number; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  // One decision per value, so a second effect run (Strict Mode) replays the same plan instead of skipping it.
  const decided = useRef<{ value: number; plan: CountUpPlan } | null>(null);
  const [badge, setBadge] = useState<{ text: string; x: number; y: number; key: number } | null>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (decided.current?.value !== value) {
      const first = !countedThisVisit;
      countedThisVisit = true;
      decided.current = { value, plan: countUpPlan(readNumber(readStore("local", KEY)), value, first) };
      writeStore("local", KEY, String(value));
    }
    const { plan } = decided.current;
    const num = el.querySelector<HTMLElement>(".desk-big");
    const text = num?.firstChild?.nodeType === Node.TEXT_NODE ? (num.firstChild as Text) : null;
    const fill = el.querySelector<HTMLElement>(".home-units-fill");
    const final = String(value);

    if (plan.delta && num) {
      const r = num.getBoundingClientRect();
      setBadge({ text: plan.delta, x: r.right + 6, y: r.top, key: Date.now() });
    }
    if (!plan.animate || calm()) return;

    const target = fill?.style.width ?? "";
    const fromWidth = target && value ? `${(parseFloat(target) * plan.from) / value}%` : "0%";
    const bar = fill?.animate([{ width: fromWidth }, { width: target }], { duration: COUNT_MS, easing: EASE });
    let raf = 0;
    if (text) {
      const began = performance.now();
      text.nodeValue = formatLike(plan.from, value);
      const step = (now: number) => {
        const t = (now - began) / COUNT_MS;
        // Writes into React's own text node, so React's later updates still land.
        text.nodeValue = t >= 1 ? final : formatLike(countAt(plan.from, value, t), value);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(raf);
      bar?.cancel();
      if (text) text.nodeValue = final;
    };
  }, [value]);

  return (
    <div ref={root} className="contents">
      {children}
      {badge && typeof document !== "undefined" && createPortal(
        <span key={badge.key} className="motion-delta" aria-hidden="true" style={{ left: badge.x, top: badge.y }} onAnimationEnd={() => setBadge(null)}>{badge.text}</span>,
        document.body,
      )}
    </div>
  );
}
