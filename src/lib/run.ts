/**
 * How the app shows one agent run, built from the events Michelle's backend streams.
 * It accepts today's events (start, step, done) and the ones in the agent design handoff
 * (handoff, stale, policy, plus runId, trigger, sourceIds and ttvMs), so the UI is ready before the backend sends them.
 * Pure, so every state stays testable.
 */
import type { AgentEvent, AgentResult } from "@/lib/agent/loop";
import type { AgentId } from "@/lib/journey";

export type Trigger = "error" | "recheck" | "steer";

export type RunEvent =
  | { type: "start"; mode: "live" | "scripted"; reason: string | null; runId?: string; parentRunId?: string; trigger?: Trigger; cause?: string }
  | { type: "step"; tool: string; helper: AgentId; text: string; ok: boolean; perm?: "read" | "suggested"; level?: string; sourceIds?: string[]; ms?: number }
  | { type: "handoff"; from: AgentId; to: AgentId; summary: string }
  | { type: "stale"; facts: string[]; tools: string[] }
  | { type: "policy"; tool: string; rule: string }
  /** A helper can't go on without a short answer from her. The run waits until she gives one. */
  | { type: "need"; helper: AgentId; question: string; choices: string[] }
  | { type: "done"; result: AgentResult; ttvMs?: number };

export type TraceStep = { kind: "step"; helper: AgentId; text: string; ok: boolean; sourceIds: string[]; at: Date };
export type TraceEntry = TraceStep | { kind: "handoff"; from: AgentId; to: AgentId; summary: string; at: Date } | { kind: "blocked"; tool: string; rule: string; at: Date };

export type TraceRun = {
  status: "running" | "waiting" | "done";
  mode: "live" | "scripted" | null;
  reason: string | null;
  /** What a re-check or re-plan is responding to. Kept apart from `reason`, which says why it ran without AI. */
  cause: string | null;
  trigger: Trigger;
  startedAt: Date | null;
  entries: TraceEntry[];
  /** Kept for the parts of the app that only read steps. */
  steps: (TraceStep & { tool: string; perm: "read" | "suggested" })[];
  /** What changed, when a run is re-checking earlier work. */
  stale: { facts: string[]; helpers: AgentId[] } | null;
  result: AgentResult | null;
  ttvMs: number | null;
  /** The question a helper is waiting on, while status is "waiting". */
  need: { helper: AgentId; question: string; choices: string[] } | null;
};

export const newTraceRun = (): TraceRun => ({ status: "running", mode: null, reason: null, cause: null, trigger: "error", startedAt: null, entries: [], steps: [], stale: null, result: null, ttvMs: null, need: null });

/** Which helper owns each tool, so a re-check can say who is redoing work. */
const TOOL_HELPER: Record<string, AgentId> = {
  read_portal_error: "reader",
  find_courses_that_count: "planner",
  search_open_sections: "backup",
  check_week_fit: "backup",
  submit_recommendation: "planner",
};

export function applyRunEvent(run: TraceRun | null, event: RunEvent | AgentEvent, at: Date): TraceRun {
  const r = run ?? newTraceRun();
  const e = event as RunEvent;
  switch (e.type) {
    case "start":
      return { ...newTraceRun(), mode: e.mode, reason: e.reason, cause: e.cause ?? null, trigger: e.trigger ?? (e.parentRunId ? "recheck" : "error"), startedAt: at, stale: r.stale };
    case "step": {
      const step: TraceStep = { kind: "step", helper: e.helper, text: e.text, ok: e.ok, sourceIds: e.sourceIds ?? [], at };
      return { ...r, entries: [...r.entries, step], steps: [...r.steps, { ...step, tool: e.tool, perm: e.perm ?? (e.level === "drafts" ? "suggested" : "read") }] };
    }
    case "handoff":
      return { ...r, entries: [...r.entries, { kind: "handoff", from: e.from, to: e.to, summary: e.summary, at }] };
    case "need":
      return { ...r, status: "waiting", need: { helper: e.helper, question: e.question, choices: e.choices } };
    case "policy":
      return { ...r, entries: [...r.entries, { kind: "blocked", tool: e.tool, rule: e.rule, at }] };
    case "stale": {
      const helpers = [...new Set(e.tools.map((t) => TOOL_HELPER[t]).filter((h): h is AgentId => !!h))];
      return { ...r, stale: { facts: e.facts, helpers } };
    }
    case "done": {
      const ttvMs = e.ttvMs ?? (r.startedAt ? Math.max(0, at.getTime() - r.startedAt.getTime()) : null);
      return { ...r, status: "done", result: e.result, ttvMs, need: null };
    }
  }
}

