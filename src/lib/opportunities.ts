import { electiveClasses } from "@/data/degree";
import type { CareerRole, DayPart, EventPeer, Opportunity, OpportunityKind, Term, WeekDay, WeekSlot } from "@/data/scenario";

const DAY: Record<WeekDay, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
const PART: Record<DayPart, string> = { morning: "mornings", afternoon: "afternoons", evening: "evenings" };

const isFree = (slot: WeekSlot, free: WeekSlot[]) => free.some((f) => f.day === slot.day && f.part === slot.part);
/** Lowercases a skill for a sentence, but leaves acronyms like SQL alone. */
const inSentence = (skill: string) => (/^[A-Z][a-z]/.test(skill) ? skill[0]!.toLowerCase() + skill.slice(1) : skill);

export function fitsWeek(o: Opportunity, free: WeekSlot[]) {
  return !o.slot || isFree(o.slot, free);
}

/** The plain reason shown on every item: what it fills and how it fits. */
export function reasonFor(o: Opportunity, gap: string, free: WeekSlot[]) {
  return `${o.kind === "event" ? `Introduces ${inSentence(gap)}, one of your gaps` : `Fills your ${inSentence(gap)} gap`}. ${fitLine(o, free)}.`;
}

function fitLine(o: Opportunity, free: WeekSlot[]) {
  const when = `${DAY[o.slot?.day ?? "Mon"]} ${PART[o.slot?.part ?? "morning"]}`;
  return !o.slot ? o.fitNote ?? "No set meeting time" : isFree(o.slot, free) ? `Fits your ${when}` : `Meets ${when}, when you're usually busy`;
}

/** The first of your goal's gaps this fills, if any. */
export const goalGap = (o: Opportunity, gaps: string[]) => gaps.find((g) => o.fills.includes(g));

/** Same as reasonFor, but honest about items that aren't one of your gaps. */
export function whyLine(o: Opportunity, gaps: string[], free: WeekSlot[]) {
  const gap = goalGap(o, gaps);
  // "Data analysis in R" already says "data analysis", so only the more specific one is named.
  const named = o.fills.filter((f, i, all) => !all.some((g, k) => k !== i && g.length > f.length && g.toLowerCase().includes(f.toLowerCase())));
  return gap ? reasonFor(o, gap, free) : `${o.kind === "event" ? "Covers" : "Builds"} ${named.map(inSentence).join(" and ")}. ${fitLine(o, free)}.`;
}

/** Something you could do outside classes. A class takes units, so it never counts as free time. */
export const doableInFreeTime = (o: Opportunity, free: WeekSlot[]) => o.kind !== "class" && fitsWeek(o, free);

export type ExploreFilters = { query: string; kind: OpportunityKind | "all"; skill: string | null; careerGaps: string[] | null; subject: string | null; place: string | null; industry: string | null; freeTimeOnly: boolean; nearbySchools: boolean };
export const NO_FILTERS: ExploreFilters = { query: "", kind: "all", skill: null, careerGaps: null, subject: null, place: null, industry: null, freeTimeOnly: false, nearbySchools: false };

/** Everything except the type tab, so the tabs can show how many results each one holds. */
export function matchesFilters(o: Opportunity, f: ExploreFilters, free: WeekSlot[]) {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = [o.title, o.host, o.kind, o.subject, o.industry, o.place, o.when, ...o.fills].join(" ").toLowerCase();
  return words.every((w) => text.includes(w))
    && (!f.skill || o.fills.includes(f.skill))
    && (!f.careerGaps || o.fills.some((s) => f.careerGaps!.includes(s)))
    && (!f.subject || o.subject === f.subject)
    && (!f.place || o.place === f.place)
    && (!f.industry || o.industry === f.industry)
    && (!f.freeTimeOnly || doableInFreeTime(o, free))
    // Picking a nearby school by name counts as asking for it.
    && (o.milesAway === undefined || f.nearbySchools || f.place === o.place);
}

/** Results for the page: what fills your gaps comes first, then what fits your week. */
export function exploreResults(items: Opportunity[], f: ExploreFilters, gaps: string[], free: WeekSlot[]) {
  const score = (o: Opportunity) => (goalGap(o, gaps) ? 2 : 0) + (fitsWeek(o, free) ? 1 : 0) - (o.milesAway === undefined ? 0 : 0.5);
  return items.filter((o) => (f.kind === "all" || o.kind === f.kind) && matchesFilters(o, f, free)).sort((a, b) => score(b) - score(a));
}

/** The school or group behind a listing, and how far away it is when that matters. */
export const hostLine = (o: Opportunity) => (o.milesAway === undefined ? o.host : `${o.host} · ${o.milesAway} mi away`);

/** When it happens, led by the price for a class. */
export const detailLine = (o: Opportunity) => (o.cost === undefined ? o.when : `$${o.cost.toLocaleString("en-US")} · ${o.when}`);

