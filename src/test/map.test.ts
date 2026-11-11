import { describe, expect, it } from "vitest";
import { terms } from "@/data/scenario";
import { MAP_ORIGIN } from "@/data/map";
import { centerOn, clampCamera, fitCamera, layoutMap, MAX_SCALE, MIN_SCALE, monthsFrom, NODE_MAX, NODE_MIN, nodeScale, placeStack, rulerTicks, statusOf, zoomAt, type MapNode } from "@/lib/map";

const today = "2026-11-08";
const at = (masters = false) => layoutMap({ masters, today });
const byId = (nodes: MapNode[], id: string) => nodes.find((n) => n.id === id);

function overlaps(nodes: MapNode[], r = 1) {
  const hits: string[] = [];
  nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => {
    const apart = a.x + a.w <= b.x || b.x + b.w <= a.x;
    if (!apart && a.top < b.top + b.h * r && b.top < a.top + a.h * r) hits.push(`${a.id}/${b.id}`);
  }));
  return hits;
}

describe("map time scale", () => {
  it("counts months with the day as a fraction", () => {
    expect(monthsFrom(MAP_ORIGIN, "2025-09-01")).toBe(0);
    expect(monthsFrom(MAP_ORIGIN, "2026-09-01")).toBe(12);
    expect(monthsFrom(MAP_ORIGIN, "2025-09-16")).toBeCloseTo(0.5);
  });
  it("separates done, now, confirmed and planned", () => {
    expect(statusOf("2026-01-01", "2026-02-01", today, false)).toBe("done");
    expect(statusOf("2026-09-21", "2026-12-11", today, false)).toBe("now");
    expect(statusOf("2027-01-04", "2027-03-26", today, true)).toBe("confirmed");
    expect(statusOf("2027-04-05", "2027-06-18", today, false)).toBe("planned");
  });
});

describe("camera", () => {
  it("keeps the point under the cursor still while zooming", () => {
    const before = { x: 40, y: -300, s: 1 };
    const after = zoomAt(before, 2, 500, 400);
    expect((500 - after.x) / nodeScale(after.s)).toBeCloseTo((500 - before.x) / nodeScale(before.s));
    expect((400 - after.y) / after.s).toBeCloseTo((400 - before.y) / before.s);
  });
  it("holds nodes between a minimum and maximum size", () => {
    expect(nodeScale(0.12)).toBe(NODE_MIN);
    expect(nodeScale(1)).toBe(1);
    expect(nodeScale(MAX_SCALE)).toBe(NODE_MAX);
  });
  it("stops at the zoom limits", () => {
    const c = { x: 0, y: 0, s: 1 };
    expect(zoomAt(c, 99, 0, 0).s).toBe(MAX_SCALE);
    expect(zoomAt(c, 0.001, 0, 0).s).toBe(MIN_SCALE);
  });
  it("centers inside the area not covered by the menu", () => {
    const c = centerOn(0, 0, 1, { w: 1000, h: 800 }, { l: 200, t: 0, r: 0, b: 0 });
    expect(c).toEqual({ x: 600, y: 400, s: 1 });
  });
  it("frames the whole journey on one screen", () => {
    const { bounds } = at();
    const v = { w: 1400, h: 900 };
    const i = { l: 270, t: 100, r: 60, b: 70 };
    const c = fitCamera(bounds, v, i);
    expect(c.y + bounds.minY * c.s).toBeGreaterThanOrEqual(i.t - 1);
    expect(c.y + bounds.maxY * c.s).toBeLessThanOrEqual(v.h - i.b + 1);
  });
  it("keeps the map on screen however far you drag", () => {
    const layout = at();
    const v = { w: 1400, h: 900 };
    const i = { l: 270, t: 100, r: 60, b: 70 };
    const midY = i.t + (v.h - i.t - i.b) / 2;
    const up = clampCamera({ x: 0, y: 99999, s: 1 }, layout, v, i);
    const down = clampCamera({ x: 0, y: -99999, s: 1 }, layout, v, i);
    expect(midY - up.y).toBeCloseTo(layout.bounds.minY);
    expect(midY - down.y).toBeCloseTo(layout.bounds.maxY);
  });
  it("only allows the far side near the class that is there", () => {
    const layout = at();
    const v = { w: 1000, h: 800 };
    const i = { l: 0, t: 0, r: 0, b: 0 };
    const near = clampCamera({ x: -99999, y: 400 - layout.reach.y, s: 1 }, layout, v, i);
    const far = clampCamera({ x: -99999, y: 400 - layout.bounds.minY, s: 1 }, layout, v, i);
    expect(500 - near.x).toBeCloseTo(layout.reach.x);
    expect(500 - far.x).toBeCloseTo(layout.bounds.maxX);
  });
  it("uses finer time labels up close", () => {
    const far = rulerTicks({ x: 0, y: 0, s: 0.2 }, 900, 60);
    const near = rulerTicks({ x: 0, y: 0, s: 2.5 }, 900, 60);
    expect(far.every((t) => /^\d{4}$/.test(t.label))).toBe(true);
    expect(near.some((t) => t.label === "Sep 8")).toBe(true);
  });
});

