import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { calm } from "@/lib/motion";

export const EASE = "cubic-bezier(.22,.8,.2,1)";
export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* ---------- Pure helpers (tested) ---------- */

/** Which class a piece of text names: the longest class code it starts with, so "ENGL 1B Research paper" is ENGL 1B. */
export function courseIn(text: string | null | undefined, courses: readonly string[]): string | null {
  const t = (text ?? "").trim();
  let best: string | null = null;
  for (const c of courses) if ((t === c || t.startsWith(`${c} `) || t.startsWith(`${c},`)) && (!best || c.length > best.length)) best = c;
  return best;
}

/** Whether an element naming `course` lights up while `hot` is hovered or focused. */
export const isLinked = (hot: string | null, course: string | null) => !!hot && hot === course;

/** What changed between two result lists: which cards came in, stayed, or left. */
export function reflowPlan(prev: readonly string[], next: readonly string[]) {
  const before = new Set(prev);
  const after = new Set(next);
  return {
    entering: next.filter((id) => !before.has(id)),
    staying: next.filter((id) => before.has(id)),
    leaving: prev.filter((id) => !after.has(id)),
  };
}

/** New cards come in 30 ms apart, capped so a long list never waits on itself. */
export const staggerDelay = (i: number) => Math.min(Math.max(0, i), 8) * 30;

/** The event row a calendar day jumps to: the picked one if it's on that day and shown, else the day's first shown row. */
export function jumpTarget(shown: readonly { id: string; date: string }[], date: string, picked: string | null) {
  const onDay = shown.filter((e) => e.date === date);
  return (onDay.find((e) => e.id === picked) ?? onDay[0])?.id ?? null;
}

/** True the first time `key` is seen this session; never throws, and says no on the server. */
export function firstThisSession(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}

export const pileupKey = (note: string) => `pa-pileup-spoken:${note.trim()}`;

/* ---------- Terms: due chips and class rows light each other ---------- */

const CHIP = "button:has(> .class-chip)";
const ROW = ".cal-class, [data-plan-course]";

function courseOf(el: Element, courses: readonly string[]) {
  const own = (el as HTMLElement).dataset?.["planCourse"];
  if (own) return own;
  if (el.matches(CHIP)) return courseIn(el.getAttribute("aria-label"), courses);
  return courseIn(el.querySelector("b")?.textContent, courses);
}

/** The class under a pointer or focus, if any. */
export function courseAt(target: EventTarget | null, courses: readonly string[]) {
  const el = target instanceof Element ? target.closest(`${CHIP}, ${ROW}`) : null;
  return el ? courseOf(el, courses) : null;
}

/** Marks every chip and row for `hot` with data-plan-hot, and clears the rest. */
export function lightCourse(root: HTMLElement | null, hot: string | null, courses: readonly string[]) {
  if (!root) return;
  for (const el of root.querySelectorAll(`${CHIP}, ${ROW}`)) {
    if (isLinked(hot, courseOf(el, courses))) el.setAttribute("data-plan-hot", "");
    else el.removeAttribute("data-plan-hot");
  }
}

/* ---------- Terms: the pile-up week speaks once ---------- */

function speak(root: HTMLElement) {
  const note = root.querySelector<HTMLElement>(".cal-busy-note");
  if (!note || note.dataset["planSpoken"] !== undefined) return;
  note.dataset["planSpoken"] = "";
  if (!firstThisSession(pileupKey(note.textContent ?? ""))) return;
  const row = note.closest(".cal")?.querySelector<HTMLElement>(".cal-wk-due");
  for (const [el, attr] of [[note, "data-plan-speak"], [row, "data-plan-pulse"]] as const) {
    if (!el) continue;
    el.setAttribute(attr, "");
    el.addEventListener("animationend", () => el.removeAttribute(attr), { once: true });
    window.setTimeout(() => el.removeAttribute(attr), 900);
  }
}

