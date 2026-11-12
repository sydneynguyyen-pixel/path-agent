/**
 * How far through a class she is, from the term's real start and end dates and the scripted clock.
 * Pure, so the Skills tab and its tests agree. No dates are ever made up: a term without dates
 * comes back as just its name, with no meter.
 */

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export type TermDates = { start: string; end: string };

export type ClassProgress =
  | { state: "done"; label: string; fraction: 1 }
  | { state: "now"; label: string; week: number; weeks: number; fraction: number }
  | { state: "upcoming"; label: string; fraction: 0 }
  /** No dates on file for this term: show its name, no meter. */
  | { state: "unknown"; label: string };

/** Weeks in a term, counting a part week at the end as a week (Sep 21 – Dec 11 is 12). */
export const termWeeks = (d: TermDates) => Math.max(1, Math.ceil((utc(d.end) - utc(d.start) + DAY) / (7 * DAY)));

export function classProgress(dates: TermDates | undefined, termName: string, today: string): ClassProgress {
  if (!dates || Number.isNaN(utc(dates.start)) || Number.isNaN(utc(dates.end))) return { state: "unknown", label: termName };
  if (today > dates.end) return { state: "done", label: "Done", fraction: 1 };
  if (today < dates.start) return { state: "upcoming", label: `Starts ${termName}`, fraction: 0 };
  const weeks = termWeeks(dates);
  const week = Math.min(weeks, Math.floor((utc(today) - utc(dates.start)) / (7 * DAY)) + 1);
  return { state: "now", label: `Week ${week} of ${weeks}`, week, weeks, fraction: week / weeks };
}

const ORDER: Record<ClassProgress["state"], number> = { now: 0, done: 1, upcoming: 2, unknown: 3 };

/** Classes in progress first, then finished ones (latest first), then upcoming (soonest first), then any without dates. */
export function byClassProgress<T extends { progress: ClassProgress; start?: string | undefined; code: string }>(a: T, b: T) {
  const o = ORDER[a.progress.state] - ORDER[b.progress.state];
  if (o !== 0) return o;
  const as = a.start ?? "", bs = b.start ?? "";
  if (as !== bs) return a.progress.state === "done" ? bs.localeCompare(as) : as.localeCompare(bs);
  return a.code.localeCompare(b.code);
}
