import { describe, expect, it } from "vitest";
import { ledgerSkills } from "@/data/scenario";
import { eventSkillKey, type EventSkill } from "@/lib/experiences";
import { portfolioSkills } from "@/lib/portfolio";

const first = ledgerSkills[0]!;
const event = { id: "x", name: first.name.toUpperCase(), theme: first.theme, level: "Practiced", events: [{ id: "e1", title: "Design night" }], courses: [] } as unknown as EventSkill;

describe("portfolioSkills", () => {
  it("gives each skill one row", () => {
    const rows = portfolioSkills(ledgerSkills, [event], [], {});
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
  it("lists class and event proof together", () => {
    const row = portfolioSkills(ledgerSkills, [event], [], {}).find((r) => r.key === first.name.toLowerCase())!;
    expect(row.proofs.map((p) => p.type)).toEqual(expect.arrayContaining(["class", "event"]));
  });
  it("is confirmed only when every source is confirmed", () => {
    const key = first.name.toLowerCase();
    const half = portfolioSkills(ledgerSkills, [event], [], { [first.id]: { confirmed: true } }).find((r) => r.key === key)!;
    expect(half.confirmed).toBe(false);
    const all = portfolioSkills(ledgerSkills, [event], [], { [first.id]: { confirmed: true }, [eventSkillKey("x")]: { confirmed: true } }).find((r) => r.key === key)!;
    expect(all.confirmed).toBe(true);
  });
  it("hides a skill with no proof", () => {
    expect(portfolioSkills([], [], [], {})).toEqual([]);
  });
});
