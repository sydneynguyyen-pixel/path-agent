import { describe, expect, it } from "vitest";
import { careerRoles, experiences, gapSkills, ledgerSkills, terms } from "@/data/scenario";
import { fromAccounts, skillsFromEvents } from "@/lib/experiences";
import { ownProofs, type Activity } from "@/lib/activities";
import { portfolioSkills } from "@/lib/portfolio";
import { blankDoc, bulletsFromEvent, bulletsFromWords, type EntrySection } from "@/lib/resume";
import { applyIdea, dismissIdea, groupIdeas, ideasFor, roleSummary, suggestIdeas, type SuggestInput } from "@/lib/resumeSuggest";

const TODAY = "2026-11-08";
const ux = careerRoles.find((r) => r.id === "ux")!;
const found = fromAccounts(experiences, ["luma", "eventbrite", "handshake"]);
const went = found.filter((e) => e.date < TODAY && e.proof === "checked-in");
const cafe: Activity = { id: "act-cafe", title: "Corner Cafe", kind: "job", role: "Barista", when: "Since Jan 2026", did: "Making drinks for the morning rush. I trained two new baristas.", skills: ["Customer communication"] };
const transcript = terms.filter((t) => t.school === "bayview" && (t.status === "done" || t.status === "in_progress")).flatMap((t) => t.courses.map((c) => ({ code: c.code, title: c.title })));

/** Her real records: the syllabi, events she checked in to, one thing she added, and what she confirmed. */
function input(o: { reviews?: Record<string, { confirmed: boolean }>; onDoc?: string[]; onCourses?: string[]; summary?: string; bullets?: Record<string, string[]>; sections?: Record<string, EntrySection>; role?: typeof ux | null } = {}): SuggestInput {
  const reviews = o.reviews ?? { observation: { confirmed: true } };
  const skills = portfolioSkills(ledgerSkills, skillsFromEvents(found, TODAY, {}), [], reviews, ownProofs([cafe], []));
  const eventEntries = went.map((e) => {
    const took = e.role !== "Attended";
    const section: EntrySection = took ? "experience" : "training";
    const suggested = took ? bulletsFromEvent(e) : bulletsFromEvent(e).slice(0, 1);
    return { id: `event-${e.id}`, section: o.sections?.[`event-${e.id}`] ?? section, role: e.title, bullets: o.bullets?.[`event-${e.id}`] ?? suggested, hidden: false, record: { type: "event" as const, title: e.title, host: e.host, kind: e.kind, outcome: e.outcome, skills: e.skills } };
  });
  const role = o.role === undefined ? ux : o.role;
  return {
    major: "Psychology",
    role,
    building: role ? role.missing : [],
    skills,
    onDoc: o.onDoc ?? ["Qualitative observation"],
    summary: o.summary ?? "",
    entries: [
      { id: cafe.id, section: "experience", role: "Barista", bullets: o.bullets?.[cafe.id] ?? bulletsFromWords(cafe.did), hidden: false, record: { type: "activity", title: cafe.title, did: cafe.did } },
      ...eventEntries,
    ],
    courses: transcript,
    onCourses: o.onCourses ?? ["PSYC 1", "PSYC 2", "SOC 1", "COMM 1", "ANTH 2", "ART 1"],
    courseSkills: [...ledgerSkills, ...gapSkills].map((x) => ({ course: x.course, name: x.name })),
  };
}

