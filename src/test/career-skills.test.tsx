import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { JourneyProvider } from "@/lib/journey";
import { CareerSkills } from "@/components/app/CareerSkills";

vi.mock("@tanstack/react-router", async (orig) => ({ ...(await orig<object>()), Link: ({ children }: { children: ReactNode }) => <a href="/career">{children}</a> }));

const view = () => render(<JourneyProvider><CareerSkills found={[]} onConnect={() => {}} resumeOpen={false} onResume={() => {}} /></JourneyProvider>);

describe("Your skills", () => {
  it("lists skills to review, one answer each, with Confirm all at the head", () => {
    view();
    const list = screen.getByRole("region", { name: /To review/ });
    const yes = within(list).getAllByRole("button", { name: "Yes, I did this" });
    expect(yes.length).toBeGreaterThan(0);
    expect(within(list).getAllByRole("button", { name: "Not really" }).length).toBe(yes.length);
    expect(within(list).getByRole("button", { name: `Confirm all ${yes.length}` })).toBeInTheDocument();
    fireEvent.click(yes[0]!);
    expect(within(list).getAllByRole("button", { name: "Yes, I did this" }).length).toBe(yes.length - 1);
  });
  it("adds something she did, with the skills she kept, as added by you", () => {
    view();
    fireEvent.click(screen.getAllByRole("button", { name: /Add something you did/ })[0]!);
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("What it was"), { target: { value: "Barista at Corner Café" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Job" }));
    fireEvent.change(within(dialog).getByLabelText(/What you did, in your own words/), { target: { value: "Served customers and made the shift schedule" } });
    expect(within(dialog).getByText(/Suggested from what you wrote/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Scheduling/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /Add it with 2 skills/ }));
    const added = screen.getByRole("region", { name: "Things you added" });
    expect(within(added).getByText("Barista at Corner Café")).toBeInTheDocument();
    const confirmed = screen.getByRole("region", { name: /Your confirmed skills/ });
    expect(within(confirmed).getByText("Customer communication")).toBeInTheDocument();
    expect(within(confirmed).queryByText("Scheduling")).not.toBeInTheDocument();
  });
});
