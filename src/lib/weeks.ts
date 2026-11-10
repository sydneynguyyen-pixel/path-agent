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
