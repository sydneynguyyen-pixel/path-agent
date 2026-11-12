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
  /** Look of the page (Style tab). Missing means Modern with the first accent. */
  template?: ResumeTemplate | undefined;
  accent?: string | undefined;
  /** Bullets she edited, per experience entry id. An entry without a key shows the suggested bullets. */
  bullets?: Record<string, string[]> | undefined;
  /** Course codes on the coursework line. Null or missing shows the suggested courses. */
  courses?: string[] | null | undefined;
  /** A job posting she pasted on the Job tab. Only read here, never fetched or sent. */
  posting?: string | undefined;
  /** A folder she made for one specific job. Missing means the folder for its career (or General). */
  folder?: string | undefined;
  /** Sections she hid on this page with the eye toggle. Missing means all show. */
  hiddenSections?: HideableSection[] | undefined;
  /** Entries she moved to another section (like a hackathon under Projects), by entry id. */
  entrySections?: Record<string, EntrySection> | undefined;
  /** Sprout's ideas she said "Not now" to on this document. */
  dismissedIdeas?: string[] | undefined;
};

/** Where an experience entry sits on the page. Things she did and events where she took part go under Experience. */
export type EntrySection = "experience" | "training" | "projects";
/** Sections with a show/hide toggle. Header, Education and Skills always show. */
export type HideableSection = "summary" | "projects" | "training";

export const sectionHidden = (doc: Pick<ResumeDoc, "hiddenSections">, s: HideableSection) => !!doc.hiddenSections?.includes(s);
export const toggleSection = (doc: Pick<ResumeDoc, "hiddenSections">, s: HideableSection): HideableSection[] =>
  sectionHidden(doc, s) ? (doc.hiddenSections ?? []).filter((x) => x !== s) : [...(doc.hiddenSections ?? []), s];
/** The section an entry shows under on this document: where she moved it, or where it belongs. */
export const entrySection = (doc: Pick<ResumeDoc, "entrySections">, e: { id: string; section: EntrySection }): EntrySection => doc.entrySections?.[e.id] ?? e.section;

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
    bullets: doc.bullets ? Object.fromEntries(Object.entries(doc.bullets).map(([k, v]) => [k, [...v]])) : undefined,
    courses: doc.courses ? [...doc.courses] : doc.courses,
    hiddenSections: doc.hiddenSections ? [...doc.hiddenSections] : undefined,
    entrySections: doc.entrySections ? { ...doc.entrySections } : undefined,
    dismissedIdeas: doc.dismissedIdeas ? [...doc.dismissedIdeas] : undefined,
    // A version for another career leaves the job folder it came from.
    folder: roleId === doc.roleId ? doc.folder : undefined,
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
  return `${o.major} student${aim}.${list ? ` Strengths from coursework and practice: ${list}.` : ""}`;
}

// ---------- Look ----------

export type ResumeTemplate = "modern" | "classic" | "compact";

export const TEMPLATES: { id: ResumeTemplate; name: string; note: string }[] = [
  { id: "modern", name: "Modern", note: "Left aligned, with a thin accent rule. Clean and current." },
  { id: "classic", name: "Classic", note: "Centered serif name. Reads as traditional and formal." },
  { id: "compact", name: "Compact", note: "Tighter spacing, so more fits on one page." },
];

/** The same accents as Your card, so her card and resume can match. */
export const RESUME_ACCENTS = [
  { id: "aqua", name: "Aqua", c: "#3fc6c0", ink: "#063b3a" },
  { id: "lime", name: "Lime", c: "#a6ec5a", ink: "#22400a" },
  { id: "violet", name: "Violet", c: "#9d8cf2", ink: "#231a5c" },
  { id: "coral", name: "Coral", c: "#ff9b85", ink: "#5a1d10" },
] as const;
export type ResumeAccent = (typeof RESUME_ACCENTS)[number];

export function docLook(doc: Pick<ResumeDoc, "template" | "accent">): { template: ResumeTemplate; accent: ResumeAccent } {
  const template = TEMPLATES.some((t) => t.id === doc.template) ? doc.template! : "modern";
  return { template, accent: RESUME_ACCENTS.find((a) => a.id === doc.accent) ?? RESUME_ACCENTS[0] };
}

/** Pages a document fills, from its content height and the page height (both in px). Never less than one. */
export const pageCount = (contentHeight: number, pageHeight: number) => Math.max(1, Math.ceil((contentHeight - 1) / pageHeight));

// ---------- Bullets ----------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const listOf = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0] ?? "");