/** The date that matters for a listing: the deadline if it has one, otherwise when it happens. */
export const deadlineDate = (o: Opportunity) => o.deadline ?? o.startsOn;
export const deadlineLabel = (o: Opportunity) => (o.kind === "class" ? "Register by" : "Apply by");
export const deadlineLine = (o: Opportunity) => `${deadlineLabel(o)} ${new Date(`${deadlineDate(o)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

/** Soonest first, one group per date. */
export function groupByDate(items: Opportunity[], dateOf: (o: Opportunity) => string = (o) => o.startsOn) {
  const byDate = new Map<string, Opportunity[]>();
  for (const o of [...items].sort((a, b) => dateOf(a).localeCompare(dateOf(b)))) byDate.set(dateOf(o), [...(byDate.get(dateOf(o)) ?? []), o]);
  return [...byDate].map(([date, group]) => ({ date, items: group }));
}

/** Sorted, distinct values for a filter menu. */
export const distinct = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

export type GapGroup = { gap: string; items: Opportunity[] };

/** One group per gap. Things that fit the week come first, and each item appears once. */
export function groupByGap(gaps: string[], items: Opportunity[], free: WeekSlot[]): GapGroup[] {
  const used = new Set<string>();
  return gaps.map((gap) => {
    const matches = items.filter((o) => o.fills.includes(gap) && !used.has(o.id));
    matches.forEach((o) => used.add(o.id));
    return { gap, items: [...matches].sort((a, b) => Number(fitsWeek(b, free)) - Number(fitsWeek(a, free))) };
  });
}

const remaining = (terms: Term[]) => terms.filter((t) => t.status === "registering" || t.status === "planned");

export function stillOpen(items: Opportunity[], terms: Term[]) {
  const ids = new Set(remaining(terms).map((t) => t.id));
  return items.filter((o) => o.openToGrads || o.termIds.some((id) => ids.has(id)));
}

/** The line at the top of Explore: how much time is left and what still fits inside it. */
export function timeLeftLine(terms: Term[], items: Opportunity[]) {
  const left = remaining(terms);
  const open = stillOpen(items, terms).length;
  const what = open === items.length ? `All ${items.length} of these still fit.` : `${open} of these ${items.length} still fit.`;
  if (left.length === 0) return `This is your last term, and it isn't too late. ${what}`;
  return `You have ${left.length} ${left.length === 1 ? "term" : "terms"} left, through ${left[left.length - 1]!.name}. ${what}`;
}

/** Names stay hidden until the student opts in, and then only peers who also opted in appear. */
export function whoIsGoing(event: { going: number; visiblePeers: EventPeer[] }, showMe: boolean) {
  return {
    count: event.going,
    visible: showMe ? event.visiblePeers : [],
    private: showMe ? event.going - event.visiblePeers.length : event.going,
  };
}

/** The first email after a match. It opens in the student's own mail app; nothing is sent for them. */
export function helloDraft(peerName: string, eventName: string, studentName: string) {
  return `Hi ${peerName.split(" ")[0]}, glad we matched for the ${eventName} next Tuesday. Want to meet at the entrance a few minutes early?\n\n${studentName.split(" ")[0]}`;
}

/** Who asked whom. A match needs both people to say yes. */
export type Asks = { sentTo: string[]; matched: string[]; passed: string[] };
export type MatchState = "matched" | "asked-you" | "you-asked" | "none";

export function matchState(id: string, g: Asks, asksYou: string[]): MatchState {
  if (g.matched.includes(id)) return "matched";
  if (g.sentTo.includes(id)) return "you-asked";
  if (asksYou.includes(id) && !g.passed.includes(id)) return "asked-you";
  return "none";
}

/** Asking someone who already asked you is a match. Otherwise it waits for their yes. */
export function askToGo<T extends Asks>(g: T, id: string, asksYou: string[]): T {
  if (g.matched.includes(id) || g.sentTo.includes(id)) return g;
  if (asksYou.includes(id)) return { ...g, matched: [...g.matched, id], passed: g.passed.filter((x) => x !== id) };
  return { ...g, sentTo: [...g.sentTo, id] };
}

/** "Not now" on someone's ask. They aren't told, and you can still ask them later. */
export function passAsk<T extends Asks>(g: T, id: string): T {
  return g.passed.includes(id) ? g : { ...g, passed: [...g.passed, id] };
}

/** The goal Explore and Home work toward: the first role you marked, otherwise the first one. */
export const goalFor = (roles: CareerRole[], interested: string[]) => roles.find((r) => r.id === interested[0]) ?? roles[0]!;

const cap = (text: string) => text[0]!.toUpperCase() + text.slice(1);
const daysUntil = (date: string, today: string) => (Date.parse(date) - Date.parse(today)) / 86_400_000;
const SOON_DAYS = 31;

/** How a listing reads inside a sentence: "the UX night", "People + Products Club". */
export function planName(o: Opportunity) {
  const short = o.title.match(/: an? (.+)$/)?.[1];
  return short ? `the ${short}` : o.title.split(" · ").at(-1)!;
}

/** Where a saved item goes on your plan. Anything starting soon belongs to the term you're in. */
export function planTermId(o: Opportunity, terms: Term[], today: string) {
  const current = terms.find((t) => t.status === "in_progress");
  if (current && daysUntil(o.startsOn, today) <= SOON_DAYS) return current.id;
  return o.termIds[0] ?? current?.id ?? terms[0]!.id;
}

/** A one-time event is worth recommending, but it never counts as having a skill. */
export const buildsSkill = (o: Opportunity) => o.kind !== "event";

/** What a card says about a gap. Events only introduce it. */
export const gapSignal = (o: Opportunity, gap: string) => (buildsSkill(o) ? `Fills a gap: ${gap}` : `Intro to ${inSentence(gap)}`);

/** You can only say you did something that's in the term you're in. Classes count through registration, and events don't count. */
export const canConfirm = (o: Opportunity, terms: Term[], today: string) => o.kind !== "class" && buildsSkill(o) && planTermId(o, terms, today) === terms.find((t) => t.status === "in_progress")?.id;

const CONFIRM = {
  club: { button: "I joined", done: "You joined", line: "You joined", stage: "started" },
  internship: { button: "I finished it", done: "You finished it", line: "You finished", stage: "practiced" },
} as const;
const confirmFor = (o: Opportunity) => CONFIRM[o.kind === "internship" ? "internship" : "club"];
export const confirmLabel = (o: Opportunity) => confirmFor(o).button;
export const doneLabel = (o: Opportunity) => confirmFor(o).done;
export const doneLine = (o: Opportunity) => `${confirmFor(o).line} ${planName(o)}`;

export type GapStage = "started" | "practiced" | "planned";
export const GAP_STAGE: Record<GapStage, string> = { started: "Started", practiced: "Practiced", planned: "On your plan" };

/** How far you've come on a skill outside class. Joining a club is a start and an internship is practice. Events never count. */
export function gapProgress(skill: string, saved: Opportunity[], went: string[]): { stage: GapStage; via: Opportunity } | null {
  const matching = saved.filter((o) => buildsSkill(o) && o.fills.includes(skill));
  const done = matching.filter((o) => went.includes(o.id));
  const best = done.find((o) => o.kind === "internship") ?? done[0];
  if (best) return { stage: confirmFor(best).stage, via: best };
  return matching[0] ? { stage: "planned", via: matching[0] } : null;
}

/** Every skill you've confirmed working on outside class, once each. */
export function skillsFromDoing(saved: Opportunity[], went: string[]) {
  const skills = [...new Set(saved.filter((o) => buildsSkill(o) && went.includes(o.id)).flatMap((o) => o.fills))];
  return skills.map((skill) => ({ skill, ...gapProgress(skill, saved, went)! }));
}

/** What the toast says right after you confirm. */
export function doneToast(o: Opportunity) {
  return `${cap(o.fills.map((s, i) => (i ? inSentence(s) : s)).join(" and "))} ${confirmFor(o).stage}`;
}

/** The one thing worth bringing up: soon, fits your week, and on a gap you haven't started. */
export function nextSuggestion(items: Opportunity[], gaps: string[], free: WeekSlot[], skip: string[], today: string) {
  const soon = (o: Opportunity) => daysUntil(o.startsOn, today) >= 0 && daysUntil(o.startsOn, today) <= SOON_DAYS;
  return items
    .filter((o) => o.kind !== "class" && !!o.slot && soon(o) && fitsWeek(o, free) && !!goalGap(o, gaps) && !skip.includes(o.id))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn) || Number(b.kind === "event") - Number(a.kind === "event"))[0];
}

