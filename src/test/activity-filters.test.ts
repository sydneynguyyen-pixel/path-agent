import { describe, expect, it } from "vitest";
import { buildEvents, type JourneyView } from "@/lib/activity";
import { filterActivity, type ActivityFilters } from "@/lib/activity-filters";

const journey: JourneyView = {
  stage: "failed", chosenId: null, seatHeld: false, emailSent: false, counselor: null,
  agentOn: { reader: true, planner: true, backup: true, drafter: true }, agentTimes: {}, decisions: [],
};
const events = buildEvents(journey);
const defaults: ActivityFilters = { query: "", status: "all", order: "newest" };

describe("Activity log controls", () => {
  it("searches source inputs as well as event titles", () => {
    expect(filterActivity(events, { ...defaults, query: "transcript" }).map(e => e.id)).toEqual(["read-docs"]);
  });
  it("combines helper and status filters", () => {
    expect(filterActivity(events, { ...defaults, helper: "backup", status: "attention" }).map(e => e.id)).toEqual(["stat2-full"]);
    expect(filterActivity(events, { ...defaults, helper: "drafter", status: "attention" })).toEqual([]);
  });
  it("orders records by their actual scripted timestamps", () => {
    expect(filterActivity(events, { ...defaults, order: "oldest" }).map(e => e.id)).toEqual(["read-docs", "term", "stat2-full"]);
  });
});