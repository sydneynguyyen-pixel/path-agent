import type { AgentId } from "@/lib/journey";
import { newRunId, runAgent, scriptedModelFor, type AgentEvent, type AgentResult, type Model, type ToolCall, type Trigger } from "./loop";
import { causeFor, knownFor, promptFor, staleFor } from "./recheck";
import { toolsFor, type World } from "./tools";

/** Server-only. Model calls stay on Lovable's gateway and the key never reaches the browser. */
export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export type GatewayEnv = { apiKey?: string | undefined; url?: string | undefined; model?: string | undefined; fetchImpl?: typeof fetch; scriptedDelayMs?: number };

export class GatewayError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function gatewayModel(env: GatewayEnv & { apiKey: string }): Model {
  const doFetch = env.fetchImpl ?? fetch;
  return async (messages, tools) => {
    const res = await doFetch(env.url ?? GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.apiKey}` },
      body: JSON.stringify({ ...(env.model ? { model: env.model } : {}), messages, ...(tools.length ? { tools, tool_choice: "auto" } : {}) }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new GatewayError(`Gateway returned ${res.status}`, res.status);
    const body = (await res.json()) as { model?: string; choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[] };
    const message = body.choices?.[0]?.message;
    if (!message) throw new GatewayError("Gateway reply had no message", 502);
    return { content: message.content ?? null, toolCalls: message.tool_calls ?? [], model: body.model };
  };
}

const reasonFor = (e: unknown) => {
  const status = e instanceof GatewayError ? e.status : 0;
  if (status === 402) return "The AI workspace is out of credits.";
  if (status === 429) return "The AI service is rate limited right now.";
  return "The AI service didn't respond.";
};

/** Who started this run, with which facts, and what changed since the last one. Defaults keep older callers working. */
export type RunOptions = { world?: World; trigger?: Trigger; runId?: string; changes?: string[] };

/** Runs the agent on the gateway. If that isn't possible, says so and runs the same tools without AI. */
export async function runRecovery(env: GatewayEnv, agentOn: Record<AgentId, boolean>, emit: (e: AgentEvent) => void | Promise<void>, run: RunOptions = {}) {
  const world = run.world ?? {};
  const trigger = run.trigger ?? "error";
  const runId = run.runId ?? newRunId();
  const changes = trigger === "error" ? [] : run.changes ?? [];
  const known = knownFor(changes);
  const userPrompt = promptFor(trigger, changes, world);
  const tools = toolsFor(agentOn, world);
  const begin = async (mode: "live" | "scripted", reason: string | null) => {
    const cause = causeFor(changes, world);
    await emit({ type: "start", mode, reason, runId, trigger, ...(cause ? { cause } : {}) });
    if (changes.length) await emit({ type: "stale", facts: changes, tools: staleFor(changes) });
  };
  const finish = async (result: AgentResult) => emit({ type: "done", result, ttvMs: result.ttvMs ?? null });
  const scripted = async (reason: string) => {
    await begin("scripted", reason);
    const paced = async (e: AgentEvent) => {
      await emit(e);
      if (env.scriptedDelayMs) await new Promise((r) => setTimeout(r, env.scriptedDelayMs));
    };
    await finish(await runAgent({ model: scriptedModelFor(world, known), tools, emit: paced, world, known, userPrompt }));
  };

  if (!env.apiKey) return scripted("No AI key is connected here.");
  try {
    await begin("live", null);
    await finish(await runAgent({ model: gatewayModel({ ...env, apiKey: env.apiKey }), tools, emit, world, known, userPrompt }));
  } catch (e) {
    await scripted(reasonFor(e));
  }
}