/** Her own words, one bullet per sentence (up to three). Nothing added, nothing measured. */
export function bulletsFromWords(did: string): string[] {
  return did
    .split(/(?<=[.!?])\s+|\n+/)
    .map((x) => x.trim().replace(/^[-•*]\s*/, "").replace(/[.;]+$/, ""))
    .filter(Boolean)
    .map(cap)
    .slice(0, 3);
}

/** An event's recorded outcome as a bullet that starts with a verb. Only rewords; never adds a result. */
export function outcomeBullet(outcome: string): string {
  const o = outcome.trim().replace(/\.$/, "");
  let m = o.match(/^poster:\s*(.+)$/i);
  if (m) return `Presented a poster on ${m[1]}`;
  m = o.match(/^team placed (\S+)\s*(.*)$/i);
  if (m) return `Placed ${m[1]} as a team${m[2] ? ` ${m[2]}` : ""}`;
  m = o.match(/^certificate issued by (.+)$/i);
  if (m) return `Earned a certificate issued by ${m[1]}`;
  return cap(o);
}

const LEVEL_VERB: Record<string, string> = { Demonstrated: "Applied", Practiced: "Practiced", Taught: "Learned" };

/**
 * Suggested bullets for an event she really went to: its recorded outcome, then the skills the listing says
 * happen there, by how far she took them. No numbers or results the record doesn't hold.
 */
export function bulletsFromEvent(e: { outcome?: string | undefined; skills: { name: string; level: string }[] }): string[] {
  const out: string[] = [];
  if (e.outcome) out.push(outcomeBullet(e.outcome));
  for (const level of ["Demonstrated", "Practiced", "Taught"]) {
    const names = [...new Set(e.skills.filter((s) => s.level === level).map((s) => inline(s.name)))];
    if (names.length) out.push(`${LEVEL_VERB[level]} ${listOf(names)}`);
  }
  return out.slice(0, 3);
}

/** Strong resume bullets start with an action verb. A gentle check for the form, not a rule. */
const VERBS = /^(led|built|ran|made|wrote|taught|helped|managed|organized|organised|planned|designed|created|developed|presented|interviewed|analyzed|analysed|researched|tutored|trained|coordinated|supported|served|cared|handled|greeted|answered|sorted|packed|placed|earned|applied|practiced|practised|learned|launched|started|founded|edited|translated|tracked|mentored|volunteered|competed|collected|conducted|drafted|mapped|prototyped|tested|observed|recorded|summarized|surveyed|scheduled|balanced|raised|grew|cut|improved|reduced|increased|won|completed|co-led|facilitated|hosted|guided|cooked|cleaned|drove|opened|closed)\b/i;
export const startsWithAction = (b: string) => VERBS.test(b.trim()) || /^[A-Za-z]+ed\b/.test(b.trim());

const IRREGULAR: Record<string, string> = {
  making: "Made", leading: "Led", running: "Ran", writing: "Wrote", teaching: "Taught", building: "Built", taking: "Took", giving: "Gave", keeping: "Kept",
  bringing: "Brought", doing: "Did", having: "Had", getting: "Got", selling: "Sold", speaking: "Spoke", finding: "Found", meeting: "Met", telling: "Told",
  driving: "Drove", coming: "Came", seeing: "Saw", holding: "Held", sitting: "Sat", standing: "Stood", thinking: "Thought", buying: "Bought", paying: "Paid",
  winning: "Won", feeding: "Fed", reading: "Read", setting: "Set", putting: "Put", cutting: "Cut", leaving: "Left", sending: "Sent", spending: "Spent", choosing: "Chose",
};
const NOT_VERB = /^(being|during|morning|evening|nothing|something|anything|everything|bring|spring|string|thing|king|ring|sing|wing|sibling|ceiling|wedding)$/i;

/**
 * The same bullet, led by a verb, when that can be done without adding anything: "I made…" → "Made…",
 * "Making drinks…" → "Made drinks…", "Responsible for…" → "Handled…", recorded outcomes reworded.
 * Null when it already starts with one, or when there's no honest rewording.
 */
export function verbLed(bullet: string): string | null {
  const b = bullet.trim().replace(/[.;]+$/, "");
  if (!b || startsWithAction(b)) return null;
  let m = b.match(/^i\s+(?:also\s+)?(\w+)\s+(.+)$/i);
  if (m && startsWithAction(m[1]!)) return `${cap(m[1]!.toLowerCase())} ${m[2]}`;
  m = b.match(/^(?:was\s+)?responsible\s+for\s+(.+)$/i);
  if (m) {
    const rest = verbLed(m[1]!);
    return rest ?? `Handled ${m[1]}`;
  }
  m = b.match(/^(\w+ing)\b\s*(.*)$/i);
  if (m && !NOT_VERB.test(m[1]!)) {
    const w = m[1]!.toLowerCase();
    let past = IRREGULAR[w];
    if (!past) {
      const stem = w.slice(0, -3);
      if (stem.length < 2) return null;
      past = cap(/[^aeiou]y$/.test(stem) ? `${stem.slice(0, -1)}ied` : `${stem}ed`);
    }
    const out = `${past}${m[2] ? ` ${m[2]}` : ""}`;
    return startsWithAction(out) ? out : null;
  }
  const o = outcomeBullet(b);
  return o !== cap(b) && startsWithAction(o) ? o : null;
}

