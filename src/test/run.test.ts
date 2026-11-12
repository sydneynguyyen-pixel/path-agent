import { describe, expect, it } from "vitest";
import { applyRunEvent, atAGlance, glanceLabel, recheckLine, runHeadline, usableIn, type TraceRun } from "@/lib/run";
import { SEAT_FILLS } from "@/data/edge-runs";

const on = { reader: true, planner: true, backup: true, drafter: true };
const play = (events: typeof SEAT_FILLS) => events.reduce<TraceRun | null>((r, e) => applyRunEvent(r, e, new Date(e.at)), null)!;

describe("agent run trace", () => {
  it("builds the re-check run from the backend's events", () => {
    const run = play(SEAT_FILLS);
    expect(run.status).toBe("done");
    expect(run.trigger).toBe("recheck");
    expect(runHeadline(run)).toBe("Re-checking because MATH 13 filled");
    expect(run.entries.map((e) => e.kind)).toEqual(["step", "handoff", "step"]);
    expect(run.stale?.helpers).toEqual(["backup", "planner"]);
    expect(recheckLine(run.stale!.facts)).toBe("MATH 13 just filled. Re-checking your options.");
    expect(usableIn(run.ttvMs)).toBe("Usable option in 3s");
    expect(run.result?.optionId).toBe("psyc5");
  });

  it("still reads today's start, step and done events", () => {
    let run = applyRunEvent(null, { type: "start", mode: "scripted", reason: "The AI service didn't respond." }, new Date(0));
    run = applyRunEvent(run, { type: "step", tool: "read_portal_error", helper: "reader", perm: "read", text: "Read the registration page", ok: true }, new Date(500));
    run = applyRunEvent(run, { type: "done", result: { optionId: "math13", why: "x", model: null, gaveUp: false } }, new Date(12400));
    expect(runHeadline(run)).toBe("Ran without AI. The AI service didn't respond.");
    expect(run.steps[0]?.sourceIds).toEqual([]);
    expect(usableIn(run.ttvMs)).toBe("Usable option in 12s");
  });

  it("shows each helper at a glance", () => {
    const run = play(SEAT_FILLS);
    const g = atAGlance(run, { ...on, reader: false }, "planner");
    expect(g.map(glanceLabel)).toEqual(["off", "waiting on you", "done · 1 step", "not needed"]);
  });

  it("records a blocked step and never guesses at unknown facts", () => {
    const run = applyRunEvent(null, { type: "policy", tool: "register", rule: "Only you can register." }, new Date(0));
    expect(run.entries[0]).toMatchObject({ kind: "blocked", rule: "Only you can register." });
    expect(recheckLine(["weather.tuesday"])).toBe("Something changed. Re-checking your options.");
  });
});