describe("placeStack", () => {
  it("only moves items that would overlap", () => {
    const placed = placeStack([{ top: 100, h: 50 }, { top: 0, h: 20 }, { top: 120, h: 10 }], 10);
    expect(placed.map((p) => p.top)).toEqual([0, 100, 160]);
  });
});

describe("layoutMap", () => {
  it("always has every term on the class line", () => {
    for (const t of terms) expect(byId(at().nodes, t.id)?.kind).toBe("term");
  });
  it("never overlaps nodes", () => {
    expect(overlaps(at(false).nodes)).toEqual([]);
    expect(overlaps(at(true).nodes)).toEqual([]);
    // Up close, with coursework showing.
    for (const r of [0.24, 0.75]) expect(overlaps(layoutMap({ masters: true, today, r }).nodes, r)).toEqual([]);
    // Far out, where coursework is hidden.
    for (const r of [3, 6]) expect(overlaps(layoutMap({ masters: true, today, r }).nodes.filter((n) => n.kind !== "work"), r)).toEqual([]);
  });
  it("gives every node an image or icon", () => {
    for (const n of at(true).nodes.filter((x) => !["work", "add"].includes(x.kind))) expect(n.visual).toBeTruthy();
  });
  it("uses all four statuses", () => {
    const { nodes } = at();
    expect(byId(nodes, "f25")?.status).toBe("done");
    expect(byId(nodes, "f26")?.status).toBe("now");
    expect(byId(nodes, "w27")?.status).toBe("confirmed");
    expect(byId(nodes, "sp27")?.status).toBe("planned");
    expect(byId(nodes, "civic-data-up")?.status).toBe("confirmed");
    expect(byId(nodes, "ux-night")?.status).toBe("planned");
  });
  it("gives each school a home point, with the line changing color at transfer", () => {
    const { nodes, spine } = at();
    expect(byId(nodes, "school-bayview")?.status).toBe("now");
    expect(byId(nodes, "school-northgate")?.status).toBe("confirmed");
    expect(byId(nodes, "school-lakeshore")?.status).toBe("planned");
    const northgate = spine.find((s) => s.school === "northgate")!;
    const hub = byId(nodes, "school-northgate")!;
    expect(northgate.y1).toBeCloseTo(hub.top + hub.h / 2);
  });
  it("ends the outside class's line at its school", () => {
    const layout = at();
    const side = byId(layout.nodes, "lcc-psyc-20")!;
    expect(byId(layout.nodes, "school-lakeshore")!.x).toBeGreaterThan(side.x + side.w);
  });
  it("brings the outside class in from the side, with no layer", () => {
    const layout = at();
    expect(byId(layout.nodes, "lcc-psyc-20")?.layer).toBeUndefined();
    expect(layout.links.some((l) => l.id === "link-side-in")).toBe(true);
  });
  it("gives every club, internship and event a layer", () => {
    for (const n of at().nodes.filter((x) => x.kind === "span" || x.kind === "event")) expect(n.layer).toBeTruthy();
  });
  it("extends past graduation only once a master's is added", () => {
    const before = at();
    const after = at(true);
    expect(byId(before.nodes, "add")).toBeTruthy();
    expect(byId(after.nodes, "add")).toBeUndefined();
    expect(byId(after.nodes, "ms-f29")?.imagined).toBe(true);
    expect(after.bounds.maxY).toBeGreaterThan(before.bounds.maxY);
  });
  it("keeps coursework out of the way, attached to its term", () => {
    const work = at().nodes.filter((n) => n.kind === "work");
    expect(work.length).toBeGreaterThan(0);
    for (const n of work) expect(byId(at().nodes, n.parent!)?.kind).toBe("term");
  });
});