export const HELPER_NAME: Record<AgentId, string> = { reader: "Reader", planner: "Planner", backup: "Backup finder", drafter: "Drafter" };

export type Glance = { helper: AgentId; state: "working" | "done" | "waiting" | "off" | "idle"; steps: number };

/** Run at a glance: for each helper, done, waiting on you, off, or not needed this time. */
export function atAGlance(run: TraceRun, agentOn: Record<AgentId, boolean>, waitingOn: AgentId | null): Glance[] {
  const working = run.status === "running" ? run.steps.at(-1)?.helper : undefined;
  return (Object.keys(HELPER_NAME) as AgentId[]).map((helper) => {
    const steps = run.steps.filter((s) => s.helper === helper).length;
    if (!agentOn[helper]) return { helper, state: "off", steps };
    if (helper === working) return { helper, state: "working", steps };
    if (run.status === "waiting" && helper === run.need?.helper) return { helper, state: "waiting", steps };
    if (helper === waitingOn && run.status === "done") return { helper, state: "waiting", steps };
    return { helper, state: steps > 0 ? "done" : "idle", steps };
  });
}

export function glanceLabel(g: Glance) {
  if (g.state === "off") return "off";
  if (g.state === "working") return "working now";
  if (g.state === "waiting") return "waiting on you";
  if (g.state === "idle") return "not needed";
  return `done · ${g.steps} ${g.steps === 1 ? "step" : "steps"}`;
}

/** "Usable option in 12s": how long from the error to something she can act on. */
export function usableIn(ms: number | null) {
  if (ms === null) return null;
  if (ms < 1000) return "Usable option in under a second";
  return `Usable option in ${Math.round(ms / 1000)}s`;
}

/** Plain words for a changed fact. Unknown facts fall back to a neutral line rather than a guess. */
const FACT_TEXT: Record<string, string> = {
  "seats.math13": "MATH 13 just filled",
  "seats.psyc5": "PSYC 5 just filled",
  "counselor.bus21": "Your counselor declined BUS 21",
};
export function recheckLine(facts: string[], done = false) {
  const said = facts.map((f) => FACT_TEXT[f] ?? (f.startsWith("note.") ? "You gave the helpers a new note" : undefined)).filter(Boolean);
  const tail = done ? "I re-checked your options." : "Re-checking your options.";
  return said.length ? `${said.join(". ")}. ${tail}` : `Something changed. ${tail}`;
}

/** What she can't get while a helper is off. */
export const OFF_LINE: Record<AgentId, string> = {
  reader: "Reader is off. I can't read the registration page, so I can't say what went wrong.",
  planner: "Planner is off. I can show open seats, not whether they count.",
  backup: "Backup finder is off. I can say what counts, not which sections have seats.",
  drafter: "Drafter is off. I won't draft notes, so you write your own.",
};

/** The run header: live, without AI, or re-checking, with the reason when there is one. */
export function runHeadline(run: TraceRun) {
  // The agent sends what a re-run responds to as `cause` and keeps `reason` for why it ran without AI.
  // Older streams (live mode, no cause) carried the cause in `reason`.
  const cause = run.cause ?? (run.mode === "live" ? run.reason : null);
  const noAi = run.mode === "scripted" && run.reason ? ` Ran without AI: ${run.reason}` : "";
  if (run.trigger === "steer") return `${cause ? `Re-planning because you said: ${cause}` : "Re-planning"}${noAi ? `.${noAi}` : ""}`;
  if (run.trigger === "recheck") return `${cause ? `Re-checking because ${cause}` : "Re-checking"}${noAi ? `.${noAi}` : ""}`;
  if (run.mode === "scripted") return run.reason ? `Ran without AI. ${run.reason}` : "Ran without AI";
  if (run.mode === "live") return "Live run";
  return "Connecting";
}

/** "While you were away": what a run did when she wasn't looking, in a title and one line. */
export function awaySummary(run: TraceRun, pickName: string | null): { title: string; body: string } | null {
  if (run.status !== "done") return null;
  const helpers = [...new Set(run.steps.map((s) => HELPER_NAME[s.helper]))];
  const who = helpers.length ? `${helpers.join(" and ")} redid ${run.steps.length} ${run.steps.length === 1 ? "step" : "steps"}` : "Nothing needed redoing";
  const title = run.stale ? recheckLine(run.stale.facts, true).replace(". I re-checked your options.", "") : "I re-checked your options";
  return { title: `While you were away: ${title}`, body: pickName ? `${who}. My pick is now ${pickName}.` : `${who}. Nothing open fits yet.` };
}
