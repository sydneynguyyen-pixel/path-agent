import { describe, expect, it } from "vitest";
import { applyRunEvent, laneLayout, LANE, laterLine, recheckSummary, recordRun, RUN_HISTORY_CAP, runGroups, runTitle, storyLines, type RunEvent, type TraceRun } from "@/lib/run";

const on = { reader: true, planner: true, backup: true, drafter: true };
type Timed = RunEvent & { at: number };
const play = (events: Timed[]) => events.reduce<TraceRun | null>((r, e) => applyRunEvent(r, e, new Date(e.at)), null)!;

/** STAT 2 is full: Reader, Planner and Backup finder each work, and Planner picks MATH 13. */
const FIRST: Timed[] = [
  { type: "start", runId: "run_7", trigger: "error", mode: "live", reason: null, at: 0 },
  { type: "step", tool: "read_portal_error", helper: "reader", text: "Read the registration page: STAT 2 §01 is full", sourceIds: ["portal-full"], ok: true, at: 700 },
  { type: "handoff", from: "reader", to: "planner", summary: "STAT 2 §01 is full", at: 900 },
  { type: "step", tool: "find_courses_that_count", helper: "planner", text: "Found 3 classes that count toward QR-1", sourceIds: ["artic-math13"], ok: true, at: 1800 },
  { type: "step", tool: "search_open_sections", helper: "backup", text: "MATH 13 has 3 open seats and no pile-ups", sourceIds: ["class-list"], ok: true, at: 2600 },
  { type: "step", tool: "submit_recommendation", helper: "planner", text: "Recommended MATH 13 §02", sourceIds: ["artic-math13"], ok: true, at: 3600 },
  { type: "done", result: { optionId: "math13", why: null, model: "claude-sonnet", gaveUp: false }, ttvMs: 3600, at: 3700 },
];

/** MATH 13 fills: only Backup finder and Planner run again. */
const RECHECK: Timed[] = [
  { type: "start", runId: "run_8", parentRunId: "run_7", trigger: "recheck", mode: "live", reason: null, at: 120000 },
  { type: "stale", facts: ["seats.math13"], tools: ["search_open_sections", "submit_recommendation"], at: 120100 },
  { type: "step", tool: "search_open_sections", helper: "backup", text: "MATH 13 is now full; PSYC 5 has seats", sourceIds: ["artic-psyc5"], ok: true, at: 121000 },
  { type: "handoff", from: "backup", to: "planner", summary: "1 open section that still counts", at: 121300 },
  { type: "step", tool: "submit_recommendation", helper: "planner", text: "Recommended PSYC 5 §01", sourceIds: ["artic-psyc5"], ok: true, at: 122000 },
  { type: "done", result: { optionId: "psyc5", why: null, model: "claude-sonnet", gaveUp: false }, ttvMs: 2000, at: 122100 },
];

describe("run history", () => {
  it("keeps run ids from the start event", () => {
    const run = play(RECHECK);
    expect(run.runId).toBe("run_8");
    expect(run.parentRunId).toBe("run_7");
  });

  it("records finished runs only, newest last, and replaces a repeat", () => {
    const first = play(FIRST);
    const running = play(FIRST.slice(0, 3));
    let runs = recordRun([], running);
    expect(runs).toEqual([]);
    runs = recordRun(runs, first);
    runs = recordRun(runs, play(RECHECK));
    runs = recordRun(runs, first);
    expect(runs.map((r) => r.runId)).toEqual(["run_8", "run_7"]);
  });

  it("caps the history", () => {
    let runs: TraceRun[] = [];
    for (let i = 0; i < RUN_HISTORY_CAP + 5; i++) runs = recordRun(runs, { ...play(FIRST), runId: `run_${i}` });
    expect(runs).toHaveLength(RUN_HISTORY_CAP);
    expect(runs[0]!.runId).toBe("run_5");
  });

  it("nests a re-check, and a re-check of a re-check, under the run it changed", () => {
    const steer = { ...play(RECHECK), runId: "run_9", parentRunId: "run_8", trigger: "steer" as const };
    const other = { ...play(FIRST), runId: "run_10" };
    const groups = runGroups([play(FIRST), play(RECHECK), steer, other]);
    expect(groups.map((g) => g.root.runId)).toEqual(["run_10", "run_7"]);
    expect(groups[1]!.rechecks.map((r) => r.runId)).toEqual(["run_8", "run_9"]);
  });
});

