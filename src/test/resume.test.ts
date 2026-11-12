import { describe, expect, it } from "vitest";
import {
  addName, appsIn, blankApplication, blankDoc, bulletsFromEvent, bulletsFromWords, comparePosting, contactLine, coverTemplate, docId, docLook, docsIn, dropName, experiencePhrase,
  folderCounts, folderList, folderOf, groupDocs, jobFolder, jobFolderDocs, libraryDocs, moveItem, newVersion, outcomeBullet, pageCount, pendingSkills, removeApplication,
  resumeText, roleAsks, saveApplication, saveDoc, skillLines, skillsForDoc, startsWithAction, syncResumeSkills, type ResumePage,
  entrySection, sectionHidden, toggleSection, verbLed,
} from "@/lib/resume";
import { experiences } from "@/data/scenario";

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

describe("honest bullets", () => {
  it("her own words become bullets as she wrote them, one per sentence", () => {
    expect(bulletsFromWords("Made drinks for the morning rush. trained two new baristas.\nClosed the shop on Sundays")).toEqual(["Made drinks for the morning rush", "Trained two new baristas", "Closed the shop on Sundays"]);
    expect(bulletsFromWords("")).toEqual([]);
  });
  it("an event's record becomes bullets that start with a verb, from its outcome and skills only", () => {
    const hack = experiences.find((e) => e.id === "civic-hack")!;
    expect(bulletsFromEvent(hack)).toEqual(["Placed 2nd as a team with a map of food pantry hours", "Applied user interviews and prototyping", "Practiced teamwork"]);
    expect(outcomeBullet("Poster: how students choose study spaces")).toBe("Presented a poster on how students choose study spaces");
  });
  it("never adds numbers or results the record doesn't hold", () => {
    for (const e of experiences) {
      const source = `${e.outcome ?? ""} ${e.skills.map((s) => s.name).join(" ")}`;
      const digits = bulletsFromEvent(e).join(" ").match(/\d+/g) ?? [];
      for (const d of digits) expect(source).toContain(d);
      if (!e.outcome) expect(bulletsFromEvent(e).every((b) => /^(Applied|Practiced|Learned) /.test(b))).toBe(true);
    }
  });
  it("checks for an action verb gently and reorders bullets", () => {
    expect(startsWithAction("Interviewed 5 residents")).toBe(true);
    expect(startsWithAction("Responsible for the register")).toBe(false);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
});

describe("templates and the page", () => {
  it("defaults to Modern with the first accent, and keeps what she picks", () => {
    expect(docLook(blankDoc("resume", null))).toMatchObject({ template: "modern", accent: { id: "aqua" } });
    expect(docLook({ template: "classic", accent: "violet" })).toMatchObject({ template: "classic", accent: { id: "violet" } });
    expect(docLook({ template: "nope" as never, accent: "nope" }).template).toBe("modern");
  });
  it("counts pages from the content height", () => {
    expect(pageCount(1056, 1056)).toBe(1);
    expect(pageCount(1200, 1056)).toBe(2);
    expect(pageCount(0, 1056)).toBe(1);
  });
  it("the contact line holds only real details: email, school, then what she typed", () => {
    expect(contactLine("m@x.example", "Bayview", { phone: "", location: "", linkedin: "", site: "" })).toEqual(["m@x.example", "Bayview"]);
    expect(contactLine("m@x.example", "Bayview", { phone: " ", location: "Eastshore, CA", linkedin: "linkedin.com/in/m", site: "" })).toEqual(["m@x.example", "Eastshore, CA", "linkedin.com/in/m"]);
  });
  it("groups skills into research, communication and tools lines", () => {
    const theme: Record<string, string> = { Interviewing: "Research and data", "Source analysis": "Analysis and critical thinking", "Research writing": "Writing and communication", Prototyping: "Tools" };
    expect(skillLines(["Interviewing", "Research writing", "Source analysis", "Prototyping", "Leadership"], (n) => theme[n], ["Figma", "prototyping"])).toEqual([
      { label: "Research", names: ["Interviewing", "Source analysis"] },
      { label: "Communication", names: ["Research writing"] },
      { label: "Tools", names: ["Prototyping", "Figma"] },
      { label: "Other", names: ["Leadership"] },
    ]);
  });
  it("the text version has the same sections as the page, education first", () => {
    const page: ResumePage = { kind: "resume", name: "Maya Torres", headline: "Aspiring UX researcher", contact: ["m@x.example", "Bayview"], summary: "", letter: "", education: [{ id: "e", school: "Northgate", degree: "B.A., Psychology", when: "Expected 2029", detail: "" }], experience: [{ id: "x", role: "Volunteer", org: "Food bank", when: "Aug 2026", bullets: ["Packed boxes", " "] }], training: [], projects: [], skills: [{ label: "Tools", names: ["Figma"] }] };
    const t = resumeText(page);
    expect(t.indexOf("EDUCATION")).toBeLessThan(t.indexOf("EXPERIENCE"));
    expect(t).toContain("m@x.example | Bayview");
    expect(t).toContain("  - Packed boxes");
    expect(t).not.toContain("SUMMARY");
    expect(t).toContain("Tools: Figma");
  });
});

describe("folders", () => {
  it("one folder per goal, then other careers she made versions for, then jobs, then General", () => {
    const job = jobFolder("UX Research Intern", "Acme Health", "ux", 1);
    expect(job.title).toBe("UX Research Intern — Acme Health");
    const docs = libraryDocs([ux], [newVersion(blankDoc("resume", "ux", "UX researcher"), "market", "Market research analyst", [], 2)]);
    expect(folderList([ux], [job], docs, () => "Market research analyst").map((f) => f.id)).toEqual(["role-ux", "role-market", job.id, "general"]);
    expect(docsIn(docs, "role-ux").map((d) => d.kind)).toEqual(["resume", "cover"]);
    expect(folderCounts(1, 0)).toBe("1 doc · 0 applications");
    expect(folderCounts(2, 3)).toBe("2 docs · 3 applications");
  });
  it("a job folder starts with a copy of her resume and a fresh cover letter, both in the folder", () => {
    const job = jobFolder("UX Research Intern", "Acme Health", "ux", 7);
    const from = { ...blankDoc("resume", "ux", "UX researcher"), summary: "Mine", bullets: { a: ["Led it"] } };
    const [resume, cover] = jobFolderDocs(job, from, 7);
    expect(resume).toMatchObject({ kind: "resume", folder: job.id, summary: "Mine", copiedFrom: from.id });
    expect(resume!.bullets).toEqual({ a: ["Led it"] });
    expect(cover).toMatchObject({ kind: "cover", folder: job.id, letter: null });
    expect(folderOf(resume!)).toBe(job.id);
    // A version for another career leaves the job folder.
    expect(folderOf(newVersion(resume!, "policy", "Policy analyst", [], 8))).toBe("role-policy");
  });
});

describe("applications", () => {
  it("are added, edited and removed by id, and listed newest applied first", () => {
    const a = { ...blankApplication("role-ux", "resume-ux", 1), company: "Acme Health", role: "UX Research Intern", applied: "2026-11-01", status: "applied" as const };
    const b = { ...blankApplication("role-ux", null, 2), company: "Bay Clinic", role: "Research assistant" };
    const c = { ...blankApplication("general", null, 3), company: "Elsewhere", role: "Intern", applied: "2026-11-05" };
    let apps = saveApplication(saveApplication(saveApplication([], b), a), c);
    expect(appsIn(apps, "role-ux").map((x) => x.company)).toEqual(["Acme Health", "Bay Clinic"]);
    apps = saveApplication(apps, { ...a, status: "interviewing" });
    expect(apps).toHaveLength(3);
    expect(apps.find((x) => x.id === a.id)?.status).toBe("interviewing");
    expect(removeApplication(apps, a.id).map((x) => x.id)).toEqual([b.id, c.id]);
    expect(blankApplication("general", null, 4)).toMatchObject({ status: "saved", applied: "", link: "" });
  });
});

describe("job posting against a resume", () => {
  it("splits the posting's skills into on this resume, hers to add, and not yet", () => {
    expect(comparePosting(["Interviewing", "SQL", "Research writing", "interviewing"], ["interviewing"], ["Research writing", "Interviewing"])).toEqual({ on: ["Interviewing"], canAdd: ["Research writing"], missing: ["SQL"] });
  });
});

describe("verb-led bullets and page sections", () => {
  it("rewords a bullet to lead with a verb without adding anything", () => {
    expect(verbLed("Making drinks for the morning rush")).toBe("Made drinks for the morning rush");
    expect(verbLed("I tutored two kids in math.")).toBe("Tutored two kids in math");
    expect(verbLed("Organizing the spring food drive")).toBe("Organized the spring food drive");
    expect(verbLed("Studying how people use the library")).toBe("Studied how people use the library");
    expect(verbLed("Responsible for opening the store")).toBe("Opened the store");
    expect(verbLed("Responsible for the cash drawer")).toBe("Handled the cash drawer");
    expect(verbLed("Poster: how students choose study spaces")).toBe("Presented a poster on how students choose study spaces");
  });
  it("leaves bullets alone when they already lead with a verb or there's no honest rewording", () => {
    expect(verbLed("Led a team of four")).toBeNull();
    expect(verbLed("Great with people")).toBeNull();
    expect(verbLed("Morning shifts on weekends")).toBeNull();
    expect(verbLed("")).toBeNull();
  });
  it("sections hide per document and entries can move between them", () => {
    const doc = blankDoc("resume", "ux");
    expect(sectionHidden(doc, "summary")).toBe(false);
    const hidden = { ...doc, hiddenSections: toggleSection(doc, "summary") };
    expect(sectionHidden(hidden, "summary")).toBe(true);
    expect(toggleSection(hidden, "summary")).toEqual([]);
    expect(entrySection(doc, { id: "event-civic-hack", section: "experience" })).toBe("experience");
    expect(entrySection({ entrySections: { "event-civic-hack": "projects" } }, { id: "event-civic-hack", section: "experience" })).toBe("projects");
    // A new version keeps her choices without sharing them.
    const moved = { ...hidden, entrySections: { a: "projects" as const }, dismissedIdeas: ["x"] };
    const v = newVersion(moved, "ux", "UX researcher", [], 1);
    expect(v).toMatchObject({ hiddenSections: ["summary"], entrySections: { a: "projects" }, dismissedIdeas: ["x"] });
    expect(v.entrySections).not.toBe(moved.entrySections);
  });
});
