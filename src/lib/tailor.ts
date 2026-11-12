/**
 * Tailoring a resume to one job posting she drops in. Deterministic and built only from her records and the
 * posting's text: skills the posting asks for go first, confirmed skills it asks for are added, courses whose
 * syllabus covers them are added, entries that show them move up, and the summary is aimed at the job.
 * Never adds a skill she hasn't confirmed, an achievement or a number her records don't hold. No AI is
 * connected here and nothing is fetched or sent. Pure helpers, tested in src/test/tailor.test.ts.
 */
import { postingVocabulary, readPosting } from "@/lib/posting";
import { addName, article, hasName, inline, orderEntries, type EntrySection, type ResumeDoc } from "@/lib/resume";
import { proofLabel, skillsSentence, strongestSkills, type SuggestEntry, type SuggestInput, type SuggestSkill } from "@/lib/resumeSuggest";

export type TailorSection = "summary" | "skills" | "experience" | "education";
/** The order the sections light up in. */
export const TAILOR_ORDER: TailorSection[] = ["summary", "skills", "experience", "education"];
export const TAILOR_LABEL: Record<TailorSection, string> = { summary: "Summary", skills: "Skills", experience: "Experience & projects", education: "Education" };

/** An entry with the skill names its record holds (an event's listed skills, the skills she tagged on her own thing). */
export type TailorEntry = SuggestEntry & { skills: string[]; /** Where it belongs when she hasn't moved it. */ home?: EntrySection | undefined };

export type TailorInput = {
  posting: string;
  company: string;
  title: string;
  major: string;
  /** Every skill with proof (confirmed or not). */
  skills: SuggestSkill[];
  /** Skills on the base version now, in page order (not tools). */
  docSkills: string[];
  /** The summary on the base page now. */
  summary: string;
  /** Every entry, with the section it shows under on the base version and whether it's ticked off. */
  entries: TailorEntry[];
  courses: { code: string; title: string }[];
  /** Course codes on the base coursework line. */
  onCourses: string[];
  courseSkills: { course: string; name: string }[];
  /** The base version. Never changed: tailoring returns patches for a copy. */
  doc: ResumeDoc;
};

export type DiffItem = { text: string; change: "same" | "added" | "removed" | "moved" };

export type TailorChange = {
  section: TailorSection;
  /** One line for the sequence: "Skills: moved Interviewing up — the posting asks for it". */
  line: string;
  /** Every change in this section, each with its reason. */
  notes: string[];
  /** The patch for the copy. Empty when nothing changes. */
  patch: Partial<ResumeDoc>;
  changed: boolean;
};

export type Tailoring =
  | { kind: "empty" | "link" | "short" }
  | {
      kind: "ok";
      /** What the posting asks for that Trellis recognises, in the order the posting says it. */
      asked: string[];
      changes: TailorChange[];
      /** Skills she has proof of but hasn't confirmed: "You may have this — check it on Your skills". */
      unconfirmed: { name: string; asked: string; from: string }[];
      /** Skills the posting asks for that nothing in her records shows yet. */
      gaps: string[];
    };

const lower = (s: string) => s.toLowerCase();
const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const listOf = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0] ?? "");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Words that don't tell two skills apart ("research", "data"…). */
const STOP = new Set(["and", "of", "in", "the", "a", "an", "to", "for", "with", "research", "data", "analysis", "methods", "skills", "writing", "management", "critical", "thinking"]);
const stem = (w: string) => w.replace(/(ing|ers|er|es|ed|s)$/, "");
const tokens = (s: string) => lower(s).split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)).map(stem);
const sameWord = (a: string, b: string) => (a.length >= 5 && b.length >= 5 ? a.startsWith(b) || b.startsWith(a) : a === b);

/**
 * Whether two skill names mean the same thing: the same name, or every telling word of the shorter one in the
 * other ("Interviewing" and "User interviews", but not "Survey design" and "Survey interpretation").
 */
