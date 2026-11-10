import { symposiumEvent, type Classmate } from "@/data/event";
import type { EventPlatform } from "@/data/scenario";
import { pastNotes, type PastNote, type Person } from "@/data/people";

/** Her answer on each deck card. Nothing is shared with the person either way. */
export type DeckChoice = "meet" | "skip" | "save";
export type Deck = Record<string, DeckChoice>;
export type PersonNote = { personId: string; event: string; date: string; text: string; promise?: string | undefined };
export type Promise_ = { id: string; personId: string; text: string; done: boolean };

/** Maya's plan for the symposium: before, during and after. Drafts are hers to send. */
export type EventPlan = {
  goal: string;
  deck: Deck;
  invite: { to: string | null; draft: string; sent: string[] };
  talked: string[];
  /** Notes belong to the person, so they show again at the next event. */
  notes: PersonNote[];
  promises: Promise_[];
  /** Promises she asked to be reminded about. Off unless she turns one on. */
  reminders: string[];
  followUp: { to: string | null; draft: string; copied: string[] };
};
/** Which demo the app opens with: Maya's built path, or a new student with nothing yet. */
export type DemoFill = "filled" | "fresh";

export const freshEventPlan: EventPlan = { goal: symposiumEvent.goals[0]!, deck: {}, invite: { to: null, draft: "", sent: [] }, talked: [], notes: [], promises: [], reminders: [], followUp: { to: null, draft: "", copied: [] } };

const reyesNote = { personId: "reyes", event: symposiumEvent.title, date: symposiumEvent.date, text: "The lab takes new RAs in January.", promise: "Email Dr. Reyes my ANTH 2 poster" };
/** Partway through: she talked to two people and wrote a note for only one, so both kinds of follow-up show. Nothing is sent yet. */
export const filledEventPlan: EventPlan = {
  ...freshEventPlan,
  deck: { reyes: "meet", priya: "meet", sam: "skip", club: "save", marcus: "meet" },
  talked: ["reyes", "priya"],
  notes: [reyesNote],
  promises: [{ id: `reyes-${symposiumEvent.date}`, personId: "reyes", text: reyesNote.promise, done: false }],
};
export const eventPlanFor = (fill: DemoFill) => (fill === "filled" ? filledEventPlan : freshEventPlan);
/** The personal event accounts each demo starts with. Handshake comes through the school either way. */
export const eventAccountsFor = (fill: DemoFill): EventPlatform[] => (fill === "filled" ? ["luma", "eventbrite"] : []);
/** Filled always has a built path. Fresh has one only once the student builds it. */
export const pathBuiltFor = (fill: DemoFill, builtBefore: boolean) => fill === "filled" || builtBefore;

/** The next card she hasn't answered, in the agent's suggested order. */
export function nextCard(order: string[], deck: Deck): string | null {
  return order.find((id) => !deck[id]) ?? null;
}

/** People she chose to meet, in deck order. */
export function toMeet(order: string[], deck: Deck): string[] {
  return order.filter((id) => deck[id] === "meet");
}

/** Only classmates who opted in are named. Everyone else is just counted. */
export function visibleClassmates(list: Classmate[]) {
  const shown = list.filter((c) => c.optedIn && c.name);
  return { shown, others: list.length - shown.length };
}

export function inviteDraft(classmate: string, event: string, day: string, student: string) {
  return `Hi ${first(classmate)}, I'm going to the ${event} on ${day} and don't know anyone there yet. Want to go together?\n\n${first(student)}`;
}

/** Everything she wrote about someone, oldest first: earlier events plus this one. */
export function notesFor(personId: string, notes: PersonNote[], past: PastNote[] = pastNotes): PersonNote[] {
  return [...past, ...notes].filter((n) => n.personId === personId).sort((a, b) => a.date.localeCompare(b.date));
}

/** A returning person: what she noted last time and anything she said she'd do. */
export function recall(personId: string, notes: PersonNote[], promises: Promise_[], past: PastNote[] = pastNotes) {
  const before = past.filter((n) => n.personId === personId);
  const open = [
    ...before.filter((n) => n.promise && !promises.some((p) => p.id === promiseId(n) && p.done)).map((n) => n.promise!),
    ...promises.filter((p) => p.personId === personId && !p.done && !before.some((n) => promiseId(n) === p.id)).map((p) => p.text),
  ];
  return before.length || open.length ? { before, open } : null;
}
export const promiseId = (n: { personId: string; date: string }) => `${n.personId}-${n.date}`;

/**
 * A follow-up written only from her own note. With no note there's nothing true to say,
 * so it asks her for one line instead of making something up.
 */
export function followUp(person: Person, note: string | undefined, event: string, student: string): { kind: "ask" } | { kind: "draft"; text: string } {
  const said = note?.trim();
  if (!said) return { kind: "ask" };
  return { kind: "draft", text: `Hi ${callName(person.name)},\n\nThanks for talking with me at the ${event}. You mentioned: ${lowerFirst(said.replace(/\.$/, ""))}. That stuck with me.\n\n${first(student)}` };
}

/** One next step after the event: a promise she made first, then the first person she talked to. */
export function nextStep(talked: string[], promises: Promise_[], people: Person[]): string | null {
  const open = promises.find((p) => !p.done);
  if (open) return open.text;
  const p = people.find((x) => x.id === talked[0]);
  return p ? `Send ${callName(p.name)} your follow-up` : null;
}

/** "Dr. Elena Reyes" → "Dr. Reyes"; everyone else by first name. */
export const callName = (name: string) => (name.startsWith("Dr. ") ? `Dr. ${name.split(" ").at(-1)}` : first(name));
/** "The lab…" → "the lab…", but leave "RA spots…" alone. */
export const lowerFirst = (t: string) => (/^[A-Z][a-z]/.test(t) ? t[0]!.toLowerCase() + t.slice(1) : t);
const first = (name: string) => name.split(" ")[0]!;
