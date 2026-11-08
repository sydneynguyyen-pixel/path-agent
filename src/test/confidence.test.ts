import { describe, expect, it } from "vitest";
import { confidenceLevel, needsCounselor } from "@/lib/confidence";
import { options } from "@/data/scenario";

describe("confidence threshold", () => {
  it("routes claims below 0.75 to the counselor", () => {
    expect(needsCounselor(0.74)).toBe(true);
    expect(needsCounselor(0.75)).toBe(false);
  });
  it("routes conflicting sources to the counselor even with a high score", () => {
    expect(needsCounselor(0.9, true)).toBe(true);
  });
  it("labels levels", () => {
    expect(confidenceLevel(0.9)).toBe("high");
    expect(confidenceLevel(0.8)).toBe("medium");
    expect(confidenceLevel(0.5)).toBe("low");
  });
  it("the catalog/articulation conflict option needs counselor confirmation", () => {
    const conflict = options.find((o) => o.conflict)!;
    expect(needsCounselor(conflict.confidence, true)).toBe(true);
  });
});
