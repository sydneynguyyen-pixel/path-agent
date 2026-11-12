/**
 * Sprout's ideas for a resume. Deterministic and built only from her records: confirmed skills and where
 * they came from (class syllabi, events she went to, things she added), event outcomes, her own words,
 * her transcript and the career she's aiming at. No AI is connected here and nothing is sent.
 * Every idea says where it came from, and none adds a result, number or skill her records don't hold.
 * Pure helpers, tested in src/test/resume-suggest.test.ts.
 */
import type { EvidenceLevel } from "@/data/scenario";
import type { SkillProof } from "@/lib/portfolio";
import {
  article, bulletsFromEvent, bulletsFromWords, hasName, inline, outcomeBullet, startsWithAction, verbLed,
  type EntrySection, type ResumeDoc,
} from "@/lib/resume";

export type IdeaSection = "summary" | "education" | "experience" | "training" | "projects" | "skills";
export type IdeaKind = "summary" | "project" | "bullet" | "verb" | "skill" | "confirm" | "course" | "gap";

/** What "Use it" changes. Skills go on her resume by name; everything else is a change to this document. */
export type IdeaApply =
  | { type: "summary"; text: string }
  | { type: "bullets"; entryId: string; bullets: string[] }
  | { type: "section"; entryId: string; section: EntrySection }
  | { type: "courses"; codes: string[] }
  | { type: "skill"; name: string };

/** Ideas with no direct change point somewhere she acts herself. */
export type IdeaLink = { to: "skills"; label: string } | { to: "plan"; roleId: string; label: string };

export type Idea = {
  id: string;
  section: IdeaSection;
  kind: IdeaKind;
  title: string;
  /** The exact wording it would put on the page, when there is some. */
  detail?: string | undefined;
  /** The evidence: where this came from in her records. */
  why: string;
  apply: IdeaApply | null;
  link?: IdeaLink | undefined;
  /** The entry it belongs to, so its row can show it too. */
  entryId?: string | undefined;
};

/** What the record behind an entry holds. */
export type EntryRecord =
  | { type: "event"; title: string; host: string; kind: string; outcome?: string | undefined; skills: { name: string; level: string }[] }
  | { type: "activity"; title: string; did: string };

export type SuggestEntry = {
  id: string;
  /** Where it shows on this document now. */
  section: EntrySection;
  role: string;
  /** The bullets on the page now. */
  bullets: string[];
  hidden: boolean;
  record?: EntryRecord | undefined;
};

export type SuggestSkill = { name: string; level: EvidenceLevel; proofs: SkillProof[]; confirmed: boolean; hidden: boolean };

export type SuggestInput = {
  major: string;
  role: { id: string; title: string; why: string[]; missing: string[] } | null;
  /** Skills she's building toward the role (buildSkillsFor). */
  building: string[];
  /** Every skill with proof (usePortfolioSkills). */
  skills: SuggestSkill[];
  /** Skill names showing on this document. */
  onDoc: string[];
  /** The summary on the page now. */
  summary: string;
  entries: SuggestEntry[];
  /** Courses on her transcript (finished or in progress). */
  courses: { code: string; title: string }[];
  /** Course codes on the coursework line now. */
  onCourses: string[];
  /** Which course teaches which skill, from the syllabi. */
  courseSkills: { course: string; name: string }[];
};