/** Why this is being brought up, in terms of the student's own goal and week. */
export function suggestionWhy(o: Opportunity, gaps: string[], role: string) {
  const skill = inSentence(goalGap(o, gaps) ?? o.fills[0]!);
  const free = o.slot ? ` You're free ${DAY[o.slot.day]} ${PART[o.slot.part]}.` : "";
  return `${buildsSkill(o) ? `Practice ${skill} each week` : `See ${skill} up close`}, which ${inSentence(role)} roles ask for.${free}`;
}

/** The tradeoff: only a class can count toward the degree, and most classes need checking. */
export function degreeLine(o: Opportunity) {
  if (o.kind !== "class") return "Won't count toward your degree";
  return o.degree === "major" ? "Counts toward your major" : o.degree === "elective" ? "Counts as an elective" : "Ask your counselor if it counts";
}

/** One listing of each other kind that really builds the same skill, so the choice is visible. */
export function otherWays(o: Opportunity, skill: string, items: Opportunity[]) {
  const others = items.filter((x) => x.id !== o.id && x.kind !== o.kind && buildsSkill(x) && x.milesAway === undefined && x.fills.includes(skill));
  return [...new Set(others.map((x) => x.kind))].map((kind) => others.find((x) => x.kind === kind)!);
}

/** Explore only offers what isn't already on the plan. */
export function notOnPlan(o: Opportunity, saved: string[], drafts: string[]): boolean {
  return !saved.includes(o.id) && !(o.courseCode && drafts.includes(o.courseCode));
}

/** What a class would do for the degree, shown on its card. */
export function fillsLine(o: Opportunity): string | undefined {
  if (o.kind !== "class") return undefined;
  return electiveClasses.some((e) => e.id === o.id) ? "Fills an Elective in your degree" : degreeLine(o);
}
