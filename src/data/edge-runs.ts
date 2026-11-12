import type { RunEvent } from "@/lib/run";

/**
 * Edge cases from the agent design handoff, as event streams in the backend's format.
 * Each is replayed through the same reducer as a live run. Synthetic, like the rest of the demo;
 * these go away as the backend learns to send them.
 */
export type TimedEvent = RunEvent & { at: number };

/** MATH 13 fills while Maya is deciding. Only the seat search and the pick are redone. */
export const SEAT_FILLS: TimedEvent[] = [
  { type: "start", runId: "run_8", parentRunId: "run_7", trigger: "recheck", mode: "live", reason: "MATH 13 filled", at: 0 },
  { type: "stale", facts: ["seats.math13"], tools: ["search_open_sections", "submit_recommendation"], at: 120 },
  { type: "step", tool: "search_open_sections", helper: "backup", level: "reads", text: "Searched the class list again: MATH 13 is now full, and PSYC 5 still has open seats", sourceIds: ["artic-psyc5"], ok: true, ms: 900, at: 1100 },
  { type: "handoff", from: "backup", to: "planner", summary: "1 open section that still counts", at: 1600 },
  { type: "step", tool: "submit_recommendation", helper: "planner", level: "drafts", text: "Recommended PSYC 5 §01, and it passed the safety check", sourceIds: ["artic-psyc5"], ok: true, ms: 1400, at: 2600 },
  { type: "done", result: { optionId: "psyc5", why: "PSYC 5 still has 4 open seats and counts with a C or better.", model: null, gaveUp: false }, ttvMs: 2600, at: 2650 },
];

/** The seats a re-check found filled, so the option cards can say "Just filled". */
export const FILLED_BY: Record<string, string> = { "seats.math13": "math13", "seats.psyc5": "psyc5" };

/** Two options both work, so the Planner asks her which matters more instead of guessing. */
export const NEEDS_NOTE: TimedEvent[] = [
  { type: "start", runId: "run_9", trigger: "error", mode: "live", reason: null, at: 0 },
  { type: "step", tool: "read_portal_error", helper: "reader", level: "reads", text: "Read the registration page: STAT 2 §01 is full", sourceIds: ["portal-full"], ok: true, ms: 700, at: 700 },
  { type: "step", tool: "search_open_sections", helper: "backup", level: "reads", text: "Found 2 open sections that fit your week: MATH 13 and PSYC 5", sourceIds: [], ok: true, ms: 900, at: 1600 },
  { type: "handoff", from: "backup", to: "planner", summary: "2 open sections to compare", at: 1900 },
  { type: "step", tool: "find_courses_that_count", helper: "planner", level: "reads", text: "Both count: MATH 13 outright, PSYC 5 with a C or better", sourceIds: ["artic-math13", "artic-psyc5"], ok: true, ms: 1100, at: 2800 },
  { type: "need", helper: "planner", question: "MATH 13 and PSYC 5 both work. Which matters more to you?", choices: ["A class that surely counts", "Tue/Thu works better"], at: 3100 },
];
