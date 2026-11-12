import { describe, expect, it } from "vitest";
import { countAt, countUpPlan, formatLike, linesToGoal, newestMapItem, readList, readNumber, relatedTo, shouldGrow } from "@/lib/motionOverview";

describe("units count-up", () => {
  it("counts from zero on first load, with no +N the first time ever", () => {
    expect(countUpPlan(null, 37.9, true)).toEqual({ from: 0, animate: true, delta: null });
  });
  it("stays still on a return when nothing changed", () => {
    expect(countUpPlan(37.9, 37.9, false)).toEqual({ from: 37.9, animate: false, delta: null });
  });
  it("counts from the last value and shows +N when units grew", () => {
    expect(countUpPlan(34.6, 37.9, false)).toEqual({ from: 34.6, animate: true, delta: "+3.3" });
  });
  it("shows +N on a first load too, when units grew since the last visit", () => {
    expect(countUpPlan(34.6, 37.9, true).delta).toBe("+3.3");
  });
  it("never shows a +N for a drop or a rounding blip", () => {
    expect(countUpPlan(40, 37.9, false).delta).toBeNull();
    expect(countUpPlan(37.9000001, 37.9, false).delta).toBeNull();
  });
  it("formats with the value's own decimals and eases to the end", () => {
    expect(formatLike(12.345, 37.9)).toBe("12.3");
    expect(formatLike(12, 38)).toBe("12");
    expect(countAt(0, 10, 0)).toBe(0);
    expect(countAt(0, 10, 1)).toBe(10);
    expect(countAt(0, 10, 2)).toBe(10);
    expect(countAt(0, 10, 0.5)).toBeGreaterThan(5);
  });
  it("reads stored numbers safely", () => {
    expect(readNumber(null)).toBeNull();
    expect(readNumber("")).toBeNull();
    expect(readNumber("abc")).toBeNull();
    expect(readNumber("37.9")).toBe(37.9);
  });
});

describe("newest item grows in", () => {
  const opps = [{ id: "dsgn20", courseCode: "DSGN 20" }, { id: "ux-night" }];
  it("picks the last saved listing, else the class behind the newest draft", () => {
    expect(newestMapItem(["design-club", "ux-night"], [], opps)).toBe("ux-night");
    expect(newestMapItem([], ["DSGN 20"], opps)).toBe("dsgn20");
    expect(newestMapItem([], [], opps)).toBeNull();
  });
  it("grows only once per item", () => {
    expect(shouldGrow("ux-night", [])).toBe(true);
    expect(shouldGrow("ux-night", ["ux-night"])).toBe(false);
    expect(shouldGrow(null, [])).toBe(false);
  });
  it("reads a stored list safely", () => {
    expect(readList(null)).toEqual([]);
    expect(readList("not json")).toEqual([]);
    expect(readList('["a",2,"b"]')).toEqual(["a", "b"]);
  });
});

describe("focusing a map card", () => {
  it("keeps the card and its connections", () => {
    const near = relatedTo("a", [{ from: "a", to: "b" }, { from: "c", to: "a" }, { from: "d", to: "e" }]);
    expect([...near].sort()).toEqual(["a", "b", "c"]);
  });
  it("lights the lines from the card up its column to the goal", () => {
    const cards = [{ id: "x", col: 1, row: 0 }, { id: "y", col: 1, row: 1 }, { id: "z", col: 1, row: 2 }, { id: "w", col: 0, row: 0 }];
    const lines = linesToGoal({ id: "y", category: "events", col: 1, row: 1 }, cards);
    expect(lines.has("goal-path") && lines.has("bus-events") && lines.has("to-x") && lines.has("to-y")).toBe(true);
    expect(lines.has("to-z") || lines.has("to-w")).toBe(false);
  });
});
