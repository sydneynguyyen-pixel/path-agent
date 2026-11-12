/**
 * Home alerts, sorted into four levels so the page stays calm:
 * - deadline: holds and deadlines. Amber bar at the top. Can't be dismissed.
 * - decision: something only the student can decide. Can be snoozed into the inbox.
 * - update: news. Can be dismissed into the inbox.
 * - suggestion: small cards, never counted as alerts.
 * At most `max` decisions and updates show as action rows; the rest wait in the inbox behind the bell.
 */
export type AlertLevel = "deadline" | "decision" | "update" | "suggestion";
export type HomeAlert = { id: string; level: AlertLevel };
export type Cleared = Record<string, "snoozed" | "dismissed">;

const RANK: Record<AlertLevel, number> = { deadline: 0, decision: 1, update: 2, suggestion: 3 };

export function homeLayout<T extends HomeAlert>(alerts: T[], cleared: Cleared, max = 3) {
  const sorted = [...alerts].sort((a, b) => RANK[a.level] - RANK[b.level]);
  const bar = sorted.filter((a) => a.level === "deadline");
  const actionable = sorted.filter((a) => a.level === "decision" || a.level === "update");
  const open = actionable.filter((a) => !cleared[a.id]);
  const rows = open.slice(0, max);
  const inbox = actionable.filter((a) => !rows.includes(a));
  const suggestions = sorted.filter((a) => a.level === "suggestion");
  // The bell counts what still needs a look: overflow and snoozed items, not dismissed news.
  const unread = inbox.filter((a) => cleared[a.id] !== "dismissed").length;
  return { bar, rows, inbox, suggestions, unread };
}

const DAY = 86_400_000;
/** Items due from today through the next six days, soonest first. */
export function dueThisWeek<T extends { date: string }>(items: T[], today: string): T[] {
  const start = Date.parse(`${today}T00:00:00Z`);
  return items
    .filter((i) => { const t = Date.parse(`${i.date}T00:00:00Z`); return t >= start && t < start + 7 * DAY; })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Whole days from today to a date, for "in 22 days". */
export function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);
}

/** Seven days from today, each with what's due, for the week strip on Home. */
export function weekStrip<T extends { date: string }>(items: T[], today: string): { date: string; items: T[] }[] {
  const start = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start + i * DAY).toISOString().slice(0, 10);
    return { date, items: items.filter((it) => it.date === date) };
  });
}
