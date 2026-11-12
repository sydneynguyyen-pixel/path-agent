import { describe, expect, it } from "vitest";
import { experiences, gapSkills, ledgerSkills, terms } from "@/data/scenario";
import { fromAccounts, skillsFromEvents } from "@/lib/experiences";
import { portfolioSkills } from "@/lib/portfolio";
import { blankDoc, bulletsFromEvent, type EntrySection } from "@/lib/resume";
import { guessJob, listDiff, mergeDecisions, numbersIn, postingAsks, sameSkill, sectionLines, tailor, type TailorInput } from "@/lib/tailor";

const TODAY = "2026-11-08";
const found = fromAccounts(experiences, ["luma", "eventbrite", "handshake"]);
const went = found.filter((e) => e.date < TODAY && e.proof === "checked-in");
const transcript = terms.filter((t) => t.school === "bayview" && (t.status === "done" || t.status === "in_progress")).flatMap((t) => t.courses.map((c) => ({ code: c.code, title: c.title })));

const POSTING = `UX Research Intern
Company: Harbor Health

We're looking for a UX research intern to join our patient experience team. You will plan and run usability tests,
interview patients and clinic staff, and help prototype new check-in flows. Experience with survey design and
qualitative observation is a plus. Strong research writing and SQL are nice to have. 12-week paid internship, 20 hours a week.`;

function input(o: { reviews?: Record<string, { confirmed: boolean }>; docSkills?: string[]; onCourses?: string[]; posting?: string; hidden?: string[] } = {}): TailorInput {
  const reviews = o.reviews ?? { observation: { confirmed: true }, "research-writing": { confirmed: true } };
  const skills = portfolioSkills(ledgerSkills, skillsFromEvents(found, TODAY, {}), [], reviews, []);
  const entries = went.map((e) => {
    const section: EntrySection = e.role !== "Attended" ? "experience" : "training";
    return { id: `event-${e.id}`, section, home: section, role: e.role !== "Attended" ? `${e.kind} participant` : e.title, bullets: bulletsFromEvent(e), hidden: !!o.hidden?.includes(`event-${e.id}`), skills: e.skills.map((s) => s.name), record: { type: "event" as const, title: e.title, host: e.host, kind: e.kind, outcome: e.outcome, skills: e.skills } };
  });
  return {
    posting: o.posting ?? POSTING,
    company: "Harbor Health",
    title: "UX Research Intern",
    major: "Psychology",
    skills,
    docSkills: o.docSkills ?? ["Research writing", "Qualitative observation"],
    summary: "Psychology student working toward a UX researcher role.",
    entries,
    courses: transcript,
    onCourses: o.onCourses ?? ["PSYC 1", "SOC 1", "COMM 1"],
    courseSkills: [...ledgerSkills, ...gapSkills].map((x) => ({ course: x.course, name: x.name })),
    doc: { ...blankDoc("resume", "ux", "UX researcher"), hiddenExperience: o.hidden ?? [] },
  };
}
const ok = (i: TailorInput) => { const t = tailor(i); if (t.kind !== "ok") throw new Error(t.kind); return t; };
const change = (i: TailorInput, s: string) => ok(i).changes.find((c) => c.section === s)!;

