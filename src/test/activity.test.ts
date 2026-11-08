import { describe, it, expect } from "vitest";
import { buildEvents, waitingCount, type JourneyView } from "@/lib/activity";

const base: JourneyView = {
  stage: "idle", chosenId: null, seatHeld: false, emailSent: false, counselor: null,
  agentOn: { reader: true, planner: true, backup: true, drafter: true }, agentTimes: {}, decisions: [],
};

describe("activity timeline", () => {
  it("starts with only the two scripted events and nothing waiting", () => {
    const ev = buildEvents(base);
    expect(ev.map((e) => e.id)).toEqual(["term", "read-docs"]);
    expect(waitingCount(ev)).toBe(0);
  });
  it("the STAT 2 error needs the student's OK until an option is chosen", () => {
    expect(waitingCount(buildEvents({ ...base, stage: "failed" }))).toBe(1);
  });
  it("after choosing, registering is handed to the student, never done by the agent", () => {
    const ev = buildEvents({ ...base, stage: "chosen", chosenId: "math13" });
    expect(ev.find((e) => e.id === "handoff")?.status).toBe("handed");
    expect(buildEvents({ ...base, stage: "chosen", chosenId: "math13", seatHeld: true }).find((e) => e.id === "handoff")?.status).toBe("done");
  });
  it("a turned-off helper's steps are marked skipped", () => {
    const ev = buildEvents({ ...base, stage: "failed", agentOn: { ...base.agentOn, backup: false } });
    expect(ev.find((e) => e.id === "stat2-full")!.steps.some((s) => s.helper === "backup" && s.skipped)).toBe(true);
  });
});
