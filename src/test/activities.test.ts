import { describe, expect, it } from "vitest";
import { ledgerSkills } from "@/data/scenario";
import { cleanSkill, isOwnKey, ownKey, ownProofs, suggestSkills, themeFor, type Activity } from "@/lib/activities";
import { portfolioSkills } from "@/lib/portfolio";

const cafe: Activity = { id: "act-1", title: "Barista at Corner Café", kind: "job", when: "Since Jan 2026", did: "Served customers and ran the register.", skills: ["Customer communication", "Budgeting"] };

describe("suggestSkills", () => {
  it("finds skills from her own words", () => {
    expect(suggestSkills("Served customers at the café and handled the cash register", "job")).toEqual(expect.arrayContaining(["Customer communication", "Budgeting"]));
    expect(suggestSkills("I make the shift schedule for the team", "job")).toEqual(expect.arrayContaining(["Scheduling", "Teamwork"]));
    expect(suggestSkills("President of the club, I led weekly meetings", "club")).toContain("Leadership");
    expect(suggestSkills("Tutor kids in math after school", "volunteering")).toContain("Teaching");
    expect(suggestSkills("Built an app and a website for my church", "project")).toContain("Programming");
    expect(suggestSkills("Ran a survey and did interviews with neighbors", "project")).toEqual(expect.arrayContaining(["Survey design", "Interviewing"]));
  });
  it("adds what the kind usually builds", () => {
    expect(suggestSkills("I look after my little brother every afternoon", "caring")).toEqual(["Caregiving & responsibility"]);
    expect(suggestSkills("", "sports")).toEqual(["Teamwork", "Time management"]);
    expect(suggestSkills("", "other")).toEqual([]);
  });
  it("is deterministic and has no duplicates", () => {
    const text = "Led the team, led the team again, coached the team";
    const a = suggestSkills(text, "sports");
    expect(suggestSkills(text, "sports")).toEqual(a);
    expect(new Set(a).size).toBe(a.length);
  });
  it("doesn't match words inside other words", () => {
    expect(suggestSkills("I applied to happy hour and my career", "other")).toEqual([]);
  });
  it("keeps the list short", () => {
    expect(suggestSkills("Led the team, wrote the newsletter, designed posters, tracked data in a spreadsheet, tutored, ran the budget, planned events", "club").length).toBeLessThanOrEqual(6);
  });
});

describe("own proofs", () => {
  it("files known skills under their category and the rest under From doing", () => {
    expect(themeFor("Customer communication")).toBe("Writing and communication");
    expect(themeFor("Juggling")).toBe("From doing");
  });
  it("tidies a skill she typed", () => {
    expect(cleanSkill("  event   planning ")).toBe("Event planning");
    expect(cleanSkill("   ")).toBe("");
  });
  it("turns activities and single skills into proof with their own review keys", () => {
    const proofs = ownProofs([cafe], [{ id: "own-1", name: "Spanish", where: "own", detail: "" }]);
    expect(proofs.map((p) => p.skill)).toEqual(["Customer communication", "Budgeting", "Spanish"]);
    expect(proofs.every((p) => isOwnKey(p.key))).toBe(true);
    expect(proofs[0]!.via.title).toBe("Barista at Corner Café");
    expect(proofs[2]!.via.title).toBe("On my own");
  });
  it("counts as confirmed and self-reported in the portfolio, until she unconfirms it", () => {
    const own = ownProofs([cafe], []);
    const row = portfolioSkills([], [], [], {}, own).find((r) => r.key === "customer communication")!;
    expect(row.confirmed).toBe(true);
    expect(row.selfReported).toBe(true);
    expect(row.proofs).toEqual([{ type: "own", id: "act-1", title: "Barista at Corner Café" }]);
    const off = portfolioSkills([], [], [], { [ownKey("act-1", "Customer communication")]: { confirmed: false } }, own).find((r) => r.key === "customer communication")!;
    expect(off.confirmed).toBe(false);
  });
  it("merges with a skill Sprout found without raising its level", () => {
    const first = ledgerSkills[0]!;
    const own = ownProofs([{ ...cafe, skills: [first.name] }], []);
    const before = portfolioSkills(ledgerSkills, [], [], {}).find((r) => r.key === first.name.toLowerCase())!;
    const after = portfolioSkills(ledgerSkills, [], [], {}, own).find((r) => r.key === first.name.toLowerCase())!;
    expect(after.level).toBe(before.level);
    expect(after.selfReported).toBe(false);
    expect(after.proofs.map((p) => p.type)).toEqual(expect.arrayContaining(["class", "own"]));
  });
});
