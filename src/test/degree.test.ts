import { describe, expect, it } from "vitest";
import { psychologyDegree } from "@/data/degree";
import { progress, requirements, terms } from "@/data/scenario";
import { auditFor, formatCredits, groupTitle, layoutTree, placeOf, semesterCredits, slotForCourse, standingOf, statisticsWays, transferReadiness, type AuditInput, type AuditSlot } from "@/lib/degree";

const start: AuditInput = { stage: "idle", seatHeld: false, chosenId: null, counselor: null, atRisk: false, savedOpportunities: [] };
const full: AuditInput = { ...start, stage: "failed", atRisk: true };
const heldMath: AuditInput = { ...start, stage: "chosen", chosenId: "math13", seatHeld: true };
const heldPsyc: AuditInput = { ...start, stage: "chosen", chosenId: "psyc5", seatHeld: true };
const audit = auditFor(psychologyDegree, start);
const slot = (i: AuditInput, id: string) => auditFor(psychologyDegree, i).categories.flatMap((c) => c.slots).find((s) => s.id === id)!;
const shape = (i: AuditInput) => auditFor(psychologyDegree, i).categories.map((c) => [c.id, c.needed, c.slots.map((s) => [s.id, s.need])]);

describe("degree template", () => {
  it("needs exactly the credits the degree requires", () => {
    expect(psychologyDegree.categories.reduce((n, c) => n + c.needed, 0)).toBe(psychologyDegree.totalNeeded);
  });
  it("places every class in the plan exactly once", () => {
    const slots = psychologyDegree.categories.flatMap((c) => c.slots).filter((s) => s.term);
    for (const t of terms) expect(slots.filter((s) => s.term === t.id).length, t.id).toBe(t.courses.length);
  });
});

describe("auditFor", () => {
  it("agrees with the credits shown elsewhere", () => {
    expect(audit.earned).toBeCloseTo(progress.earned, 1);
    expect(audit.now).toBeCloseTo(progress.inProgress, 1);
  });
  it("reaches the degree total with the plan as it stands", () => {
    expect(audit.earned + audit.now + audit.planned).toBeCloseTo(120, 5);
    expect(audit.short).toBe(0);
  });
  it("never lets a category hold more than it needs", () => {
    for (const c of audit.categories) expect(c.credits.done + c.credits.now + c.credits.planned).toBeLessThanOrEqual(c.needed + 1e-9);
  });
  it("keeps the same layout whatever happens", () => {
    const states = [full, heldMath, heldPsyc, { ...heldPsyc, counselor: "declined" as const }, { ...start, savedOpportunities: ["dsgn20", "psyc41"] }];
    for (const s of states) expect(shape(s)).toEqual(shape(start));
  });
  it("converts quarter units to semester credits", () => {
    expect(semesterCredits("5 quarter units")).toBeCloseTo(3.33, 2);
    expect(semesterCredits("3 semester units")).toBe(3);
    expect(formatCredits(3.3333)).toBe("3.3");
    expect(formatCredits(15)).toBe("15");
  });
  it("counts the Northgate and upper-division rules from the plan", () => {
    const [residency, upper] = audit.rules;
    expect(residency!.done).toBe(0);
    expect(residency!.planned).toBe(52);
    expect(upper!.planned).toBe(30);
  });
});

describe("statistics slot", () => {
  it("starts planned with STAT 2", () => {
    expect(slot(start, "qr1")).toMatchObject({ status: "planned", code: "STAT 2" });
  });
  it("empties when the section is full and leaves the plan short", () => {
    expect(slot(full, "qr1")).toMatchObject({ status: "open", credits: 0 });
    expect(auditFor(psychologyDegree, full).short).toBeCloseTo(3, 5);
  });
  it("registers directly for a clear option", () => {
    expect(slot(heldMath, "qr1")).toMatchObject({ status: "now", code: "MATH 13" });
  });
  it("needs a check for a conditional option until the counselor answers", () => {
    expect(slot(heldPsyc, "qr1")).toMatchObject({ status: "check", code: "PSYC 5" });
    expect(slot({ ...heldPsyc, counselor: "confirmed" }, "qr1")).toMatchObject({ status: "now", code: "PSYC 5" });
    expect(slot({ ...heldPsyc, counselor: "declined" }, "qr1")).toMatchObject({ status: "open", credits: 0 });
  });
  it("doesn't call a registered class earned", () => {
    expect(auditFor(psychologyDegree, { ...heldPsyc, counselor: "confirmed" }).earned).toBeCloseTo(progress.earned, 1);
  });
});

