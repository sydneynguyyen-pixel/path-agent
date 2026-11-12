import { describe, expect, it, vi } from "vitest";
import { askSprout, factsFor, parseAnswer, parseAskInput } from "@/lib/agent/ask";
import { runRecovery } from "@/lib/agent/gateway";
import { parseRunInput } from "@/lib/agent/input";
import { runAgent, scriptedModelFor, type AgentEvent } from "@/lib/agent/loop";
import { knownFor, promptFor, staleFor } from "@/lib/agent/recheck";
import { actionable, buildTools, rejectPick, toolsFor } from "@/lib/agent/tools";
import { addAsk, addReply } from "@/lib/chat";

const allOn = { reader: true, planner: true, backup: true, drafter: true };
const noEarly = { notes: [{ id: "no-early", text: "No classes before 10 am" }] };
const called = ["find_courses_that_count", "search_open_sections"];

describe("notes she gives the helpers", () => {
  it("rules out sections that break a note, in code", () => {
    expect(rejectPick("psyc5", called, noEarly)).toContain("No classes before 10 am");
    expect(actionable(noEarly).map((o) => o.id)).not.toContain("psyc5");
  });
  it("says which sections don't fit when searching", () => {
    const search = buildTools(noEarly).find((t) => t.name === "search_open_sections")!;
    expect(search.run({}).summary).toContain("PSYC 5 doesn't fit");
  });
  it("treats preferences as order, never as a rule", () => {
    const sure = { notes: [{ id: "sure", text: "Pick classes that surely count" }] };
    expect(actionable(sure).length).toBe(actionable().length);
    expect(actionable(sure)[0]!.verdict).toBe("counts");
  });
  it("passes free-form notes to the model without enforcing them", () => {
    const free = { notes: [{ id: "note-i-work-mondays", text: "I work Mondays" }] };
    expect(actionable(free).length).toBe(actionable().length);
  });
});

describe("re-checks", () => {
  it("re-runs only what depended on the change", () => {
    expect(staleFor(["seats.math13"])).toEqual(["search_open_sections", "check_week_fit", "submit_recommendation"]);
    expect(knownFor(["seats.math13"])).toEqual(["read_portal_error", "find_courses_that_count"]);
    expect(knownFor([])).toEqual([]);
  });
  it("tells the model what changed and carries earlier results forward", () => {
    const p = promptFor("recheck", ["seats.math13"], { seats: { math13: 0 } });
    expect(p).toContain("MATH 13 now has 0 open seats");
    expect(p).toContain("find_courses_that_count");
  });
  it("scripted re-check skips the still-valid tools and picks something else", async () => {
    const world = { seats: { math13: 0 } };
    const known = knownFor(["seats.math13"]);
    const events: AgentEvent[] = [];
    const result = await runAgent({ model: scriptedModelFor(world, known), tools: toolsFor(allOn, world), emit: (e) => void events.push(e), world, known });
    expect(events.filter((e) => e.type === "step").map((e) => e.type === "step" && e.tool)).toEqual(["search_open_sections", "check_week_fit", "submit_recommendation"]);
    expect(result.optionId).not.toBe("math13");
    expect(result.optionId).toBeTruthy();
  });
  it("the server announces what's stale and the time to value", async () => {
    const events: AgentEvent[] = [];
    await runRecovery({}, allOn, (e) => void events.push(e), { trigger: "recheck", changes: ["seats.math13"], world: { seats: { math13: 0 } } });
    expect(events[1]).toEqual({ type: "stale", facts: ["seats.math13"], tools: ["search_open_sections", "check_week_fit", "submit_recommendation"] });
    const done = events.at(-1);
    expect(done?.type === "done" && typeof done.ttvMs).toBe("number");
  });
  it("a first run never re-checks, even if changes are sent", async () => {
    const events: AgentEvent[] = [];
    await runRecovery({}, allOn, (e) => void events.push(e), { trigger: "error", changes: ["seats.math13"] });
    expect(events.some((e) => e.type === "stale")).toBe(false);
  });
  it("accepts only well-formed notes and changes", () => {
    const r = parseRunInput({ trigger: "steer", changes: ["note.no-early", "drop.everything", 5], world: { notes: [{ id: "no-early", text: " No classes before 10 am " }, { id: "BAD ID", text: "x" }, { id: "x" }] } });
    expect(r.changes).toEqual(["note.no-early"]);
    expect(r.world.notes).toEqual([{ id: "no-early", text: "No classes before 10 am" }]);
  });
});

