import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { JourneyProvider, useJourney } from "@/lib/journey";
import { ResumeTab } from "@/components/app/ResumeTab";
import { Toaster } from "@/components/ui/sonner";
import { CareerHeader } from "@/routes/career";

vi.mock("@tanstack/react-router", async (orig) => ({ ...(await orig<object>()), Link: ({ children }: { children: ReactNode }) => <a href="/career">{children}</a> }));

let journey: ReturnType<typeof useJourney> | null = null;
function Grab() { journey = useJourney(); return null; }
const view = () => render(<JourneyProvider><Grab /><ResumeTab /><Toaster /></JourneyProvider>);
const page = () => screen.getByRole("article", { name: "Document preview" });
const docsNav = () => screen.getByRole("navigation", { name: "Documents" });
const review = () => screen.getByRole("region", { name: "Review the changes" });
const card = (name: string) => within(review()).getByRole("article", { name });

const POSTING = `UX Research Intern
Company: Harbor Health

We're looking for a UX research intern to join our patient experience team. You will plan and run usability tests,
interview patients and clinic staff, and help prototype new check-in flows. Experience with survey design and
qualitative observation is a plus. Strong research writing and SQL are nice to have. 12-week paid internship.`;

/** Pastes the posting, tailors, and skips the sequence to the review. */
function drop() {
  fireEvent.change(screen.getByRole("textbox", { name: "Job description" }), { target: { value: POSTING } });
  expect(screen.getByLabelText("Company")).toHaveValue("Harbor Health");
  expect(screen.getByLabelText("Job title")).toHaveValue("UX Research Intern");
  fireEvent.click(screen.getByRole("button", { name: /Tailor my resume/ }));
  const run = screen.getByRole("region", { name: "Tailoring your resume" });
  expect(within(run).getByRole("list", { name: "What changed" })).toBeInTheDocument();
  fireEvent.click(within(run).getByRole("button", { name: "Show all changes now" }));
}

