import { describe, expect, it } from "vitest";
import { byClassProgress, classProgress, termWeeks } from "@/lib/classProgress";
import { termDates } from "@/data/map";
import { FALL_2026_WEEKS, WINTER_2027_WEEKS } from "@/data/scenario";

const fall = { start: "2026-09-21", end: "2026-12-11" };

describe("classProgress", () => {
  it("counts weeks the same way the term calendars do", () => {
    expect(termWeeks(termDates["f26"]!)).toBe(FALL_2026_WEEKS);
    expect(termWeeks(termDates["w27"]!)).toBe(WINTER_2027_WEEKS);
  });
  it("says which week she's in during the term", () => {
    expect(classProgress(fall, "Fall 2026", "2026-09-21")).toMatchObject({ state: "now", label: "Week 1 of 12", week: 1 });
    expect(classProgress(fall, "Fall 2026", "2026-11-08")).toMatchObject({ state: "now", label: "Week 7 of 12", week: 7 });
    expect(classProgress(fall, "Fall 2026", "2026-12-11")).toMatchObject({ state: "now", label: "Week 12 of 12", fraction: 1 });
  });
  it("is done after the last day and upcoming before the first", () => {
    expect(classProgress(fall, "Fall 2026", "2026-12-12")).toEqual({ state: "done", label: "Done", fraction: 1 });
    expect(classProgress(termDates["w27"], "Winter 2027", "2026-11-08")).toEqual({ state: "upcoming", label: "Starts Winter 2027", fraction: 0 });
  });
  it("never invents dates: a term without them is just its name", () => {
    expect(classProgress(undefined, "Fall 2030", "2026-11-08")).toEqual({ state: "unknown", label: "Fall 2030" });
  });
  it("orders in progress, then done (latest first), then upcoming (soonest first), then unknown", () => {
    const row = (code: string, dates: { start: string; end: string } | undefined) => ({ code, start: dates?.start, progress: classProgress(dates, code, "2026-11-08") });
    const list = [
      row("UNK", undefined),
      row("SP27", termDates["sp27"]),
      row("W27", termDates["w27"]),
      row("S26", termDates["s26"]),
      row("F25", termDates["f25"]),
      row("F26", termDates["f26"]),
    ].sort(byClassProgress);
    expect(list.map((r) => r.code)).toEqual(["F26", "S26", "F25", "W27", "SP27", "UNK"]);
  });
});
