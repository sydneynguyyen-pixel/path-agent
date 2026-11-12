import { ledgerSkills, type AttendanceProof, type EventPlatform, type EvidenceLevel, type Experience } from "@/data/scenario";
import type { SkillReview } from "@/lib/skills";

/** An event the student can see, with the services it came from and the best proof among them. */
export type Found = Experience & { proof: AttendanceProof; via: EventPlatform[] };
/** The student's own answer to "Did you go?". Sprout never fills this in. */
export type Checks = Record<string, "went" | "missed">;
export type Attendance = "upcoming" | "checked-in" | "confirmed" | "ask" | "missed";

const PROOF: Record<AttendanceProof, number> = { rsvp: 1, ticket: 2, "checked-in": 3 };
const LEVEL: Record<EvidenceLevel, number> = { Taught: 1, Practiced: 2, Demonstrated: 3 };

/** Only events listed on a service the student connected. An event on two services shows once. */
export function fromAccounts(list: Experience[], linked: EventPlatform[]): Found[] {
  return list.flatMap((e) => {
    const on = e.foundOn.filter((f) => linked.includes(f.platform));
    if (on.length === 0) return [];
    const best = on.reduce((a, b) => (PROOF[b.proof] > PROOF[a.proof] ? b : a));
    return [{ ...e, proof: best.proof, via: on.map((f) => f.platform) }];
  });
}

/** A ticket or RSVP only says someone planned to go, so past ones wait for the student to say. */
export function attendance(e: Found, today: string, checks: Checks): Attendance {
  if (e.date >= today) return "upcoming";
  const said = checks[e.id];
  if (said) return said === "went" ? "confirmed" : "missed";
  return e.proof === "checked-in" ? "checked-in" : "ask";
}
export const wentTo = (a: Attendance) => a === "checked-in" || a === "confirmed";

export function seasonOf(date: string) {
  const [y, m] = [Number(date.slice(0, 4)), Number(date.slice(5, 7))];
  return `${m <= 5 ? "Spring" : m <= 8 ? "Summer" : "Fall"} ${y}`;
}

/** Upcoming soonest first; the past newest first, grouped by term. */
export function timeline(found: Found[], today: string) {
  const upcoming = found.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || minutes(a.time) - minutes(b.time));
  const past = found.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const seasons: { season: string; events: Found[] }[] = [];
  for (const e of past) {
    const season = seasonOf(e.date);
    const group = seasons.find((s) => s.season === season);
    if (group) group.events.push(e);
    else seasons.push({ season, events: [e] });
  }
  return { upcoming, seasons };
}

export function minutes(time: string) {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 0;
  const h = (Number(m[1]) % 12) + (m[3]!.toUpperCase() === "PM" ? 12 : 0);
  return h * 60 + Number(m[2]);
}

/** Upcoming events on the same day that start within three hours of each other. Maps each to the one it clashes with. */
export function clashes<T extends { id: string; date: string; time: string }>(upcoming: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const a of upcoming)
    for (const b of upcoming)
      if (a.id !== b.id && a.date === b.date && Math.abs(minutes(a.time) - minutes(b.time)) < 180 && !out[a.id]) out[a.id] = b;
  return out;
}

export type EventSkill = { id: string; name: string; theme: string; level: EvidenceLevel; events: Found[]; courses: string[] };
export const eventSkillKey = (id: string) => `event-${id}`;

/** Skills from events the student went to, merged across events, with any course that teaches the same thing. */
export function skillsFromEvents(found: Found[], today: string, checks: Checks): EventSkill[] {
  const byId = new Map<string, EventSkill>();
  for (const e of found) {
    if (!wentTo(attendance(e, today, checks))) continue;
    for (const s of e.skills) {
      const known = byId.get(s.id);
      if (known) {
        known.events.push(e);
        if (LEVEL[s.level] > LEVEL[known.level]) known.level = s.level;
      } else {
        const courses = [...new Set(ledgerSkills.filter((l) => l.name.toLowerCase() === s.name.toLowerCase()).map((l) => l.course))];
        byId.set(s.id, { id: s.id, name: s.name, theme: s.theme, level: s.level, events: [e], courses });
      }
    }
  }
  return [...byId.values()].sort((a, b) => LEVEL[b.level] - LEVEL[a.level] || b.events.length - a.events.length || a.name.localeCompare(b.name));
}

/**
 * What a shared profile shows: only experiences the student picked and actually went to,
 * and only skills they confirmed that one of those experiences backs up.
 */
export function sharedProfile(found: Found[], today: string, checks: Checks, reviews: Record<string, SkillReview>, picked: string[]) {
  const shown = found.filter((e) => picked.includes(e.id) && wentTo(attendance(e, today, checks)));
  const skills = skillsFromEvents(shown, today, checks).filter((s) => reviews[eventSkillKey(s.id)]?.confirmed && !reviews[eventSkillKey(s.id)]?.hidden);
  return { experiences: shown, skills };
}
