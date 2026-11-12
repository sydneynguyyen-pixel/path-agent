import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { JourneyProvider, type Decision } from "@/lib/journey";
import { RunCard } from "@/components/app/RunCard";
import { applyRunEvent, runGroups, type RunEvent, type TraceRun } from "@/lib/run";

vi.mock("@tanstack/react-router", async (orig) => ({ ...(await orig<object>()), Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a> }));

type Timed = RunEvent & { at: number };
const play = (events: Timed[]) => events.reduce<TraceRun | null>((r, e) => applyRunEvent(r, e, new Date(e.at)), null)!;
const FIRST = play([
  { type: "start", runId: "run_1", trigger: "error", mode: "live", reason: null, at: 0 },
  { type: "step", tool: "read_portal_error", helper: "reader", text: "Read the registration page: STAT 2 §01 is full", sourceIds: ["portal-full"], ok: true, at: 700 },
  { type: "step", tool: "submit_recommendation", helper: "planner", text: "Recommended MATH 13 §02", sourceIds: [], ok: true, at: 3600 },
  { type: "done", result: { optionId: "math13", why: null, model: null, gaveUp: false }, ttvMs: 3600, at: 3700 },
]);
const STEER = play([
  { type: "start", runId: "run_2", parentRunId: "run_1", trigger: "steer", cause: "No classes before 10 am", mode: "live", reason: null, at: 60000 },
  { type: "step", tool: "submit_recommendation", helper: "planner", text: "Recommended PSYC 5 §01", sourceIds: [], ok: true, at: 61000 },
  { type: "done", result: { optionId: "psyc5", why: null, model: null, gaveUp: false }, ttvMs: 1000, at: 61100 },
]);
const decisions: Decision[] = [{ id: "d1", who: "Maya", what: "Told the helpers: No classes before 10 am", when: new Date(50000), evidence: [] }];

function Harness({ needs }: { needs: boolean }) {
  const [open, setOpen] = useState(needs);
  const [g] = runGroups([FIRST, STEER]);
  return <ol><RunCard group={g!} decisions={decisions} until={Infinity} needs={needs} open={open} onToggle={() => setOpen((o) => !o)} now={null} /></ol>;
}

describe("Activity run card", () => {
  it("is one line when closed, with the summary and a status chip", () => {
    render(<JourneyProvider><Harness needs={false} /></JourneyProvider>);
    const head = screen.getByRole("button", { expanded: false });
    expect(head).toHaveTextContent("STAT 2 was full → picked PSYC 5");
    expect(head).toHaveTextContent("Done");
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("opens to the latest run, shows her note on the re-plan, and switches runs", () => {
    render(<JourneyProvider><Harness needs /></JourneyProvider>);
    expect(screen.getByRole("button", { expanded: true })).toHaveTextContent("Needs you");
    expect(screen.getByRole("button", { name: "Re-plan" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/You told the helpers:/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open in chat/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "First run" }));
    expect(screen.queryByText(/You told the helpers:/)).not.toBeInTheDocument();
    expect(screen.getByText(/took 2 steps to find you another class/)).toBeInTheDocument();
  });
});