export function sameSkill(a: string, b: string): boolean {
  if (lower(a.trim()) === lower(b.trim())) return true;
  const [x, y] = [tokens(a), tokens(b)].sort((p, q) => p.length - q.length) as [string[], string[]];
  return x.length > 0 && x.every((w) => y.some((v) => sameWord(w, v)));
}

/** Skills in her records that a posting's words point to, beyond the posting reader's list. */
const EXTRA: { name: string; terms: RegExp }[] = [
  { name: "Prototyping", terms: /prototyp/i },
  { name: "Presenting research", terms: /present(ing|ation)s?\b/i },
  { name: "Teamwork", terms: /\bteamwork\b|collaborat/i },
  { name: "UX research methods", terms: /ux research|user research/i },
];

/**
 * What a posting asks for, in the order it says it: the posting reader's known skills, a few more it points to,
 * and any of her own skill names written out. Nothing outside these is guessed.
 */
export function postingAsks(text: string, herSkills: string[]): string[] {
  const hits: { name: string; at: number; k: number }[] = [];
  const add = (name: string, re: RegExp, k: number) => { const at = text.search(re); if (at >= 0) hits.push({ name, at, k }); };
  postingVocabulary.forEach((v, k) => add(v.name, v.terms, k));
  EXTRA.forEach((v, k) => add(v.name, v.terms, 100 + k));
  herSkills.forEach((n, k) => add(n, new RegExp(`\\b${escape(n)}\\b`, "i"), 200 + k));
  hits.sort((a, b) => a.at - b.at || a.k - b.k);
  const out: string[] = [];
  for (const h of hits) if (!out.some((n) => sameSkill(n, h.name))) out.push(h.name);
  return out;
}

const JOB_WORD = /\b(intern(ship)?|analyst|researcher|coordinator|assistant|associate|designer|manager|specialist|engineer|evaluator|fellow|technician|scientist|writer|strategist)\b/i;

/** The job title and company when the posting says them plainly ("Company: …", "at Acme Health"). Empty when it doesn't. */
export function guessJob(text: string): { title: string; company: string } {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const field = (k: RegExp) => lines.map((l) => l.match(k)?.[1]?.trim()).find(Boolean) ?? "";
  let title = field(/^(?:job title|title|role|position)\s*[:\-–]\s*(.+)$/i);
  let company = field(/^(?:company|organization|organisation|employer)\s*[:\-–]\s*(.+)$/i);
  if (!title) {
    const first = lines[0] ?? "";
    if (first.length <= 70 && !/[.!?]$/.test(first) && JOB_WORD.test(first) && !/^https?:/i.test(first)) title = first.replace(/\s+[—–-]\s+.*$/, "").replace(/\s+at\s+.*$/i, "");
  }
  if (!title) {
    const m = text.match(/\b(?:hiring|seeking|looking for)\s+(?:a|an)\s+((?:[A-Z][\w/&-]*\s+){0,4}?[A-Za-z/&-]*?(?:Intern|Analyst|Researcher|Coordinator|Assistant|Associate|Designer|Specialist|Evaluator|Fellow))\b/);
    if (m) title = m[1]!.trim();
  }
  if (!company) {
    const m = text.match(/\b(?:at|join)\s+((?:[A-Z][\w&'-]*)(?:\s+[A-Z][\w&'-]*){0,3})/);
    if (m && !JOB_WORD.test(m[1]!)) company = m[1]!.replace(/[.,]$/, "");
  }
  return { title: title.slice(0, 80), company: company.slice(0, 60) };
}

const SECTION_NAME: Record<EntrySection, string> = { experience: "Experience", projects: "Projects", training: "Training & events" };
const SECTION_RANK: Record<EntrySection, number> = { experience: 0, projects: 1, training: 2 };
/** How an entry reads on the page: an event moved under Projects reads as the event's own name. */
const entryName = (e: TailorEntry, section: EntrySection) => (section === "projects" && e.record?.type === "event" ? e.record.title : e.role);

