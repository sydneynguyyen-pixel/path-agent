import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { JourneyProvider } from "@/lib/journey";
import { CareerSkills } from "@/components/app/CareerSkills";
import { groupBySource, type PortfolioSkill } from "@/lib/portfolio";

vi.mock("@tanstack/react-router", async (orig) => ({ ...(await orig<object>()), Link: ({ children }: { children: ReactNode }) => <a href="/career">{children}</a> }));

const view = () => render(<JourneyProvider><CareerSkills found={[]} onConnect={() => {}} resumeOpen={false} onResume={() => {}} /></JourneyProvider>);
const classCards = () => within(screen.getByRole("region", { name: "From your classes" })).getAllByRole("region");

describe("Your skills", () => {
  it("shows one card per class: in progress first, then upcoming, each with its week or start", () => {
    view();
    const names = classCards().map((c) => c.getAttribute("aria-labelledby"));
    expect(names.slice(0, 2).sort()).toEqual(["src-class-ANTH-2", "src-class-ART-1"]);
    const anth = screen.getByRole("region", { name: "ANTH 2 · Cultural Anthropology" });
    expect(within(anth).getByText("Week 7 of 12")).toBeInTheDocument();
    expect(within(anth).getByText("Check them as you get there.")).toBeInTheDocument();
    const stat = screen.getByRole("region", { name: "STAT 2 · Statistics" });
    expect(within(stat).getByText("Starts Winter 2027")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("checks a skill with Yes, I did this, then offers Add to resume", () => {
    view();
    const anth = screen.getByRole("region", { name: "ANTH 2 · Cultural Anthropology" });
    const box = within(anth).getByRole("checkbox", { name: "Yes, I did this: Cultural analysis" });
    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(anth).getByRole("button", { name: "Add Cultural analysis to resume" }));
    expect(within(anth).getByRole("button", { name: /Cultural analysis: on your resume/ })).toHaveTextContent("On your resume");
  });

  it("checks all from a class but leaves skills Sprout isn't sure about", async () => {
    view();
    const art = screen.getByRole("region", { name: "ART 1 · Art History" });
    expect(within(art).getByText(/Sprout isn't sure/)).toBeInTheDocument();
    fireEvent.click(within(art).getByRole("button", { name: "Check all from this class" }));
    // Rows check one after another, a few ms apart.
    await waitFor(() => expect(within(art).getByRole("checkbox", { name: /Visual analysis/ })).toHaveAttribute("aria-checked", "true"));
    expect(within(art).getByRole("checkbox", { name: /Public speaking/ })).toHaveAttribute("aria-checked", "false");
  });

  it("always invites her to add what Sprout can't see", () => {
    view();
    const added = screen.getByRole("region", { name: "Things you added" });
    expect(within(added).getByText(/caring for family, a club, volunteering/)).toBeInTheDocument();
  });

  it("adds something she did, with the skills she kept, as its own checked card", () => {
    view();
    fireEvent.click(screen.getAllByRole("button", { name: /Add something you did/ })[0]!);
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("What it was"), { target: { value: "Barista at Corner Café" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Job" }));
    fireEvent.change(within(dialog).getByLabelText(/What you did, in your own words/), { target: { value: "Served customers and made the shift schedule" } });
    expect(within(dialog).getByText(/Suggested from what you wrote/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Scheduling/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /Add it with 2 skills/ }));
    const card = screen.getByRole("region", { name: "Barista at Corner Café" });
    expect(within(card).getByRole("checkbox", { name: /Customer communication/ })).toHaveAttribute("aria-checked", "true");
    expect(within(card).queryByText("Scheduling")).not.toBeInTheDocument();
  });
});

describe("groupBySource", () => {
  const skill = (key: string, proofs: PortfolioSkill["proofs"], hidden = false): PortfolioSkill => ({ key, name: key, theme: "t", level: "Taught", proofs, reviewKeys: [key], confirmed: false, hidden, unsure: false, selfReported: false });
  it("puts a skill under every source it came from and leaves hidden ones out", () => {
    const a = skill("a", [{ type: "class", code: "ANTH 2", quote: "", source: "" }, { type: "event", id: "e1", title: "Fair" }]);
    const b = skill("b", [{ type: "class", code: "ANTH 2", quote: "", source: "" }], true);
    const groups = groupBySource([a, b]);
    expect(groups.map((g) => [g.type, g.id, g.skills.map((s) => s.key)])).toEqual([["class", "ANTH 2", ["a"]], ["event", "e1", ["a"]]]);
  });
});
