/**
 * Things a student did that no integration sees: jobs, caring for family, clubs, sports, side projects.
 * Everything here is self-reported. Skills come from a small keyword map, never from AI, and only count
 * once the student ticks them.
 */

export type ActivityKind = "job" | "volunteering" | "club" | "caring" | "sports" | "project" | "other";

export const ACTIVITY_KINDS: { id: ActivityKind; label: string }[] = [
  { id: "job", label: "Job" },
  { id: "volunteering", label: "Volunteering" },
  { id: "club", label: "Club" },
  { id: "caring", label: "Caring for family" },
  { id: "sports", label: "Sports" },
  { id: "project", label: "Project" },
  { id: "other", label: "Other" },
];

export const kindLabel = (k: ActivityKind) => ACTIVITY_KINDS.find((x) => x.id === k)?.label ?? "Other";

export type Activity = {
  id: string;
  title: string;
  kind: ActivityKind;
  role?: string | undefined;
  /** Free text, like "Since Jan 2026" or "Summer 2025". */
  when: string;
  often?: string | undefined;
  /** In her own words. */
  did: string;
  link?: string | undefined;
  /** Skills she ticked. Ticking one is what makes it count. */
  skills: string[];
};

/** A single skill added by name, without an activity around it. */
export type SingleSkill = { id: string; name: string; where: "class" | "event" | "work" | "own"; detail: string; link?: string | undefined };

export const WHERE: { id: SingleSkill["where"]; label: string }[] = [
  { id: "class", label: "A class" },
  { id: "event", label: "An event" },
  { id: "work", label: "A club or job" },
  { id: "own", label: "On my own" },
];

const OTHER_THEME = "From doing";

type Rule = { skill: string; theme: string; match: RegExp };

/** Keyword → skill. Names match skills that already exist in the app where one fits, so rows merge. */
const RULES: Rule[] = [
  { skill: "Customer communication", theme: "Writing and communication", match: /\b(caf[eé]s?|barista|customers?|clients?|guests?|retail|cashier|waiter|waitress|server|front desk|hostess|host)\b/i },
  { skill: "Scheduling", theme: OTHER_THEME, match: /\b(schedul\w*|shifts?|rotas?|calendars?|rosters?)\b/i },
  { skill: "Leadership", theme: OTHER_THEME, match: /\b(lead|leads|leading|leader\w*|led|president|vice[- ]president|captain|chair\w*|manag\w*|supervis\w*|founder|founded|officer|head of)\b/i },
  { skill: "Teaching", theme: "Writing and communication", match: /\b(tutor\w*|teach\w*|taught|mentor\w*|coach\w*|instruct\w*|lessons?)\b/i },
  { skill: "Budgeting", theme: "Analysis and critical thinking", match: /\b(budget\w*|cash|money|register|treasurer|financ\w*|fundrais\w*|invoices?|payments?)\b/i },
  { skill: "Caregiving & responsibility", theme: OTHER_THEME, match: /\b(care|cared|caring|caregiv\w*|caretak\w*|siblings?|brothers?|sisters?|parents?|mom|dad|mother|father|grand(ma|pa|mother|father|parents?)|babysit\w*|elderly|family)\b/i },
  { skill: "Programming", theme: "Tools", match: /\b(code|coded|coding|apps?|websites?|web ?site|programm(ing|ed|er)|software|python|javascript|java|react|html|developer|github)\b/i },
  { skill: "Survey design", theme: "Research and data", match: /\b(surveys?|questionnaires?|polls?)\b/i },
  { skill: "Interviewing", theme: "Research and data", match: /\b(interview\w*)\b/i },
  { skill: "Teamwork", theme: "Writing and communication", match: /\b(teams?|teammates?|crew|together|group project|collaborat\w*)\b/i },
  { skill: "Public speaking", theme: "Writing and communication", match: /\b(present(ed|ing|ation|ations)?|speech\w*|pitch\w*|public speaking|debate\w*|announc\w*)\b/i },
  { skill: "Writing", theme: "Writing and communication", match: /\b(writ(e|es|ing|ten)|wrote|newsletters?|blog\w*|articles?|essays?|edit(ed|ing|or))\b/i },
  { skill: "Visual design", theme: "Tools", match: /\b(design(ed|ing)?|flyers?|posters?|figma|canva|logos?|graphics?|illustrat\w*)\b/i },
  { skill: "Data analysis", theme: "Research and data", match: /\b(data|spreadsheets?|excel|analy[sz]\w*|statistics|tracked|tracking)\b/i },
  { skill: "Active listening", theme: "Writing and communication", match: /\b(listen\w*|hotline|peer support|counsel\w*|comfort\w*)\b/i },
  { skill: "Event planning", theme: OTHER_THEME, match: /\b(events?|organi[sz](e|ed|ing)|fundraisers?|planned|planning|coordinat\w*)\b/i },
  { skill: "Social media", theme: "Writing and communication", match: /\b(social media|instagram|tiktok|marketing|promot\w*)\b/i },
  { skill: "Bilingual communication", theme: "Writing and communication", match: /\b(translat\w*|interpret\w*|bilingual|spanish|mandarin|cantonese|vietnamese|tagalog|arabic|french|korean)\b/i },
  { skill: "Time management", theme: OTHER_THEME, match: /\b(hours? ?(a|per|\/) ?week|hrs|deadlines?|juggl\w*|balanc\w*|practices?|training)\b/i },
];