/** One section as lines, for any version (the base, or the base with a patch). */
export function sectionLines(section: TailorSection, i: TailorInput, d: ResumeDoc): string[] {
  switch (section) {
    case "summary":
      return d.hiddenSections?.includes("summary") ? [] : [(d.summary ?? i.summary).trim()].filter(Boolean);
    case "skills":
      return (d.skillOrder ? uniq([...d.skillOrder, ...i.docSkills]) : i.docSkills).filter((n) => !hasName(d.hiddenSkills, n));
    case "education":
      return i.courses.filter((c) => (d.courses ?? i.onCourses).includes(c.code)).map((c) => c.title);
    case "experience": {
      const sec = (e: TailorEntry): EntrySection => d.entrySections?.[e.id] ?? e.home ?? e.section;
      const shown = i.entries.filter((e) => !d.hiddenExperience.includes(e.id) && !(sec(e) !== "experience" && d.hiddenSections?.includes(sec(e) as "projects" | "training")));
      const ordered = orderEntries(shown, d.entryOrder).map((e, k) => ({ e, k })).sort((a, b) => SECTION_RANK[sec(a.e)] - SECTION_RANK[sec(b.e)] || a.k - b.k);
      return ordered.map(({ e }) => `${entryName(e, sec(e))} · ${SECTION_NAME[sec(e)]}`);
    }
  }
}

/** Before and after as one list: what stays, what's new, what moved up, and what came off (at the end). */
export function listDiff(before: string[], after: string[]): DiffItem[] {
  const common = after.filter((x) => before.includes(x));
  const was = before.filter((x) => after.includes(x));
  const out: DiffItem[] = after.map((text) => {
    if (!before.includes(text)) return { text, change: "added" };
    return { text, change: common.indexOf(text) < was.indexOf(text) ? "moved" : "same" };
  });
  return [...out, ...before.filter((x) => !after.includes(x)).map((text) => ({ text, change: "removed" as const }))];
}

