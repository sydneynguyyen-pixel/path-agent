import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { JourneyProvider, useJourney } from "@/lib/journey";
import { ResumeTab } from "@/components/app/ResumeTab";

vi.mock("@tanstack/react-router", async (orig) => ({ ...(await orig<object>()), Link: ({ children }: { children: ReactNode }) => <a href="/career">{children}</a> }));

let journey: ReturnType<typeof useJourney> | null = null;
function Grab() { journey = useJourney(); return null; }
const view = () => render(<JourneyProvider><Grab /><ResumeTab /></JourneyProvider>);
const preview = () => screen.getByRole("article", { name: "Document preview" });

describe("Career → Resume", () => {
  it("opens on the main goal's resume, with the skills that career asks for first", () => {
    view();
    expect(screen.getByRole("button", { name: /Cover letter/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^CV/ })).toBeInTheDocument();
    expect(within(preview()).getByText("Maya Torres")).toBeInTheDocument();
    expect(within(preview()).getByText("Skills UX researcher roles ask for")).toBeInTheDocument();
    expect(within(preview()).getByText("Qualitative observation")).toBeInTheDocument();
    // Already confirmed before she opened it: on quietly, no New mark.
    expect(within(preview()).queryByText("New")).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("adds a newly confirmed skill with a New mark, and Undo takes it off for good", () => {
    view();
    act(() => journey!.reviewSkill("sources", { confirmed: true }));
    expect(within(preview()).getByText("Source analysis")).toBeInTheDocument();
    expect(within(preview()).getByText("New")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(within(preview()).queryByText("Source analysis")).not.toBeInTheDocument();
    expect(journey!.resumeDismissed).toContain("Source analysis");
  });

  it("with auto-add off, a new skill waits as Ready to add", () => {
    view();
    fireEvent.click(screen.getByRole("switch", { name: /Add new skills automatically/ }));
    act(() => journey!.reviewSkill("research-writing", { confirmed: true }));
    expect(within(preview()).queryByText("Research writing")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Research writing/ }));
    expect(within(preview()).getByText("Research writing")).toBeInTheDocument();
  });

  it("the cover letter is an editable draft from her real skills", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: /Cover letter/ }));
    const box = screen.getByRole("textbox", { name: "Cover letter" }) as HTMLTextAreaElement;
    expect(box.value).toContain("UX researcher role");
    expect(box.value).toContain("qualitative observation");
    fireEvent.change(box, { target: { value: "Dear team, hello." } });
    expect(within(preview()).getByText("Dear team, hello.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send|submit/i })).not.toBeInTheDocument();
  });

  it("Reset demo clears drafts and resume skills but keeps the auto-add choice", () => {
    view();
    fireEvent.click(screen.getByRole("switch", { name: /Add new skills automatically/ }));
    act(() => journey!.saveResume({ ...journey!.resumes[0]!, id: "resume-ux", kind: "resume", roleId: "ux", title: "x", headline: null, summary: "Mine", letter: null, hiddenExperience: [], hiddenSkills: [], projects: [], showProjects: false }));
    act(() => journey!.reset());
    expect(journey!.resumes).toEqual([]);
    expect(journey!.autoAddSkills).toBe(false);
  });
});
