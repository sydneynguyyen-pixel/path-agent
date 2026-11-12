import { options } from "@/data/scenario";
import type { AgentId } from "@/lib/journey";
import { TRIGGERS, type Trigger } from "./loop";
import type { World } from "./tools";

const HELPERS: AgentId[] = ["reader", "planner", "backup", "drafter"];
const KNOWN = new Set(options.map((o) => o.id));

/** Everything a run needs from the app. The server trusts nothing else. */
export type RunInput = { agentOn: Record<AgentId, boolean>; world: World; trigger: Trigger; runId?: string };

/**
 * Reads a request body into a run. Unknown helpers, options and fields are dropped, so a bad
 * or old request still produces a safe run: helpers stay on unless explicitly off, and only
 * known options with whole, non-negative seat counts can change the world.
 */
export function parseRunInput(body: unknown): RunInput {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const on = (b["agentOn"] && typeof b["agentOn"] === "object" ? b["agentOn"] : {}) as Record<string, unknown>;
  const agentOn = Object.fromEntries(HELPERS.map((h) => [h, on[h] !== false])) as Record<AgentId, boolean>;

  const w = (b["world"] && typeof b["world"] === "object" ? b["world"] : {}) as Record<string, unknown>;
  const world: World = {};
  if (w["seats"] && typeof w["seats"] === "object") {
    const seats = Object.entries(w["seats"] as Record<string, unknown>).filter(([id, n]) => KNOWN.has(id) && Number.isInteger(n) && (n as number) >= 0);
    if (seats.length) world.seats = Object.fromEntries(seats) as Record<string, number>;
  }
  if (Array.isArray(w["declined"])) {
    const declined = [...new Set(w["declined"].filter((id): id is string => typeof id === "string" && KNOWN.has(id)))];
    if (declined.length) world.declined = declined;
  }

  const trigger = TRIGGERS.includes(b["trigger"] as Trigger) ? (b["trigger"] as Trigger) : "error";
  const runId = typeof b["runId"] === "string" && /^[\w-]{1,64}$/.test(b["runId"]) ? b["runId"] : undefined;
  return { agentOn, world, trigger, ...(runId ? { runId } : {}) };
}
