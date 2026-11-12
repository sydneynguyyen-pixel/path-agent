import { PILEUP_THRESHOLD } from "@/data/scenario";

export const isPileup = (due: number) => due >= PILEUP_THRESHOLD;

const DAY = 86_400_000;
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const parts = (ms: number) => {
  const [month, day] = new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).split(" ");
  return { month: month!, day: day! };
};

export function shortDate(iso: string) {
  const { month, day } = parts(utc(iso));
  return `${month} ${day}`;
}

/** Monday to Sunday of a term week: "Jun 21–27", or "Jun 28–Jul 4" across a month. */
export function weekDates(termStart: string, week: number) {
  const monday = utc(termStart) + (week - 1) * 7 * DAY;
  const a = parts(monday);
  const b = parts(monday + 6 * DAY);
  return `${a.month} ${a.day}–${a.month === b.month ? "" : `${b.month} `}${b.day}`;
}

/** The term week that contains today, or undefined before the term starts and after it ends. */
export function currentWeek(termStart: string, weekCount: number, today: string) {
  const week = Math.floor((utc(today) - utc(termStart)) / (7 * DAY)) + 1;
  return week >= 1 && week <= weekCount ? week : undefined;
}

const things = (n: number) => `${n} ${n === 1 ? "thing" : "things"}`;

/** The week to open first: the first pile-up, otherwise the first week with anything due. */
export function firstWeekToShow(weeks: number[], load: (week: number) => number) {
  return weeks.find((w) => isPileup(load(w))) ?? weeks.find((w) => load(w) > 0) ?? weeks[0]!;
}

/** Says what's piling up and points to the lightest earlier week to get ahead in. */
export function pileupLine(week: number, weeks: number[], load: (week: number) => number) {
  const due = `${things(load(week))} due in Week ${week}.`;
  const earlier = weeks.filter((w) => w < week && load(w) < load(week));
  if (earlier.length === 0) return due;
  const lightest = earlier.reduce((best, w) => (load(w) < load(best) ? w : best));
  return `${due} Week ${lightest} ${load(lightest) === 0 ? "is clear" : "is lighter"}, so start early.`;
}

export type DueItem = { course: string; date: string; label: string; worth?: string | undefined; detail?: string | undefined };
export type CalendarDay = { date: string; items: DueItem[] };
export type CalendarWeek = { week: number; days: CalendarDay[]; due: number };

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The date a week-only syllabus item lands on: that week's Friday. */
export const fridayOf = (termStart: string, week: number) => iso(utc(termStart) + ((week - 1) * 7 + 4) * DAY);

/** A term as Monday-to-Sunday weeks, each day holding what's due on it. */
export function calendarWeeks(termStart: string, weekCount: number, items: DueItem[]): CalendarWeek[] {
  return Array.from({ length: weekCount }, (_, i) => {
    const days = Array.from({ length: 7 }, (_, d) => {
      const date = iso(utc(termStart) + (i * 7 + d) * DAY);
      return { date, items: items.filter((it) => it.date === date) };
    });
    return { week: i + 1, days, due: days.reduce((n, d) => n + d.items.length, 0) };
  });
}

/** Day of the week, Monday = 0 … Sunday = 6. */
export const weekday = (date: string) => (new Date(utc(date)).getUTCDay() + 6) % 7;

/** The week a calendar opens on: this week, or next week once the school week is over (Sat/Sun). Clamped to the term. */
export function weekToOpen(termStart: string, weekCount: number, today: string) {
  if (today < termStart) return 1;
  const week = currentWeek(termStart, weekCount, today);
  if (!week) return weekCount;
  return weekday(today) >= 5 && week < weekCount ? week + 1 : week;
}

/** Minutes after midnight for "HH:MM". */
export const minutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h! * 60 + (m ?? 0); };

/** "13:30" → "1:30", "09:00" → "9" (period added by the caller where needed). */
export function clock(time: string, period = false) {
  const t = minutes(time);
  const h = Math.floor(t / 60);
  const m = t % 60;
  const label = `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
  return period ? `${label} ${h < 12 ? "AM" : "PM"}` : label;
}

/** The hours a week grid needs: from the earliest start to the latest end, at least 8 AM to 5 PM. */
export function hourSpan(times: { start: string; end: string }[]) {
  const from = Math.min(8, ...times.map((t) => Math.floor(minutes(t.start) / 60)));
  const to = Math.max(17, ...times.map((t) => Math.ceil(minutes(t.end) / 60)));
  return { from, to };
}

/** A month as Monday-first rows of dates (ISO), padded with the neighbouring months' days. */
export function monthGrid(date: string) {
  const first = `${date.slice(0, 7)}-01`;
  const start = utc(first) - weekday(first) * DAY;
  const next = new Date(utc(first));
  next.setUTCMonth(next.getUTCMonth() + 1);
  const rows = Math.ceil((weekday(first) + (next.getTime() - utc(first)) / DAY) / 7);
  return Array.from({ length: rows }, (_, r) => Array.from({ length: 7 }, (_, d) => iso(start + (r * 7 + d) * DAY)));
}

/** The term week a date falls in, or undefined outside the term. */
export const weekOf = (termStart: string, weekCount: number, date: string) => currentWeek(termStart, weekCount, date);
