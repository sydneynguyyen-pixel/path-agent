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
/** Opens one of the Content tab's section cards by its name. */
const card = (name: string) => fireEvent.click(within(within(panel()).getByRole("region", { name })).getAllByRole("button", { expanded: false })[0]!);

describe("Career → Resume", () => {
  it("opens on the main goal's resume, a real one-page resume, education first, with only her real details", () => {
    view();
    expect(screen.getByRole("button", { name: "Build" })).toHaveAttribute("aria-pressed", "true");
    const docs = screen.getByRole("navigation", { name: "Documents" });
    expect(within(docs).getByRole("button", { name: /Resume · UX researcher/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(docs).getByRole("button", { name: /General CV/ })).toBeInTheDocument();
    expect(within(docs).getByRole("button", { name: /Cover letter/ })).toBeInTheDocument();
    // No folders any more: one drop zone for a job instead.
    expect(screen.queryByRole("navigation", { name: "Folders" })).not.toBeInTheDocument();
    expect(screen.getByText("Drop a job and I'll tailor a copy.")).toBeInTheDocument();
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
    card("Experience");
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
    // The closed Skills card says so; opening it shows the New mark with Undo.
    expect(within(panel()).getByRole("region", { name: "Skills" })).toHaveTextContent("New");
    card("Skills");
    fireEvent.click(within(panel()).getByRole("button", { name: "Undo" }));
    expect(within(page()).queryByText("Source analysis")).not.toBeInTheDocument();
    expect(journey!.resumeDismissed).toContain("Source analysis");
  });

  it("with auto-add off, a new skill waits as Ready to add", () => {
    view();
    card("Skills");
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
    fireEvent.click(within(screen.getByRole("navigation", { name: "Documents" })).getByRole("button", { name: /Cover letter/ }));
    expect(page()).toHaveAttribute("data-template", "modern");
    fireEvent.click(within(panel()).getByRole("button", { name: /Compact/ }));
    expect(page()).toHaveAttribute("data-template", "compact");
  });

  it("the cover letter is its own editable page from her real skills", () => {
    view();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Documents" })).getByRole("button", { name: /Cover letter/ }));
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

  it("Reset demo clears drafts and applications but keeps the auto-add choice", () => {
    view();
    card("Skills");
    fireEvent.click(screen.getByRole("switch", { name: /Add new skills automatically/ }));
    act(() => journey!.saveResume({ id: "resume-ux", kind: "resume", roleId: "ux", title: "x", headline: null, summary: "Mine", letter: null, hiddenExperience: [], hiddenSkills: [], projects: [], showProjects: false, template: "classic" }));
    act(() => journey!.saveApplication({ id: "a", roleId: "ux", company: "Acme", role: "Intern", link: "", applied: "", resumeId: null, status: "saved", next: "", followUp: "" }));
    act(() => journey!.setResumeContact({ phone: "555" }));
    act(() => journey!.reset());
    expect(journey!.resumes).toEqual([]);
    expect(journey!.applications).toEqual([]);
    expect(journey!.resumeFolders).toEqual([]);
    expect(journey!.resumeContact.phone).toBe("");
    expect(journey!.autoAddSkills).toBe(false);
  });
});

describe("Career → Resume: Content cards and Sprout's ideas", () => {
  /** The Undo on this idea's toast (toasts from earlier tests can still be on screen). */
  const undoIdea = async (title: string) => within((await screen.findByText(`Used Sprout's idea: ${title}`)).closest("[data-sonner-toast]") as HTMLElement).getByRole("button", { name: "Undo" });
  const cards = () => within(panel()).getAllByRole("region").map((r) => r.getAttribute("aria-label"));

  it("is a stack of closed one-line cards in page order, and opening one closes the others", () => {
    view();
    expect(cards()).toEqual(["Sprout's ideas", "Header", "Summary", "Education", "Experience", "Training & events", "Projects", "Skills"]);
    const region = (name: string) => within(panel()).getByRole("region", { name });
    expect(region("Education")).toHaveTextContent("Northgate State · Bayview CC · 6 courses");
    expect(region("Experience")).toHaveTextContent("1 entry · 3 bullets");
    expect(region("Skills")).toHaveTextContent("Qualitative observation");
    expect(region("Projects")).toHaveTextContent("1 idea");
    expect(within(panel()).queryByRole("textbox", { name: "Summary" })).not.toBeInTheDocument();
    card("Summary");
    expect(within(panel()).getByRole("textbox", { name: "Summary" })).toBeInTheDocument();
    card("Education");
    expect(within(region("Summary")).getAllByRole("button")[0]).toHaveAttribute("aria-expanded", "false");
    expect(within(panel()).queryByRole("textbox", { name: "Summary" })).not.toBeInTheDocument();
    // Courses show as chips; the full picker is behind Edit courses.
    expect(within(panel()).getByRole("list", { name: "Courses on the page" })).toHaveTextContent("Research Methods");
    expect(within(panel()).queryByRole("group", { name: "Pick courses" })).not.toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: "Edit courses" }));
    fireEvent.click(within(within(panel()).getByRole("group", { name: "Pick courses" })).getByRole("button", { name: /Research Methods/ }));
    expect(within(page()).queryByText(/Relevant coursework: .*Research Methods/)).not.toBeInTheDocument();
    // Optional contact details sit behind a button.
    card("Header");
    expect(within(panel()).queryByLabelText(/Phone/)).not.toBeInTheDocument();
    fireEvent.click(within(panel()).getByRole("button", { name: "Add contact details" }));
    expect(within(panel()).getByLabelText(/Phone/)).toBeInTheDocument();
  });

  it("the eye hides a section on this page only", () => {
    view();
    fireEvent.click(within(panel()).getByRole("button", { name: "Hide Summary on the page" }));
    expect(within(page()).queryByRole("heading", { name: "Summary" })).not.toBeInTheDocument();
    expect(within(panel()).getByRole("region", { name: "Summary" })).toHaveTextContent("Hidden on the page");
    fireEvent.click(within(panel()).getByRole("button", { name: "Show Summary on the page" }));
    expect(within(page()).getByRole("heading", { name: "Summary" })).toBeInTheDocument();
  });

  it("clicking an entry on the page opens its card and entry and puts the cursor in its first bullet", async () => {
    view();
    fireEvent.click(within(page()).getByText("Placed 2nd as a team with a map of food pantry hours"));
    expect(within(within(panel()).getByRole("region", { name: "Experience" })).getAllByRole("button")[0]).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(document.activeElement).toBe(within(panel()).getByRole("textbox", { name: "Bullet 1 for Hackathon participant" })));
  });

  it("lists Sprout's ideas from her records, labelled honestly, and Use it changes the page with Undo", async () => {
    view();
    fireEvent.click(within(panel()).getByRole("button", { name: /Sprout has \d+ ideas for this resume/ }));
    const ideas = within(panel()).getByRole("region", { name: "Sprout's ideas" });
    expect(ideas).toHaveTextContent("Sprout's ideas, from your classes, events and projects.");
    expect(ideas).toHaveTextContent("Suggested from your records; no AI is connected here.");
    const hack = within(ideas).getByRole("group", { name: "Show Civic Hack Weekend as a project" });
    expect(hack).toHaveTextContent('From Civic Hack Weekend\'s record: "Team placed 2nd with a map of food pantry hours"');
    fireEvent.click(within(hack).getByRole("button", { name: "Use it" }));
    const projects = within(page()).getByRole("heading", { name: "Projects" }).closest("section")!;
    expect(within(projects).getByText("Civic Hack Weekend")).toBeInTheDocument();
    expect(within(projects).getByText("Placed 2nd as a team with a map of food pantry hours").closest("[data-block]")).toHaveAttribute("data-flash");
    expect(journey!.resumes.find((d) => d.id === "resume-ux")?.entrySections).toEqual({ "event-civic-hack": "projects" });
    fireEvent.click(await undoIdea("Show Civic Hack Weekend as a project"));
    expect(within(page()).queryByRole("heading", { name: "Projects" })).not.toBeInTheDocument();
    expect(within(page()).getByText("Hackathon participant")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("unconfirmed skills only point to Your skills; Not now is remembered on this document", () => {
    view();
    card("Skills");
    const skills = within(panel()).getByRole("region", { name: "Skills" });
    const check = within(skills).getByRole("group", { name: "Check Interviewing on Your skills first" });
    expect(within(check).queryByRole("button", { name: "Use it" })).not.toBeInTheDocument();
    expect(within(check).getByText("Check it on Your skills")).toBeInTheDocument();
    expect(within(page()).queryByText("Interviewing")).not.toBeInTheDocument();
    const gap = within(skills).getByRole("group", { name: /^Not yet:/ });
    expect(gap).toHaveTextContent("Plan toward a UX researcher role");
    fireEvent.click(within(gap).getByRole("button", { name: "Not now" }));
    expect(within(skills).queryByRole("group", { name: /^Not yet:/ })).not.toBeInTheDocument();
    expect(journey!.resumes.find((d) => d.id === "resume-ux")?.dismissedIdeas).toEqual(["gap:ux"]);
    // Another document still has its own ideas.
    fireEvent.click(within(screen.getByRole("navigation", { name: "Documents" })).getByRole("button", { name: /General CV/ }));
    expect(within(panel()).getByRole("button", { name: /Sprout has \d+ ideas? for this CV/ })).toBeInTheDocument();
  });

  it("a confirmed skill the role asks for comes back with Use it, and Undo takes it off again", async () => {
    view();
    act(() => journey!.removeResumeSkill("Qualitative observation"));
    expect(within(page()).queryByText("Qualitative observation")).not.toBeInTheDocument();
    card("Skills");
    const add = within(within(panel()).getByRole("region", { name: "Skills" })).getByRole("group", { name: "Add Qualitative observation" });
    expect(add).toHaveTextContent("UX researcher roles ask for it. From ANTH 2's syllabus");
    fireEvent.click(within(add).getByRole("button", { name: "Use it" }));
    expect(within(page()).getByText("Qualitative observation")).toBeInTheDocument();
    fireEvent.click(await undoIdea("Add Qualitative observation"));
    expect(within(page()).queryByText("Qualitative observation")).not.toBeInTheDocument();
    expect(journey!.resumeDismissed).toContain("Qualitative observation");
  });
});