/** Tailors the base version to the posting. The same records and posting always give the same result. */
export function tailor(i: TailorInput): Tailoring {
  const read = readPosting(i.posting);
  if (read.kind !== "ok") return { kind: read.kind };
  const withProof = i.skills.filter((s) => !s.hidden && s.proofs.length > 0);
  const confirmed = withProof.filter((s) => s.confirmed);
  const asked = postingAsks(i.posting, withProof.map((s) => s.name));
  const matchIn = (names: string[], a: string) => names.filter((n) => sameSkill(n, a));

  // ---------- Skills ----------
  const onDoc = i.docSkills;
  const added: { name: string; asked: string }[] = [];
  const unconfirmed: { name: string; asked: string; from: string }[] = [];
  const gaps: string[] = [];
  for (const a of asked) {
    if (matchIn(onDoc, a).length) continue;
    const mine = confirmed.find((s) => sameSkill(s.name, a));
    if (mine) { if (!added.some((x) => x.name === mine.name)) added.push({ name: mine.name, asked: a }); continue; }
    const maybe = withProof.find((s) => sameSkill(s.name, a));
    if (maybe) { if (!unconfirmed.some((x) => x.name === maybe.name)) unconfirmed.push({ name: maybe.name, asked: a, from: listOf(uniq(maybe.proofs.slice(0, 2).map(proofLabel))) }); continue; }
    gaps.push(a);
  }
  const pool = [...onDoc, ...added.map((x) => x.name)];
  const lead = asked.flatMap((a) => matchIn(pool, a)).reduce(addName, [] as string[]);
  const skillOrder = [...lead, ...onDoc].reduce(addName, [] as string[]);
  const kept = skillOrder.filter((n) => onDoc.includes(n));
  const moved = lead.filter((n) => onDoc.includes(n) && kept.indexOf(n) < onDoc.indexOf(n));
  const askedFor = (n: string) => asked.find((a) => sameSkill(n, a)) ?? n;
  const skillNotes = [
    ...added.map((x) => `Added ${x.name} — you confirmed it, and the posting asks for ${inline(x.asked)}`),
    ...moved.map((n) => `Moved ${n} up — the posting asks for ${lower(askedFor(n)) === lower(n) ? "it" : inline(askedFor(n))}`),
  ];
  const skillsChange: TailorChange = {
    section: "skills",
    line: skillNotes[0] ? `Skills: ${skillNotes[0].charAt(0).toLowerCase()}${skillNotes[0].slice(1)}` : lead.length ? "Skills: already leads with what the posting asks for" : "Skills: nothing on your page matches the posting yet",
    notes: skillNotes,
    patch: skillNotes.length ? { skillOrder, hiddenSkills: i.doc.hiddenSkills.filter((n) => !added.some((x) => lower(x.name) === lower(n))) } : {},
    changed: skillNotes.length > 0,
  };

  // ---------- Experience & projects ----------
  const shows = (e: TailorEntry) => asked.filter((a) => e.skills.some((s) => sameSkill(s, a)));
  const matched = i.entries.filter((e) => shows(e).length > 0);
  const expNotes: string[] = [];
  const entrySections: Record<string, EntrySection> = { ...i.doc.entrySections };
  let hiddenExperience = [...i.doc.hiddenExperience];
  let hiddenSections = [...(i.doc.hiddenSections ?? [])];
  for (const e of matched) {
    const what = inline(shows(e)[0]!);
    const r = e.record;
    if (r?.type === "event" && /hackathon/i.test(r.kind) && r.outcome && e.section !== "projects") {
      entrySections[e.id] = "projects";
      hiddenSections = hiddenSections.filter((s) => s !== "projects");
      expNotes.push(`Added ${r.title} as a project — it shows ${what}`);
    }
    if (e.hidden) {
      hiddenExperience = hiddenExperience.filter((x) => x !== e.id);
      expNotes.push(`Brought back ${entryName(e, e.section)} — it shows ${what}`);
    }
  }
  const prevOrder = orderEntries(i.entries, i.doc.entryOrder).map((e) => e.id);
  const ranked = [...matched].sort((a, b) => shows(b).length - shows(a).length || prevOrder.indexOf(a.id) - prevOrder.indexOf(b.id));
  const entryOrder = uniq([...ranked.map((e) => e.id), ...prevOrder]);
  const sectionOf = (e: TailorEntry) => entrySections[e.id] ?? e.section;
  // Only say "moved up" where it changes the page: an entry now ahead of one it used to follow in its section.
  for (const e of ranked) {
    const peers = (order: string[]) => order.filter((id) => { const x = i.entries.find((y) => y.id === id); return x && sectionOf(x) === sectionOf(e) && !hiddenExperience.includes(id); });
    if (peers(entryOrder).indexOf(e.id) < peers(prevOrder).indexOf(e.id)) expNotes.push(`Moved ${entryName(e, sectionOf(e))} up — it shows ${inline(shows(e)[0]!)}`);
  }
  const expChanged = expNotes.length > 0;
  const expChange: TailorChange = {
    section: "experience",
    line: expChanged ? `Experience: ${expNotes[0]!.charAt(0).toLowerCase()}${expNotes[0]!.slice(1)}` : matched.length ? "Experience: what shows the posting's skills is already up top" : "Experience: nothing in your records shows the posting's skills yet",
    notes: expNotes,
    patch: expChanged ? { entrySections, hiddenExperience, hiddenSections, entryOrder } : {},
    changed: expChanged,
  };

  // ---------- Education ----------
  const addCourses = i.courses.filter((c) => !i.onCourses.includes(c.code)).map((c) => ({ c, taught: uniq(i.courseSkills.filter((x) => x.course === c.code && asked.some((a) => sameSkill(x.name, a))).map((x) => x.name)) })).filter((x) => x.taught.length);
  const eduNotes = addCourses.map(({ c, taught }) => `Added ${c.title} to coursework — its syllabus covers ${listOf(taught.map(inline))}`);
  const eduChange: TailorChange = {
    section: "education",
    line: eduNotes[0] ? `Education: ${eduNotes[0].charAt(0).toLowerCase()}${eduNotes[0].slice(1)}` : "Education: your coursework line stays as it is",
    notes: eduNotes,
    patch: eduNotes.length ? { courses: [...i.onCourses, ...addCourses.map((x) => x.c.code)] } : {},
    changed: eduNotes.length > 0,
  };

  // ---------- Summary ----------
  const askedMine = confirmed.filter((s) => asked.some((a) => sameSkill(s.name, a))).map((s) => s.name);
  const top = strongestSkills({ major: i.major, role: { id: "posting", title: i.title || "posting", why: askedMine, missing: [] }, building: [], skills: i.skills, onDoc: [], summary: "", entries: [], courses: [], onCourses: [], courseSkills: [] } satisfies SuggestInput);
  const title = i.title.trim(), company = i.company.trim();
  const aim = title ? `applying for ${article(inline(title))} ${inline(title)} role${company ? ` at ${company}` : ""}` : company ? `applying to ${company}` : "";
  const summary = `${i.major} student${aim ? ` ${aim}` : ""}.${top.length ? ` ${skillsSentence(top)}` : ""}`;
  const sumChanged = summary.trim() !== i.summary.trim() || !!i.doc.hiddenSections?.includes("summary");
  const lead1 = top.find((s) => askedMine.includes(s.name));
  const sumNotes = sumChanged ? [
    title ? `Aimed it at the ${title} role${company ? ` at ${company}` : ""} — the posting's title` : "Rewrote it from your strongest skills for this posting",
    ...(lead1 ? [`Leads with ${inline(lead1.name)} — the posting asks for it`] : []),
  ] : [];
  const sumChange: TailorChange = {
    section: "summary",
    line: sumChanged ? `Summary: ${sumNotes[0]!.charAt(0).toLowerCase()}${sumNotes[0]!.slice(1)}` : "Summary: already aimed at this job",
    notes: sumNotes,
    patch: sumChanged ? { summary, hiddenSections: (i.doc.hiddenSections ?? []).filter((s) => s !== "summary") } : {},
    changed: sumChanged,
  };

  return { kind: "ok", asked, changes: [sumChange, skillsChange, expChange, eduChange], unconfirmed, gaps };
}

