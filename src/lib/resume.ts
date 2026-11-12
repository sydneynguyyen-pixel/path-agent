/**
 * Resumes, CVs and cover letters. Every document is a draft she edits; nothing here sends or submits.
 * Pure helpers, tested in src/test/resume.test.ts.
 */

export type DocKind = "resume" | "cv" | "cover";

export const KIND_LABEL: Record<DocKind, string> = { resume: "Resume", cv: "CV", cover: "Cover letter" };

export type ResumeProject = { id: string; title: string; text: string };

/** One draft. Text left null follows what the app knows (suggested wording); once she types, it's hers. */
export type ResumeDoc = {
  id: string;
  kind: DocKind;
  /** The career this version is for. Null is the general one. */
  roleId: string | null;
  title: string;
  /** A line under her name, like "Aspiring UX researcher". */
  headline: string | null;
  summary: string | null;
  /** Cover letters only: the letter body. */
  letter: string | null;
  /** Experience entries she took off this document (activity or event ids). */
  hiddenExperience: string[];
  /** Skills she took off this document only (names). */
  hiddenSkills: string[];
  projects: ResumeProject[];
  showProjects: boolean;
  /** The doc she made this one from with "New version". */
  copiedFrom?: string | undefined;
};

export const docId = (kind: DocKind, roleId: string | null) => `${kind}-${roleId ?? "general"}`;

const lower = (s: string) => s.toLowerCase();
/** A title mid-sentence: "Policy analyst" → "policy analyst", but "UX researcher" stays. */
/** "a" or "an" before a word ("a UX researcher", "an archivist"). */
export const article = (w: string) => (/^[aeio]/i.test(w) || /^u[a-z]/.test(w) ? "an" : "a");
export const inline = (t: string) => (/^[A-Z][A-Z]/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));

/** A blank draft. Text sections follow the suggested wording from her real data until she edits them. */
export function blankDoc(kind: DocKind, roleId: string | null, roleTitle?: string): ResumeDoc {
  const label = KIND_LABEL[kind];
  return {
    id: docId(kind, roleId),
    kind,
    roleId,
    title: roleTitle ? `${label} · ${roleTitle}` : kind === "cv" ? "General CV" : `General ${label.toLowerCase()}`,
    headline: null,
    summary: null,
    letter: null,
    hiddenExperience: [],
    hiddenSkills: [],
    projects: [],
    showProjects: false,
  };
}

type RoleLike = { id: string; title: string };

/**
 * The library: for each goal (main first) a resume and a cover letter, then one general CV.
 * With no goals, a general resume and CV. Drafts she saved replace the defaults with the same id,
 * and versions she made stay after the one they came from.
 */
export function libraryDocs(goals: RoleLike[], saved: ResumeDoc[]): ResumeDoc[] {
  const defaults: ResumeDoc[] = goals.length
    ? [...goals.flatMap((g) => [blankDoc("resume", g.id, g.title), blankDoc("cover", g.id, g.title)]), blankDoc("cv", null)]
    : [blankDoc("resume", null), blankDoc("cv", null)];
  const byId = new Map(saved.map((d) => [d.id, d]));
  const out = defaults.map((d) => byId.get(d.id) ?? d);
  const ids = new Set(out.map((d) => d.id));
  for (const d of saved) if (!ids.has(d.id)) out.push(d);
  return out;
}

/** Groups the library by career (in goal order), with general documents last. */
export function groupDocs(docs: ResumeDoc[], goalIds: string[]): { roleId: string | null; docs: ResumeDoc[] }[] {
  const order = [...goalIds, ...docs.map((d) => d.roleId).filter((r): r is string => !!r && !goalIds.includes(r))];
  const groups = [...new Set(order)].map((roleId) => ({ roleId: roleId as string | null, docs: docs.filter((d) => d.roleId === roleId) })).filter((g) => g.docs.length);
  const general = docs.filter((d) => d.roleId === null);
  return general.length ? [...groups, { roleId: null, docs: general }] : groups;
}

/** A copy of a draft for another career (or the same one), with a fresh id. */
export function newVersion(doc: ResumeDoc, roleId: string | null, roleTitle: string | undefined, taken: string[], stamp: number): ResumeDoc {
  const base = `${doc.kind}-${roleId ?? "general"}-v`;
  let n = 2;
  while (taken.includes(`${base}${n}`) || taken.includes(`${base}${n}-${stamp}`)) n++;
  const label = KIND_LABEL[doc.kind];
  return {
    ...doc,
    id: `${base}${n}-${stamp}`,
    roleId,
    title: `${roleTitle ? `${label} · ${roleTitle}` : `General ${label.toLowerCase()}`} (v${n})`,
    // The letter and headline were written for the old career; a new one starts from the template again.
    letter: roleId === doc.roleId ? doc.letter : null,
    headline: roleId === doc.roleId ? doc.headline : null,
    summary: roleId === doc.roleId ? doc.summary : null,
    hiddenSkills: [...doc.hiddenSkills],
    hiddenExperience: [...doc.hiddenExperience],
    projects: doc.projects.map((p) => ({ ...p })),
    copiedFrom: doc.id,
  };
}

/** Upsert by id. */
export const saveDoc = (docs: ResumeDoc[], doc: ResumeDoc): ResumeDoc[] =>
  docs.some((d) => d.id === doc.id) ? docs.map((d) => (d.id === doc.id ? doc : d)) : [...docs, doc];

export const removeDoc = (docs: ResumeDoc[], id: string): ResumeDoc[] => docs.filter((d) => d.id !== id);

