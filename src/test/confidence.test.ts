import { describe, expect, it } from "vitest";
import { confidenceLevel, needsCounselor, recoveryPath } from "@/lib/confidence";
import { options, rankOptions } from "@/data/scenario";

const byId = (id: string) => options.find((o) => o.id === id)!;

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
});

describe("recovery paths", () => {
  it("clearly-counts course goes straight to 'do this now'", () => {
    expect(recoveryPath(byId("math13"))).toBe("now");
  });
  it("grade-threshold course uses hold-and-confirm", () => {
    expect(recoveryPath(byId("psyc5"))).toBe("hold");
  });
  it("catalog/articulation conflict uses hold-and-confirm", () => {
    expect(recoveryPath(byId("bus21"))).toBe("hold");
  });
});

describe("ranking", () => {
  it("puts sections with open seats before full ones, even if the full one fits better", () => {
    const ranked = rankOptions(options);
    expect(ranked.at(-1)!.id).toBe("stat2-02");
    expect(ranked[0]!.id).toBe("math13");
  });
});
