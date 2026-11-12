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
  stale: { facts: string[]; helpers: AgentId[] } | null;
  result: AgentResult | null;
  ttvMs: number | null;
  /** The question a helper is waiting on, while status is "waiting". */
  need: { helper: AgentId; question: string; choices: string[] } | null;
};

export const newTraceRun = (): TraceRun => ({ runId: null, parentRunId: null, status: "running", mode: null, reason: null, cause: null, trigger: "error", startedAt: null, entries: [], steps: [], stale: null, result: null, ttvMs: null, need: null });

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

export type StoryLine = { helper: AgentId; used: boolean; text: string; sourceIds: string[] };

/**
 * One plain line per helper, built only from that helper's own steps. A helper that did nothing
 * says why: it's off, it kept an earlier result, or it wasn't needed.
 */
export function storyLines(run: TraceRun, agentOn: Record<AgentId, boolean>, earlier: TraceRun[] = []): StoryLine[] {
  return ORDER.map((helper) => {
    const steps = run.steps.filter((s) => s.helper === helper);
    if (steps.length) {
      const last = [...steps].reverse().find((s) => s.ok) ?? steps.at(-1)!;
      return { helper, used: true, text: last.text, sourceIds: [...new Set(steps.flatMap((s) => s.sourceIds))] };
    }
    if (!agentOn[helper]) return { helper, used: false, text: OFF_LINE[helper], sourceIds: [] };
    if (earlier.some((r) => r.steps.some((s) => s.helper === helper))) return { helper, used: false, text: `${HELPER_NAME[helper]}'s earlier result was still valid, so it didn't run again.`, sourceIds: [] };
    if (helper === "drafter") return { helper, used: false, text: "Drafter is waiting. It only writes your counselor if your pick needs a yes.", sourceIds: [] };
    return { helper, used: false, text: `${HELPER_NAME[helper]} wasn't needed this time.`, sourceIds: [] };
  });
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

/** "filled 2 min later", from the first run's start to the re-check's start. */
export function laterLine(fromMs: number, toMs: number) {
  const s = Math.max(0, Math.round((toMs - fromMs) / 1000));
  return s < 60 ? `${s}s later` : `${Math.round(s / 60)} min later`;
}

// ---------- Helper lanes: positions for the "How it ran" chart ----------

export type LaneDot = { id: string; helper: AgentId; ms: number; x: number; y: number; text: string; sourceIds: string[]; at: Date; pick: boolean; kept: boolean; optionId?: string | null };
export type LaneLink = { from: { x: number; y: number }; to: { x: number; y: number }; summary: string };
export type LaneChange = { x: number; label: string };
export type LaneLayout = { width: number; height: number; laneY: Record<AgentId, number>; dots: LaneDot[]; links: LaneLink[]; changes: LaneChange[]; ticks: { x: number; label: string }[] };

export const LANE = { left: 120, right: 40, top: 34, gap: 46, minWidth: 640, pxPerSecond: 70 };

/**
 * Lays out a run and its re-checks on one time axis: one lane per helper, x = time since the first
 * run started. Gaps between runs are shortened so a long wait doesn't push the re-check off screen.
 */
export function laneLayout(root: TraceRun, rechecks: TraceRun[] = []): LaneLayout {
  const laneY = Object.fromEntries(ORDER.map((h, i) => [h, LANE.top + i * LANE.gap])) as Record<AgentId, number>;
  const runs = [root, ...rechecks];
  // Each run gets its own stretch of the axis; a re-check starts a short gap after the previous run ends.
  const GAP_MS = 1500;
  let offset = 0;
  const spans = runs.map((r, i) => {
    const t0 = r.startedAt?.getTime() ?? r.steps[0]?.at.getTime() ?? 0;
    const last = Math.max(t0, ...r.entries.map((e) => e.at.getTime()));
    const start = i === 0 ? 0 : offset + GAP_MS;
    offset = start + (last - t0);
    return { r, t0, start, end: offset };
  });
  const totalMs = Math.max(1000, offset);
  const width = Math.max(LANE.minWidth, LANE.left + LANE.right + (totalMs / 1000) * LANE.pxPerSecond);
  const xOf = (ms: number) => LANE.left + (ms / totalMs) * (width - LANE.left - LANE.right);
  const dots: LaneDot[] = [];
  const links: LaneLink[] = [];
  const changes: LaneChange[] = [];
  const ticks: { x: number; label: string }[] = [{ x: xOf(0), label: "0s" }];
  spans.forEach(({ r, t0, start }, i) => {
    const runDots: LaneDot[] = r.steps.map((s, k) => {
      const ms = start + (s.at.getTime() - t0);
      return { id: `${r.runId ?? i}-${k}`, helper: s.helper, ms, x: xOf(ms), y: laneY[s.helper], text: s.text, sourceIds: s.sourceIds, at: s.at, pick: s.tool === "submit_recommendation", kept: false, optionId: s.tool === "submit_recommendation" ? r.result?.optionId ?? null : null };
    });
    if (i > 0) {
      changes.push({ x: xOf(start - GAP_MS / 2), label: r.trigger === "steer" ? (r.cause ? `You said: ${r.cause}` : "Your note") : runTitle(r) });
      const earlier = runs.slice(0, i);
      for (const h of ORDER) {
        if (r.steps.some((s) => s.helper === h)) continue;
        const prev = [...earlier].reverse().flatMap((e) => e.steps).find((s) => s.helper === h);
        if (prev) dots.push({ id: `${r.runId ?? i}-kept-${h}`, helper: h, ms: start, x: xOf(start), y: laneY[h], text: `${HELPER_NAME[h]} kept its earlier result: ${prev.text}`, sourceIds: prev.sourceIds, at: prev.at, pick: false, kept: true });
      }
    }
    for (const e of r.entries) {
      if (e.kind !== "handoff") continue;
      const ms = start + (e.at.getTime() - t0);
      const from = [...runDots].reverse().find((d) => d.helper === e.from && d.ms <= ms);
      const to = runDots.find((d) => d.helper === e.to && d.ms >= ms);
      if (from && to) links.push({ from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, summary: e.summary });
    }
    dots.push(...runDots);
    if (r.ttvMs !== null) ticks.push({ x: xOf(start + r.ttvMs), label: i === 0 ? `${Math.round(r.ttvMs / 1000)}s · usable` : `+${Math.round(r.ttvMs / 1000)}s` });
  });
  return { width, height: LANE.top + ORDER.length * LANE.gap, laneY, dots, links, changes, ticks };
}
