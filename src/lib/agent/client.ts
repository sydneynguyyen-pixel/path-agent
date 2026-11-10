import type { AgentId } from "@/lib/journey";
import { runAgent, scriptedModel, type AgentEvent } from "./loop";
import { toolsFor } from "./tools";

/** Streams one agent run from the server. Throws if the endpoint can't be reached. */
export async function streamRecovery(agentOn: Record<AgentId, boolean>, onEvent: (e: AgentEvent) => void, signal: AbortSignal) {
  const res = await fetch("/api/agent-recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentOn }), signal });
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
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as AgentEvent);
  }
}

/** Streams a run, and finishes it in the browser without AI if the server can't. The demo never dead-ends. */
export async function recover(agentOn: Record<AgentId, boolean>, emit: (e: AgentEvent) => void, signal: AbortSignal) {
  let finished = false;
  try {
    await streamRecovery(agentOn, (e) => { if (e.type === "done") finished = true; emit(e); }, signal);
  } catch {
    // Handled below: anything short of a finished run falls through to the scripted run.
  }
  if (finished || signal.aborted) return;
  emit({ type: "start", mode: "scripted", reason: "The AI service didn't respond." });
  const paced = async (e: AgentEvent) => {
    if (signal.aborted) return;
    emit(e);
    await new Promise((r) => setTimeout(r, 450));
  };
  const result = await runAgent({ model: scriptedModel, tools: toolsFor(agentOn), emit: paced });
  if (!signal.aborted) emit({ type: "done", result });
}
