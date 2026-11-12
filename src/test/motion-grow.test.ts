import { afterEach, describe, expect, it, vi } from "vitest";
import { cascadeDelays, confirmedBySegment, grewSegments, inSegment, levelChange, runCascade, sameSegment } from "@/lib/motionGrow";

describe("inSegment", () => {
  const skill = { theme: "Writing and communication", level: "Practiced" as const };
  it("lights only skills in the focused area and level", () => {
    expect(inSegment({ theme: "Writing and communication", level: "Practiced" }, skill)).toBe(true);
    expect(inSegment({ theme: "Writing and communication", level: "Taught" }, skill)).toBe(false);
    expect(inSegment({ theme: "Tools", level: "Practiced" }, skill)).toBe(false);
    expect(inSegment(null, skill)).toBe(false);
  });
  it("compares segments by value", () => {
    expect(sameSegment({ theme: "a", level: "Taught" }, { theme: "a", level: "Taught" })).toBe(true);
    expect(sameSegment(null, { theme: "a", level: "Taught" })).toBe(false);
    expect(sameSegment(null, null)).toBe(true);
  });
});

describe("cascade", () => {
  afterEach(() => vi.useRealTimers());
  it("steps 30 ms apart, backwards from the last row", () => {
    expect(cascadeDelays(4)).toEqual([0, 30, 60, 90]);
    expect(cascadeDelays(4, "back")).toEqual([90, 60, 30, 0]);
  });
  it("applies rows in order, and in reverse for Undo", () => {
    vi.useFakeTimers();
    const seen: number[] = [];
    runCascade([1, 2, 3], (n) => seen.push(n));
    vi.advanceTimersByTime(100);
    runCascade([1, 2, 3], (n) => seen.push(n), { direction: "back" });
    vi.advanceTimersByTime(100);
    expect(seen).toEqual([1, 2, 3, 3, 2, 1]);
  });
  it("applies everything at once with reduced motion", () => {
    const seen: number[] = [];
    runCascade([1, 2, 3], (n) => seen.push(n), { now: true });
    expect(seen).toEqual([1, 2, 3]);
  });
  it("can be cancelled", () => {
    vi.useFakeTimers();
    const seen: number[] = [];
    const stop = runCascade([1, 2, 3], (n) => seen.push(n));
    vi.advanceTimersByTime(0);
    stop();
    vi.advanceTimersByTime(100);
    expect(seen).toEqual([1]);
  });
});

describe("segments that grew", () => {
  it("finds the area and level where a skill was just confirmed", () => {
    const before = confirmedBySegment([{ theme: "Tools", level: "Taught", confirmed: false }, { theme: "Tools", level: "Practiced", confirmed: true }]);
    const after = confirmedBySegment([{ theme: "Tools", level: "Taught", confirmed: true }, { theme: "Tools", level: "Practiced", confirmed: true }]);
    expect(grewSegments(before, after)).toEqual(["Tools|Taught"]);
    expect(grewSegments(after, before)).toEqual([]);
  });
});

describe("levelChange", () => {
  it("is null when the level stayed", () => {
    expect(levelChange("Taught", "Taught")).toBeNull();
    expect(levelChange("Taught", "Practiced")).toEqual({ from: "Taught", to: "Practiced" });
  });
});
