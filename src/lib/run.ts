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
  /** From the start event. Null only for streams that never sent one. */
  runId: string | null;
  /** For a re-check or re-plan: the run whose result it changed. */
  parentRunId: string | null;
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
  stale: { facts: string[]; helpers: AgentId[]; tools: string[] } | null;
  result: AgentResult | null;
  ttvMs: number | null;
  /** The question a helper is waiting on, while status is "waiting". */
  need: { helper: AgentId; question: string; choices: string[] } | null;
};

export const newTraceRun = (): TraceRun => ({ runId: null, parentRunId: null, status: "running", mode: null, reason: null, cause: null, trigger: "error", startedAt: null, entries: [], steps: [], stale: null, result: null, ttvMs: null, need: null });

/** Which helper owns each tool, so a re-check can say who is redoing work. */
export const TOOL_HELPER: Record<string, AgentId> = {
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
      return { ...newTraceRun(), runId: e.runId ?? null, parentRunId: e.parentRunId ?? null, mode: e.mode, reason: e.reason, cause: e.cause ?? null, trigger: e.trigger ?? (e.parentRunId ? "recheck" : "error"), startedAt: at, stale: r.stale };
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
      return { ...r, stale: { facts: e.facts, helpers, tools: e.tools } };
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

// ---------- Run history: every finished run, with re-checks linked to the run they changed ----------

export const RUN_HISTORY_CAP = 20;

/** Keeps a finished run, newest last. A run seen again (same id) replaces its earlier copy. */
export function recordRun(runs: TraceRun[], run: TraceRun): TraceRun[] {
  if (run.status !== "done" || !run.runId) return runs;
  return [...runs.filter((r) => r.runId !== run.runId), run].slice(-RUN_HISTORY_CAP);
}

/** A first run and every re-check that followed from it, oldest re-check first. */
export type RunGroup = { root: TraceRun; rechecks: TraceRun[] };

/** Groups runs by the run they started from, newest group first. A re-check of a re-check joins the same group. */
export function runGroups(runs: TraceRun[]): RunGroup[] {
  const byId = new Map(runs.filter((r) => r.runId).map((r) => [r.runId!, r]));
  const rootOf = (r: TraceRun): TraceRun => {
    const seen = new Set<string>();
    let cur = r;
    while (cur.parentRunId && byId.has(cur.parentRunId) && !seen.has(cur.parentRunId)) {
      seen.add(cur.parentRunId);
      cur = byId.get(cur.parentRunId)!;
    }
    return cur;
  };
  const groups: RunGroup[] = [];
  for (const r of runs) {
    const root = rootOf(r);
    let g = groups.find((x) => x.root === root);
    if (!g) groups.push((g = { root, rechecks: [] }));
    if (r !== root) g.rechecks.push(r);
  }
  return groups.reverse();
}

const ORDER: AgentId[] = ["reader", "planner", "backup", "drafter"];

/** A run's title, from what started it. The class comes from what Reader saw, never a guess. */
export function runTitle(run: TraceRun) {
  if (run.trigger === "steer") return run.cause ? `Re-planned because you said: ${run.cause}` : "Re-planned from your note";
  if (run.trigger === "recheck") return run.stale ? recheckLine(run.stale.facts, true).replace(". I re-checked your options.", "") : "Re-checked your options";
  const read = run.steps.find((s) => s.helper === "reader")?.text ?? "";
  const course = read.match(/\b([A-Z]{2,5}\s?\d+[A-Z]?)\b[^.]*\b(?:full|closed)\b/i)?.[1];
  return course ? `${course} was full` : "A class you tried to add was full";
}

const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

/** Who redid work in a re-check and who kept an earlier result: "Backup finder and Planner redid their work. Reader was still valid, so it didn't re-run." */
export function recheckSummary(recheck: TraceRun, earlier: TraceRun[]) {
  const redid = ORDER.filter((h) => recheck.steps.some((s) => s.helper === h));
  const kept = ORDER.filter((h) => !redid.includes(h) && earlier.some((r) => r.steps.some((s) => s.helper === h)));
  const a = redid.length ? `${list(redid.map((h) => HELPER_NAME[h]))} redid ${redid.length === 1 ? "its" : "their"} work.` : "No helper needed to redo work.";
  const b = kept.length ? ` ${list(kept.map((h) => HELPER_NAME[h]))} ${kept.length === 1 ? "was" : "were"} still valid, so ${kept.length === 1 ? "it" : "they"} didn't re-run.` : "";
  return { redid, kept, line: a + b };
}

// ---------- Behind the scenes: trace rows, what was redone, safety checks ----------

/** The agent's tools in run order, with plain names for students. */
export const TOOLS: { id: string; plain: string }[] = [
  { id: "read_portal_error", plain: "Read the registration page" },
  { id: "find_courses_that_count", plain: "Check which classes count" },
  { id: "search_open_sections", plain: "Find open seats" },
  { id: "check_week_fit", plain: "Check your busy weeks" },
  { id: "submit_recommendation", plain: "Make a pick and run the safety checks" },
];
export const toolPlain = (id: string) => TOOLS.find((t) => t.id === id)?.plain ?? id;

export type TraceRow =
  | { kind: "step"; id: string; tool: string; helper: AgentId; text: string; ok: boolean; sourceIds: string[]; startMs: number; endMs: number }
  | { kind: "kept"; id: string; tool: string; helper: AgentId; text: string }
  | { kind: "handoff"; id: string; from: AgentId; to: AgentId; summary: string; atMs: number };

/**
 * The waterfall for one run: steps with their start and end (a step starts when the previous entry
 * ended), handoffs, and, for a re-check, the earlier steps it kept instead of redoing.
 */
export function traceRows(run: TraceRun, earlier: TraceRun[] = []): { rows: TraceRow[]; totalMs: number } {
  const t0 = run.startedAt?.getTime() ?? run.entries[0]?.at.getTime() ?? 0;
  const ranTools = new Set(run.steps.map((s) => s.tool));
  const kept: TraceRow[] = [];
  if (earlier.length) {
    for (const t of TOOLS) {
      if (ranTools.has(t.id)) continue;
      const prev = [...earlier].reverse().flatMap((r) => [...r.steps].reverse()).find((s) => s.tool === t.id);
      if (prev) kept.push({ kind: "kept", id: `kept-${t.id}`, tool: t.id, helper: prev.helper, text: prev.text });
    }
  }
  const rows: TraceRow[] = [];
  let prevMs = 0;
  let stepIdx = 0;
  for (const e of run.entries) {
    const ms = Math.max(0, e.at.getTime() - t0);
    if (e.kind === "handoff") rows.push({ kind: "handoff", id: `h-${ms}-${e.from}`, from: e.from, to: e.to, summary: e.summary, atMs: ms });
    if (e.kind === "step") {
      const s = run.steps[stepIdx++];
      rows.push({ kind: "step", id: `s-${stepIdx}`, tool: s?.tool ?? "", helper: e.helper, text: e.text, ok: e.ok, sourceIds: e.sourceIds, startMs: prevMs, endMs: ms });
    }
    prevMs = ms;
  }
  const totalMs = Math.max(1000, prevMs, run.ttvMs ?? 0);
  return { rows: [...kept, ...rows], totalMs };
}

export type ToolState = "ran" | "kept" | "idle";

/** For each tool: did it run in this run, keep an earlier answer, or not take part. */
export function toolStates(run: TraceRun, earlier: TraceRun[] = []): Record<string, ToolState> {
  const ran = new Set(run.steps.map((s) => s.tool));
  const before = new Set(earlier.flatMap((r) => r.steps.map((s) => s.tool)));
  return Object.fromEntries(TOOLS.map((t) => [t.id, ran.has(t.id) ? "ran" : before.has(t.id) ? "kept" : "idle"]));
}

/** Plain words for a changed fact: "MATH 13 filled", "Your note". */
export function factPlain(fact: string) {
  const [kind, id = ""] = fact.split(".");
  if (kind === "seats") return `${id.replace(/^([a-z]+)(\d+)$/, (_m, a: string, b: string) => `${a.toUpperCase()} ${b}`)} filled`;
  if (kind === "note") return "Your note";
  if (kind === "counselor") return "Your counselor said no";
  return fact;
}

/** The rules every pick has to pass, as code checks them. */
export const PICK_CHECKS = [
  "Looked up what counts and what's open first",
  "The section has open seats",
  "It counts toward the requirement",
  "Your counselor hasn't declined it",
  "It follows the notes you gave the helpers",
];

/** Whether this run's pick passed the checks, and what got sent back on the way. */
export function checkResult(run: TraceRun): { state: "passed" | "none" | "running"; sentBack: string[]; blocked: string[] } {
  const submits = run.steps.filter((s) => s.tool === "submit_recommendation");
  const sentBack = submits.filter((s) => !s.ok).map((s) => s.text.replace(/^The safety check sent a recommendation back:\s*/, ""));
  const blocked = run.entries.flatMap((e) => (e.kind === "blocked" ? [e.rule] : []));
  if (run.status !== "done") return { state: "running", sentBack, blocked };
  return { state: submits.some((s) => s.ok) ? "passed" : "none", sentBack, blocked };
}

// ---------- Activity: one line per run group, one sentence per run, and her decisions on each run ----------

/** The closed card's one line: "STAT 2 was full → picked PSYC 5". Only says what the latest run actually did. */
export function groupSummary(group: RunGroup, pickName: string | null): string {
  const last = group.rechecks.at(-1) ?? group.root;
  const title = runTitle(group.root);
  if (last.status === "running") return `${title} → working on it`;
  if (last.status === "waiting") return `${title} → waiting on you`;
  if (pickName) return `${title} → picked ${pickName}`;
  if (last.result?.gaveUp) return `${title} → nothing open fits yet`;
  return title;
}

/** One plain sentence for a run: how many steps it took, or for a re-check what ran again and what kept its answer. */
export function runSentence(run: TraceRun, earlier: TraceRun[] = []): string {
  if (!earlier.length) {
    if (run.status !== "done" && run.steps.length === 0) return `${runTitle(run)}. The helpers are starting.`;
    return `${runTitle(run)}, so the helpers took ${run.steps.length} ${run.steps.length === 1 ? "step" : "steps"} to find you another class.`;
  }
  const states = Object.values(toolStates(run, earlier));
  const ran = states.filter((s) => s === "ran").length;
  const kept = states.filter((s) => s === "kept").length;
  return `${runTitle(run)}. ${ran} ${ran === 1 ? "step" : "steps"} ran again and ${kept} kept ${kept === 1 ? "its" : "their"} answer.`;
}

/**
 * Splits her decisions across the runs of one group by time: each run owns what she decided from its
 * start until the next run started. A note she gave the helpers belongs to the re-plan it started.
 * Decisions before the first run or at/after `until` (the next group) are left out.
 */
export function decisionsByRun<D extends { what: string; when: Date }>(runs: TraceRun[], decisions: D[], until = Infinity): D[][] {
  const starts = runs.map((r) => r.startedAt?.getTime() ?? 0);
  const out = runs.map(() => [] as D[]);
  for (const d of decisions) {
    const t = d.when.getTime();
    if (!runs.length || t < starts[0]! || t >= until) continue;
    let i = 0;
    while (i + 1 < runs.length && starts[i + 1]! <= t) i++;
    const next = runs[i + 1];
    if (next?.trigger === "steer" && next.cause && d.what === `Told the helpers: ${next.cause}`) i++;
    out[i]!.push(d);
  }
  return out;
}
