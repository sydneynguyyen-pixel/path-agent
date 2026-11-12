/**
 * Home is a desktop: a wallpaper, the agent's briefing with an ask box, and widgets the
 * student arranges. Everything here is pure so layout changes stay testable.
 */
export type WidgetKind = "week" | "deadline" | "path" | "next" | "skills" | "saved" | "match";
/** s = 1×1, m = 2×1, l = 2×2 on the widget grid. */
export type WidgetSize = "s" | "m" | "l";
export type Placed = { kind: WidgetKind; size: WidgetSize };
export type WidgetGroup = "Today" | "Path" | "Career" | "People";

export const WIDGETS: Record<WidgetKind, { title: string; blurb: string; sizes: WidgetSize[]; group: WidgetGroup }> = {
  week: { title: "This week", blurb: "The next seven days and what's due", sizes: ["m", "l"], group: "Today" },
  deadline: { title: "Deadline", blurb: "Days left on your transfer application", sizes: ["s", "m"], group: "Today" },
  path: { title: "Your path", blurb: "Units so far and when you graduate", sizes: ["s", "m", "l"], group: "Path" },
  next: { title: "Next outside class", blurb: "One event or club that fits your goal", sizes: ["m", "l"], group: "Career" },
  skills: { title: "Skills toward your goal", blurb: "What you have proof for, and what's next", sizes: ["m", "l"], group: "Career" },
  saved: { title: "Saved", blurb: "Opportunities you added to your plan", sizes: ["m", "l"], group: "Career" },
  match: { title: "Going together", blurb: "Who you are going to an event with", sizes: ["m"], group: "People" },
};

export const WIDGET_KINDS = Object.keys(WIDGETS) as WidgetKind[];

export const DEFAULT_WIDGETS: Placed[] = [
  { kind: "week", size: "l" },
  { kind: "deadline", size: "s" },
  { kind: "path", size: "s" },
  { kind: "next", size: "m" },
];

const fits = (kind: WidgetKind, size: WidgetSize) => WIDGETS[kind].sizes.includes(size);

/** Adds a widget at the end. Each kind lives on Home once. */
export function addWidget(list: Placed[], kind: WidgetKind, size?: WidgetSize): Placed[] {
  if (list.some((w) => w.kind === kind)) return list;
  const s: WidgetSize = size && fits(kind, size) ? size : WIDGETS[kind].sizes.includes("m") ? "m" : WIDGETS[kind].sizes[0]!;
  return [...list, { kind, size: s }];
}

export function removeWidget(list: Placed[], kind: WidgetKind): Placed[] {
  return list.filter((w) => w.kind !== kind);
}

/** Moves one widget to another's place, as when dragging onto it. */
export function moveWidget(list: Placed[], kind: WidgetKind, to: number): Placed[] {
  const from = list.findIndex((w) => w.kind === kind);
  if (from < 0) return list;
  const i = Math.max(0, Math.min(list.length - 1, to));
  if (i === from) return list;
  const next = [...list];
  const [w] = next.splice(from, 1);
  next.splice(i, 0, w!);
  return next;
}

export function resizeWidget(list: Placed[], kind: WidgetKind, size: WidgetSize): Placed[] {
  if (!fits(kind, size)) return list;
  return list.map((w) => (w.kind === kind ? { ...w, size } : w));
}

/** Anything read back from storage: unknown kinds and sizes dropped, one of each kind. */
export function cleanWidgets(raw: unknown): Placed[] {
  if (!Array.isArray(raw)) return DEFAULT_WIDGETS;
  const out: Placed[] = [];
  for (const r of raw) {
    const kind = (r as Placed | null)?.kind;
    const size = (r as Placed | null)?.size;
    if (!kind || !(kind in WIDGETS) || out.some((w) => w.kind === kind)) continue;
    out.push({ kind, size: size && fits(kind, size) ? size : WIDGETS[kind].sizes[0]! });
  }
  return out;
}

export type Season = "fall" | "winter" | "spring" | "summer";
export type WallpaperId = "season" | Season | "bay" | "glow" | "peach" | "sky" | "aqua" | "lilac";
export type Wallpaper = { id: WallpaperId; name: string; kind: "illustration" | "color" };

export const WALLPAPERS: Wallpaper[] = [
  { id: "season", name: "Changes with the term", kind: "illustration" },
  { id: "fall", name: "Fall valley", kind: "illustration" },
  { id: "winter", name: "Winter valley", kind: "illustration" },
  { id: "spring", name: "Spring valley", kind: "illustration" },
  { id: "summer", name: "Summer valley", kind: "illustration" },
  { id: "bay", name: "The bridge", kind: "illustration" },
  { id: "glow", name: "Sprout", kind: "color" },
  { id: "peach", name: "Peach", kind: "color" },
  { id: "sky", name: "Sky", kind: "color" },
  { id: "aqua", name: "Aqua", kind: "color" },
  { id: "lilac", name: "Lilac", kind: "color" },
];

/** Sep–Nov fall, Dec–Feb winter, Mar–May spring, Jun–Aug summer. */
export function seasonFor(date: string): Season {
  const m = Number(date.slice(5, 7));
  if (m >= 9 && m <= 11) return "fall";
  if (m === 12 || m <= 2) return "winter";
  if (m <= 5) return "spring";
  return "summer";
}

/** The wallpaper to paint: "season" follows the calendar. */
export function resolveWallpaper(id: WallpaperId, today: string): Exclude<WallpaperId, "season"> {
  return id === "season" ? seasonFor(today) : id;
}

/** The site theme that matches each wallpaper, so the sidebar and buttons share its colors. */
const WALL_THEME: Record<Exclude<WallpaperId, "season">, "clear" | "dawn" | "orchid" | "lagoon" | "meadow"> = {
  fall: "dawn", peach: "dawn", spring: "orchid", lilac: "orchid", winter: "clear", glow: "clear", sky: "clear", bay: "lagoon", aqua: "lagoon", summer: "meadow",
};
export function themeFor(id: WallpaperId, today: string) {
  return WALL_THEME[resolveWallpaper(id, today)];
}

export type Desk = { wallpaper: WallpaperId; widgets: Placed[] };
export const DEFAULT_DESK: Desk = { wallpaper: "season", widgets: DEFAULT_WIDGETS };

export function cleanDesk(raw: unknown): Desk {
  const r = (raw ?? {}) as Partial<Desk>;
  const wallpaper = WALLPAPERS.some((w) => w.id === r.wallpaper) ? (r.wallpaper as WallpaperId) : DEFAULT_DESK.wallpaper;
  return { wallpaper, widgets: cleanWidgets(r.widgets) };
}

/** Which widget a question is about, so the scripted reply can show it and offer to pin it. */
export function topicFor(question: string): WidgetKind | null {
  const q = question.toLowerCase();
  if (/\b(deadline|apply|application|transfer)\b/.test(q)) return "deadline";
  if (/\b(due|week|homework|assignment|busy)\b/.test(q)) return "week";
  if (/\b(graduat|units?|on track|path|degree)/.test(q)) return "path";
  if (/\b(club|event|internship|outside|volunteer)/.test(q)) return "next";
  if (/\b(skill|resume|portfolio)/.test(q)) return "skills";
  return null;
}
