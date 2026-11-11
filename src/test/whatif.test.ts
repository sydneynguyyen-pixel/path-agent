import { describe, expect, it } from "vitest";
import { changedSlots, explain, NO_CHANGE, OFF_TERM, parseWhatIf, project, statsFromSeat, SUMMER_CLASSES, termsMoved, type WhatIf } from "@/lib/whatif";

const base = project(NO_CHANGE, "stat2");
const run = (patch: Partial<WhatIf>) => project({ ...NO_CHANGE, ...patch }, "stat2");

describe("what-if projection", () => {
  it("matches the real plan when nothing changes", () => {
    expect(base.graduation).toBe("Spring 2029");
    expect(base.transfer).toBe("ready");
    expect(base.transferTerm).toBe("Fall 2027");
    expect(base.unitsAtTransfer).toBe(69.1);
    expect(base.pileups).toEqual([4]);
    expect(base.tuition).toBe(0);
    expect(base.bars.every((b) => b.state === "same")).toBe(true);
    expect(explain(NO_CHANGE, base, base)).toEqual([]);
  });

  it("moves a dropped class onto the lightest later term and keeps graduation", () => {
    const p = run({ dropped: ["BIO 12"] });
    expect(p.graduation).toBe("Spring 2029");
    expect(p.bars[0]).toMatchObject({ name: "Fall 2027", units: 15, state: "heavier" });
    expect(p.pileups).toEqual([]);
  });

  it("charges Northgate's rate for what moves there", () => {
    expect(run({ dropped: ["BIO 12"] }).tuition).toBe(3 * 396 - 5 * 31);
  });

  it("blocks transfer under the unit minimum and pushes graduation", () => {
    const p = run({ dropped: SUMMER_CLASSES });
    expect(p.unitsAtTransfer).toBe(59.2);
    expect(p.transfer).toBe("blocked");
    expect(p.transferTerm).toBe("Spring 2028");
    expect(p.bars[0]!.state).toBe("bayview");
    expect(termsMoved(base, p)).toBeGreaterThan(0);
  });

  it("blocks transfer without QR-1", () => {
    expect(run({ stats: "skip" }).transfer).toBe("blocked");
  });

  it("carries each statistics option's real status and deadlines", () => {
    expect(run({ stats: "math13" }).transfer).toBe("ready");
    expect(run({ stats: "math13" }).pileups).toEqual([4, 8]);
    expect(run({ stats: "psyc5" }).transfer).toBe("conditional");
    expect(run({ stats: "psyc5" }).pileups).toEqual([4, 7]);
    expect(run({ stats: "bus21" }).transfer).toBe("review");
  });

  it("adds a term when a term off leaves no room", () => {
    const p = run({ termOff: true });
    expect(p.bars.find((b) => b.name === "Spring 2028")!.state).toBe("off");
    expect(p.graduation).toBe("Fall 2029");
    expect(termsMoved(base, p)).toBe(1);
  });

  it("finishes a term early by going over the normal load, and says so", () => {
    const change = { ...NO_CHANGE, early: true };
    const p = project(change, "stat2");
    expect(p.graduation).toBe("Fall 2028");
    expect(termsMoved(base, p)).toBe(-1);
    expect(p.bars.some((b) => b.units > 16)).toBe(true);
    expect(explain(change, base, p).some((n) => n.text.includes("approval"))).toBe(true);
  });

  it("never lets a plan fall short of the degree", () => {
    const cases: Partial<WhatIf>[] = [{ dropped: ["BIO 12"] }, { dropped: ["BIO 12", "HIST 18"] }, { stats: "bus21" }, { termOff: true }, { early: true }, { dropped: SUMMER_CLASSES, stats: "skip", termOff: true }];
    for (const c of cases) {
      const p = run(c);
      expect(p.unitsAtTransfer + p.bars.reduce((n, b) => n + b.units, 0)).toBeGreaterThanOrEqual(120);
    }
  });

  it("starts from a seat the student holds", () => {
    expect(statsFromSeat(null, false)).toBe("stat2");
    expect(statsFromSeat("math13", true)).toBe("math13");
    expect(statsFromSeat("math13", false)).toBe("stat2");
  });
});

describe("typed changes", () => {
  it("reads common phrasing", () => {
    expect(parseWhatIf("drop BIO 12", NO_CHANGE)?.dropped).toEqual(["BIO 12"]);
    expect(parseWhatIf("what if I take MATH 13 instead of STAT 2", NO_CHANGE)?.stats).toBe("math13");
    expect(parseWhatIf("drop stat 2", NO_CHANGE)?.stats).toBe("skip");
    expect(parseWhatIf("add a summer internship", NO_CHANGE)?.internship).toBe(true);
    expect(parseWhatIf("take spring 2028 off", NO_CHANGE)?.termOff).toBe(true);
    expect(parseWhatIf("can I graduate early?", NO_CHANGE)?.early).toBe(true);
  });

  it("takes the whole summer off", () => {
    const next = parseWhatIf("take summer off", NO_CHANGE);
    expect(next?.dropped).toEqual(SUMMER_CLASSES);
    expect(next?.stats).toBe("skip");
  });

  it("builds on the current draft and can undo", () => {
    const one = parseWhatIf("drop bio", NO_CHANGE)!;
    expect(parseWhatIf("drop history", one)?.dropped).toEqual(["BIO 12", "HIST 18"]);
    expect(parseWhatIf("keep bio", one)?.dropped).toEqual([]);
    expect(parseWhatIf("start over", one)).toEqual(NO_CHANGE);
  });

  it("admits when it can't test something", () => {
    expect(parseWhatIf("change my major to dance", NO_CHANGE)).toBeNull();
    expect(parseWhatIf("   ", NO_CHANGE)).toBeNull();
  });
});

describe("changedSlots", () => {
  const slots = [{ id: "a", code: "BIO 12", termName: "Summer 2027" }, { id: "b", code: "PSYC 1", termName: OFF_TERM }, { id: "c", code: "PSYC 9", termName: "Last" }];
  it("marks nothing when nothing changed", () => {
    expect([...changedSlots(NO_CHANGE, slots, false, false, "Last")]).toEqual([]);
  });
  it("marks a dropped class", () => {
    expect([...changedSlots({ ...NO_CHANGE, dropped: ["BIO 12"] }, slots, false, false, "Last")]).toEqual(["a"]);
  });
  it("marks a term off, finishing early, statistics and the finish", () => {
    expect(changedSlots({ ...NO_CHANGE, termOff: true }, slots, false, false, "Last").has("b")).toBe(true);
    expect(changedSlots({ ...NO_CHANGE, early: true }, slots, false, false, "Last").has("c")).toBe(true);
    const moved = changedSlots(NO_CHANGE, slots, true, true, "Last");
    expect(moved.has("qr1") && moved.has("graduate")).toBe(true);
  });
});