/** Watches a page for a pile-up note and lets it pulse and type in the first time it shows this session. */
export function usePileupOnce(root: RefObject<HTMLElement | null>) {
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    speak(el);
    const watch = new MutationObserver(() => speak(el));
    watch.observe(el, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, [root]);
}

/* ---------- Explore: cards reflow when results change ---------- */

type Spot = { x: number; y: number; w: number; h: number; el: HTMLElement };

function measure(root: HTMLElement) {
  const r = root.getBoundingClientRect();
  const map = new Map<string, Spot>();
  for (const el of root.querySelectorAll<HTMLElement>("[data-opp]")) {
    const id = el.dataset["opp"]!;
    if (map.has(id)) continue;
    const b = el.getBoundingClientRect();
    map.set(id, { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height, el });
  }
  return map;
}

/**
 * Cards that stay glide to their new place, new ones fade up 30 ms apart, and ones that left fade out where they were.
 * `layout` names the arrangement: when it changes, everything just fades up instead of gliding across shapes.
 */
export function useReflow<T extends HTMLElement>(key: string, layout: string) {
  const ref = useRef<T>(null);
  const last = useRef<{ key: string; layout: string; spots: Map<string, Spot> } | null>(null);
  useIsoLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const prev = last.current;
    const spots = measure(root);
    last.current = { key, layout, spots };
    if (!prev || prev.key === key || calm()) return;
    const sameLayout = prev.layout === layout;
    const plan = reflowPlan([...prev.spots.keys()], [...spots.keys()]);
    const fresh = sameLayout ? plan.entering : [...spots.keys()];
    fresh.forEach((id, i) => spots.get(id)!.el.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 240, delay: staggerDelay(i), easing: EASE, fill: "backwards" }));
    if (!sameLayout) return;
    for (const id of plan.staying) {
      const a = prev.spots.get(id)!;
      const b = spots.get(id)!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      b.el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 280, easing: EASE });
    }
    const box = root.getBoundingClientRect();
    for (const id of plan.leaving.slice(0, 12)) {
      const a = prev.spots.get(id)!;
      const ghost = a.el.cloneNode(true) as HTMLElement;
      ghost.removeAttribute("data-opp");
      ghost.setAttribute("aria-hidden", "true");
      ghost.classList.add("plan-ghost");
      ghost.style.cssText = `left:${box.left + a.x}px;top:${box.top + a.y}px;width:${a.w}px;height:${a.h}px;`;
      document.body.append(ghost);
      void ghost.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.97)" }], { duration: 180, easing: EASE, fill: "forwards" }).finished.finally(() => ghost.remove());
    }
  }, [key, layout]);
  return ref;
}

/* ---------- Explore calendar: jump to a day, cross-fade the details ---------- */

/** Scrolls a timeline row into view and gives it one soft outline pulse. */
export function jumpTo(row: HTMLElement | null, group: HTMLElement | null) {
  if (!row) return;
  (group ?? row).scrollIntoView({ block: "nearest", behavior: calm() ? "auto" : "smooth" });
  if (calm()) return;
  row.animate([{ boxShadow: "0 0 0 0 transparent" }, { boxShadow: "0 0 0 3px var(--rim)", offset: 0.4 }, { boxShadow: "0 0 0 6px transparent" }], { duration: 340, easing: EASE });
}

/** Lays a copy of the old details over the new ones and fades between them. */
export function crossFade(panel: HTMLElement | null, old: HTMLElement | null) {
  if (!panel || !old || calm()) return;
  const ghost = document.createElement("div");
  ghost.className = "plan-fade-ghost";
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.top = `${panel.scrollTop}px`;
  ghost.append(...old.childNodes);
  const content = [...panel.children] as HTMLElement[];
  panel.append(ghost);
  for (const c of content) c.animate({ opacity: [0, 1] }, { duration: 260, easing: EASE });
  void ghost.animate({ opacity: [1, 0] }, { duration: 220, easing: EASE, fill: "forwards" }).finished.finally(() => ghost.remove());
}
