import type { EventPlatform, Opportunity, Posting } from "@/data/scenario";
import { clashes, minutes, type Found } from "@/lib/experiences";

/** One upcoming event on the Events page: something Maya signed up for, or an Explore pick, or both. */
export type EventItem = {
  id: string;
  title: string;
  host: string;
  /** YYYY-MM-DD */
  date: string;
  time: string;
  place: string;
  photo: string;
  /** Connected accounts it's listed on. Empty for an Explore pick she hasn't signed up for. */
  via: EventPlatform[];
  /** She has an RSVP, ticket or check-in on a connected account. */
  registered: boolean;
  /** Why it's worth her time, in Sprout's words. */
  why?: string | undefined;
  opportunity?: Opportunity | undefined;
  experience?: Found | undefined;
};

const timeIn = (when: string) => when.match(/\d{1,2}:\d{2}\s*[AP]M/i)?.[0] ?? "";

/**
 * Upcoming events from her accounts plus Explore's event picks, soonest first.
 * An account event that matches an Explore listing shows once, with the listing's flyer.
 */
export function allEvents(found: Found[], picks: Opportunity[], today: string): EventItem[] {
  const listings = new Map(picks.filter((o) => o.kind === "event").map((o) => [o.id, o]));
  const items: EventItem[] = [];
  for (const e of found) {
    if (e.date < today) continue;
    const o = e.opportunityId ? listings.get(e.opportunityId) : undefined;
    if (o) listings.delete(o.id);
    items.push({
      id: e.id,
      title: e.title,
      host: e.host,
      date: e.date,
      time: e.time,
      place: e.place,
      photo: o?.photo ?? e.photo,
      via: e.via,
      registered: true,
      why: e.prep,
      opportunity: o,
      experience: e,
    });
  }
  for (const o of listings.values()) {
    if (o.startsOn < today) continue;
    items.push({
      id: o.id,
      title: o.title,
      host: o.host,
      date: o.startsOn,
      time: timeIn(o.when),
      place: o.place,
      photo: o.photo,
      via: [],
      registered: false,
      why: o.fills.length ? `Builds ${o.fills.join(", ").toLowerCase()}` : undefined,
      opportunity: o,
    });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || minutes(a.time) - minutes(b.time));
}

/** Events that start within three hours of another on the same day. */
export const overlaps = (items: EventItem[]) => clashes(items);

/** The site an event is listed on, from her accounts or its posting. */
export function siteOf(e: EventItem, posting: Posting | undefined): EventPlatform | undefined {
  if (e.via[0]) return e.via[0];
  const site = posting?.site.toLowerCase();
  return site === "luma" || site === "handshake" || site === "eventbrite" ? site : undefined;
}

/** Days in a month grid starting Monday, with blanks before the 1st. Dates are YYYY-MM-DD. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`),
  ];
}

/** True when `date` falls in the 7 days starting `today`. */
export function inNextWeek(date: string, today: string) {
  const d = Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`);
  return d >= 0 && d < 7 * 86400000;
}