describe("Sprout's resume ideas", () => {
  it("are deterministic: the same records give the same ideas", () => {
    expect(suggestIdeas(input())).toEqual(suggestIdeas(input()));
  });

  it("writes a summary aimed at the role from confirmed skills only, the role's own skills first, saying where each came from", () => {
    const text = roleSummary(input({ reviews: { observation: { confirmed: true }, culture: { confirmed: true }, interviewing: { confirmed: true }, "interview-basics": { confirmed: true }, "event-user-interviews": { confirmed: true } } }))!;
    expect(text).toMatch(/^Psychology student working toward a UX researcher role\./);
    // Qualitative observation and interviewing are what UX researchers are known for; they lead.
    expect(text.indexOf("qualitative observation")).toBeLessThan(text.indexOf("cultural analysis"));
    expect(text.indexOf("interviewing")).toBeLessThan(text.indexOf("cultural analysis"));
    expect(text).toContain("ANTH 2");
    expect(text).toContain("Civic Hack Weekend");
    expect(text).toMatch(/coursework and events/);
    // Nothing she hasn't confirmed, and no achievements.
    expect(text).not.toMatch(/prototyping|research writing|placed|award/i);
    const idea = suggestIdeas(input()).find((x) => x.kind === "summary")!;
    expect(idea.why).toBe("From skills you confirmed: ANTH 2's syllabus and Corner Cafe (added by you)");
    expect(idea.detail).toBe("Psychology student working toward a UX researcher role. Skills from coursework and projects: qualitative observation (ANTH 2) and customer communication (Corner Cafe).");
    expect(applyIdea(blankDoc("resume", "ux"), idea.apply!).patch.summary).toBe(idea.detail);
  });

  it("offers no summary when hers already says the same, and none with no confirmed skills", () => {
    const text = roleSummary(input())!;
    expect(suggestIdeas(input({ summary: text })).some((x) => x.kind === "summary")).toBe(false);
    expect(roleSummary(input({ reviews: {} }))?.includes("Customer communication".toLowerCase())).toBe(true);
    expect(suggestIdeas(input({ reviews: { "own:act-cafe:customer communication": { confirmed: false } } })).some((x) => x.kind === "summary")).toBe(false);
  });

  it("turns the hackathon into a project from its recorded outcome, and moving it is the whole change", () => {
    const idea = suggestIdeas(input()).find((x) => x.kind === "project")!;
    expect(idea).toMatchObject({ section: "projects", title: "Show Civic Hack Weekend as a project", detail: "Placed 2nd as a team with a map of food pantry hours" });
    expect(idea.why).toBe('From Civic Hack Weekend\'s record: "Team placed 2nd with a map of food pantry hours"');
    const { patch, block } = applyIdea(blankDoc("resume", "ux"), idea.apply!);
    expect(patch.entrySections).toEqual({ "event-civic-hack": "projects" });
    expect(block).toBe("entry:event-civic-hack");
    // Once it's there, the idea is done.
    expect(suggestIdeas(input({ sections: { "event-civic-hack": "projects" } })).some((x) => x.kind === "project")).toBe(false);
  });

  it("adds back a bullet the record supports, and only those", () => {
    const ideas = suggestIdeas(input({ bullets: { "event-civic-hack": ["Applied user interviews and prototyping"] } }));
    const add = ideas.find((x) => x.kind === "bullet" && x.entryId === "event-civic-hack")!;
    expect(add.detail).toBe("Placed 2nd as a team with a map of food pantry hours");
    expect(add.apply).toEqual({ type: "bullets", entryId: "event-civic-hack", bullets: ["Applied user interviews and prototyping", "Placed 2nd as a team with a map of food pantry hours"] });
    for (const x of ideas.filter((i) => i.kind === "bullet")) {
      const e = input().entries.find((en) => en.id === x.entryId)!;
      const supported = e.record?.type === "event" ? bulletsFromEvent(e.record) : bulletsFromWords(e.record!.did);
      expect(supported).toContain(x.detail);
    }
  });

  it("offers a verb-led version of a bullet that doesn't start with an action, and only when it can reword honestly", () => {
    const ideas = suggestIdeas(input()).filter((x) => x.kind === "verb");
    expect(ideas.map((x) => x.detail)).toEqual(["Made drinks for the morning rush", "Trained two new baristas"]);
    expect(ideas[0]!.apply).toEqual({ type: "bullets", entryId: "act-cafe", bullets: ["Made drinks for the morning rush", "I trained two new baristas"] });
    expect(suggestIdeas(input({ bullets: { "act-cafe": ["Great with people"] } })).some((x) => x.kind === "verb")).toBe(false);
  });

  it("suggests confirmed skills the role asks for, and points unconfirmed ones to Your skills without adding them", () => {
    const ideas = suggestIdeas(input({ onDoc: [] }));
    const add = ideas.filter((x) => x.kind === "skill");
    expect(add.map((x) => x.title)).toEqual(["Add Qualitative observation"]);
    expect(add[0]!.why).toBe("UX researcher roles ask for it. From ANTH 2's syllabus");
    const check = ideas.filter((x) => x.kind === "confirm");
    expect(check[0]).toMatchObject({ title: "Check Interviewing on Your skills first", apply: null, link: { to: "skills" } });
    expect(check[0]!.why).toMatch(/^From Civic Hack Weekend\./);
  });

  it("never adds an unconfirmed skill directly", () => {
    for (const reviews of [{}, { observation: { confirmed: true } }, { interviewing: { confirmed: true } }]) {
      const i = input({ reviews, onDoc: [] });
      const confirmed = i.skills.filter((s) => s.confirmed).map((s) => s.name.toLowerCase());
      for (const x of suggestIdeas(i)) if (x.apply?.type === "skill") expect(confirmed).toContain(x.apply.name.toLowerCase());
      for (const x of suggestIdeas(i).filter((y) => y.kind === "confirm")) expect(x.apply).toBeNull();
    }
  });

  it("suggests a course whose syllabus teaches what the role asks for, if it isn't on the coursework line", () => {
    const course = suggestIdeas(input({ onCourses: ["PSYC 1"] })).filter((x) => x.kind === "course");
    expect(course.map((x) => x.title)).toEqual(["Add Cultural Anthropology to your coursework"]);
    expect(course[0]!.why).toBe("From ANTH 2's syllabus: qualitative observation and interviewing, which UX researcher roles ask for");
    expect(course[0]!.apply).toEqual({ type: "courses", codes: ["PSYC 1", "ANTH 2"] });
    expect(suggestIdeas(input()).some((x) => x.kind === "course")).toBe(false);
  });

  it("names the role's gaps once, pointing to Plan, with no score", () => {
    const gaps = suggestIdeas(input()).filter((x) => x.kind === "gap");
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ title: "Not yet: usability testing and survey design", apply: null, link: { to: "plan", roleId: "ux", label: "Plan toward a UX researcher role" } });
    expect(suggestIdeas(input({ role: null })).some((x) => x.kind === "gap" || x.kind === "skill" || x.kind === "course")).toBe(false);
  });

  it("no idea holds a number that isn't in her records, and none is a score", () => {
    const variants = [input(), input({ onDoc: [], onCourses: [] }), input({ reviews: {} }), input({ role: careerRoles[1]! }), input({ bullets: { "event-civic-hack": [] } })];
    for (const v of variants) {
      const records = JSON.stringify(v);
      for (const x of suggestIdeas(v)) {
        const text = [x.title, x.detail ?? "", x.why].join(" ");
        for (const n of text.match(/\d+(?:\.\d+)?/g) ?? []) expect(records, `"${n}" in "${text}"`).toContain(n);
        expect(text).not.toMatch(/%|percent|score|rank|match/i);
      }
    }
  });

  it("Not now is remembered per document; ideas group in page order", () => {
    const all = suggestIdeas(input());
    const doc = { ...blankDoc("resume", "ux"), dismissedIdeas: dismissIdea(blankDoc("resume", "ux"), all[0]!.id) };
    expect(dismissIdea(doc, all[0]!.id)).toEqual([all[0]!.id]);
    expect(ideasFor(input(), doc).map((x) => x.id)).not.toContain(all[0]!.id);
    expect(ideasFor(input(), blankDoc("resume", "policy"))).toHaveLength(all.length);
    expect(groupIdeas(all).map((g) => g.section)).toEqual(["summary", "experience", "projects", "skills"]);
  });

  it("a skill idea un-hides it on this document and adds it by name", () => {
    const doc = { ...blankDoc("resume", "ux"), hiddenSkills: ["Qualitative observation"] };
    expect(applyIdea(doc, { type: "skill", name: "Qualitative observation" })).toEqual({ patch: { hiddenSkills: [] }, addSkill: "Qualitative observation", block: "skills" });
  });
});
