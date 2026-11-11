import { pathCategories, type PathCategory, type PathConnection, type PathItem, type PathState } from "@/data/map";
import type { Bounds, Camera, Insets, Viewport } from "@/lib/map";

export const PATH_STATE_LABEL: Record<PathState, string> = { plan: "On your plan", suggested: "Suggested", touch: "In touch", todo: "To do" };
export const PATH_MIN_SCALE = 0.35;
export const PATH_MAX_SCALE = 1.6;
/** The board won't start smaller than this, even on a narrow screen. You can pan to the rest. */
const START_MIN_SCALE = 0.6;

export const CARD_W = 180;
export const CARD_H = 142;
const PITCH = 252;
const ROW_PITCH = 206;
const BOARD_W = (pathCategories.length - 1) * PITCH + CARD_W;
const MID = BOARD_W / 2;
const HEAD_W = 150;
const HEAD_H = 40;
const GOAL = { x: MID - 190, y: 0, w: 380, h: 64 };
const PATH = { x: MID - 235, y: 104, w: 470, h: 104 };
const NOTES = { x: MID + 290, y: 126, w: 280, h: 60 };
const BUS_Y = 252;
const HEAD_Y = 284;
const CARDS_Y = 360;

export type Box = { x: number; y: number; w: number; h: number };
export type PathCard = PathItem & Box & { col: number; row: number };
export type PathColumn = Box & { id: PathCategory; label: string; count: number };
export type PathLine = { id: string; d: string; solid: boolean };
export type PathLayout = { goal: Box; path: Box; notes: Box; columns: PathColumn[]; cards: PathCard[]; lines: PathLine[]; bounds: Bounds };
export type PathRoute = PathConnection & { id: string; d: string; x: number; y: number; active: boolean };

const committed = (i: PathItem) => i.state !== "suggested";

/** What the board shows: everything she hasn't turned down, with the symposium line taken from her own plan. */
export function pathItemsFor(items: PathItem[], skipped: string[], meet: number): PathItem[] {
  const line = meet > 0 ? `${meet} ${meet === 1 ? "person" : "people"} to meet.` : "Pick who to meet.";
  return items
    .filter((i) => i.state !== "suggested" || !skipped.includes(i.id))
    .map((i) => (i.id === "psych-symposium" ? { ...i, sub: `${i.sub} ${line}` } : i));
}

export function layoutPath(items: PathItem[]): PathLayout {
  const lines: PathLine[] = [
    { id: "goal-path", d: `M ${MID} ${GOAL.h} L ${MID} ${PATH.y}`, solid: true },
    { id: "path-notes", d: `M ${PATH.x + PATH.w} ${NOTES.y + NOTES.h / 2} L ${NOTES.x} ${NOTES.y + NOTES.h / 2}`, solid: true },
    { id: "path-bus", d: `M ${MID} ${PATH.y + PATH.h} L ${MID} ${BUS_Y}`, solid: true },
    { id: "bus", d: `M ${CARD_W / 2} ${BUS_Y} L ${BOARD_W - CARD_W / 2} ${BUS_Y}`, solid: true },
  ];
  const cards: PathCard[] = [];
  const columns = pathCategories.map(({ id, label }, col) => {
    const inColumn = items.filter((i) => i.category === id);
    const x = col * PITCH;
    const cx = x + CARD_W / 2;
    lines.push({ id: `bus-${id}`, d: `M ${cx} ${BUS_Y} L ${cx} ${HEAD_Y}`, solid: inColumn.some(committed) });
    inColumn.forEach((item, row) => {
      const y = CARDS_Y + row * ROW_PITCH;
      const above = row === 0 ? HEAD_Y + HEAD_H : y - (ROW_PITCH - CARD_H);
      const prev = inColumn[row - 1];
      lines.push({ id: `to-${item.id}`, d: `M ${cx} ${above} L ${cx} ${y}`, solid: committed(item) && (!prev || committed(prev)) });
      cards.push({ ...item, x, y, w: CARD_W, h: CARD_H, col, row });
    });
    return { id, label, count: inColumn.length, x: cx - HEAD_W / 2, y: HEAD_Y, w: HEAD_W, h: HEAD_H };
  });
  const maxY = Math.max(HEAD_Y + HEAD_H, ...cards.map((c) => c.y + c.h));
  return { goal: GOAL, path: PATH, notes: NOTES, columns, cards, lines, bounds: { minX: 0, maxX: BOARD_W, minY: 0, maxY } };
}