describe("open slots", () => {
  it("say what kind of class goes there", () => {
    expect(slot(start, "social-science")).toMatchObject({ status: "open", hint: "Any approved social science GE" });
  });
  it("fill in when a class is added, without changing the credits", () => {
    const after = { ...start, savedOpportunities: ["dsgn20"] };
    expect(slot(after, "open-fa27")).toMatchObject({ status: "planned", code: "DSGN 20" });
    expect(auditFor(psychologyDegree, after).planned).toBeCloseTo(audit.planned, 5);
  });
});

describe("graduation tree", () => {
  const tree = layoutTree(audit, start);
  it("has the four rows and seven columns", () => {
    expect(tree.rows.map((r) => r.id)).toEqual(["major", "statistics", "ge", "ux"]);
    expect(tree.columns).toHaveLength(7);
  });
  it("branches Statistics three ways in the winter", () => {
    const ways = tree.cards.filter((c) => c.kind === "way");
    expect(ways.map((w) => w.title)).toEqual(["STAT 2 · Evening", "MATH 13 · Online live", "PSYC 5 · In person"]);
    expect(ways.every((w) => w.col === "w27")).toBe(true);
  });
  it("never overlaps two cards", () => {
    for (const a of tree.cards) for (const b of tree.cards) {
      if (a === b) continue;
      expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h, `${a.id} / ${b.id}`).toBe(false);
    }
  });
  it("runs every row to graduation", () => {
    for (const r of tree.rows) expect(tree.links.some((l) => l.id.endsWith(">graduate") && tree.cards.find((c) => c.id === l.id.split(">")[0])?.row === r.id), r.id).toBe(true);
  });
  it("continues only from the class you've settled on", () => {
    const held = layoutTree(auditFor(psychologyDegree, heldMath), heldMath);
    expect(held.links.filter((l) => l.id.endsWith(">graduate") && l.id.startsWith("way-")).map((l) => l.id)).toEqual(["way-math13>graduate"]);
  });
  it("runs the planned path past classes that are only options", () => {
    expect(tree.links.find((l) => l.id === "major-sp27>major-fa27")?.state).toBe("plan");
    expect(tree.links.find((l) => l.id === "major-done>lcc-psyc20")?.state).toBe("option");
  });
  it("always shows the class you chose", () => {
    expect(statisticsWays({ ...start, chosenId: "bus21" }).map((w) => w.id)).toEqual(["stat2", "math13", "bus21"]);
  });
  it("marks STAT 2 as full once it fills", () => {
    expect(layoutTree(auditFor(psychologyDegree, full), full).cards.find((c) => c.id === "way-stat2")).toMatchObject({ status: "option", sub: "Section full" });
  });
  it("shortens repeated subjects", () => {
    const s = (code: string) => ({ code, need: "x" }) as AuditSlot;
    expect(groupTitle([s("PSYC 1"), s("PSYC 2"), s("PSYC 14")])).toBe("PSYC 1 · 2 · 14");
    expect(groupTitle([s("A 1"), s("B 2"), s("C 3"), s("D 4")])).toBe("A 1 · B 2 +2");
  });
  it("has no scores in its copy", () => {
    const text = tree.cards.map((c) => `${c.title} ${c.sub}`).join(" ");
    expect(text).not.toMatch(/\d+%|likely|fairly sure|\bhigh\b|\bmedium\b/i);
  });
});

describe("finding a class in the degree", () => {
  it("finds the line a planned class fills", () => {
    const s = audit.categories.flatMap((c) => c.slots).find((x) => x.code)!;
    expect(slotForCourse(audit, s.code!)?.slot).toBe(s.id);
  });
  it("returns nothing for a class that isn't in the degree", () => {
    expect(slotForCourse(audit, "ZZZ 999")).toBeUndefined();
  });
  it("places every planned class on a degree line", () => {
    for (const t of terms) for (const c of t.courses) expect(placeOf(psychologyDegree, t.id, c), c.code).toBeDefined();
  });
});

describe("transferReadiness", () => {
  it("only lists what Bayview needs first", () => {
    const lines = transferReadiness(requirements, start);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(requirements.length);
  });
  it("follows the statistics decision", () => {
    const qr = (i: AuditInput) => transferReadiness(requirements, i).find((r) => r.id === "qr1");
    expect(qr(heldMath)?.detail).toContain("MATH 13");
  });
});

describe("standing", () => {
  it("names the standing and the units that reach the next one", () => {
    expect(standingOf(37.9)).toEqual({ name: "Sophomore", next: { name: "Junior", at: 60 } });
    expect(standingOf(12)).toEqual({ name: "Freshman", next: { name: "Sophomore", at: 30 } });
    expect(standingOf(95).next).toBeUndefined();
  });
});
