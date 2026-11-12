import type { AgentId } from "@/lib/journey";
import { newRunId, runAgent, scriptedModelFor, type AgentEvent, type Trigger } from "./loop";
import { causeFor, knownFor, promptFor, staleFor } from "./recheck";
import { toolsFor, type World } from "./tools";

/** What changed and why this run started. All optional: a plain recover() behaves as before. */
export type RecoverOptions = { world?: World; trigger?: Trigger; changes?: string[] };

/** Streams one agent run from the server. Throws if the endpoint can't be reached. */
export async function streamRecovery(agentOn: Record<AgentId, boolean>, onEvent: (e: AgentEvent) => void, signal: AbortSignal, body: RecoverOptions & { runId?: string } = {}) {
  const res = await fetch("/api/agent-recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentOn, ...body }), signal });
  if (!res.ok || !res.body) throw new Error(`Agent endpoint returned ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        onEvent(JSON.parse(line) as AgentEvent);
      } catch {
        // A malformed line is skipped rather than ending the run.
      }
    }
  }
}

/** Streams a run, and finishes it in the browser without AI if the server can't. The demo never dead-ends. */
export async function recover(agentOn: Record<AgentId, boolean>, emit: (e: AgentEvent) => void, signal: AbortSignal, opts: RecoverOptions = {}) {
  const world = opts.world ?? {};
  const trigger = opts.trigger ?? "error";
  const changes = trigger === "error" ? [] : opts.changes ?? [];
  const runId = newRunId();
  let finished = false;
  try {
    await streamRecovery(agentOn, (e) => { if (e.type === "done") finished = true; emit(e); }, signal, { world, trigger, runId, changes });
  } catch {
    // Handled below: anything short of a finished run falls through to the scripted run.
  }
  if (finished || signal.aborted) return;
  const cause = causeFor(changes, world);
  emit({ type: "start", mode: "scripted", reason: "The AI service didn't respond.", runId, trigger, ...(cause ? { cause } : {}) });
  if (changes.length) emit({ type: "stale", facts: changes, tools: staleFor(changes) });
  const known = knownFor(changes);
  const paced = async (e: AgentEvent) => {
    if (signal.aborted) return;
    emit(e);
    await new Promise((r) => setTimeout(r, 450));
  };
  const result = await runAgent({ model: scriptedModelFor(world, known), tools: toolsFor(agentOn, world), emit: paced, world, known, userPrompt: promptFor(trigger, changes, world) });
  if (!signal.aborted) emit({ type: "done", result, ttvMs: result.ttvMs ?? null });
}

/** Asks Sprout. Resolves to null when there's no live answer, so the chat keeps its scripted preview. */
export async function askLive(question: string, opts: { today: string; notes: string[] }, signal?: AbortSignal): Promise<{ answer: string; topic: import("@/lib/desktop").WidgetKind | null; factIds: string[]; model: string | null } | null> {
  try {
    const res = await fetch("/api/agent-ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, ...opts }), signal: signal ?? AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const v = (await res.json()) as { mode?: string; answer?: string; topic?: import("@/lib/desktop").WidgetKind | null; factIds?: string[]; model?: string | null };
    return v.mode === "live" && typeof v.answer === "string" ? { answer: v.answer, topic: v.topic ?? null, factIds: v.factIds ?? [], model: v.model ?? null } : null;
  } catch {
    return null;
  }
}