export type Decision = { kind: "accept" } | { kind: "keep" } | { kind: "edit"; patch: Partial<ResumeDoc> };

/**
 * The patch for the tailored copy from her decisions: accepted sections take the tailored change, edited ones
 * her edit, kept ones nothing. Sections she hasn't decided on are left out. The hiddenSections list is merged.
 */
export function mergeDecisions(changes: TailorChange[], decisions: Partial<Record<TailorSection, Decision>>, base: ResumeDoc): Partial<ResumeDoc> {
  let out: Partial<ResumeDoc> = {};
  let hidden = [...(base.hiddenSections ?? [])];
  for (const c of changes) {
    const d = decisions[c.section];
    const patch = !d || d.kind === "keep" ? null : d.kind === "edit" ? d.patch : c.patch;
    if (!patch) continue;
    const { hiddenSections, ...rest } = patch;
    if (hiddenSections) {
      // Only the section this change is about may be shown again or hidden.
      const own = c.section === "summary" ? ["summary"] : c.section === "experience" ? ["projects", "training"] : [];
      hidden = [...hidden.filter((s) => !own.includes(s)), ...hiddenSections.filter((s) => own.includes(s))];
    }
    out = { ...out, ...rest };
  }
  return { ...out, hiddenSections: uniq(hidden) };
}

/** Every number in a text, for checking that tailoring never makes one up. */
export const numbersIn = (s: string) => s.match(/\d+(?:[.,]\d+)?/g) ?? [];
