import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { JourneyProvider, useJourney } from "@/lib/journey";
import { ResumeTab } from "@/components/app/ResumeTab";
import { Toaster } from "@/components/ui/sonner";

vi.mock("@tanstack/react-router", async (orig) => ({ ...(await orig<object>()), Link: ({ children }: { children: ReactNode }) => <a href="/career">{children}</a> }));

let journey: ReturnType<typeof useJourney> | null = null;
function Grab() { journey = useJourney(); return null; }
const view = () => render(<JourneyProvider><Grab /><ResumeTab /><Toaster /></JourneyProvider>);
const page = () => screen.getByRole("article", { name: "Document preview" });
const panel = () => screen.getByRole("complementary", { name: "Build your resume" });
const tab = (name: string) => fireEvent.click(within(panel()).getByRole("tab", { name }));

describe("Career → Resume", () => {
  it("opens the main goal's folder on a real one-page resume, education first, with only her real details", () => {
    view();
    const folders = screen.getByRole("navigation", { name: "Folders" });
    expect(within(folders).getByRole("button", { name: /UX researcher.*2 docs · 0 applications/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(folders).getByRole("button", { name: /General.*1 doc/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cover letter/ })).toBeInTheDocument();
    expect(within(page()).getByText("Maya Torres")).toBeInTheDocument();
    const contact = within(page()).getByRole("list", { name: "Contact" });
    expect(contact).toHaveTextContent("maya.torres@bayview.example");
    expect(contact.textContent).not.toMatch(/\(\d{3}\)|\d{3}-\d{4}/);
    const headings = within(page()).getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings.indexOf("Education")).toBeLessThan(headings.indexOf("Experience"));
    expect(within(page()).getByText(/Relevant coursework: .*Research Methods/)).toBeInTheDocument();
    expect(within(page()).getByText("Qualitative observation")).toBeInTheDocument();
    expect(within(page()).getByText("Tools:")).toBeInTheDocument();
    expect(screen.getByText("1 page")).toBeInTheDocument();
    // Already confirmed before she opened it: on quietly, no New mark. No scores anywhere.
    expect(within(page()).queryByText("New")).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("seeds experience bullets honestly: her own words, or the event's record, marked as a suggestion", () => {
    view();
    act(() => { journey!.addActivity({ title: "Corner Cafe", kind: "job", role: "Barista", when: "Since Jan 2026", did: "Made drinks for the morning rush. Trained two new baristas.", skills: [] }); });
    expect(within(page()).getByText("Barista")).toBeInTheDocument();
    expect(within(page()).getByText("Made drinks for the morning rush")).toBeInTheDocument();
    expect(within(page()).getByText("Placed 2nd as a team with a map of food pantry hours")).toBeInTheDocument();
    // The form says where each came from; her own entry is labelled Added by you.
    const cafe = within(panel()).getByRole("button", { name: /Barista/ });
    expect(cafe).toHaveTextContent("Added by you");
    fireEvent.click(cafe);
    expect(within(panel()).getByText("Suggestion")).toBeInTheDocument();
    // She edits, reorders and deletes bullets; the page follows.
    fireEvent.change(within(panel()).getByRole("textbox", { name: "Bullet 2 for Barista" }), { target: { value: "Trained two new baristas on opening" } });
    fireEvent.click(within(panel()).getByRole("button", { name: "Move bullet 2 up" }));
    const bullets = within(page()).getByText("Trained two new baristas on opening").closest("ul")!;
    expect(within(bullets).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Trained two new baristas on opening", "Made drinks for the morning rush"]);
    fireEvent.click(within(panel()).getByRole("button", { name: "Delete bullet 2" }));
    expect(within(page()).queryByText("Made drinks for the morning rush")).not.toBeInTheDocument();
    expect(within(panel()).getByText("Your words.")).toBeInTheDocument();
  });

  it("adds a newly confirmed skill with a New mark, and Undo takes it off for good", () => {
    view();
    act(() => journey!.reviewSkill("sources", { confirmed: true }));
    expect(within(page()).getByText("Source analysis")).toBeInTheDocument();
    expect(within(page()).getByText("New")).toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: "Undo" }));
    expect(within(page()).queryByText("Source analysis")).not.toBeInTheDocument();
    expect(journey!.resumeDismissed).toContain("Source analysis");
  });

  it("with auto-add off, a new skill waits as Ready to add", () => {
    view();
    fireEvent.click(screen.getByRole("switch", { name: /Add new skills automatically/ }));
    act(() => journey!.reviewSkill("research-writing", { confirmed: true }));
    expect(within(page()).queryByText("Research writing")).not.toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: /Research writing/ }));
    expect(within(page()).getByText("Research writing")).toBeInTheDocument();
  });

  it("switches templates and accents per document", () => {
    view();
    expect(page()).toHaveAttribute("data-template", "modern");
    tab("Style");
    fireEvent.click(within(panel()).getByRole("button", { name: /Classic/ }));
    expect(page()).toHaveAttribute("data-template", "classic");
    fireEvent.click(within(panel()).getByRole("button", { name: "Violet" }));
    expect(page().style.getPropertyValue("--rs-accent")).toBe("#9d8cf2");
    expect(journey!.resumes.find((d) => d.id === "resume-ux")).toMatchObject({ template: "classic", accent: "violet" });
    // Another document keeps its own look.
    fireEvent.click(screen.getByRole("button", { name: /Cover letter/ }));
    expect(page()).toHaveAttribute("data-template", "modern");
    fireEvent.click(within(panel()).getByRole("button", { name: /Compact/ }));
    expect(page()).toHaveAttribute("data-template", "compact");
  });

  it("the cover letter is its own editable page from her real skills", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: /Cover letter/ }));
    const box = within(panel()).getByRole("textbox", { name: "Cover letter" }) as HTMLTextAreaElement;
    expect(box.value).toContain("UX researcher role");
    expect(box.value).toContain("qualitative observation");
    fireEvent.change(box, { target: { value: "Dear team, hello." } });
    expect(within(page()).getByText("Dear team, hello.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send|submit/i })).not.toBeInTheDocument();
  });

  it("clicking a part of the page opens its field in the panel", async () => {
    view();
    tab("Style");
    fireEvent.click(within(page()).getByText("Summary"));
    expect(within(panel()).getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(document.activeElement).toBe(within(panel()).getByRole("textbox", { name: "Summary" })));
    // Typing there rings the matching block on the page.
    fireEvent.change(within(panel()).getByRole("textbox", { name: "Summary" }), { target: { value: "Curious about people." } });
    expect(within(page()).getByText("Curious about people.").closest("[data-block]")).toHaveAttribute("data-flash");
  });

  it("compares a pasted posting with this resume: on it, hers to add in one click, and not yet", () => {
    view();
    act(() => journey!.removeResumeSkill("Qualitative observation"));
    tab("Job");
    fireEvent.change(within(panel()).getByRole("textbox", { name: "Job posting" }), { target: { value: "We are hiring a UX research intern. You will run usability tests, do qualitative observation in clinics, and write SQL queries. Interview skills a plus." } });
    fireEvent.click(within(panel()).getByRole("button", { name: "Read this posting" }));
    const add = within(panel()).getByRole("region", { name: "You have these. Add them?" });
    expect(within(add).getByText("Qualitative observation")).toBeInTheDocument();
    const missing = within(panel()).getByRole("region", { name: "Not yet" });
    expect(within(missing).getByText("SQL")).toBeInTheDocument();
    expect(within(missing).getByText(/Plan toward a UX researcher role/)).toBeInTheDocument();
    fireEvent.click(within(add).getByRole("button", { name: "Add Qualitative observation to this resume" }));
    expect(within(page()).getByText("Qualitative observation")).toBeInTheDocument();
    expect(within(within(panel()).getByRole("region", { name: "Already on this resume" })).getByText("Qualitative observation")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("tracks applications she records, with the resume she sent, and Undo after removing", async () => {
    view();
    tab("Apply");
    expect(within(panel()).getByText("Track where you've applied.")).toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: "Add an application" }));
    const form = within(panel()).getByRole("form", { name: "Add an application" });
    fireEvent.change(within(form).getByLabelText("Company"), { target: { value: "Acme Health" } });
    fireEvent.change(within(form).getByLabelText("Role title"), { target: { value: "UX Research Intern" } });
    fireEvent.change(within(form).getByLabelText("Date applied"), { target: { value: "2026-11-10" } });
    expect((within(form).getByLabelText("Resume you sent") as HTMLSelectElement).value).toBe("resume-ux");
    fireEvent.click(within(form).getByRole("button", { name: "Interviewing" }));
    fireEvent.click(within(form).getByRole("button", { name: "Add to tracker" }));
    expect(journey!.applications).toMatchObject([{ company: "Acme Health", role: "UX Research Intern", applied: "2026-11-10", status: "interviewing", resumeId: "resume-ux", folderId: "role-ux" }]);
    expect(within(panel()).getByText(/Sent Resume/)).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Folders" })).getByRole("button", { name: /UX researcher.*1 application/ })).toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: "Remove Acme Health" }));
    expect(journey!.applications).toEqual([]);
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
    expect(journey!.applications).toHaveLength(1);
    expect(screen.getByText(/Sprout never applies or sends anything/)).toBeInTheDocument();
  });

  it("makes a folder for a specific job with its own resume and cover letter", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: "New folder for a specific job" }));
    fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "UX Research Intern" } });
    fireEvent.change(screen.getByLabelText(/Organization/), { target: { value: "Acme Health" } });
    fireEvent.click(screen.getByRole("button", { name: "Make folder" }));
    expect(journey!.resumeFolders).toMatchObject([{ title: "UX Research Intern — Acme Health", roleId: "ux" }]);
    const folder = within(screen.getByRole("navigation", { name: "Folders" })).getByRole("button", { name: /UX Research Intern.*Acme Health.*2 docs/ });
    expect(folder).toHaveAttribute("aria-pressed", "true");
    expect(within(panel()).getByText(/Resume · UX Research Intern/)).toBeInTheDocument();
  });

  it("Reset demo clears drafts, folders and applications but keeps the auto-add choice", () => {
    view();
    fireEvent.click(screen.getByRole("switch", { name: /Add new skills automatically/ }));
    act(() => journey!.saveResume({ id: "resume-ux", kind: "resume", roleId: "ux", title: "x", headline: null, summary: "Mine", letter: null, hiddenExperience: [], hiddenSkills: [], projects: [], showProjects: false, template: "classic" }));
    act(() => journey!.saveApplication({ id: "a", folderId: "role-ux", company: "Acme", role: "Intern", link: "", applied: "", resumeId: null, status: "saved", next: "", followUp: "" }));
    act(() => journey!.saveResumeFolder({ id: "job-x", title: "Intern — Acme", roleId: "ux" }));
    act(() => journey!.setResumeContact({ phone: "555" }));
    act(() => journey!.reset());
    expect(journey!.resumes).toEqual([]);
    expect(journey!.applications).toEqual([]);
    expect(journey!.resumeFolders).toEqual([]);
    expect(journey!.resumeContact.phone).toBe("");
    expect(journey!.autoAddSkills).toBe(false);
  });
});
