import { goTogetherEvent, type Opportunity } from "@/data/scenario";

/*
 * Which event she's at, by the scripted clock, and the people she met there.
 * Pure helpers so the share sheet and People you met agree, and tests can pin the clock.
 */

const TZ = "America/Los_Angeles";
/** An event counts as "now" from an hour before it starts to three hours after. */
const BEFORE_MIN = 60;
const AFTER_MIN = 180;

export type AtEvent = { id: string; name: string; when: string; date: string; minutes: number; host: string; photo: string };

/** The card link the QR code opens. An .example domain: nothing real is behind it. */
export const cardLink = (studentId: string) => `https://trellis.example/c/${encodeURIComponent(studentId)}`;

/** The short name people say out loud ("UX Night"), not the listing's full title. */
export function eventName(o: Pick<Opportunity, "id" | "title" | "flyer">): string {
  if (o.id === goTogetherEvent.id) return goTogetherEvent.name;
  if (o.flyer?.headline.length) return o.flyer.headline.join(" ").replace(/\s+/g, " ").trim();
  return o.title.split(":")[0]!.trim();
}

/** Start time in minutes after midnight, read from the listing's "when". */
export function startMinutes(when: string): number | null {
  const m = /(\d{1,2})(?::(\d{2}))?\s*([AP])M/i.exec(when);
  if (!m) return null;
  const h = Number(m[1]) % 12 + (m[3]!.toUpperCase() === "P" ? 12 : 0);
  return h * 60 + Number(m[2] ?? 0);
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const clock = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
};

export function toAtEvent(o: Opportunity): AtEvent | null {
  if (o.kind !== "event") return null;
  const minutes = startMinutes(o.when);
  if (minutes === null) return null;
  const day = WEEKDAY[new Date(`${o.startsOn}T12:00:00Z`).getUTCDay()]!;
  return { id: o.id, name: eventName(o), when: `${day} ${clock(minutes)}`, date: o.startsOn, minutes, host: o.host, photo: o.photo };
}

/** The date (YYYY-MM-DD) and minutes after midnight in the school's time zone. */
export function localNow(now: number): { date: string; minutes: number } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now)).map((p) => [p.type, p.value]));
  return { date: `${parts["year"]}-${parts["month"]}-${parts["day"]}`, minutes: Number(parts["hour"]) * 60 + Number(parts["minute"]) };
}

/** Events she saved that haven't ended yet, soonest first. */
export function upcomingSaved(events: Opportunity[], saved: string[], now: number): AtEvent[] {
  const t = localNow(now);
  return events
    .filter((o) => saved.includes(o.id))
    .map(toAtEvent)
    .filter((e): e is AtEvent => !!e && (e.date > t.date || (e.date === t.date && t.minutes <= e.minutes + AFTER_MIN)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.minutes - b.minutes);
}

/** The saved event happening right now, if any. Otherwise she isn't at one. */
export function eventNow(events: Opportunity[], saved: string[], now: number): AtEvent | null {
  const t = localNow(now);
  return upcomingSaved(events, saved, now).find((e) => e.date === t.date && t.minutes >= e.minutes - BEFORE_MIN && t.minutes <= e.minutes + AFTER_MIN) ?? null;
}

export type Meet = { peerId: string; eventId: string; at: Date; note?: string | undefined; followedUp?: Date | undefined };
export type ScriptedMet = { peerId: string; event: string; date: string; text: string };
export type MetEntry = { event: string; date: string; text: string; live?: { eventId: string; followedUp: boolean } };
export type MetPerson = { peerId: string; entries: MetEntry[] };

/** One row per person: the scripted students she met first, then anyone she met with the share sheet. A person met twice is listed once, with both events. */
export function mergeMet(scripted: ScriptedMet[], met: Meet[], nameOf: (eventId: string) => string): MetPerson[] {
  const out: MetPerson[] = [];
  const row = (peerId: string) => {
    let r = out.find((x) => x.peerId === peerId);
    if (!r) out.push((r = { peerId, entries: [] }));
    return r;
  };
  for (const s of scripted) row(s.peerId).entries.push({ event: s.event, date: s.date, text: s.text });
  for (const m of met) row(m.peerId).entries.push({ event: nameOf(m.eventId), date: localNow(m.at.getTime()).date, text: m.note ?? "", live: { eventId: m.eventId, followedUp: !!m.followedUp } });
  return out;
}

/** Add someone she just met. Meeting the same person at the same event again keeps one entry (and a new note, if she gave one). */
export function addMeet(list: Meet[], peerId: string, eventId: string, at: Date, note?: string): Meet[] {
  const text = note?.trim();
  const i = list.findIndex((m) => m.peerId === peerId && m.eventId === eventId);
  if (i >= 0) return text ? list.map((m, k) => (k === i ? { ...m, note: text } : m)) : list;
  return [...list, { peerId, eventId, at, ...(text ? { note: text } : {}) }];
}
