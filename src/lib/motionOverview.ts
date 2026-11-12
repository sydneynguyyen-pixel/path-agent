/** Small, pure decisions behind the Home, Map and Degree micro-interactions. */

export const EASE = "cubic-bezier(.22,.8,.2,1)";

export type CountUpPlan = {
  /** Where the number starts counting from. */
  from: number;
  /** Whether anything should move at all. */
  animate: boolean;
  /** "+3.3" when units grew since her last visit, otherwise null. */
  delta: string | null;
};

const decimalsOf = (n: number) => (String(n).split(".")[1] ?? "").length;

/** Shows a number with the same decimals as the real value, so 37.9 counts as 12.4, 25.1, 37.9. */
export function formatLike(n: number, like: number): string {
  return n.toFixed(Math.min(2, decimalsOf(like)));
}

/**
 * First load counts up from zero. After that it only moves when the value changed,
 * and a "+N" floats up once when units grew since the last value she saw.
 */
export function countUpPlan(lastSeen: number | null, value: number, firstLoad: boolean): CountUpPlan {
  const from = firstLoad ? 0 : lastSeen ?? value;
  const places = Math.max(1, decimalsOf(value), lastSeen === null ? 0 : decimalsOf(lastSeen));
  const grew = lastSeen === null ? 0 : Number((value - lastSeen).toFixed(places));
  return { from, animate: from !== value, delta: grew > 0 ? `+${formatLike(grew, grew)}` : null };
}

/** The number partway through a count, eased the same way as every other motion. */
export function countAt(from: number, to: number, t: number): number {
  const k = Math.min(1, Math.max(0, t));
  const eased = 1 - (1 - k) ** 3;
  return from + (to - from) * eased;
}

/** The item she saved most recently: the last saved listing, or the class behind her newest draft course. */
export function newestMapItem(saved: string[], drafts: string[], opportunities: { id: string; courseCode?: string }[]): string | null {
  const last = saved[saved.length - 1];
  if (last) return last;
  const code = drafts[drafts.length - 1];
  if (!code) return null;
  return opportunities.find((o) => o.courseCode === code)?.id ?? null;
}

/** Only the newest item grows in, and only the first time the map shows it. */
export function shouldGrow(id: string | null, seen: string[]): id is string {
  return !!id && !seen.includes(id);
}

/** Cards a focused card relates to: itself and anything it connects with. */
export function relatedTo(id: string, links: { from: string; to: string }[]): Set<string> {
  const out = new Set([id]);
  for (const l of links) {
    if (l.from === id) out.add(l.to);
    if (l.to === id) out.add(l.from);
  }
  return out;
}

/** The tree lines from a card up to the goal: its column, the bus, then the path and goal. */
export function linesToGoal(card: { id: string; category: string; row: number; col: number }, cards: { id: string; col: number; row: number }[]): Set<string> {
  const ids = ["goal-path", "path-bus", "bus", `bus-${card.category}`];
  for (const c of cards) if (c.col === card.col && c.row <= card.row) ids.push(`to-${c.id}`);
  return new Set(ids);
}

/** localStorage and sessionStorage can be missing or throw (private windows, SSR); none of this is worth failing over. */
export function readStore(kind: "local" | "session", key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return (kind === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStore(kind: "local" | "session", key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    (kind === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    /* storage blocked: the motion just plays again next time */
  }
}

export function readNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function readList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
