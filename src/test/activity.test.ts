import { describe, it, expect } from "vitest";
import { buildEvents, waitingCount, type JourneyView } from "@/lib/activity";

const base: JourneyView = {
  stage: "idle", chosenId: null, seatHeld: false, emailSent: false, counselor: null,
  agentOn: { reader: true, planner: true, backup: true, drafter: true }, agentTimes: {}, decisions: [],
};

describe("activity timeline", () => {
  it("logs going together only after opting in, without asking for attention", () => {
    const t = new Date(Date.UTC(2026, 10, 8, 4));
    const g = { showMe: true, shownAt: t, sentTo: [], sentAt: null, matched: [], matchedAt: null, passed: [] };
    expect(buildEvents(base).some((e) => e.id === "go-together")).toBe(false);
    const shown = buildEvents({ ...base, goTogether: g });
    expect(shown[0]?.headline).toBe("You chose to show yourself as going to the UX night");
    expect(waitingCount(shown)).toBe(0);
    const sent = buildEvents({ ...base, goTogether: { ...g, sentTo: ["tomas"], sentAt: t } });
    expect(sent[0]?.status).toBe("done");
    expect(sent[0]?.headline).toBe("You asked Tomás to go to the UX night together");
    const matched = buildEvents({ ...base, goTogether: { ...g, matched: ["lena"], matchedAt: t } });
    expect(matched[0]?.headline).toBe("You and Lena are going to the UX night together");
  });
  it("times the class choice from its own decision, not a later note", () => {
    const early = new Date(Date.UTC(2026, 10, 8, 4));
    const note = { what: "Sent Tomás a note", when: new Date(Date.UTC(2026, 10, 8, 1)) };
    const ev = buildEvents({ ...base, stage: "chosen", chosenId: "math13", decisions: [note, { what: "Switched STAT 2 to MATH 13", when: early }] });
    expect(ev.find((e) => e.id === "handoff")?.at.getTime()).toBe(early.getTime() + 1000);
  });
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
