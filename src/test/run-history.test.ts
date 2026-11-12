import { describe, expect, it } from "vitest";
import { applyRunEvent, checkResult, decisionsByRun, factPlain, groupSummary, recheckSummary, recordRun, RUN_HISTORY_CAP, runGroups, runSentence, runTitle, toolStates, traceRows, type RunEvent, type TraceRun } from "@/lib/run";

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

  it("says which helpers redid work in a re-check and which kept their result", () => {
    const s = recheckSummary(play(RECHECK), [play(FIRST)]);
    expect(s.redid).toEqual(["planner", "backup"]);
    expect(s.line).toBe("Planner and Backup finder redid their work. Reader was still valid, so it didn't re-run.");
  });
});

describe("activity", () => {
  it("sums up a run group in one line from what the latest run did", () => {
    const [g] = runGroups([play(FIRST), play(RECHECK)]);
    expect(groupSummary(g!, "PSYC 5")).toBe("STAT 2 was full → picked PSYC 5");
    expect(groupSummary({ root: play(FIRST.slice(0, 3)), rechecks: [] }, null)).toBe("STAT 2 was full → working on it");
    const waiting = applyRunEvent(play(FIRST.slice(0, 3)), { type: "need", helper: "planner", question: "Mornings OK?", choices: ["Yes", "No"] }, new Date(1000));
    expect(groupSummary({ root: waiting, rechecks: [] }, null)).toBe("STAT 2 was full → waiting on you");
    const gaveUp = { ...play(FIRST), result: { optionId: null, why: null, model: null, gaveUp: true } } as TraceRun;
    expect(groupSummary({ root: gaveUp, rechecks: [] }, null)).toBe("STAT 2 was full → nothing open fits yet");
  });

  it("says one plain sentence per run", () => {
    expect(runSentence(play(FIRST))).toBe("STAT 2 was full, so the helpers took 4 steps to find you another class.");
    expect(runSentence(play(RECHECK), [play(FIRST)])).toBe("MATH 13 just filled. 2 steps ran again and 2 kept their answer.");
  });

  it("puts each decision on the run it happened during, and a note on the re-plan it started", () => {
    const first = play(FIRST);
    const steer = { ...play(RECHECK), runId: "run_9", trigger: "steer" as const, cause: "No classes before 10 am" };
    const d = (what: string, at: number) => ({ what, when: new Date(at) });
    const [a, b] = decisionsByRun([first, steer], [
      d("before any run", -5),
      d("Chose MATH 13", 5000),
      d("Told the helpers: No classes before 10 am", 60000),
      d("Chose PSYC 5", 125000),
      d("next group", 200000),
    ], 200000);
    expect(a!.map((x) => x.what)).toEqual(["Chose MATH 13"]);
    expect(b!.map((x) => x.what)).toEqual(["Told the helpers: No classes before 10 am", "Chose PSYC 5"]);
  });
});

describe("behind the scenes", () => {
  it("lays out a re-check's steps with timing, and lists what it kept", () => {
    const { rows, totalMs } = traceRows(play(RECHECK), [play(FIRST)]);
    expect(rows.filter((r) => r.kind === "kept").map((r) => r.tool)).toEqual(["read_portal_error", "find_courses_that_count"]);
    const steps = rows.filter((r) => r.kind === "step");
    expect(steps.map((r) => r.tool)).toEqual(["search_open_sections", "submit_recommendation"]);
    for (const s of steps) if (s.kind === "step") expect(s.endMs).toBeGreaterThanOrEqual(s.startMs);
    expect(rows.some((r) => r.kind === "handoff")).toBe(true);
    expect(totalMs).toBeGreaterThanOrEqual(2000);
  });

  it("marks each tool as ran, kept or not needed", () => {
    expect(toolStates(play(RECHECK), [play(FIRST)])).toEqual({
      read_portal_error: "kept", find_courses_that_count: "kept", search_open_sections: "ran", check_week_fit: "idle", submit_recommendation: "ran",
    });
    expect(play(RECHECK).stale?.tools).toEqual(["search_open_sections", "submit_recommendation"]);
  });

  it("names facts in plain words and reports the safety checks", () => {
    expect(factPlain("seats.math13")).toBe("MATH 13 filled");
    expect(factPlain("note.no-early")).toBe("Your note");
    expect(checkResult(play(FIRST)).state).toBe("passed");
    const sentBack = applyRunEvent(play(FIRST.slice(0, 5)), { type: "step", tool: "submit_recommendation", helper: "planner", text: "The safety check sent a recommendation back: MATH 13 section 02 has no open seats.", ok: false }, new Date(3000));
    expect(checkResult(sentBack).sentBack).toEqual(["MATH 13 section 02 has no open seats."]);
    expect(checkResult(sentBack).state).toBe("running");
  });
});
