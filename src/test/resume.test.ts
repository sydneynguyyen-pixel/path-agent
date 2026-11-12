import { describe, expect, it } from "vitest";
import { addName, blankDoc, coverTemplate, docId, dropName, experiencePhrase, groupDocs, libraryDocs, newVersion, pendingSkills, roleAsks, saveDoc, skillsForDoc, syncResumeSkills } from "@/lib/resume";

const ux = { id: "ux", title: "UX researcher" };
const policy = { id: "policy", title: "Policy analyst" };
const skill = (name: string, confirmed = true, hidden = false) => ({ name, confirmed, hidden });

describe("resume library", () => {
  it("gives each goal a resume and a cover letter, main goal first, then one general CV", () => {
    const docs = libraryDocs([ux, policy], []);
    expect(docs.map((d) => d.id)).toEqual(["resume-ux", "cover-ux", "resume-policy", "cover-policy", "cv-general"]);
  });
  it("with no goals, offers a general resume and CV", () => {
    expect(libraryDocs([], []).map((d) => d.id)).toEqual(["resume-general", "cv-general"]);
  });
  it("uses saved drafts in place of defaults and keeps versions she made", () => {
    const edited = { ...blankDoc("resume", "ux", "UX researcher"), summary: "Mine" };
    const v2 = newVersion(edited, "policy", "Policy analyst", [], 1);
    const docs = libraryDocs([ux], [edited, v2]);
    expect(docs.find((d) => d.id === "resume-ux")?.summary).toBe("Mine");
    expect(docs.at(-1)?.id).toBe(v2.id);
    const groups = groupDocs(docs, ["ux"]);
    expect(groups.map((g) => g.roleId)).toEqual(["ux", "policy", null]);
  });
  it("a new version for another career starts its wording fresh and remembers where it came from", () => {
    const doc = { ...blankDoc("cover", "ux", "UX researcher"), letter: "Dear UX team" };
    const v = newVersion(doc, "policy", "Policy analyst", [], 5);
    expect(v.roleId).toBe("policy");
    expect(v.letter).toBeNull();
    expect(v.copiedFrom).toBe(docId("cover", "ux"));
    expect(v.id).not.toBe(doc.id);
    expect(newVersion(doc, "ux", "UX researcher", [], 5).letter).toBe("Dear UX team");
  });
  it("saveDoc inserts or replaces by id", () => {
    const a = blankDoc("resume", null);
    expect(saveDoc([], a)).toHaveLength(1);
    expect(saveDoc([a], { ...a, title: "B" })).toEqual([{ ...a, title: "B" }]);
  });
});

describe("skills on the resume", () => {
  it("names are added once, case-insensitive, and can be dropped", () => {
    expect(addName(["Interviewing"], "interviewing")).toEqual(["Interviewing"]);
    expect(dropName(["Interviewing", "SQL"], "sql")).toEqual(["Interviewing"]);
  });
  it("pending skills are confirmed, visible, not on the resume and not taken off", () => {
    const skills = [skill("Interviewing"), skill("SQL", false), skill("Survey design"), skill("Hidden", true, true), skill("Leadership")];
    expect(pendingSkills(skills, ["interviewing"], ["Leadership"])).toEqual(["Survey design"]);
  });
  it("the first visit adds what she already confirmed quietly, without New marks", () => {
    const next = syncResumeSkills({ resumeSkills: [], resumeNew: [], resumeDismissed: [], resumeSeeded: false, autoAddSkills: true }, [skill("Interviewing"), skill("SQL", false)]);
    expect(next).toEqual({ resumeSkills: ["Interviewing"], resumeNew: [], seeded: true });
  });
  it("after that, a newly confirmed skill is added and marked new while auto-add is on", () => {
    const st = { resumeSkills: ["Interviewing"], resumeNew: [], resumeDismissed: [], resumeSeeded: true, autoAddSkills: true };
    expect(syncResumeSkills(st, [skill("Interviewing"), skill("Survey design")])).toEqual({ resumeSkills: ["Interviewing", "Survey design"], resumeNew: ["Survey design"], seeded: true });
  });
  it("with auto-add off nothing changes; the skill waits as ready to add", () => {
    const st = { resumeSkills: ["Interviewing"], resumeNew: [], resumeDismissed: [], resumeSeeded: true, autoAddSkills: false };
    const next = syncResumeSkills(st, [skill("Interviewing"), skill("Survey design")]);
    expect(next.resumeSkills).toBe(st.resumeSkills);
    expect(pendingSkills([skill("Survey design")], next.resumeSkills, [])).toEqual(["Survey design"]);
  });
  it("an undone skill is not added back", () => {
    const st = { resumeSkills: [], resumeNew: [], resumeDismissed: ["Survey design"], resumeSeeded: true, autoAddSkills: true };
    expect(syncResumeSkills(st, [skill("Survey design")]).resumeSkills).toEqual([]);
  });
  it("nothing to do returns the same lists, so no re-render loop", () => {
    const st = { resumeSkills: ["A"], resumeNew: [], resumeDismissed: [], resumeSeeded: true, autoAddSkills: true };
    const next = syncResumeSkills(st, [skill("A")]);
    expect(next.resumeSkills).toBe(st.resumeSkills);
    expect(next.resumeNew).toBe(st.resumeNew);
  });
});

describe("role-specialized documents", () => {
  it("puts the skills a career asks for first, in the role's order, then the rest", () => {
    const asks = roleAsks({ why: ["Qualitative observation", "Interviewing"] }, ["Usability testing"]);
    expect(skillsForDoc(["Budgeting", "interviewing", "Usability testing", "Qualitative observation"], asks)).toEqual({ asked: ["Qualitative observation", "interviewing", "Usability testing"], other: ["Budgeting"] });
  });
  it("leaves out skills taken off this one document", () => {
    expect(skillsForDoc(["A", "B"], ["A"], ["a"])).toEqual({ asked: [], other: ["B"] });
  });
  it("the cover letter template uses her real skills and leaves placeholders for what it can't know", () => {
    const t = coverTemplate({ name: "Maya Torres", roleTitle: "UX researcher", school: "Bayview Community College", major: "Psychology", skills: ["Interviewing", "Research writing"], experience: [] });
    expect(t).toContain("a UX researcher role");
    expect(t).toContain("interviewing and research writing");
    expect(t).toContain("[organization]");
    expect(t.trim().endsWith("Maya Torres")).toBe(true);
  });
  it("describes what she did in plain words", () => {
    expect(experiencePhrase({ title: "Corner Cafe", role: "Barista", kind: "job" })).toBe("I worked as a barista with Corner Cafe");
    expect(experiencePhrase({ title: "Caring for my brother", kind: "caring" })).toBe("I've been caring for my brother");
    expect(experiencePhrase({ title: "Data Club", kind: "club" })).toBe("I've been part of Data Club");
  });
});