/** The bullets showing for an entry: hers once she edits them, the suggestion before that. */
export const entryBullets = (doc: Pick<ResumeDoc, "bullets">, id: string, suggested: string[]) => doc.bullets?.[id] ?? suggested;

/** Moves one item up or down a list (clamped). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x as T);
  return next;
}

// ---------- Folders ----------

/** A folder of documents and applications: one per goal career, one per specific job she adds, and General. */
export type ResumeFolder = { id: string; title: string; roleId: string | null; job?: { title: string; org: string } | undefined };

export const GENERAL_FOLDER = "general";
export const roleFolderId = (roleId: string) => `role-${roleId}`;
export const folderOf = (doc: Pick<ResumeDoc, "folder" | "roleId">) => doc.folder ?? (doc.roleId ? roleFolderId(doc.roleId) : GENERAL_FOLDER);

/** Folders in order: goals (main first), other careers she made versions for, jobs she added, then General. */
export function folderList(goals: RoleLike[], jobs: ResumeFolder[], docs: ResumeDoc[], titleOf: (roleId: string) => string | undefined): ResumeFolder[] {
  const roles = [...goals.map((g) => g.id), ...docs.filter((d) => !d.folder && d.roleId).map((d) => d.roleId!)];
  const roleFolders = [...new Set(roles)].map((id) => ({ id: roleFolderId(id), roleId: id, title: goals.find((g) => g.id === id)?.title ?? titleOf(id) ?? id }));
  return [...roleFolders, ...jobs, { id: GENERAL_FOLDER, roleId: null, title: "General" }];
}

export const docsIn = (docs: ResumeDoc[], folderId: string) => docs.filter((d) => folderOf(d) === folderId);