/** Adds a name once (case-insensitive). */
export function addName(list: string[], name: string): string[] {
  const n = name.trim();
  if (!n || list.some((x) => lower(x) === lower(n))) return list;
  return [...list, n];
}

export const dropName = (list: string[], name: string): string[] => list.filter((x) => lower(x) !== lower(name.trim()));

export const hasName = (list: string[], name: string) => list.some((x) => lower(x) === lower(name));

type SkillLike = { name: string; confirmed: boolean; hidden?: boolean };

/** Confirmed skills that aren't on her resume yet and that she didn't take off. */
export function pendingSkills(skills: SkillLike[], onResume: string[], dismissed: string[]): string[] {
  return skills.filter((s) => s.confirmed && !s.hidden && !hasName(onResume, s.name) && !hasName(dismissed, s.name)).map((s) => s.name);
}

export type ResumeSkillSync = { resumeSkills: string[]; resumeNew: string[]; seeded: boolean };

/**
 * What the Resume tab does with confirmed skills. The first time, everything she already confirmed goes on
 * quietly. After that, with auto-add on, each newly confirmed skill is added and marked new; with it off,
 * nothing changes and pendingSkills lists them as ready to add.
 */
export function syncResumeSkills(
  st: { resumeSkills: string[]; resumeNew: string[]; resumeDismissed: string[]; resumeSeeded: boolean; autoAddSkills: boolean },
  skills: SkillLike[],
): ResumeSkillSync {
  const pending = pendingSkills(skills, st.resumeSkills, st.resumeDismissed);
  if (!st.resumeSeeded) return { resumeSkills: pending.reduce(addName, st.resumeSkills), resumeNew: st.resumeNew, seeded: true };
  if (!st.autoAddSkills || !pending.length) return { resumeSkills: st.resumeSkills, resumeNew: st.resumeNew, seeded: true };
  return { resumeSkills: pending.reduce(addName, st.resumeSkills), resumeNew: pending.reduce(addName, st.resumeNew), seeded: true };
}

/**
 * Skills for one document: the ones this career asks for first (in the role's order), then the rest.
 * The general document keeps her order. Skills she took off this document are left out.
 */
export function skillsForDoc(resumeSkills: string[], roleAsks: string[], hidden: string[] = []): { asked: string[]; other: string[] } {
  const shown = resumeSkills.filter((s) => !hasName(hidden, s));
  const asked = roleAsks.flatMap((a) => shown.find((s) => lower(s) === lower(a)) ?? []);
  return { asked: [...new Set(asked)], other: shown.filter((s) => !hasName(asked, s)) };
}

/** The skills a career asks for: what she already has for it, then what she's building. */
export const roleAsks = (role: { why: string[] }, building: string[]): string[] => [...new Set([...role.why, ...building])];

/** A cover letter template from the career and her real skills. A draft for her to rewrite. */
export function coverTemplate(o: { name: string; roleTitle: string | null; school: string; major: string; skills: string[]; experience: string[] }): string {
  const role = o.roleTitle ? `${article(inline(o.roleTitle))} ${inline(o.roleTitle)} role` : "this role";
  const skills = o.skills.slice(0, 3).map(inline);
  const skillLine = skills.length
    ? `In my classes and activities I've built ${skills.length > 1 ? `${skills.slice(0, -1).join(", ")} and ${skills.at(-1)}` : skills[0]}.`
    : "[Add a skill or two you can point to proof for.]";
  const exp = o.experience[0] ? `Most recently, ${o.experience[0]}.` : "[Add one thing you did that shows how you work.]";
  return [
    "Dear [hiring manager's name],",
    "",
    `I'm ${o.name}, a ${o.major} student at ${o.school}, and I'm applying for ${role} at [organization].`,
    "",
    `${skillLine} ${exp}`,
    "",
    "[One sentence on why this organization in particular.]",
    "",
    "Thank you for your time. I'd welcome the chance to talk.",
    "",
    "Sincerely,",
    o.name,
  ].join("\n");
}

export const docFileName = (doc: ResumeDoc, name: string) =>
  `${name.split(" ")[0]!.toLowerCase()}-${doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.txt`;

/** One line about something she did, in her words where she gave them. */
export function experiencePhrase(a: { title: string; role?: string | undefined; kind: string }): string {
  if (a.role) return `I worked as ${article(inline(a.role))} ${inline(a.role)} with ${a.title}`;
  // "Caring for my brother", "Tutoring at the library": the title already reads as what she does.
  if (/^\w+ing\b/i.test(a.title)) return `I've been ${a.title.charAt(0).toLowerCase()}${a.title.slice(1)}`;
  return `I've been part of ${a.title}`;
}

/** A suggested headline: the career this version is for, or her major. */
export const suggestedHeadline = (roleTitle: string | null, major: string) => (roleTitle ? `Aspiring ${inline(roleTitle)} · ${major} student` : `${major} student`);

/** A suggested summary from her real skills. No claims beyond them. */
export function suggestedSummary(o: { major: string; roleTitle: string | null; skills: string[] }): string {
  const sk = o.skills.slice(0, 3).map(inline);
  const list = sk.length > 1 ? `${sk.slice(0, -1).join(", ")} and ${sk.at(-1)}` : sk[0];
  const aim = o.roleTitle ? ` working toward ${article(inline(o.roleTitle))} ${inline(o.roleTitle)} role` : "";
  return `${o.major} student${aim}.${list ? ` Skills with proof from class and practice: ${list}.` : ""}`;
}