describe("story lines", () => {
  it("titles a run from what Reader saw, and a re-check from what changed", () => {
    expect(runTitle(play(FIRST))).toBe("STAT 2 was full");
    expect(runTitle(play(RECHECK))).toBe("MATH 13 just filled");
    expect(runTitle({ ...play(FIRST), steps: [{ ...play(FIRST).steps[0]!, text: "Read the registration page: STAT 2 is a Closed Section" }] })).toBe("STAT 2 was full");
    expect(runTitle({ ...play(FIRST), steps: [] })).toBe("A class you tried to add was full");
  });

  it("gives one line per helper from its own steps, and says why a helper didn't run", () => {
    const lines = storyLines(play(FIRST), on);
    expect(lines.map((l) => l.used)).toEqual([true, true, true, false]);
    expect(lines[1]!.text).toBe("Recommended MATH 13 §02");
    expect(lines[1]!.sourceIds).toEqual(["artic-math13"]);
    expect(lines[3]!.text).toMatch(/Drafter is waiting/);
    const noBackup = play(FIRST.filter((e) => !(e.type === "step" && e.helper === "backup")));
    expect(storyLines(noBackup, { ...on, backup: false })[2]!.text).toMatch(/Backup finder is off/);
  });

  it("says which helpers redid work in a re-check and which kept their result", () => {
    const s = recheckSummary(play(RECHECK), [play(FIRST)]);
    expect(s.redid).toEqual(["planner", "backup"]);
    expect(s.line).toBe("Planner and Backup finder redid their work. Reader was still valid, so it didn't re-run.");
    expect(storyLines(play(RECHECK), on, [play(FIRST)])[0]!.text).toMatch(/earlier result was still valid/);
    expect(laterLine(0, 120000)).toBe("2 min later");
    expect(laterLine(0, 4000)).toBe("4s later");
  });
});

describe("helper lanes", () => {
  const layout = laneLayout(play(FIRST), [play(RECHECK)]);

  it("puts one dot per step on its helper's lane, in time order", () => {
    const real = layout.dots.filter((d) => !d.kept);
    expect(real).toHaveLength(6);
    for (const d of real) expect(d.y).toBe(layout.laneY[d.helper]);
    const first = real.filter((d) => d.id.startsWith("run_7"));
    expect(first.map((d) => d.x)).toEqual([...first.map((d) => d.x)].sort((a, b) => a - b));
    expect(first[0]!.x).toBeGreaterThan(LANE.left);
    expect(first[0]!.x).toBeLessThan(layout.width - LANE.right);
  });

  it("rings the picks and shortens the wait before a re-check", () => {
    expect(layout.dots.filter((d) => d.pick).map((d) => d.text)).toEqual(["Recommended MATH 13 §02", "Recommended PSYC 5 §01"]);
    // Two minutes passed in real time, but the chart only leaves a short gap.
    expect(layout.width).toBeLessThan(1400);
  });

  it("draws the change, dashed kept dots, and handoffs between real dots", () => {
    expect(layout.changes).toHaveLength(1);
    expect(layout.changes[0]!.label).toBe("MATH 13 just filled");
    const kept = layout.dots.filter((d) => d.kept);
    expect(kept.map((d) => d.helper)).toEqual(["reader"]);
    expect(kept[0]!.x).toBeGreaterThan(layout.changes[0]!.x);
    expect(layout.links).toHaveLength(2);
    expect(layout.ticks.map((t) => t.label)).toEqual(["0s", "4s · usable", "+2s"]);
  });
});
