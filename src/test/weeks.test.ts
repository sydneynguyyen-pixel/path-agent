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