describe("Career header", () => {
  // The sliding pill measures itself; jsdom has no ResizeObserver.
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  it("puts the title on the left and the tab pills on the same row from lg, pills still sub-tabs", () => {
    render(<CareerHeader tab="resume" onChange={() => {}} />);
    expect(screen.getByRole("heading", { level: 1, name: "Your resume" })).toBeInTheDocument();
    const tabs = screen.getByRole("tablist", { name: "Career" });
    expect(tabs).toHaveClass("sub-tabs");
    expect(within(tabs).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Your goals", "Your skills", "Your card", "Your resume"]);
    expect(within(tabs).getByRole("tab", { name: "Your resume" })).toHaveAttribute("aria-selected", "true");
    expect(tabs.parentElement!.parentElement).toHaveClass("lg:flex", "lg:justify-between");
  });
  it("carries the Build | Applications switch in the same row on the Resume tab", () => {
    render(<CareerHeader tab="resume" onChange={() => {}} extra={<div role="group" aria-label="Resume view" />} />);
    expect(screen.getByRole("group", { name: "Resume view" }).parentElement).toBe(screen.getByRole("tablist", { name: "Career" }).parentElement);
  });
});

describe("Career → Resume: drop a job", () => {
  it("is honest that it can't open links, and needs the description text", () => {
    view();
    fireEvent.change(screen.getByRole("textbox", { name: "Job description" }), { target: { value: "https://jobs.example/ux-intern" } });
    expect(screen.getByText("I can't open links here. Paste the description text and I'll read it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tailor my resume/ })).toBeDisabled();
  });

  it("asks for the company and title when the posting doesn't say them plainly", () => {
    view();
    fireEvent.change(screen.getByRole("textbox", { name: "Job description" }), { target: { value: "you will run usability tests and interview people about how they use the clinic. Survey design a plus, and qualitative observation." } });
    expect(screen.getByText("Add the company and job title.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tailor my resume/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Bay Clinic" } });
    fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Research Assistant" } });
    expect(screen.getByRole("button", { name: /Tailor my resume/ })).toBeEnabled();
  });

  it("lights up each section with what changed and why, from her records only", () => {
    view();
    drop();
    const steps = within(screen.getByRole("list", { name: "What changed" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(steps[0]).toMatch(/^SummaryAimed it at the UX Research Intern role at Harbor Health/);
    expect(steps[2]).toMatch(/Added Civic Hack Weekend as a project — it shows interviewing/);
    expect(screen.getByRole("region", { name: "Tailoring your resume" })).toHaveTextContent("Tailored from your records; no AI is connected here.");
    // Unconfirmed skills only point to Your skills; gaps point to a plan. Nothing scored.
    expect(within(review()).getByRole("group", { name: "You may have these" })).toHaveTextContent("Interviewing");
    expect(within(review()).getByRole("group", { name: "Not yet" })).toHaveTextContent("SQL");
    expect(screen.queryByText(/%|match score/i)).not.toBeInTheDocument();
  });

  it("accept, edit and keep per section, then saves a new version and an application; her base resume is untouched", () => {
    view();
    const before = page().textContent;
    drop();
    // Edit opens the section's editor, prefilled with the tailored version.
    fireEvent.click(within(card("Summary")).getByRole("button", { name: "Edit Summary" }));
    const box = within(card("Summary")).getByRole("textbox", { name: "Tailored summary" }) as HTMLTextAreaElement;
    expect(box.value).toMatch(/applying for a UX Research Intern role at Harbor Health/);
    fireEvent.change(box, { target: { value: "My own words for Harbor." } });
    fireEvent.click(within(card("Summary")).getByRole("button", { name: "Use my edit" }));
    expect(card("Summary")).toHaveTextContent("Edited by you");
    // Accept shows the change with what came off struck through and what's new highlighted.
    const exp = card("Experience & projects");
    expect(within(exp).getByText("Civic Hack Weekend · Projects").tagName).toBe("INS");
    expect(within(exp).getByText("Hackathon participant · Experience").tagName).toBe("DEL");
    fireEvent.click(within(exp).getByRole("button", { name: "Accept Experience & projects" }));
    expect(card("Experience & projects")).toHaveTextContent("Accepted");
    const edu = card("Education");
    const keep = within(edu).queryByRole("button", { name: "Keep my original Education" });
    if (keep) fireEvent.click(keep);
    // Nothing has changed on the board yet.
    expect(page().textContent).toBe(before);
    fireEvent.click(within(review()).getByRole("button", { name: "Save as application" }));

    expect(journey!.applications).toHaveLength(1);
    const app = journey!.applications[0]!;
    expect(app).toMatchObject({ company: "Harbor Health", role: "UX Research Intern", status: "saved", roleId: "ux", posting: POSTING.trim() });
    expect(app.savedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const made = journey!.resumes.find((d) => d.id === app.resumeId)!;
    expect(made).toMatchObject({ applicationId: app.id, summary: "My own words for Harbor.", copiedFrom: "resume-ux", entrySections: { "event-civic-hack": "projects" } });
    if (keep) expect(made.courses ?? null).toBeNull();
    // Her base resume was never saved or changed.
    expect(journey!.resumes.find((d) => d.id === "resume-ux")).toBeUndefined();
    // The new version is on the board for more editing.
    expect(within(docsNav()).getByRole("button", { name: /Resume · UX Research Intern — Harbor Health/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(page()).getByText("My own words for Harbor.")).toBeInTheDocument();
    expect(within(within(page()).getByRole("heading", { name: "Projects" }).closest("section")!).getByText("Civic Hack Weekend")).toBeInTheDocument();
    // The base still reads as it did.
    fireEvent.click(within(docsNav()).getByRole("button", { name: /Resume · UX researcher/ }));
    expect(page().textContent).toBe(before);
  });

  it("Accept all remaining takes every change", () => {
    view();
    drop();
    fireEvent.click(within(review()).getByRole("button", { name: "Accept all remaining" }));
    expect(card("Summary")).toHaveTextContent("Accepted");
    fireEvent.click(within(review()).getByRole("button", { name: "Save as application" }));
    const made = journey!.resumes.find((d) => d.applicationId)!;
    expect(made.summary).toMatch(/^Psychology student applying for a UX Research Intern role at Harbor Health\./);
  });
});

describe("Career → Resume: Applications", () => {
  const toApps = () => fireEvent.click(screen.getByRole("button", { name: /^Applications/ }));

  it("starts empty with base resumes, and invites dropping a job", () => {
    view();
    toApps();
    expect(screen.getByText("No applications yet.")).toBeInTheDocument();
    const bases = screen.getByRole("heading", { name: "Base resumes" }).closest("section")!;
    expect(within(bases).getByRole("button", { name: "Open Resume · UX researcher in Build" })).toBeInTheDocument();
    expect(within(bases).getByRole("button", { name: "Open General CV in Build" })).toBeInTheDocument();
    expect(screen.getByText(/Sprout never applies or sends anything/)).toBeInTheDocument();
    fireEvent.click(within(bases).getByRole("button", { name: "Open General CV in Build" }));
    expect(within(docsNav()).getByRole("button", { name: /General CV/ })).toHaveAttribute("aria-pressed", "true");
    toApps();
    fireEvent.click(screen.getByRole("button", { name: "Drop a job" }));
    expect(screen.getByRole("textbox", { name: "Job description" })).toHaveFocus();
  });

  it("edits status inline, filters by status, goal and company, and removes with Undo", async () => {
    view();
    drop();
    fireEvent.click(within(review()).getByRole("button", { name: "Save as application" }));
    act(() => journey!.saveApplication({ id: "app-0", roleId: "policy", company: "Policy Lab", role: "Analyst", link: "", applied: "2026-10-01", resumeId: null, status: "applied", next: "Send thank-you note", followUp: "2026-11-20" }));
    toApps();
    const list = () => screen.getByRole("list", { name: "Your applications" });
    const names = () => within(list()).getAllByRole("article").map((a) => a.getAttribute("aria-label"));
    expect(names()).toEqual(["Harbor Health — UX Research Intern", "Policy Lab — Analyst"]);
    const harbor = within(list()).getByRole("article", { name: "Harbor Health — UX Research Intern" });
    expect(harbor).toHaveTextContent("Uses Resume · UX Research Intern — Harbor Health");
    expect(harbor).toHaveTextContent(/We're looking for a UX research intern/);
    expect(within(list()).getByRole("article", { name: "Policy Lab — Analyst" })).toHaveTextContent("Next: Send thank-you note, follow up Nov 20");
    fireEvent.change(within(harbor).getByRole("combobox", { name: "Status for Harbor Health" }), { target: { value: "interviewing" } });
    expect(journey!.applications.find((a) => a.company === "Harbor Health")!.status).toBe("interviewing");

    fireEvent.click(within(screen.getByRole("group", { name: "Filter by status" })).getByRole("button", { name: "Interviewing" }));
    expect(names()).toEqual(["Harbor Health — UX Research Intern"]);
    fireEvent.click(within(screen.getByRole("group", { name: "Filter by status" })).getByRole("button", { name: "All" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by goal" }), { target: { value: "policy" } });
    expect(names()).toEqual(["Policy Lab — Analyst"]);
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by goal" }), { target: { value: "all" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Search by company" }), { target: { value: "harb" } });
    expect(names()).toEqual(["Harbor Health — UX Research Intern"]);
    fireEvent.change(screen.getByRole("textbox", { name: "Search by company" }), { target: { value: "" } });

    // Remove takes its tailored version too; Undo brings both back.
    const tailoredId = journey!.applications.find((a) => a.company === "Harbor Health")!.resumeId!;
    fireEvent.click(within(list()).getByRole("button", { name: "Remove Harbor Health" }));
    expect(journey!.applications.map((a) => a.company)).toEqual(["Policy Lab"]);
    expect(journey!.resumes.some((d) => d.id === tailoredId)).toBe(false);
    fireEvent.click(within((await screen.findByText("Removed Harbor Health")).closest("[data-sonner-toast]") as HTMLElement).getByRole("button", { name: "Undo" }));
    expect(journey!.applications).toHaveLength(2);
    expect(journey!.resumes.some((d) => d.id === tailoredId)).toBe(true);

    // The small page opens that version in Build; a cover letter can be started for it.
    fireEvent.click(within(list()).getByRole("button", { name: "Write a cover letter for Harbor Health" }));
    expect(within(docsNav()).getByRole("button", { name: /Cover letter · UX Research Intern — Harbor Health/ })).toHaveAttribute("aria-pressed", "true");
    expect((within(screen.getByRole("complementary", { name: "Build your resume" })).getByRole("textbox", { name: "Cover letter" }) as HTMLTextAreaElement).value).toContain("at Harbor Health");
    toApps();
    fireEvent.click(within(list()).getByRole("button", { name: "Open the resume for Harbor Health in Build" }));
    expect(within(docsNav()).getByRole("button", { name: /Resume · UX Research Intern — Harbor Health/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("old job folders show up as applications with their documents", () => {
    view();
    act(() => {
      journey!.saveResume({ id: "resume-job", kind: "resume", roleId: "ux", title: "Resume · Intern", headline: null, summary: null, letter: null, hiddenExperience: [], hiddenSkills: [], projects: [], showProjects: false, folder: "job-intern-acme" });
      journey!.saveResumeFolder({ id: "job-intern-acme", title: "Intern — Acme", roleId: "ux", job: { title: "Intern", org: "Acme" } });
    });
    expect(journey!.resumeFolders).toEqual([]);
    toApps();
    expect(within(screen.getByRole("list", { name: "Your applications" })).getByRole("article", { name: "Acme — Intern" })).toHaveTextContent("Uses Resume · Intern");
  });
});