const lower = (s: string) => s.toLowerCase();
const listOf = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0] ?? "");
const slug = (s: string) => lower(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const RANK: Record<string, number> = { Demonstrated: 3, Practiced: 2, Taught: 1 };
const roleLine = (title: string) => `${article(inline(title))} ${inline(title)} role`;

/** Where a skill's proof came from, as she'd recognise it: "ANTH 2's syllabus", "Civic Hack Weekend", "Corner Cafe (added by you)". */
export function proofLabel(p: SkillProof): string {
  if (p.type === "class") return `${p.code}'s syllabus`;
  if (p.type === "own") return `${p.title} (added by you)`;
  return p.title;
}

const proofShort = (p: SkillProof) => (p.type === "class" ? p.code : p.title);
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
/** Up to two places a skill came from, one class and one thing she did when she has both. */
const sourcesOf = (s: SuggestSkill): SkillProof[] => {
  const cls = s.proofs.find((p) => p.type === "class");
  const did = s.proofs.find((p) => p.type !== "class");
  return cls && did ? [cls, did] : s.proofs.slice(0, 2);
};
const fromLine = (s: SuggestSkill) => `From ${listOf(uniq(sourcesOf(s).map(proofLabel)))}`;

/** The skills this role asks for, in order: what it's known for first, then what she's building. */
const asksOf = (i: SuggestInput) => (i.role ? uniq([...i.role.why, ...i.building, ...i.role.missing]) : []);

/** Confirmed skills, strongest for this role first: the role's own list, then what it asks for, then by evidence level. */
export function strongestSkills(i: SuggestInput, n = 3): SuggestSkill[] {
  const why = i.role?.why.map(lower) ?? [];
  const asks = asksOf(i).map(lower);
  const at = (list: string[], s: SuggestSkill) => { const k = list.indexOf(lower(s.name)); return k < 0 ? 99 : k; };
  return i.skills
    .filter((s) => s.confirmed && !s.hidden && s.proofs.length > 0)
    .map((s, k) => ({ s, k }))
    .sort((a, b) => at(why, a.s) - at(why, b.s) || at(asks, a.s) - at(asks, b.s) || RANK[b.s.level]! - RANK[a.s.level]! || a.k - b.k)
    .slice(0, n)
    .map((x) => x.s);
}

/** A summary aimed at the role, naming her strongest confirmed skills and where each came from. Nothing more. */
export function roleSummary(i: SuggestInput): string | null {
  const top = strongestSkills(i);
  if (!top.length) return null;
  const kinds = uniq<string>(top.flatMap((s) => sourcesOf(s).map((p) => (p.type === "class" ? "coursework" : p.type === "event" ? "events" : "projects"))));
  const order = ["coursework", "events", "projects"].filter((k) => kinds.includes(k));
  const parts = top.map((s) => `${inline(s.name)} (${uniq(sourcesOf(s).map(proofShort)).join(", ")})`);
  const aim = i.role ? ` working toward ${roleLine(i.role.title)}` : "";
  return `${i.major} student${aim}. Skills from ${listOf(order)}: ${listOf(parts)}.`;
}

/** Every bullet the record supports for an entry, in order. */
function recordBullets(r: EntryRecord | undefined): string[] {
  if (!r) return [];
  return r.type === "event" ? bulletsFromEvent(r) : bulletsFromWords(r.did);
}

/** All of Sprout's ideas for this document, before the ones she said "Not now" to are taken out. */
export function suggestIdeas(i: SuggestInput): Idea[] {
  const out: Idea[] = [];
  const role = i.role;

  // Summary: aimed at the role, from her strongest confirmed skills and where they came from.
  const text = roleSummary(i);
  if (text && text.trim() !== i.summary.trim()) {
    const sources = uniq(strongestSkills(i).flatMap((s) => sourcesOf(s).map(proofLabel))).slice(0, 3);
    out.push({
      id: `summary:${role?.id ?? "general"}`,
      section: "summary",
      kind: "summary",
      title: role ? `A summary aimed at ${roleLine(role.title)}` : "A summary from your strongest skills",
      detail: text,
      why: `From skills you confirmed: ${listOf(sources)}`,
      apply: { type: "summary", text },
    });
  }

  for (const e of i.entries) {
    if (e.hidden) continue;
    const r = e.record;
    // A hackathon reads as a project: what she built, with the recorded result.
    if (r?.type === "event" && /hackathon/i.test(r.kind) && e.section !== "projects" && r.outcome) {
      out.push({
        id: `project:${e.id}`,
        section: "projects",
        kind: "project",
        title: `Show ${r.title} as a project`,
        detail: outcomeBullet(r.outcome),
        why: `From ${r.title}'s record: "${r.outcome}"`,
        apply: { type: "section", entryId: e.id, section: "projects" },
        entryId: e.id,
      });
    }
    // A bullet the record supports that isn't on the page.
    const missing = recordBullets(r).filter((b) => !e.bullets.some((x) => lower(x.trim()) === lower(b)));
    if (missing[0] && e.bullets.filter((b) => b.trim()).length < 4 && r) {
      const b = missing[0];
      out.push({
        id: `bullet:${e.id}:${slug(b)}`,
        section: e.section,
        kind: "bullet",
        title: `Add a bullet to ${e.role}`,
        detail: b,
        why: r.type === "event" ? (r.outcome && b === outcomeBullet(r.outcome) ? `From ${r.title}'s record: "${r.outcome}"` : `From ${r.title}'s listing: what you did there`) : `From what you wrote about ${r.title}`,
        apply: { type: "bullets", entryId: e.id, bullets: [...e.bullets.filter((x) => x.trim()), b] },
        entryId: e.id,
      });
    }
    // A bullet that doesn't lead with a verb, when it can be reworded without adding anything.
    e.bullets.forEach((b, k) => {
      if (!b.trim() || startsWithAction(b)) return;
      const led = verbLed(b);
      if (!led) return;
      out.push({
        id: `verb:${e.id}:${slug(b)}`,
        section: e.section,
        kind: "verb",
        title: `Lead with a verb in ${e.role}`,
        detail: led,
        why: `Your bullet "${b.trim()}" doesn't start with an action. Same words, verb first`,
        apply: { type: "bullets", entryId: e.id, bullets: e.bullets.map((x, n) => (n === k ? led : x)) },
        entryId: e.id,
      });
    });
  }

  // Courses this role is close to, from the syllabi, that aren't on the coursework line.
  if (role) {
    const asks = asksOf(i);
    for (const c of i.courses) {
      if (i.onCourses.includes(c.code)) continue;
      const taught = uniq(i.courseSkills.filter((x) => x.course === c.code && hasName(asks, x.name)).map((x) => x.name));
      if (!taught.length) continue;
      out.push({
        id: `course:${c.code}`,
        section: "education",
        kind: "course",
        title: `Add ${c.title} to your coursework`,
        why: `From ${c.code}'s syllabus: ${listOf(taught.map(inline))}, which ${inline(role.title)} roles ask for`,
        apply: { type: "courses", codes: [...i.onCourses, c.code] },
      });
    }
  }

  // Skills: confirmed ones the role asks for that aren't on this page; ones with proof she hasn't checked yet.
  const asks = asksOf(i);
  const visible = i.skills.filter((s) => !s.hidden && s.proofs.length > 0);
  if (role) {
    for (const s of visible) {
      if (!s.confirmed || hasName(i.onDoc, s.name) || !hasName(asks, s.name)) continue;
      out.push({ id: `skill:${slug(s.name)}`, section: "skills", kind: "skill", title: `Add ${s.name}`, why: `${role.title} roles ask for it. ${fromLine(s)}`, apply: { type: "skill", name: s.name } });
    }
  }
  const unchecked = visible
    .filter((s) => !s.confirmed && s.proofs.some((p) => p.type === "event" || p.type === "doing" || p.type === "own"))
    .sort((a, b) => Number(hasName(asks, b.name)) - Number(hasName(asks, a.name)));
  for (const s of unchecked.slice(0, Math.max(3, unchecked.filter((x) => hasName(asks, x.name)).length))) {
    out.push({
      id: `confirm:${slug(s.name)}`,
      section: "skills",
      kind: "confirm",
      title: `Check ${s.name} on Your skills first`,
      why: `${fromLine({ ...s, proofs: s.proofs.some((p) => p.type !== "class") ? s.proofs.filter((p) => p.type !== "class") : s.proofs })}. It goes on a resume once you've checked it`,
      apply: null,
      link: { to: "skills", label: "Check it on Your skills" },
    });
  }

  // Gaps: what the role asks for that her records hold no proof of yet. One line, no score.
  if (role) {
    const gaps = asks.filter((n) => !i.skills.some((s) => lower(s.name) === lower(n) && s.proofs.length > 0));
    if (gaps.length) {
      out.push({
        id: `gap:${role.id}`,
        section: "skills",
        kind: "gap",
        title: `Not yet: ${listOf(gaps.map(inline))}`,
        why: `${role.title} roles ask for ${gaps.length > 1 ? "these" : "it"}. Nothing in your records shows ${gaps.length > 1 ? "them" : "it"} yet`,
        apply: null,
        link: { to: "plan", roleId: role.id, label: `Plan toward ${roleLine(role.title)}` },
      });
    }
  }

  return out;
}

/** The ideas for this document: everything Sprout found, minus the ones she said "Not now" to. */
export const ideasFor = (i: SuggestInput, doc: Pick<ResumeDoc, "dismissedIdeas">): Idea[] => {
  const no = new Set(doc.dismissedIdeas ?? []);
  return suggestIdeas(i).filter((x) => !no.has(x.id));
};

/** "Not now": remembered on this document only. */
export const dismissIdea = (doc: Pick<ResumeDoc, "dismissedIdeas">, id: string): string[] => uniq([...(doc.dismissedIdeas ?? []), id]);

/** The change to this document that "Use it" makes. Skills are added to her resume separately, by name. */
export function applyIdea(doc: ResumeDoc, a: IdeaApply): { patch: Partial<ResumeDoc>; addSkill?: string | undefined; block: string } {
  switch (a.type) {
    case "summary":
      return { patch: { summary: a.text, hiddenSections: (doc.hiddenSections ?? []).filter((s) => s !== "summary") }, block: "summary" };
    case "bullets":
      return { patch: { bullets: { ...doc.bullets, [a.entryId]: a.bullets } }, block: `entry:${a.entryId}` };
    case "section":
      return {
        patch: { entrySections: { ...doc.entrySections, [a.entryId]: a.section }, ...(a.section !== "experience" ? { hiddenSections: (doc.hiddenSections ?? []).filter((s) => s !== a.section) } : {}) },
        block: `entry:${a.entryId}`,
      };
    case "courses":
      return { patch: { courses: a.codes }, block: "education" };
    case "skill":
      return { patch: hasName(doc.hiddenSkills, a.name) ? { hiddenSkills: doc.hiddenSkills.filter((x) => lower(x) !== lower(a.name)) } : {}, addSkill: a.name, block: "skills" };
  }
}

export const SECTION_ORDER: IdeaSection[] = ["summary", "education", "experience", "training", "projects", "skills"];
export const IDEA_SECTION_LABEL: Record<IdeaSection, string> = { summary: "Summary", education: "Education", experience: "Experience", training: "Training & events", projects: "Projects", skills: "Skills" };

/** Ideas grouped by section, in page order. */
export function groupIdeas(ideas: Idea[]): { section: IdeaSection; ideas: Idea[] }[] {
  return SECTION_ORDER.map((section) => ({ section, ideas: ideas.filter((x) => x.section === section) })).filter((g) => g.ideas.length);
}
