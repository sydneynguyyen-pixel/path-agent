import { describe, expect, it } from "vitest";
import { opportunities } from "@/data/scenario";
import { SCRIPT_START } from "@/lib/journey";
import { addMeet, cardLink, eventName, eventNow, mergeMet, startMinutes, upcomingSaved } from "@/components/app/mobile/atEvent";

// UX Night: Tue Nov 10, 2026, 5:30 PM Pacific (PST, UTC-8) = 01:30 UTC on Nov 11.
const uxStart = Date.UTC(2026, 10, 11, 1, 30);

describe("which event she's at", () => {
  it("reads the start time from the listing", () => {
    expect(startMinutes("Next Tuesday, 5:30 PM · Free")).toBe(17 * 60 + 30);
    expect(startMinutes("Saturday, 10:00 AM · Free")).toBe(600);
    expect(startMinutes("Fall 2027")).toBeNull();
  });

  it("is not at an event at the scripted start, and lists her saved events soonest first", () => {
    expect(eventNow(opportunities, ["ux-night", "civic-data"], SCRIPT_START)).toBeNull();
    expect(upcomingSaved(opportunities, ["civic-data", "ux-night", "dsgn20"], SCRIPT_START).map((e) => [e.id, e.name, e.when])).toEqual([
      ["ux-night", "UX Night", "Tue 5:30 PM"],
      ["civic-data", "Civic Data", "Sat 9:30 AM"],
    ]);
  });

  it("picks the saved event happening now, from an hour before to three hours after", () => {
    expect(eventNow(opportunities, ["ux-night"], uxStart)?.id).toBe("ux-night");
    expect(eventNow(opportunities, ["ux-night"], uxStart - 59 * 60_000)?.id).toBe("ux-night");
    expect(eventNow(opportunities, ["ux-night"], uxStart + 4 * 3600_000)).toBeNull();
    // Only events she saved.
    expect(eventNow(opportunities, [], uxStart)).toBeNull();
  });

  it("uses the name people say and an .example card link", () => {
    expect(eventName(opportunities.find((o) => o.id === "ux-night")!)).toBe("UX Night");
    expect(cardLink("maya-t")).toBe("https://trellis.example/c/maya-t");
  });
});

describe("people she met", () => {
  it("keeps one entry per person and event, updating the note", () => {
    const at = new Date(uxStart);
    let list = addMeet([], "lena", "ux-night", at);
    list = addMeet(list, "lena", "ux-night", at, "  Bus stops  ");
    list = addMeet(list, "lena", "ux-night", at);
    expect(list).toEqual([{ peerId: "lena", eventId: "ux-night", at, note: "Bus stops" }]);
  });

  it("merges with the scripted students without duplicates", () => {
    const rows = mergeMet(
      [{ peerId: "jordan", event: "Figma for Non-Designers", date: "2025-11-15", text: "Sat next to me." }],
      [{ peerId: "jordan", eventId: "ux-night", at: new Date(uxStart), note: "Film cameras" }, { peerId: "lena", eventId: "ux-night", at: new Date(uxStart) }],
      () => "UX Night",
    );
    expect(rows.map((r) => r.peerId)).toEqual(["jordan", "lena"]);
    expect(rows[0]!.entries.map((e) => e.event)).toEqual(["Figma for Non-Designers", "UX Night"]);
    expect(rows[0]!.entries[1]).toMatchObject({ date: "2026-11-10", text: "Film cameras", live: { eventId: "ux-night", followedUp: false } });
  });
});
