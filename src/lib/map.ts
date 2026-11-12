import { experiences, outsideSchool, schools, terms, type ClubId, type OrgId } from "@/data/scenario";
import { MAP_ORIGIN, mapAssignments, mapConfirmed, mapMasters, mapMilestones, mapPlannedEvents, mapSchools, mapSideClass, mapSpans, termDates } from "@/data/map";

export type MapLayer = "events" | "internships" | "clubs";
/** Finished, happening now, set for later, or still only a plan. */
export type MapStatus = "done" | "now" | "confirmed" | "planned";
export const STATUS_LABEL: Record<MapStatus, string> = { done: "Done", now: "Now", confirmed: "Confirmed", planned: "Planned" };

/** World pixels per month. The layout never changes; only the camera does. */
export const PPM = 72;
export const MIN_SCALE = 0.12;
export const MAX_SCALE = 5;
/** Nodes stop shrinking and growing on screen at these sizes, like markers on a map. Zooming still spreads out time. */
export const NODE_MIN = 0.72;
export const NODE_MAX = 1.2;
export const nodeScale = (s: number) => Math.min(NODE_MAX, Math.max(NODE_MIN, s));
/** Coursework labels appear from this close. */
export const NEAR_SCALE = 1.6;
/** Weekly labels on the ruler appear from this close. */
const WEEK_SCALE = 2.4;

const parts = (iso: string) => iso.split("-").map(Number) as [number, number, number];

/** Months after the map's origin, with the day as a fraction. */
export function monthsFrom(origin: string, iso: string): number {
  const [oy, om] = parts(origin);
  const [y, m, d] = parts(iso);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return (y - oy) * 12 + (m - om) + (d - 1) / days;
}
export const worldY = (iso: string) => monthsFrom(MAP_ORIGIN, iso) * PPM;

export function statusOf(start: string, end: string, today: string, confirmed: boolean): MapStatus {
  if (end < today) return "done";
  if (start <= today) return "now";
  return confirmed ? "confirmed" : "planned";
}

/** Moves items down only as far as needed so none overlap. Input order does not matter. */
export function placeStack<T extends { top: number; h: number }>(items: T[], gap: number): T[] {
  let floor = -Infinity;
  return [...items]
    .sort((a, b) => a.top - b.top)
    .map((item) => {
      const top = Math.max(item.top, floor);
      floor = top + item.h + gap;
      return { ...item, top };
    });
}

// ---------- Camera ----------
export type Camera = { x: number; y: number; s: number };
export type Viewport = { w: number; h: number };
export type Insets = { l: number; t: number; r: number; b: number };
export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

export const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** Changes scale while the point under (px, py) stays under it. Across the map, spacing follows node size; down the map, it follows time. */
export function zoomAt(c: Camera, s: number, px: number, py: number): Camera {
  const next = clampScale(s);
  return { s: next, x: px - (px - c.x) * (nodeScale(next) / nodeScale(c.s)), y: py - (py - c.y) * (next / c.s) };
}

/** Puts a world point in the middle of the free area. */
export function centerOn(wx: number, wy: number, s: number, v: Viewport, i: Insets): Camera {
  const scale = clampScale(s);
  return { s: scale, x: i.l + (v.w - i.l - i.r) / 2 - wx * nodeScale(scale), y: i.t + (v.h - i.t - i.b) / 2 - wy * scale };
}

