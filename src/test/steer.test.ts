import { describe, expect, it } from "vitest";
import { options } from "@/data/scenario";
import { NEEDS_NOTE } from "@/data/edge-runs";
import { applyRunEvent, atAGlance, awaySummary, runHeadline, type TraceRun } from "@/lib/run";
import { constraintFrom, forget, noteFrom, remember, startHour, steerEvents, steerPick } from "@/lib/steer";
import { buildDraft, draftLines } from "@/lib/journey";

const open = options.filter((o) => ["math13", "psyc5", "bus21"].includes(o.id));
const on = { reader: true, planner: true, backup: true, drafter: true };
const play = (events: { at: number }[]) => events.reduce<TraceRun | null>((r, { at, ...e }) => applyRunEvent(r, e as never, new Date(1000 + at)), null)!;

describe("notes she gives the helpers", () => {
  it("turns words into notes they can act on, and keeps anything else as she wrote it", () => {
    expect(constraintFrom("I can't do mornings")?.text).toBe("No classes before 10 am");
    expect(constraintFrom("no fridays please")?.text).toBe("No Friday classes");
    expect(constraintFrom("A class that surely counts")?.id).toBe("sure");
    expect(constraintFrom("Tue/Thu works better")?.id).toBe("tuthu");
    expect(constraintFrom("keep it under 15 units.")?.text).toBe("Keep it under 15 units");
    expect(constraintFrom("   ")).toBeNull();
  });

  it("only treats a statement in the ask box as a note, never a question", () => {
    expect(noteFrom("What's due this week?")).toBeNull();
    expect(noteFrom("Find a club for UX")).toBeNull();
    expect(noteFrom("I can't do mornings")?.id).toBe("no-early");
    expect(noteFrom("Remember that I work weekends")?.text).toBe("I work weekends");
  });

  it("remembers each note once and forgets on request", () => {
    const a = constraintFrom("no fridays")!;
    const list = remember(remember([], a), a);
    expect(list).toHaveLength(1);
    expect(forget(list, a.id)).toEqual([]);
  });
});

describe("re-planning with a note", () => {
  it("reads section start times", () => {
    expect(startHour("Tue/Thu 9:00–10:50 am")).toBe(9);
    expect(startHour("Mon/Wed 1:00–2:50 pm")).toBe(13);
    expect(startHour("Mon/Wed 10:00–11:50 am")).toBe(10);
  });

  it("rules out options a note excludes and prefers what it asks for", () => {
    const early = constraintFrom("no classes before 10")!;
    expect(steerPick(open, [early]).ruledOut.map((o) => o.id)).toEqual(["psyc5"]);
    expect(steerPick(open, [constraintFrom("Tue/Thu works better")!]).pick?.id).toBe("psyc5");
    expect(steerPick(open, [constraintFrom("A class that surely counts")!]).pick?.verdict).toBe("counts");
  });

  it("plays a re-plan run with a header that names her note", () => {
    const note = constraintFrom("Tue/Thu works better")!;
    const run = play(steerEvents(note, open, [note], "math13"));
    expect(run.status).toBe("done");
    expect(run.result?.optionId).toBe("psyc5");
    expect(runHeadline(run)).toBe("Re-planning because you said: Tue/Thu works better for classes");
    expect(run.steps.at(-1)?.text).toMatch(/instead/);
  });

  it("says so when no open option fits", () => {
    const notes = [constraintFrom("no classes before 10")!, constraintFrom("I can only do online")!];
    const run = play(steerEvents(notes[0]!, open.filter((o) => o.id === "psyc5"), notes, "psyc5"));
    expect(run.result?.gaveUp).toBe(true);
  });
});

describe("a helper that needs a note", () => {
  it("waits on her, with the asking helper marked waiting", () => {
    const run = play(NEEDS_NOTE);
    expect(run.status).toBe("waiting");
    expect(run.need?.choices).toHaveLength(2);
    expect(atAGlance(run, on, null).find((g) => g.helper === "planner")?.state).toBe("waiting");
  });
});

describe("while you were away", () => {
  it("sums up a finished run in one line", () => {
    const run = play([
      { type: "start", trigger: "recheck", mode: "live", reason: "MATH 13 filled", at: 0 },
      { type: "stale", facts: ["seats.math13"], tools: ["search_open_sections"], at: 10 },
      { type: "step", tool: "search_open_sections", helper: "backup", text: "x", ok: true, at: 20 },
      { type: "done", result: { optionId: "psyc5", why: null, model: null, gaveUp: false }, at: 30 },
    ] as never);
    expect(awaySummary(run, "PSYC 5")).toEqual({ title: "While you were away: MATH 13 just filled", body: "Backup finder redid 1 step. My pick is now PSYC 5." });
  });
});

describe("counselor draft", () => {
  it("backs every line with a source, and the email says the same lines", () => {
    const lines = draftLines("bus21");
    expect(lines.every((l) => l.sourceIds.length > 0)).toBe(true);
    for (const l of lines) expect(buildDraft("bus21")).toContain(l.text);
  });
});
