import { describe, expect, it } from "vitest";
import { experiences, opportunities } from "@/data/scenario";
import { fromAccounts } from "@/lib/experiences";
import { allEvents, inNextWeek, monthGrid, overlaps } from "@/lib/events";

const today = "2026-11-08";
const found = fromAccounts(experiences, ["luma", "eventbrite", "handshake"]);

describe("allEvents", () => {
  const items = allEvents(found, opportunities, today);

  it("lists only upcoming events, soonest first", () => {
    expect(items.every((e) => e.date >= today)).toBe(true);
    const keys = items.map((e) => e.date);
    expect([...keys].sort()).toEqual(keys);
  });

  it("shows an account event and its Explore listing once, with the flyer", () => {
    const civic = items.filter((e) => e.title === "Civic Data Saturday");
    expect(civic).toHaveLength(1);
    expect(civic[0]!.registered).toBe(true);
    expect(civic[0]!.opportunity?.flyer).toBeDefined();
  });

  it("includes Explore event picks she hasn't signed up for", () => {
    const ux = items.find((e) => e.id === "ux-night");
    expect(ux?.registered).toBe(false);
    expect(ux?.time).toBe("5:30 PM");
  });

  it("never includes classes, clubs or internships", () => {
    expect(items.some((e) => e.opportunity && e.opportunity.kind !== "event")).toBe(false);
  });

  it("flags the two Saturday morning events as overlapping", () => {
    const clash = overlaps(items);
    const civic = items.find((e) => e.title === "Civic Data Saturday")!;
    expect(clash[civic.id]?.title).toBe("Write Better Questions: a survey workshop");
  });
});

describe("monthGrid", () => {
  it("starts November 2026 on Sunday the 1st after six blanks", () => {
    const g = monthGrid(2026, 10);
    expect(g.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(g[6]).toBe("2026-11-01");
    expect(g.at(-1)).toBe("2026-11-30");
  });
});

describe("inNextWeek", () => {
  it("covers today through six days out", () => {
    expect(inNextWeek("2026-11-08", today)).toBe(true);
    expect(inNextWeek("2026-11-14", today)).toBe(true);
    expect(inNextWeek("2026-11-15", today)).toBe(false);
    expect(inNextWeek("2026-11-07", today)).toBe(false);
  });
});