/** What each kind usually builds, added after what her own words point to. */
const BY_KIND: Record<ActivityKind, string[]> = {
  job: ["Time management"],
  volunteering: ["Community service"],
  club: ["Teamwork"],
  caring: ["Caregiving & responsibility"],
  sports: ["Teamwork", "Time management"],
  project: ["Project management"],
  other: [],
};

const THEMES: Record<string, string> = {
  ...Object.fromEntries(RULES.map((r) => [r.skill.toLowerCase(), r.theme])),
  "community service": OTHER_THEME,
  "project management": OTHER_THEME,
};

const MAX_SUGGESTIONS = 6;

/** Skills suggested from what she wrote. Same words in, same skills out, in a stable order. */
export function suggestSkills(text: string, kind: ActivityKind): string[] {
  const fromWords = RULES.filter((r) => r.match.test(text)).map((r) => r.skill);
  return [...new Set([...fromWords, ...BY_KIND[kind]])].slice(0, MAX_SUGGESTIONS);
}

/** The category a self-reported skill sits in. Skills she typed herself go under "From doing". */
export function themeFor(skill: string): string {
  return THEMES[skill.trim().toLowerCase()] ?? OTHER_THEME;
}

/** Review keys for self-reported proof. They count as confirmed unless she unconfirms them. */
export const OWN_KEY = "own:";
export const isOwnKey = (key: string) => key.startsWith(OWN_KEY);
export const ownKey = (sourceId: string, skill: string) => `${OWN_KEY}${sourceId}:${skill.trim().toLowerCase()}`;

export type OwnProof = { key: string; skill: string; theme: string; via: { id: string; title: string }; link?: string | undefined };

/** Every skill she added herself, from activities and single skills, as proof rows for her portfolio. */
export function ownProofs(activities: Activity[], singles: SingleSkill[]): OwnProof[] {
  const fromActivities = activities.flatMap((a) =>
    a.skills.map((skill) => ({ key: ownKey(a.id, skill), skill, theme: themeFor(skill), via: { id: a.id, title: a.title }, ...(a.link ? { link: a.link } : {}) })),
  );
  const fromSingles = singles.map((o) => ({
    key: ownKey(o.id, o.name),
    skill: o.name,
    theme: themeFor(o.name),
    via: { id: o.id, title: o.detail || (WHERE.find((w) => w.id === o.where)?.label ?? "On my own") },
    ...(o.link ? { link: o.link } : {}),
  }));
  return [...fromActivities, ...fromSingles];
}

/** A tidy skill name from what she typed: trimmed, single-spaced, first letter capitalized. */
export function cleanSkill(raw: string): string {
  const s = raw.trim().replace(/\s+/g, " ");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

export const activityId = (title: string, now: number) => `act-${now.toString(36)}-${title.toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "").slice(0, 24)}`;
