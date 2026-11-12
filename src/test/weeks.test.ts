import { calendarWeeks, fridayOf } from "@/lib/weeks";
import { FALL_2026_START, FALL_2026_WEEKS, fallWork } from "@/data/scenario";
import { describe, expect, it } from "vitest";
import { currentWeek, firstWeekToShow, isPileup, pileupLine, shortDate, weekDates } from "@/lib/weeks";

const weeks = [1, 2, 3, 4, 5];
const loads: Record<number, number> = { 1: 0, 2: 1, 3: 1, 4: 3, 5: 0 };
const load = (w: number) => loads[w] ?? 0;

describe("weeks", () => {
  it("labels each week with its dates", () => {
    expect(shortDate("2027-06-21")).toBe("Jun 21");
    expect(weekDates("2027-06-21", 1)).toBe("Jun 21–27");
    expect(weekDates("2027-06-21", 2)).toBe("Jun 28–Jul 4");
    expect(weekDates("2027-06-21", 8)).toBe("Aug 9–15");
  });

  it("finds the week that contains today", () => {
    expect(currentWeek("2027-06-21", 8, "2027-06-20")).toBeUndefined();
    expect(currentWeek("2027-06-21", 8, "2027-06-21")).toBe(1);
    expect(currentWeek("2027-06-21", 8, "2027-06-27")).toBe(1);
    expect(currentWeek("2027-06-21", 8, "2027-06-28")).toBe(2);
    expect(currentWeek("2027-06-21", 8, "2027-08-15")).toBe(8);
    expect(currentWeek("2027-06-21", 8, "2027-08-16")).toBeUndefined();
  });

  it("treats three things in one week as a pile-up", () => {
    expect(isPileup(2)).toBe(false);
    expect(isPileup(3)).toBe(true);
  });

  it("opens on the pile-up first", () => {
    expect(firstWeekToShow(weeks, load)).toBe(4);
    expect(firstWeekToShow(weeks, (w) => (w === 3 ? 1 : 0))).toBe(3);
    expect(firstWeekToShow(weeks, () => 0)).toBe(1);
  });

  it("says what's due and where to get ahead", () => {
    expect(pileupLine(4, weeks, load)).toBe("3 things due in Week 4. Week 1 is clear, so start early.");
    expect(pileupLine(4, weeks, (w) => (w === 4 ? 3 : 1))).toBe("3 things due in Week 4. Week 1 is lighter, so start early.");
    expect(pileupLine(1, weeks, () => 3)).toBe("3 things due in Week 1.");
  });
});

describe("term calendar", () => {
  it("lays a term out Monday to Sunday with each item on its day", () => {
    const weeks = calendarWeeks(FALL_2026_START, FALL_2026_WEEKS, fallWork);
    expect(weeks).toHaveLength(12);
    expect(weeks[0]!.days[0]!.date).toBe("2026-09-21");
    expect(weeks[0]!.days[6]!.date).toBe("2026-09-27");
    expect(weeks.reduce((n, w) => n + w.due, 0)).toBe(fallWork.length);
  });
  it("puts the busy week right after today, with three things due", () => {
    const weeks = calendarWeeks(FALL_2026_START, FALL_2026_WEEKS, fallWork);
    expect(currentWeek(FALL_2026_START, 12, "2026-11-08")).toBe(7);
    expect(weeks[7]!.due).toBe(3);
    expect(isPileup(weeks[7]!.due)).toBe(true);
  });
  it("places week-only syllabus items on that week's Friday", () => {
    expect(fridayOf("2027-06-21", 1)).toBe("2027-06-25");
    expect(fridayOf("2027-06-21", 2)).toBe("2027-07-02");
  });
});

describe("week calendar helpers", () => {
  it("opens on this week, or next week on a weekend", async () => {
    const { weekToOpen } = await import("@/lib/weeks");
    expect(weekToOpen("2026-09-21", 12, "2026-11-04")).toBe(7); // Wednesday
    expect(weekToOpen("2026-09-21", 12, "2026-11-08")).toBe(8); // Sunday → next week
    expect(weekToOpen("2026-09-21", 12, "2026-08-01")).toBe(1);
    expect(weekToOpen("2026-09-21", 12, "2027-03-01")).toBe(12);
    expect(weekToOpen("2026-09-21", 12, "2026-12-13")).toBe(12); // last Sunday stays in the term
  });

  it("formats times and spans the day", async () => {
    const { clock, hourSpan, minutes } = await import("@/lib/weeks");
    expect(minutes("13:30")).toBe(810);
    expect(clock("13:30")).toBe("1:30");
    expect(clock("09:00", true)).toBe("9 AM");
    expect(clock("12:00", true)).toBe("12 PM");
    expect(hourSpan([{ start: "10:30", end: "12:20" }])).toEqual({ from: 8, to: 17 });
    expect(hourSpan([{ start: "07:30", end: "18:10" }])).toEqual({ from: 7, to: 19 });
  });

  it("lays out a month Monday first", async () => {
    const { monthGrid, weekday } = await import("@/lib/weeks");
    expect(weekday("2026-11-09")).toBe(0);
    expect(weekday("2026-11-08")).toBe(6);
    const nov = monthGrid("2026-11-12");
    expect(nov[0]![0]).toBe("2026-10-26");
    expect(nov[0]![6]).toBe("2026-11-01");
    expect(nov.at(-1)!.at(-1)).toBe("2026-12-06");
    expect(nov.every((r) => r.length === 7)).toBe(true);
  });
});