describe("Sprout's chat", () => {
  const facts = factsFor("2026-11-08");
  it("knows the application deadline from her plan", () => {
    expect(facts.find((f) => f.id === "apply")!.text).toContain("22 days");
  });
  it("reads a JSON answer and drops unknown topics and fact ids", () => {
    expect(parseAnswer('Sure! {"answer":" You have  22 days. ","topic":"deadline","factIds":["apply","made-up"]}', facts)).toEqual({ answer: "You have 22 days.", topic: "deadline", factIds: ["apply"] });
    expect(parseAnswer('{"answer":"Hi","topic":"weather"}', facts)?.topic).toBeNull();
    expect(parseAnswer("not json", facts)).toBeNull();
    expect(parseAnswer('{"answer":""}', facts)).toBeNull();
  });
  it("falls back to the preview with no key, and says why", async () => {
    expect(await askSprout({}, "When is my application due?", { today: "2026-11-08" })).toEqual({ mode: "scripted", reason: "No AI key is connected here." });
  });
  it("answers live from the facts when the model replies", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { messages: { content: string }[] };
      expect(body.messages[0]!.content).toContain("[apply]");
      return new Response(JSON.stringify({ model: "m1", choices: [{ message: { content: '{"answer":"Your application is due Nov 30.","topic":"deadline","factIds":["apply"]}' } }] }));
    }) as unknown as typeof fetch;
    expect(await askSprout({ apiKey: "k", fetchImpl }, "When is my application due?", { today: "2026-11-08" })).toEqual({ mode: "live", answer: "Your application is due Nov 30.", topic: "deadline", factIds: ["apply"], model: "m1" });
  });
  it("treats an unreadable model reply as no answer", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "I think maybe" } }] }))) as unknown as typeof fetch;
    expect((await askSprout({ apiKey: "k", fetchImpl }, "hi", { today: "2026-11-08" })).mode).toBe("scripted");
  });
  it("validates the request", () => {
    expect(parseAskInput({ question: "   " })).toBeNull();
    expect(parseAskInput({ question: "x".repeat(900), today: "nope" })).toMatchObject({ today: "2026-11-08" });
    expect(parseAskInput({ question: "x".repeat(900) })!.question).toHaveLength(500);
  });
  it("a live reply lands in the thread with its answer and topic", () => {
    const { threads, id } = addAsk([], null, "When is my application due?", 1);
    const next = addReply(threads, id, "When is my application due?", 2, { answer: "Nov 30.", topic: "deadline", factIds: ["apply"], model: "m1" });
    expect(next[0]!.messages.at(-1)).toMatchObject({ from: "agent", topic: "deadline", live: { answer: "Nov 30." } });
  });
});

describe("run header", () => {
  it("names the cause and, separately, why it ran without AI", async () => {
    const { applyRunEvent, runHeadline } = await import("@/lib/run");
    const run = applyRunEvent(null, { type: "start", mode: "scripted", reason: "No AI key is connected here.", trigger: "recheck", cause: "MATH 13 filled" }, new Date(0));
    expect(runHeadline(run)).toBe("Re-checking because MATH 13 filled. Ran without AI: No AI key is connected here.");
    const live = applyRunEvent(null, { type: "start", mode: "live", reason: null, trigger: "steer", cause: "No classes before 10 am" }, new Date(0));
    expect(runHeadline(live)).toBe("Re-planning because you said: No classes before 10 am");
  });
});
