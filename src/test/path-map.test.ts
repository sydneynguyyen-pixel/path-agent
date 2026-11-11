import { describe, expect, it } from "vitest";
import { pathCategories, pathConnections, pathItems } from "@/data/map";
import { CARD_H, CARD_W, centerPath, clampPath, connectionsOf, filterPath, fitPath, followUpCount, layoutPath, linkRoute, pathItemsFor, routeLinks, zoomPath } from "@/lib/path-map";

const viewport = { w: 1400, h: 900 };
const insets = { l: 300, t: 100, r: 20, b: 60 };
const layout = layoutPath(pathItems);
const card = (id: string) => layout.cards.find((c) => c.id === id)!;

describe("path map data", () => {
  it("connects only items that exist", () => {
    const ids = new Set(pathItems.map((i) => i.id));
    for (const l of pathConnections) expect(ids.has(l.from) && ids.has(l.to)).toBe(true);
  });
  it("has no scores in its copy", () => {
    const text = pathItems.map((i) => `${i.title} ${i.sub} ${i.about}`).join(" ");
    expect(text).not.toMatch(/\d+%|fairly sure|\bhigh\b|\bmedium\b/i);
  });
});

describe("pathItemsFor", () => {
  it("drops suggestions she turned down but keeps what is on her plan", () => {
    const ids = pathItemsFor(pathItems, ["dsgn20", "stat2"], 0).map((i) => i.id);
    expect(ids).not.toContain("dsgn20");
    expect(ids).toContain("stat2");
  });
  it("takes the symposium line from her plan", () => {
    const line = (meet: number) => pathItemsFor(pathItems, [], meet).find((i) => i.id === "psych-symposium")?.sub;
    expect(line(3)).toContain("3 people to meet");
    expect(line(1)).toContain("1 person to meet");
    expect(line(0)).toContain("Pick who to meet");
  });
});

describe("layoutPath", () => {
  it("makes one column per category with counts", () => {
    expect(layout.columns.map((c) => c.id)).toEqual(pathCategories.map((c) => c.id));
    expect(layout.columns.every((c) => c.count === 2)).toBe(true);
  });
  it("never overlaps two cards", () => {
    for (const a of layout.cards) for (const b of layout.cards) {
      if (a.id === b.id) continue;
      expect(a.x + CARD_W <= b.x || b.x + CARD_W <= a.x || a.y + CARD_H <= b.y || b.y + CARD_H <= a.y).toBe(true);
    }
  });
  it("closes the gap when a card is removed", () => {
    const next = layoutPath(pathItemsFor(pathItems, ["ux-night", "design-club"], 0));
    expect(next.cards.find((c) => c.id === "research-club")?.row).toBe(0);
  });
  it("draws suggested branches dashed and planned ones solid", () => {
    const solid = (id: string) => layout.lines.find((l) => l.id === id)?.solid;
    expect(solid("to-stat2")).toBe(true);
    expect(solid("to-dsgn20")).toBe(false);
    expect(solid("bus-clubs")).toBe(false);
    expect(solid("bus-classes")).toBe(true);
  });
});

describe("filterPath", () => {
  it("matches every word across the item", () => {
    expect(filterPath(pathItems, { query: "harbor sam", category: "all" }).map((i) => i.id)).toEqual(["ux-intern"]);
  });
  it("combines search with category", () => {
    expect(filterPath(pathItems, { query: "harbor", category: "networking" }).map((i) => i.id)).toEqual(["priya"]);
    expect(filterPath(pathItems, { query: "", category: "fairs" })).toHaveLength(2);
  });
});

describe("connections", () => {
  it("finds links from either end, with the reason", () => {
    const found = connectionsOf("campus-ra", pathConnections, pathItems);
    expect(found.map((c) => c.item.id)).toEqual(["reyes"]);
    expect(found[0]?.why).toContain("runs this lab");
  });
  it("forgets items no longer on the board", () => {
    const items = pathItemsFor(pathItems, ["reyes"], 0);
    expect(connectionsOf("campus-ra", pathConnections, items)).toEqual([]);
  });
  it("keeps long links hidden until one end is in focus", () => {
    const ids = (focus: string | null) => routeLinks(layout, pathConnections, focus).map((r) => r.id);
    expect(ids(null)).toContain("reyes>campus-ra");
    expect(ids(null)).not.toContain("psych-symposium>priya");
    expect(ids("psych-symposium")).toContain("psych-symposium>priya");
  });
  it("gives each of an item's links its own midpoint", () => {
    const a = linkRoute(card("psych-symposium"), card("priya"));
    const b = linkRoute(card("psych-symposium"), card("reyes"));
    expect(a.y).not.toBe(b.y);
  });
  it("runs long links between rows, clear of cards", () => {
    const { y } = linkRoute(card("psych-symposium"), card("reyes"));
    expect(layout.cards.some((c) => y > c.y && y < c.y + c.h)).toBe(false);
  });
});

describe("followUpCount", () => {
  const past = [{ personId: "priya", date: "2026-04-09", promise: "Send poster" }];
  it("counts each person once", () => {
    expect(followUpCount(past, [{ id: "x", personId: "priya", done: false }, { id: "y", personId: "reyes", done: false }])).toBe(2);
  });
  it("drops a past promise once it is done", () => {
    expect(followUpCount(past, [{ id: "priya-2026-04-09", personId: "priya", done: true }])).toBe(0);
  });
});

describe("path camera", () => {
  it("keeps the point under the cursor while zooming", () => {
    const c = { x: 40, y: 60, s: 0.8 };
    const next = zoomPath(c, 1.2, 500, 300);
    expect((500 - next.x) / next.s).toBeCloseTo((500 - c.x) / c.s);
    expect((300 - next.y) / next.s).toBeCloseTo((300 - c.y) / c.s);
  });
  it("fits the width and starts at the goal", () => {
    const c = fitPath(layout.bounds, viewport, insets);
    expect(c.y).toBe(insets.t);
    expect(layout.bounds.maxX * c.s).toBeLessThanOrEqual(viewport.w - insets.l - insets.r + 0.01);
  });
  it("won't start tiny on a narrow screen", () => {
    expect(fitPath(layout.bounds, { w: 375, h: 800 }, { l: 12, t: 160, r: 12, b: 140 }).s).toBe(0.6);
  });
  it("can't be dragged off the board", () => {
    const held = clampPath({ x: 99999, y: -99999, s: 1 }, layout.bounds, viewport, insets);
    const center = centerPath(layout.bounds.minX, layout.bounds.maxY, 1, viewport, insets);
    expect(held).toEqual(center);
  });
});