/** Frames the given bounds inside the free area. */
export function fitCamera(b: Bounds, v: Viewport, i: Insets): Camera {
  const s = Math.min((v.h - i.t - i.b) / (b.maxY - b.minY), 1);
  return centerOn((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, s, v, i);
}

/**
 * Keeps the middle of the screen on the map so it can't be lost. Far out to the side is only
 * reachable near the row that actually has something there.
 */
export function clampCamera(c: Camera, map: { bounds: Bounds; reach: { x: number; y: number } }, v: Viewport, i: Insets): Camera {
  const k = nodeScale(c.s);
  const midX = i.l + (v.w - i.l - i.r) / 2;
  const midY = i.t + (v.h - i.t - i.b) / 2;
  const between = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  const y = between(c.y, midY - map.bounds.maxY * c.s, midY - map.bounds.minY * c.s);
  const distance = Math.abs((midY - y) / c.s - map.reach.y) * c.s;
  const near = Math.max(0, 1 - distance / (v.h * 0.6));
  const maxX = map.bounds.maxX + (map.reach.x - map.bounds.maxX) * near;
  return { s: c.s, y, x: between(c.x, midX - maxX * k, midX - map.bounds.minX * k) };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string) => {
  const [, m, d] = parts(iso);
  return `${MONTHS[m - 1]} ${d}`;
};
const monthYear = (iso: string) => `${MONTHS[parts(iso)[1] - 1]} ${parts(iso)[0]}`;
const longDate = (iso: string) => `${shortDate(iso)}, ${parts(iso)[0]}`;

export type MapTick = { id: string; y: number; label: string; major: boolean };

/** Time labels for the edge of the screen. They get finer as you zoom in. */
export function rulerTicks(c: Camera, height: number, lastMonth: number): MapTick[] {
  const [oy, om] = parts(MAP_ORIGIN);
  const first = Math.max(0, Math.floor(-c.y / c.s / PPM));
  const last = Math.min(lastMonth, Math.ceil((height - c.y) / c.s / PPM));
  const ticks: MapTick[] = [];
  for (let m = first; m <= last; m++) {
    const index = om - 1 + m;
    const year = oy + Math.floor(index / 12);
    const month = index % 12;
    const y = c.y + m * PPM * c.s;
    const january = month === 0;
    if (c.s < 0.4) {
      if (january) ticks.push({ id: `${m}`, y, label: String(year), major: true });
      continue;
    }
    ticks.push({ id: `${m}`, y, label: january ? `${MONTHS[month]} ${year}` : MONTHS[month]!, major: january });
    if (c.s >= WEEK_SCALE) for (const [w, day] of [[1, 8], [2, 15], [3, 22]] as const) ticks.push({ id: `${m}-${w}`, y: y + (w / 4) * PPM * c.s, label: `${MONTHS[month]} ${day}`, major: false });
  }
  return ticks;
}

// ---------- Layout ----------
export type MapVisual = { type: "school"; school: "bayview" | "northgate" | "lakeshore" } | { type: "org"; org: OrgId; club?: ClubId } | { type: "photo"; photo: string } | { type: "cap" };
export type MapSchool = "bayview" | "northgate" | "lakeshore";
export type MapNodeKind = "school" | "term" | "work" | "milestone" | "event" | "span" | "side" | "add";
export type MapNode = {
  id: string;
  kind: MapNodeKind;
  layer?: MapLayer;
  school?: MapSchool;
  x: number;
  top: number;
  w: number;
  h: number;
  iso: string;
  title: string;
  sub?: string;
  status: MapStatus;
  imagined?: boolean;
  visual?: MapVisual;
  /** Coursework opens the term it belongs to. */
  parent?: string;
  when?: string;
  place?: string;
  about?: string;
  courses?: { code: string; title: string }[];
  coursework?: { title: string; date: string }[];
  skills?: string[];
  facts?: { label: string; value: string }[];
  to?: "/semester" | "/career";
};
export type MapLink = { id: string; d: string; layer?: MapLayer; school?: MapSchool; status: MapStatus };
export type MapPort = { id: string; x: number; y: number; layer?: MapLayer; school?: MapSchool };
export type MapLayout = {
  spine: { id: string; y1: number; y2: number; status: MapStatus; school: MapSchool }[];
  today: number;
  nodes: MapNode[];
  links: MapLink[];
  ports: MapPort[];
  bounds: Bounds;
  /** The one place the map extends past its main columns. */
  reach: { x: number; y: number };
  lastMonth: number;
};

const TERM = { x: -68, w: 136, h: 40 };
const HUB = { w: 208, h: 60 };
const MILESTONE = { x: -82, w: 164, h: 28 };
const LEFT = { x: -292, w: 144 };
const RIGHT = { x: 116, w: 148 };
const SIDE = { x: 316, w: 148 };
const CARD_H = 36;
const LANE = { clubs: -98, internships: -118 } as const;

const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Big-picture dates for a term, plus any papers from its syllabi. */
function workFor(term: { id: string; start: string; end: string; courses: { code: string }[] }) {
  const span = (Date.parse(term.end) - Date.parse(term.start)) / 86_400_000;
  const at = (share: number) => addDays(term.start, Math.round(span * share));
  const papers = term.courses.flatMap((c) => (mapAssignments[c.code] ?? []).map((title) => `${c.code}: ${title}`));
  return [
    ...papers.map((title, i) => ({ title, date: at(0.26 + (i / Math.max(1, papers.length)) * 0.56) })),
    { title: "Midterms", date: at(0.48) },
    { title: "Finals", date: at(0.96) },
  ].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Lays out the whole journey. Classes are always here; the page hides layers, so nothing jumps.
 * `r` is node size relative to the time scale, so stacks open up when nodes are large against it.
 */
export function layoutMap({ masters, today, r = 1 }: { masters: boolean; today: string; r?: number }): MapLayout {
  const stack = <T extends { top: number; h: number }>(items: T[], gap: number) => placeStack(items.map((i) => ({ ...i, h: i.h * r })), gap * r).map((i) => ({ ...i, h: i.h / r }));
  const links: MapLink[] = [];
  const ports: MapPort[] = [];
  const nodes: MapNode[] = [];

  const allTerms = [
    ...terms.map((t) => ({ id: t.id, name: t.name, school: t.school as "bayview" | "northgate", courses: t.courses as { code: string; title: string }[], imagined: false, ...termDates[t.id]! })),
    ...(masters ? mapMasters.terms.map((t) => ({ ...t, school: "northgate" as const, imagined: true })) : []),
  ];

  type Draft = MapNode & { anchor: number };
  const mainDrafts: Draft[] = [];
  for (const t of allTerms) {
    const anchor = worldY(t.start);
    ports.push({ id: `port-${t.id}`, x: 0, y: anchor, school: t.school });
    mainDrafts.push({
      id: t.id, kind: "term", school: t.school, ...TERM, top: anchor, anchor, iso: t.start, title: t.name, sub: schools[t.school].short, status: statusOf(t.start, t.end, today, mapConfirmed.has(t.id)), imagined: t.imagined,
      visual: { type: "school", school: t.school }, courses: t.courses.map((c) => ({ code: c.code, title: c.title })), coursework: workFor(t).map((w) => ({ title: w.title, date: shortDate(w.date) })), when: `${longDate(t.start)} to ${longDate(t.end)}`, ...(t.imagined ? {} : { to: "/semester" as const }),
    });
  }
  for (const h of mapSchools) {
    const anchor = worldY(h.start);
    const here = terms.filter((t) => t.school === h.school);
    // The first school sits above its first term; later ones land on their date.
    const top = h.school === "bayview" ? anchor - (HUB.h + 10) * r : anchor;
    mainDrafts.push({
      id: h.id, kind: "school", school: h.school, x: -HUB.w / 2, ...HUB, top, anchor, iso: h.start, title: schools[h.school].short, sub: `${monthYear(h.start)} to ${monthYear(h.end)}`, status: statusOf(h.start, h.end, today, mapConfirmed.has(h.id)), visual: { type: "school", school: h.school }, about: schools[h.school].role,
      facts: [{ label: "Full name", value: schools[h.school].name }, { label: "Calendar", value: schools[h.school].system }, { label: "Terms", value: String(here.length) }, { label: "Classes", value: String(here.reduce((n, t) => n + t.courses.length, 0)) }], to: "/semester",
    });
  }
  const visualFor: Record<string, MapVisual> = { graduate: { type: "cap" }, "ms-start": { type: "school", school: "northgate" }, "ms-finish": { type: "cap" } };
  const milestones = [...mapMilestones, ...(masters ? [{ id: "ms-start", date: mapMasters.start, title: mapMasters.title }, { id: "ms-finish", date: mapMasters.finish, title: `Finish ${mapMasters.title}` }] : [])];
  for (const m of milestones) {
    const anchor = worldY(m.date);
    mainDrafts.push({ id: m.id, kind: "milestone", school: "northgate", ...MILESTONE, top: anchor, anchor, iso: m.date, title: m.title, status: statusOf(m.date, m.date, today, mapConfirmed.has(m.id)), imagined: m.id.startsWith("ms-"), visual: visualFor[m.id]!, when: longDate(m.date) });
  }
  if (!masters) {
    const anchor = worldY("2029-07-01");
    mainDrafts.push({ id: "add", kind: "add", ...MILESTONE, top: anchor, anchor, iso: "2029-07-01", title: "Add what's next", status: "planned" });
  }
  const main = stack(mainDrafts, 8);
  // A term pushed down by its neighbors takes its port with it.
  for (const p of ports) p.y = main.find((m) => `port-${m.id}` === p.id)?.top ?? p.y;
  nodes.push(...main);

  // Up close, each term's dates sit along the line below its card.
  const blocker = (top: number, h: number) => main.find((m) => top < m.top + m.h * r + 3 * r && m.top < top + h * r + 3 * r);
  for (const t of main.filter((n) => n.kind === "term")) {
    const term = allTerms.find((x) => x.id === t.id)!;
    const work = workFor(term).map((w, i) => ({ id: `${t.id}-work-${i}`, kind: "work" as const, x: 8, w: 96, h: 16, top: Math.max(worldY(w.date), t.top + t.h * r + 6 * r), iso: w.date, title: w.title, sub: shortDate(w.date), status: statusOf(w.date, w.date, today, false), parent: t.id }));
    let floor = -Infinity;
    for (const w of work) {
      let top = Math.max(w.top, floor);
      for (let hit = blocker(top, w.h); hit; hit = blocker(top, w.h)) top = hit.top + hit.h * r + 3 * r;
      nodes.push({ ...w, top });
      floor = top + w.h * r + 3 * r;
    }
  }

  const leftDrafts: Draft[] = mapSpans.map((s) => {
    const y1 = worldY(s.start);
    const y2 = worldY(s.end);
    const lane = LANE[s.layer];
    const bend = Math.min(34 * r, (y2 - y1) / 2);
    const status = statusOf(s.start, s.end, today, mapConfirmed.has(s.id));
    links.push({ id: `span-${s.id}`, layer: s.layer, status, d: `M 0 ${y1} C 0 ${y1 + bend / 2}, ${lane} ${y1 + bend / 2}, ${lane} ${y1 + bend} L ${lane} ${y2 - bend} C ${lane} ${y2 - bend / 2}, 0 ${y2 - bend / 2}, 0 ${y2}` });
    ports.push({ id: `in-${s.id}`, x: 0, y: y1, layer: s.layer }, { id: `out-${s.id}`, x: 0, y: y2, layer: s.layer });
    const anchor = y1 + bend;
    return { id: s.id, kind: "span", layer: s.layer, ...LEFT, h: CARD_H, top: anchor - (CARD_H * r) / 2, anchor, iso: s.start, title: s.title, sub: s.host, status, visual: { type: "org", org: s.org, ...(s.club ? { club: s.club } : {}) }, when: `${longDate(s.start)} to ${longDate(s.end)}`, about: s.about };
  });
  for (const d of stack(leftDrafts, 6)) {
    nodes.push(d);
    const lane = LANE[d.layer as "clubs" | "internships"];
    const edge = LEFT.x + LEFT.w;
    const mid = d.top + (d.h * r) / 2;
    links.push({ id: `link-${d.id}`, layer: d.layer!, status: d.status, d: `M ${lane} ${d.anchor} C ${lane - 10} ${d.anchor}, ${edge + 10} ${mid}, ${edge} ${mid}` });
  }

  const eventDrafts: Draft[] = [
    ...experiences.map((e): Draft => {
      const anchor = worldY(e.date);
      return { id: e.id, kind: "event", layer: "events", ...RIGHT, h: CARD_H, top: anchor - (CARD_H * r) / 2, anchor, iso: e.date, title: e.title, sub: `${shortDate(e.date)} · ${e.host}`, status: statusOf(e.date, e.date, today, true), visual: { type: "photo", photo: e.photo }, when: `${longDate(e.date)}, ${e.time}`, place: e.place, about: e.listing, skills: e.skills.map((s) => s.name), to: e.date >= today ? ("/semester" as const) : ("/career" as const) };
    }),
    ...mapPlannedEvents.map((e): Draft => {
      const anchor = worldY(e.date);
      return { id: e.id, kind: "event", layer: "events", ...RIGHT, h: CARD_H, top: anchor - (CARD_H * r) / 2, anchor, iso: e.date, title: e.title, sub: `${shortDate(e.date)} · ${e.host}`, status: statusOf(e.date, e.date, today, false), visual: { type: "photo", photo: e.photo }, when: `${longDate(e.date)}, ${e.time}`, place: e.place };
    }),
  ];
  for (const d of stack(eventDrafts, 6)) {
    nodes.push(d);
    const mid = d.top + (d.h * r) / 2;
    ports.push({ id: `port-${d.id}`, x: 0, y: d.anchor, layer: "events" });
    links.push({ id: `link-${d.id}`, layer: "events", status: d.status, d: `M 0 ${d.anchor} C 70 ${d.anchor}, ${RIGHT.x - 70} ${mid}, ${RIGHT.x} ${mid}` });
  }

  // A class from another school arrives from outside the map and joins the line.
  const sideY = worldY(mapSideClass.start);
  const sideEnd = worldY(mapSideClass.end);
  const sideStatus = statusOf(mapSideClass.start, mapSideClass.end, today, false);
  const sideMid = sideY;
  nodes.push({ id: mapSideClass.id, kind: "side", school: "lakeshore", ...SIDE, h: CARD_H, top: sideMid - (CARD_H * r) / 2, iso: mapSideClass.start, title: mapSideClass.code, sub: `${mapSideClass.title} · ${mapSideClass.school}`, status: sideStatus, visual: { type: "school", school: "lakeshore" }, courses: [{ code: mapSideClass.code, title: mapSideClass.title }], when: `${longDate(mapSideClass.start)} to ${longDate(mapSideClass.end)}`, about: "Taken as a visiting student. Not offered at Bayview." });
  links.push({ id: "link-side", school: "lakeshore", status: sideStatus, d: `M ${SIDE.x} ${sideMid} C ${SIDE.x - 150} ${sideMid}, 0 ${sideEnd - 70}, 0 ${sideEnd}` });
  const hubX = SIDE.x + SIDE.w + 44;
  links.push({ id: "link-side-in", school: "lakeshore", status: sideStatus, d: `M ${SIDE.x + SIDE.w} ${sideMid} L ${hubX} ${sideMid}` });
  ports.push({ id: "port-side", x: 0, y: sideEnd, school: "lakeshore" });
  nodes.push({
    id: "school-lakeshore", kind: "school", school: "lakeshore", x: hubX, ...HUB, top: sideMid - (HUB.h * r) / 2, iso: mapSideClass.start, title: outsideSchool.short, sub: "Summer 2027", status: sideStatus, visual: { type: "school", school: "lakeshore" }, about: outsideSchool.note,
    facts: [{ label: "Full name", value: outsideSchool.name }, { label: "Calendar", value: outsideSchool.system }, { label: "Class", value: `${outsideSchool.course.code}, ${outsideSchool.course.title}` }, { label: "Counts as", value: outsideSchool.transfer.lands }],
  });

  const now = worldY(today);
  const lastConfirmed = worldY(termDates["f26"]!.end);
  const lowest = Math.max(...nodes.map((n) => n.top + n.h * r));
  const lineTop = main.find((n) => n.id === "school-bayview")!.top;
  const northgate = main.find((n) => n.id === "school-northgate")!;
  const handoff = northgate.top + (northgate.h * r) / 2;
  const bottom = Math.max(...main.filter((n) => n.kind !== "add").map((n) => n.top));
  return {
    spine: [
      { id: "planned-northgate", y1: handoff, y2: bottom, status: "planned", school: "northgate" },
      { id: "planned-bayview", y1: lastConfirmed, y2: handoff, status: "planned", school: "bayview" },
      { id: "confirmed", y1: now, y2: lastConfirmed, status: "confirmed", school: "bayview" },
      { id: "done", y1: lineTop, y2: now, status: "done", school: "bayview" },
    ],
    today: now,
    nodes,
    links,
    ports,
    bounds: { minX: LEFT.x, maxX: RIGHT.x + RIGHT.w, minY: lineTop - 24 * r, maxY: lowest },
    reach: { x: hubX + HUB.w, y: sideMid },
    lastMonth: Math.ceil(lowest / PPM),
  };
}