/** Every word has to appear somewhere in the item, within the chosen category. */
export function filterPath(items: PathItem[], { query, category }: { query: string; category: PathCategory | "all" }): PathItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((i) => {
    if (category !== "all" && i.category !== category) return false;
    const text = `${i.title} ${i.sub} ${i.about}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

export const linkId = (l: PathConnection) => `${l.from}>${l.to}`;

/** What an item is connected to, leaving out anything no longer on the board. */
export function connectionsOf(id: string, links: PathConnection[], items: PathItem[]) {
  return links.flatMap((l) => {
    if (l.from !== id && l.to !== id) return [];
    const item = items.find((i) => i.id === (l.from === id ? l.to : l.from));
    return item ? [{ item, why: l.why, id: linkId(l) }] : [];
  });
}

/** Neighbors meet across the gap between them. Anything further runs through the lane between rows, so it never crosses a card. */
export function linkRoute(a: PathCard, b: PathCard): { d: string; x: number; y: number } {
  if (a.col === b.col) {
    const [top, low] = a.row < b.row ? [a, b] : [b, a];
    const x = top.x + top.w / 2;
    return { d: `M ${x} ${top.y + top.h} L ${x} ${low.y}`, x, y: (top.y + top.h + low.y) / 2 };
  }
  const [left, right] = a.col < b.col ? [a, b] : [b, a];
  if (right.col - left.col === 1) {
    const x1 = left.x + left.w;
    const x2 = right.x;
    const y1 = left.y + left.h / 2;
    const y2 = right.y + right.h / 2;
    const x = (x1 + x2) / 2;
    return { d: `M ${x1} ${y1} C ${x} ${y1} ${x} ${y2} ${x2} ${y2}`, x, y: (y1 + y2) / 2 };
  }
  const x1 = a.x + (a.col < b.col ? a.w * 0.75 : a.w * 0.25);
  const x2 = b.x + (a.col < b.col ? b.w * 0.25 : b.w * 0.75);
  const sameRow = a.row === b.row;
  const lane = sameRow ? a.y - 16 : Math.min(a.y, b.y) + CARD_H + (ROW_PITCH - CARD_H) / 2;
  const y1 = sameRow || a.y > b.y ? a.y : a.y + a.h;
  const y2 = sameRow || b.y > a.y ? b.y : b.y + b.h;
  return { d: `M ${x1} ${y1} L ${x1} ${lane} L ${x2} ${lane} L ${x2} ${y2}`, x: (x1 + x2) / 2, y: lane };
}

/** Neighbors always show their link. Longer ones appear only for the item in focus, so the board stays quiet. */
export function routeLinks(layout: PathLayout, links: PathConnection[], focus: string | null): PathRoute[] {
  return links.flatMap((l) => {
    const a = layout.cards.find((c) => c.id === l.from);
    const b = layout.cards.find((c) => c.id === l.to);
    if (!a || !b) return [];
    const active = focus === l.from || focus === l.to;
    if (!active && Math.abs(a.col - b.col) > 1) return [];
    return [{ ...l, ...linkRoute(a, b), id: linkId(l), active }];
  });
}

/** People she still owes something: promises from earlier notes and from this event. */
export function followUpCount(past: { personId: string; date: string; promise?: string }[], promises: { id: string; personId: string; done: boolean }[]): number {
  const open = new Set<string>();
  for (const n of past) if (n.promise && !promises.some((p) => p.id === `${n.personId}-${n.date}` && p.done)) open.add(n.personId);
  for (const p of promises) if (!p.done) open.add(p.personId);
  return open.size;
}

const clampPathScale = (s: number) => Math.min(PATH_MAX_SCALE, Math.max(PATH_MIN_SCALE, s));

export function zoomPath(c: Camera, s: number, px: number, py: number): Camera {
  const next = clampPathScale(s);
  const ratio = next / c.s;
  return { s: next, x: px - (px - c.x) * ratio, y: py - (py - c.y) * ratio };
}

export function centerPath(wx: number, wy: number, s: number, v: Viewport, i: Insets): Camera {
  const scale = clampPathScale(s);
  return { s: scale, x: i.l + (v.w - i.l - i.r) / 2 - wx * scale, y: i.t + (v.h - i.t - i.b) / 2 - wy * scale };
}

/** Fits the board's width and starts at the goal. */
export function fitPath(b: Bounds, v: Viewport, i: Insets): Camera {
  const s = clampPathScale(Math.max(START_MIN_SCALE, Math.min(1, (v.w - i.l - i.r) / (b.maxX - b.minX))));
  return { s, x: i.l + (v.w - i.l - i.r) / 2 - ((b.minX + b.maxX) / 2) * s, y: i.t - b.minY * s };
}

/** Keeps the middle of the free area over the board so it can't be lost. */
export function clampPath(c: Camera, b: Bounds, v: Viewport, i: Insets): Camera {
  const midX = i.l + (v.w - i.l - i.r) / 2;
  const midY = i.t + (v.h - i.t - i.b) / 2;
  const between = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  return { s: c.s, x: between(c.x, midX - b.maxX * c.s, midX - b.minX * c.s), y: between(c.y, midY - b.maxY * c.s, midY - b.minY * c.s) };
}