/** A folder for one specific job, like "UX Research Intern — Acme Health". */
export function jobFolder(title: string, org: string, roleId: string | null, stamp: number): ResumeFolder {
  const t = title.trim(), o = org.trim();
  const slug = `${t}-${o}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
  return { id: `job-${slug}-${stamp.toString(36)}`, title: o ? `${t} — ${o}` : t, roleId, job: { title: t, org: o } };
}

/** Starting documents for a job folder: a copy of the resume she picked, and a fresh cover letter. */
export function jobFolderDocs(folder: ResumeFolder, from: ResumeDoc, stamp: number): ResumeDoc[] {
  const tag = stamp.toString(36);
  const name = folder.job?.title || folder.title;
  return [
    { ...newVersion(from, folder.roleId, undefined, [], stamp), id: `resume-${folder.id}-${tag}`, title: `Resume · ${name}`, folder: folder.id, kind: from.kind === "cover" ? "resume" : from.kind, headline: from.roleId === folder.roleId ? from.headline : null },
    { ...blankDoc("cover", folder.roleId), id: `cover-${folder.id}-${tag}`, title: `Cover letter · ${name}`, folder: folder.id },
  ];
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const folderCounts = (docs: number, apps: number) => `${plural(docs, "doc")} · ${plural(apps, "application")}`;

// ---------- Applications ----------

export type AppStatus = "saved" | "applied" | "interviewing" | "offer" | "closed";

export const APP_STATUS: { id: AppStatus; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "closed", label: "Not moving forward" },
];
export const statusLabel = (s: AppStatus) => APP_STATUS.find((x) => x.id === s)?.label ?? "Saved";

/** One application she recorded herself. Sprout never applies or sends anything. */
export type Application = {
  id: string;
  folderId: string;
  company: string;
  role: string;
  link: string;
  /** YYYY-MM-DD, or empty while it's only saved. */
  applied: string;
  /** The resume version she sent, so she always knows what they have. */
  resumeId: string | null;
  status: AppStatus;
  /** Next step, in her words. */
  next: string;
  /** YYYY-MM-DD follow-up date, or empty. */
  followUp: string;
};

export function blankApplication(folderId: string, resumeId: string | null, stamp: number, role = ""): Application {
  return { id: `app-${stamp.toString(36)}`, folderId, company: "", role, link: "", applied: "", resumeId, status: "saved", next: "", followUp: "" };
}

export const saveApplication = (apps: Application[], app: Application): Application[] =>
  apps.some((a) => a.id === app.id) ? apps.map((a) => (a.id === app.id ? app : a)) : [...apps, app];

export const removeApplication = (apps: Application[], id: string): Application[] => apps.filter((a) => a.id !== id);

/** A folder's applications: the newest applied first, saved-for-later ones after. */
export const appsIn = (apps: Application[], folderId: string) =>
  apps.filter((a) => a.folderId === folderId).sort((a, b) => (b.applied || "").localeCompare(a.applied || "") || a.company.localeCompare(b.company));

// ---------- Job posting ----------

/**
 * A posting's skills against this document: already on it, ones she has (confirmed) but hasn't put on it,
 * and ones she doesn't have yet. Just lists, never a score.
 */
export function comparePosting(asked: string[], onDoc: string[], confirmed: string[]): { on: string[]; canAdd: string[]; missing: string[] } {
  const on: string[] = [], canAdd: string[] = [], missing: string[] = [];
  for (const n of asked.reduce(addName, [] as string[])) {
    if (hasName(onDoc, n)) on.push(n);
    else if (hasName(confirmed, n)) canAdd.push(n);
    else missing.push(n);
  }
  return { on, canAdd, missing };
}

// ---------- Contact ----------

/** Contact details she typed in herself. Empty until she does; nothing here is filled in for her. */
export type ResumeContact = { phone: string; location: string; linkedin: string; site: string };
export const blankContact: ResumeContact = { phone: "", location: "", linkedin: "", site: "" };

/** The contact line: email and school from her account, then only what she added. */
export const contactLine = (email: string, school: string, c: ResumeContact) =>
  [email, c.phone, c.location || school, c.linkedin, c.site].map((x) => x.trim()).filter(Boolean);

// ---------- The page as data, and as text ----------

export type PageEntry = { id: string; role: string; org: string; when: string; bullets: string[] };
export type PageSkillLine = { label: string; names: string[] };
export type ResumePage = {
  kind: DocKind;
  name: string;
  headline: string;
  contact: string[];
  summary: string;
  letter: string;
  education: { id: string; school: string; degree: string; when: string; detail: string }[];
  experience: PageEntry[];
  training: PageEntry[];
  projects: PageEntry[];
  skills: PageSkillLine[];
};

/** The same document as plain text, for Copy and Download. */
export function resumeText(p: ResumePage): string {
  const head = [p.name, ...(p.headline.trim() ? [p.headline.trim()] : []), p.contact.join(" | "), ""];
  if (p.kind === "cover") return [...head, p.letter.trim(), ""].join("\n");
  const out = [...head];
  const entry = (e: PageEntry) => [`${[e.role, e.org].filter(Boolean).join(", ")}${e.when ? ` (${e.when})` : ""}`, ...e.bullets.filter((b) => b.trim()).map((b) => `  - ${b.trim()}`)];
  if (p.summary.trim()) out.push("SUMMARY", p.summary.trim(), "");
  out.push("EDUCATION", ...p.education.flatMap((e) => [`${e.school}${e.when ? ` (${e.when})` : ""}`, `  ${e.degree}`, ...(e.detail ? [`  ${e.detail}`] : [])]), "");
  if (p.experience.length) out.push("EXPERIENCE", ...p.experience.flatMap(entry), "");
  if (p.projects.length) out.push("PROJECTS", ...p.projects.flatMap(entry), "");
  if (p.training.length) out.push("TRAINING AND EVENTS", ...p.training.flatMap(entry), "");
  if (p.skills.length) out.push("SKILLS", ...p.skills.map((s) => `${s.label}: ${s.names.join(", ")}`), "");
  return out.join("\n");
}

/** Skill themes as resume lines. Research and analysis share a line; tools get their own. */
export function skillLines(names: string[], themeOf: (name: string) => string | undefined, tools: string[]): PageSkillLine[] {
  const LINE: Record<string, string> = { "Research and data": "Research", "Analysis and critical thinking": "Research", "Writing and communication": "Communication", Tools: "Tools" };
  const lines = new Map<string, string[]>([["Research", []], ["Communication", []], ["Tools", []], ["Other", []]]);
  for (const n of names) lines.get(LINE[themeOf(n) ?? ""] ?? "Other")!.push(n);
  for (const t of tools) if (!hasName(lines.get("Tools")!, t)) lines.get("Tools")!.push(t);
  return [...lines].filter(([, v]) => v.length).map(([label, v]) => ({ label, names: v }));
}
