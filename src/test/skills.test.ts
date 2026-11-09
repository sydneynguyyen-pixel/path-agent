import { describe, expect, it } from "vitest";
import { ledgerSkills, gapSkills, careerRoles } from "@/data/scenario";
import { evidenceFor, resumeBullet, exportableSkills, canExport, orderRoles, skillsSummary } from "@/lib/skills";
const taught = ledgerSkills.find(s => s.id === "descriptive");
const practiced = ledgerSkills.find(s => s.id === "sources");
describe("Skills trust rules", () => {
  it("keeps every skill tied to a course and source quote", () => { for (const s of [...ledgerSkills, ...gapSkills]) { expect(s.course.length).toBeGreaterThan(0); expect(s.quote.length).toBeGreaterThan(0); expect(s.source.length).toBeGreaterThan(0); } });
  it("only moves evidence to Demonstrated when work exists", () => { if (!taught) throw Error("Missing STAT 2"); expect(evidenceFor(taught, { confirmed: true })).toBe("Taught"); expect(evidenceFor(taught, { work: "project.pdf" })).toBe("Demonstrated"); });
  it("uses Coursework in for taught-only resume claims", () => { if (!taught) throw Error("Missing STAT 2"); expect(resumeBullet(taught)).toBe("Coursework in descriptive statistics (from STAT 2, taught)."); });
  it("does not use demonstrated verbs for practiced skills", () => { if (!practiced) throw Error("Missing HIST 17"); expect(resumeBullet(practiced)).toBe("Practiced source analysis through course assignments (from HIST 17, practiced)."); expect(resumeBullet(practiced)).not.toMatch(/Built|Analyzed|Led/); });
  it("only exports confirmed and visible skills", () => { expect(exportableSkills(ledgerSkills, { descriptive: { confirmed: true }, sources: { confirmed: true, hidden: true } }).map(s=>s.id)).toEqual(["descriptive"]); });
  it("summarizes what is ready, what needs checking and the most applied theme", () => { expect(skillsSummary(ledgerSkills, { observation: { confirmed: true } })).toMatchObject({ total: 15, ready: 1, toCheck: 14, strongestTheme: "Analysis and critical thinking", strongestCount: 4 }); });
  it("leaves hidden skills out of the summary and counts attached work as applied", () => { expect(skillsSummary(ledgerSkills, { observation: { confirmed: true, hidden: true }, descriptive: { work: "project.pdf" } })).toMatchObject({ total: 14, ready: 0, toCheck: 14 }); expect(skillsSummary([], {})).toMatchObject({ total: 0, strongestTheme: null }); });
  it("requires accuracy confirmation before copying or download", () => { expect(canExport(false,3)).toBe(false); expect(canExport(true,0)).toBe(false); expect(canExport(true,3)).toBe(true); });
  it("keeps the uncertain ART 1 skill low confidence", () => { expect(ledgerSkills.find(s=>s.id === "speaking")).toMatchObject({ confidence: "Low", level: "Taught", quote: "Class discussion" }); });
  it("interest reorders options without hiding roles", () => { const ordered = orderRoles(["Creative work"], ["museum"]); expect(ordered[0]?.id).toBe("museum"); expect(ordered).toHaveLength(5); expect(ordered.map(r=>r.id).sort()).toEqual(careerRoles.map(r=>r.id).sort()); });
  it("preserves exactly the requested UX learning gap", () => { expect(careerRoles.find(r=>r.id === "ux")?.missing).toEqual(["Usability testing", "Survey design"]); });
});