describe("tailoring a resume to a posting", () => {
  it("is deterministic", () => {
    expect(tailor(input())).toEqual(tailor(input()));
  });

  it("reads what the posting asks for, in the order it says it", () => {
    const asks = postingAsks(POSTING, ["Qualitative observation", "Research writing"]);
    expect(asks.slice(0, 4)).toEqual(["UX research methods", "Usability testing", "Interviewing", "Prototyping"]);
    expect(asks).toContain("SQL");
    expect(sameSkill("Interviewing", "User interviews")).toBe(true);
    expect(sameSkill("Survey design", "Survey interpretation")).toBe(false);
  });

  it("puts the skills the posting asks for first, and only adds ones she confirmed", () => {
    const i = input({ reviews: { observation: { confirmed: true }, "research-writing": { confirmed: true }, interviewing: { confirmed: true }, "interview-basics": { confirmed: true }, "event-user-interviews": { confirmed: true } } });
    const skills = change(i, "skills");
    const order = skills.patch.skillOrder!;
    expect(order.slice(0, 3)).toEqual(["Interviewing", "Qualitative observation", "Research writing"]);
    expect(skills.line).toBe("Skills: added Interviewing — you confirmed it, and the posting asks for interviewing");
    expect(skills.notes).toContain("Moved Qualitative observation up — the posting asks for it");
    // Prototyping and Usability testing come from a syllabus she hasn't checked: never added.
    expect(order).not.toContain("Prototyping");
    expect(order).not.toContain("Usability testing");
  });

  it("lists unconfirmed skills to check, and gaps to plan toward", () => {
    const t = ok(input());
    expect(t.unconfirmed.map((x) => x.name)).toEqual(["Interviewing", "Prototyping"]);
    expect(t.unconfirmed.find((x) => x.name === "Interviewing")!.from).toMatch(/ANTH 2's syllabus|Civic Hack Weekend/);
    expect(t.gaps).toEqual(expect.arrayContaining(["Usability testing", "SQL"]));
    expect(change(input(), "skills").patch.skillOrder ?? []).not.toContain("Interviewing");
  });

  it("shows the hackathon as a project because it shows what the posting asks for", () => {
    const exp = change(input(), "experience");
    expect(exp.line).toMatch(/^Experience: added Civic Hack Weekend as a project — it shows (interviewing|prototyping)$/);
    expect(exp.patch.entrySections).toEqual({ "event-civic-hack": "projects" });
    const after = sectionLines("experience", input(), { ...input().doc, ...exp.patch });
    expect(after).toContain("Civic Hack Weekend · Projects");
    // An entry she ticked off comes back when it shows a skill the posting asks for.
    const hidden = input({ hidden: ["event-civic-hack"] });
    expect(change(hidden, "experience").notes).toContain("Brought back Hackathon participant — it shows interviewing");
  });

  it("adds courses whose syllabus covers what the posting asks for", () => {
    const edu = change(input(), "education");
    expect(edu.notes).toContain("Added Cultural Anthropology to coursework — its syllabus covers qualitative observation and interviewing");
    expect(edu.patch.courses).toEqual(expect.arrayContaining(["PSYC 1", "SOC 1", "COMM 1", "ANTH 2"]));
  });

  it("aims the summary at the posting's title from confirmed skills, with no numbers or claims her records don't hold", () => {
    const sum = change(input(), "summary");
    expect(sum.patch.summary).toMatch(/^Psychology student applying for a UX Research Intern role at Harbor Health\. Skills from coursework/);
    expect(sum.line).toBe("Summary: aimed it at the UX Research Intern role at Harbor Health — the posting's title");
    const t = ok(input());
    const all = [...t.changes.flatMap((c) => [c.line, ...c.notes, JSON.stringify(c.patch)]), ...t.unconfirmed.map((x) => x.from)].join("\n");
    const records = JSON.stringify([input().entries, transcript, ledgerSkills, gapSkills, found]);
    for (const n of numbersIn(all)) expect(records).toContain(n);
    // The posting's own numbers (12-week, 20 hours) never leak onto her resume.
    expect(all).not.toMatch(/\b12\b|\b20 hours/);
    expect(all).not.toMatch(/%|score|match/i);
  });

  it("is honest about links and short text", () => {
    expect(tailor(input({ posting: "https://jobs.example/ux-intern" })).kind).toBe("link");
    expect(tailor(input({ posting: "UX intern" })).kind).toBe("short");
  });

  it("guesses title and company only when the posting says them plainly", () => {
    expect(guessJob(POSTING)).toEqual({ title: "UX Research Intern", company: "Harbor Health" });
    expect(guessJob("We are hiring a Research Assistant at Bay Clinic. You will help with interviews.")).toEqual({ title: "Research Assistant", company: "Bay Clinic" });
    expect(guessJob("you will help with things and stuff for a while.")).toEqual({ title: "", company: "" });
  });

  it("merges her decisions: accept takes the change, keep takes nothing, edit takes hers", () => {
    const i = input();
    const t = ok(i);
    const merged = mergeDecisions(t.changes, { summary: { kind: "edit", patch: { summary: "Mine." } }, skills: { kind: "keep" }, experience: { kind: "accept" } }, i.doc);
    expect(merged.summary).toBe("Mine.");
    expect(merged.skillOrder).toBeUndefined();
    expect(merged.courses).toBeUndefined();
    expect(merged.entrySections).toEqual({ "event-civic-hack": "projects" });
  });

  it("diffs lists: added, moved up, and removed at the end", () => {
    expect(listDiff(["a", "b", "c"], ["c", "a", "d"])).toEqual([
      { text: "c", change: "moved" }, { text: "a", change: "same" }, { text: "d", change: "added" }, { text: "b", change: "removed" },
    ]);
  });
});
