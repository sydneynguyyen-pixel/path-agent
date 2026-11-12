import { describe, expect, it } from "vitest";
import { careerRoles } from "@/data/scenario";
import { addGoal, buildSkillsFor, chosenGoals, skillSuggestions, goalLine, goalsFor, makeMain, MAX_GOALS, removeGoal, suggestedRoles } from "@/lib/goals";

describe("goals", () => {
  it("starts with Maya's goal in the filled demo and nothing in a fresh start", () => {
    expect(goalsFor("filled")).toEqual(["ux"]);
    expect(goalsFor("fresh")).toEqual([]);
  });

  it("adds up to three goals without duplicates", () => {
    expect(addGoal(["ux"], "ux")).toEqual(["ux"]);
    expect(addGoal(["ux"], "policy")).toEqual(["ux", "policy"]);
    const full = ["ux", "policy", "market"];
    expect(full).toHaveLength(MAX_GOALS);
    expect(addGoal(full, "museum")).toBe(full);
  });

  it("makes a goal main, dropping the last one when full", () => {
    expect(makeMain(["ux", "policy"], "policy")).toEqual(["policy", "ux"]);
    expect(makeMain(["ux", "policy", "market"], "museum")).toEqual(["museum", "ux", "policy"]);
    expect(removeGoal(["ux", "policy"], "ux")).toEqual(["policy"]);
  });

  it("never guesses a goal when none is chosen", () => {
    expect(chosenGoals(careerRoles, [])).toEqual([]);
    expect(chosenGoals(careerRoles, ["policy", "ux"]).map((r) => r.id)).toEqual(["policy", "ux"]);
  });

  it("suggests careers not chosen or turned down, best fit first", () => {
    const ids = suggestedRoles(careerRoles, ["ux"], ["museum"], []).map((r) => r.id);
    expect(ids).not.toContain("ux");
    expect(ids).not.toContain("museum");
    expect(ids.at(-1)).toBe("nonprofit");
    expect(suggestedRoles(careerRoles, [], [], ["Helping communities", "Working with people"])[0]!.id).toBe("nonprofit");
  });

  it("describes progress in words", () => {
    expect(goalLine(2, 5)).toBe("You have proof for 2 of 5 skills it asks for");
    expect(goalLine(3, 3)).toBe("You have proof for all 3 skills it asks for");
    expect(goalLine(0, 4)).toMatch(/^4 skills to build/);
  });

  it("builds the missing skills until she picks her own", () => {
    const ux = careerRoles.find((r) => r.id === "ux")!;
    expect(buildSkillsFor(ux, {})).toEqual(["Usability testing", "Survey design"]);
    expect(buildSkillsFor(ux, {}, ["survey design"])).toEqual(["Usability testing"]);
    expect(buildSkillsFor(ux, { ux: ["Figma"] })).toEqual(["Figma"]);
  });

  it("suggests skills she hasn't picked, without repeats", () => {
    const ux = careerRoles.find((r) => r.id === "ux")!;
    const s = skillSuggestions(ux, ["Usability testing"], ["Prototyping", "survey design"]);
    expect(s[0]).toBe("Survey design");
    expect(s).not.toContain("Usability testing");
    expect(s.filter((n) => n.toLowerCase() === "survey design")).toHaveLength(1);
    expect(s).toContain("Prototyping");
    expect(skillSuggestions(ux, [], ["Interviewing"])).not.toContain("Interviewing");
  });
});
