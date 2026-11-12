/**
 * Steering: what Maya tells the helpers, kept as plain notes they remember, and the short
 * re-plan run each note causes. Pure, so the scripted demo and its tests agree.
 * Scripted until the live agent is connected; the backend will send these runs itself.
 */
import type { TimedEvent } from "@/data/edge-runs";
import type { Option } from "@/data/scenario";

/** A note the helpers keep using until she removes it. */
export type Constraint = { id: string; text: string; from: "asked" | "said" };

/** Words she might type, mapped to a note the helpers can act on. Anything else is kept as she wrote it. */
const KNOWN: { id: string; text: string; test: RegExp }[] = [
  { id: "no-early", text: "No classes before 10 am", test: /before\s*10|no\s+(early|morning)|mornings?\s+(off|free)|(can'?t|cannot|not|no)\b.*\b(mornings?|[89]\s*am)\b/i },
  { id: "no-friday", text: "No Friday classes", test: /fri(day)?s?\b/i },
  { id: "sure", text: "Pick classes that surely count", test: /surely count|for sure|safe(st)? (option|choice)|definitely counts?/i },
  { id: "tuthu", text: "Tue/Thu works better for classes", test: /tue(sday)?s?\s*(\/|and|&)\s*thu(rsday)?s?/i },
];

export function constraintFrom(text: string): Constraint | null {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return null;
  const known = KNOWN.find((k) => k.test.test(t));
  if (known) return { id: known.id, text: known.text, from: "said" };
  const plain = t.replace(/[.!]+$/, "");
  return { id: `note-${plain.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`, text: plain.charAt(0).toUpperCase() + plain.slice(1), from: "said" };
}

/** Adds a note once; a newer note with the same id replaces the old one. */
export function remember(list: Constraint[], c: Constraint): Constraint[] {
  return [...list.filter((x) => x.id !== c.id), c];
}

export function forget(list: Constraint[], id: string): Constraint[] {
  return list.filter((x) => x.id !== id);
}

/** The hour a section starts, from "Tue/Thu 9:00–10:50 am" or "Mon/Wed 1:00–2:50 pm". */
export function startHour(sectionTime: string): number {
  const m = sectionTime.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):\d{2}\s*(am|pm)/i);
  if (!m) return 12;
  let h = Number(m[1]);
  const end = Number(m[3]);
  const pm = m[4]!.toLowerCase() === "pm";
  // The am/pm belongs to the end time; a start later on the clock than the end crossed noon.
  if (pm && h !== 12 && h <= end) h += 12;
  return h;
}

const fits = (o: Option, c: Constraint) => {
  if (c.id === "no-early") return startHour(o.sectionTime) >= 10;
  if (c.id === "no-friday") return !/fri/i.test(o.sectionTime);
  return true;
};
const prefers = (o: Option, c: Constraint) => (c.id === "sure" ? o.verdict === "counts" : c.id === "tuthu" ? /tue\/thu/i.test(o.sectionTime) : false);

/** Open options that still count, filtered by her notes, best first. */
export function steerPick(open: Option[], notes: Constraint[]): { pick: Option | null; ruledOut: Option[] } {
  const ruledOut = open.filter((o) => notes.some((c) => !fits(o, c)));
  const left = open.filter((o) => !ruledOut.includes(o));
  const score = (o: Option) => notes.filter((c) => prefers(o, c)).length;
  const pick = [...left].sort((a, b) => score(b) - score(a))[0] ?? null;
  return { pick, ruledOut };
}

const short = (o: Option) => o.course.replace("BCC ", "");

/** The re-plan run one note causes: Planner checks the open options against it and picks again. */
export function steerEvents(note: Constraint, open: Option[], notes: Constraint[], previousId: string | null): TimedEvent[] {
  const { pick, ruledOut } = steerPick(open, notes);
  const checked: TimedEvent = { type: "step", tool: "find_courses_that_count", helper: "planner", level: "reads", ok: true, at: 900,
    text: ruledOut.length ? `Checked ${open.length} open options against "${note.text}": ${ruledOut.map(short).join(" and ")} ${ruledOut.length === 1 ? "doesn't" : "don't"} fit` : `Checked ${open.length} open options against "${note.text}": all still fit`,
    sourceIds: [] };
  const start: TimedEvent = { type: "start", trigger: "steer", mode: "live", reason: note.text, at: 0 };
  if (!pick) {
    return [start, checked, { type: "done", result: { optionId: null, why: `No open option fits "${note.text}". Remove the note to see them all again.`, model: null, gaveUp: true }, ttvMs: 1000, at: 1000 }];
  }
  const changed = pick.id !== previousId;
  return [
    start,
    checked,
    { type: "step", tool: "submit_recommendation", helper: "planner", level: "drafts", ok: true, at: 1800, sourceIds: pick.sourceIds,
      text: changed ? `Recommended ${short(pick)} §${pick.section} instead, and it passed the safety check` : `Kept ${short(pick)} §${pick.section}, and it passed the safety check` },
    { type: "done", result: { optionId: pick.id, why: `${short(pick)} meets ${pick.sectionTime}, ${pick.seatsOpen} seats are open, and it fits what you told me.`, model: null, gaveUp: false }, ttvMs: 1800, at: 1850 },
  ];
}

/** In the Home ask box: a note to remember ("I can't do mornings") rather than a question. */
export function noteFrom(text: string): Constraint | null {
  const t = text.trim();
  if (!t || /\?\s*$/.test(t)) return null;
  const c = constraintFrom(t);
  if (!c) return null;
  if (!c.id.startsWith("note-")) return c;
  return /^(remember|i can'?t|i cannot|i don'?t|i won'?t|i prefer|i work|i'?d rather|no |don'?t|please don'?t|only )/i.test(t) ? constraintFrom(t.replace(/^remember( that)?\s*/i, "")) : null;
}
