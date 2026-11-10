import type { AgentId } from "@/lib/journey";
import { runAgent, scriptedModel, type AgentEvent, type Model, type ToolCall } from "./loop";
import { toolsFor } from "./tools";

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

/** Runs the agent on the gateway. If that isn't possible, says so and runs the same tools without AI. */
export async function runRecovery(env: GatewayEnv, agentOn: Record<AgentId, boolean>, emit: (e: AgentEvent) => void | Promise<void>) {
  const tools = toolsFor(agentOn);
  const scripted = async (reason: string) => {
    await emit({ type: "start", mode: "scripted", reason });
    const paced = async (e: AgentEvent) => {
      await emit(e);
      if (env.scriptedDelayMs) await new Promise((r) => setTimeout(r, env.scriptedDelayMs));
    };
    await emit({ type: "done", result: await runAgent({ model: scriptedModel, tools, emit: paced }) });
  };

  if (!env.apiKey) return scripted("No AI key is connected here.");
  try {
    await emit({ type: "start", mode: "live", reason: null });
    const result = await runAgent({ model: gatewayModel({ ...env, apiKey: env.apiKey }), tools, emit });
    await emit({ type: "done", result });
  } catch (e) {
    await scripted(reasonFor(e));
  }
}
