import { describe, expect, it, vi } from "vitest";
import { GatewayError, gatewayModel, runRecovery } from "@/lib/agent/gateway";
import { applyAgentEvent, runAgent, scriptedModel, type AgentEvent, type Model, type ToolCall } from "@/lib/agent/loop";
import { allTools, rejectPick, toolsFor } from "@/lib/agent/tools";

const allOn = { reader: true, planner: true, backup: true, drafter: true };
const call = (name: string, args: Record<string, unknown> = {}, id = name): ToolCall => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
const scriptModel = (turns: ToolCall[][]): Model => {
  let i = 0;
  return async () => ({ content: null, toolCalls: turns[i++] ?? [], model: "test-model" });
};
const collect = () => {
  const events: AgentEvent[] = [];
  return { events, emit: (e: AgentEvent) => void events.push(e) };
};
const gather = [call("find_courses_that_count"), call("search_open_sections")];

describe("agent tools", () => {
  it("has no way to register, drop, waitlist or send", () => {
    for (const t of allTools) expect(t.name).not.toMatch(/register|enroll|drop|waitlist|send|email/i);
  });
  it("removes a helper's tools when it is off", () => {
    expect(toolsFor({ ...allOn, backup: false }).map((t) => t.name)).toEqual(["read_portal_error", "find_courses_that_count"]);
  });
  it("rejects picks that are full, don't count, or weren't researched", () => {
    const called = ["find_courses_that_count", "search_open_sections"];
    expect(rejectPick("math13", [])).toContain("find_courses_that_count");
    expect(rejectPick("stat2-02", called)).toContain("no open seats");
    expect(rejectPick("made-up", called)).toContain("no option");
    expect(rejectPick("math13", called)).toBeNull();
  });
});

describe("agent loop", () => {
  it("runs tools and returns a checked recommendation", async () => {
    const { events, emit } = collect();
    const result = await runAgent({ model: scriptModel([gather, [call("submit_recommendation", { option_id: "math13", why: "It counts." })]]), tools: toolsFor(allOn), emit });
    expect(result).toEqual({ optionId: "math13", why: "It counts.", model: "test-model", gaveUp: false });
    expect(events.filter((e) => e.type === "step")).toHaveLength(3);
  });
  it("sends a bad pick back to the model and lets it correct itself", async () => {
    const { events, emit } = collect();
    const result = await runAgent({ model: scriptModel([gather, [call("submit_recommendation", { option_id: "stat2-02", why: "Same class." })], [call("submit_recommendation", { option_id: "math13", why: "It counts." }, "second")]]), tools: toolsFor(allOn), emit });
    expect(result.optionId).toBe("math13");
    expect(events.some((e) => e.type === "step" && !e.ok)).toBe(true);
  });
  it("refuses a tool it wasn't given", async () => {
    const { events, emit } = collect();
    const result = await runAgent({ model: scriptModel([[call("register_student")]]), tools: toolsFor(allOn), emit });
    expect(result.gaveUp).toBe(true);
    expect(events).toHaveLength(0);
  });
  it("stops at the turn limit", async () => {
    const model = vi.fn(async () => ({ content: null, toolCalls: [call("read_portal_error")] }));
    const result = await runAgent({ model, tools: toolsFor(allOn), emit: () => {}, maxTurns: 3 });
    expect(model).toHaveBeenCalledTimes(3);
    expect(result.gaveUp).toBe(true);
  });
  it("completes the same path without AI", async () => {
    const { events, emit } = collect();
    const result = await runAgent({ model: scriptedModel, tools: toolsFor(allOn), emit });
    expect(result.optionId).toBeTruthy();
    expect(result.gaveUp).toBe(false);
    expect(events.filter((e) => e.type === "step").map((e) => e.type === "step" && e.tool)).toEqual(["read_portal_error", "find_courses_that_count", "search_open_sections", "check_week_fit", "submit_recommendation"]);
  });
  it("makes no recommendation when the backup finder is off", async () => {
    const result = await runAgent({ model: scriptedModel, tools: toolsFor({ ...allOn, backup: false }), emit: () => {} });
    expect(result.optionId).toBeNull();
  });
});

describe("run state", () => {
  const at = new Date(0);
  it("clears earlier steps when a run restarts as scripted", () => {
    let run = applyAgentEvent(null, { type: "start", mode: "live", reason: null }, at);
    run = applyAgentEvent(run, { type: "step", tool: "t", helper: "reader", perm: "read", text: "x", ok: true }, at);
    expect(run.steps).toHaveLength(1);
    run = applyAgentEvent(run, { type: "start", mode: "scripted", reason: "r" }, at);
    expect(run).toMatchObject({ mode: "scripted", reason: "r", steps: [], status: "running" });
  });
  it("finishes with the result", () => {
    const result = { optionId: "math13", why: "w", model: null, gaveUp: false };
    expect(applyAgentEvent(null, { type: "done", result }, at)).toMatchObject({ status: "done", result });
  });
});

describe("gateway", () => {
  const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("sends the key server-side and reads tool calls", async () => {
    const fetchImpl = reply({ model: "m1", choices: [{ message: { content: null, tool_calls: [call("read_portal_error")] } }] });
    const out = await gatewayModel({ apiKey: "k", fetchImpl })([], []);
    expect(out.toolCalls[0]?.function.name).toBe("read_portal_error");
    expect(out.model).toBe("m1");
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer k");
  });
  it("raises the status on errors", async () => {
    await expect(gatewayModel({ apiKey: "k", fetchImpl: reply({}, 402) })([], [])).rejects.toBeInstanceOf(GatewayError);
  });
  it("labels the run as scripted when there is no key", async () => {
    const { events, emit } = collect();
    await runRecovery({}, allOn, emit);
    expect(events[0]).toEqual({ type: "start", mode: "scripted", reason: "No AI key is connected here." });
    expect(events.at(-1)?.type).toBe("done");
  });
  it("restarts as scripted and says why when the gateway fails", async () => {
    const { events, emit } = collect();
    await runRecovery({ apiKey: "k", fetchImpl: reply({}, 402) }, allOn, emit);
    expect(events.filter((e) => e.type === "start").map((e) => e.type === "start" && e.mode)).toEqual(["live", "scripted"]);
    expect(events[1]).toEqual({ type: "start", mode: "scripted", reason: "The AI workspace is out of credits." });
  });
});
