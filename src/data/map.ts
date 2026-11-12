// Dates and extras for the journey map. Fully synthetic, like src/data/scenario.ts.
import type { ClubId, OrgId } from "@/data/scenario";

/** The map's first row. Must be the first of a month. */
export const MAP_ORIGIN = "2025-09-01";

export const termDates: Record<string, { start: string; end: string }> = {
  f25: { start: "2025-09-22", end: "2025-12-12" },
  w26: { start: "2026-01-05", end: "2026-03-27" },
  s26: { start: "2026-04-06", end: "2026-06-26" },
  f26: { start: "2026-09-21", end: "2026-12-11" },
  w27: { start: "2027-01-04", end: "2027-03-26" },
  sp27: { start: "2027-04-05", end: "2027-06-18" },
  su27: { start: "2027-06-28", end: "2027-08-13" },
  fa27: { start: "2027-08-23", end: "2027-12-17" },
  sp28: { start: "2028-01-18", end: "2028-05-19" },
  fa28: { start: "2028-08-22", end: "2028-12-15" },
  sp29: { start: "2029-01-17", end: "2029-05-18" },
};

export const mapMilestones = [{ id: "graduate", date: "2029-05-19", title: "Graduate, B.A. Psychology" }];

/** The schools on the class line. Each one is a large home point where its stretch begins. */
export const mapSchools = [
  { id: "school-bayview", school: "bayview", start: "2025-09-08", end: "2027-06-18" },
  { id: "school-northgate", school: "northgate", start: "2027-08-16", end: "2029-05-18" },
] as const;

/** Already registered, RSVP'd or admitted, so these are set rather than planned. */
export const mapConfirmed = new Set(["school-northgate", "peer-mentors"]);

/** Events Maya is eyeing but has not signed up for. */
export const mapPlannedEvents = [
  { id: "ux-night", title: "UX Night", host: "Eastshore Design Collective", date: "2026-11-17", time: "5:30 PM", place: "Eastshore Makerspace", photo: "photo-1586717791821-3f44a563fa4c" },
  { id: "archives-day", title: "Inside the Archive open day", host: "Eastshore History Center", date: "2027-04-17", time: "10:00 AM", place: "Eastshore History Center", photo: "archives-day" },
];

/** Clubs and internships run for a stretch of time, so they leave the class line and rejoin it. */
export type MapSpan = { id: string; layer: "clubs" | "internships"; title: string; host: string; start: string; end: string; org: OrgId; club?: ClubId; about: string };
export const mapSpans: MapSpan[] = [
  { id: "psych-club", layer: "clubs", title: "Psychology Club", host: "Bayview CC", start: "2025-10-06", end: "2026-06-12", org: "bayview", about: "Weekly talks and study groups for psychology students." },
  { id: "peer-mentors", layer: "clubs", title: "Peer Mentors", host: "Bayview CC", start: "2026-09-28", end: "2027-06-11", org: "bayview", about: "Mentoring first-year students through their first term." },
  { id: "data-club", layer: "clubs", title: "Data Club", host: "Northgate State", start: "2027-09-10", end: "2028-05-12", org: "northgate", club: "data-club", about: "A student group that practices SQL and data analysis." },
  { id: "youth-research", layer: "internships", title: "Youth program research intern", host: "Bay Neighbors Food Network", start: "2026-06-29", end: "2026-08-28", org: "food-network", about: "Helped evaluate a summer youth meal program." },
  { id: "library-usability", layer: "internships", title: "Library website usability intern", host: "Eastshore Public Library", start: "2027-06-28", end: "2027-08-20", org: "library", about: "Would run usability tests on the library website." },
  { id: "psych-lab", layer: "internships", title: "Psychology lab assistant", host: "Northgate State", start: "2028-06-05", end: "2028-08-18", org: "northgate", about: "Would help run studies in a psychology lab." },
];

/** A class taken at another school joins the class line from the side. */
export const mapSideClass = {
  id: "lcc-psyc-20",
  code: "LCC PSYC 20",
  title: "Abnormal Psychology",
  school: "Lakeshore CC",
  start: "2027-06-21",
  end: "2027-08-13",
};

/** Dated coursework for the Month view. */
export const mapAssignments: Record<string, string[]> = {
  "PSYC 33": ["Reflection journal", "Interview practice"],
  "HIST 17": ["Primary-source analysis", "Research paper"],
  "ANTH 2": ["Ethnography fieldnotes", "Cultural analysis essay"],
  "ART 1": ["Visual analysis essay", "Written critique"],
};

/** What a student might add after graduating. */
export const mapMasters = {
  school: "Northgate State",
  title: "M.S. Human Factors",
  start: "2029-08-13",
  finish: "2031-05-17",
  terms: [
    { id: "ms-f29", name: "Fall 2029", start: "2029-08-20", end: "2029-12-14", courses: [{ code: "HF 501", title: "Human Factors Methods" }, { code: "HF 510", title: "Applied Statistics" }] },
    { id: "ms-s30", name: "Spring 2030", start: "2030-01-16", end: "2030-05-17", courses: [{ code: "HF 520", title: "Cognition and Design" }, { code: "HF 530", title: "Usability Evaluation" }] },
    { id: "ms-f30", name: "Fall 2030", start: "2030-08-19", end: "2030-12-13", courses: [{ code: "HF 610", title: "Field Research" }, { code: "HF 620", title: "Accessibility" }] },
    { id: "ms-s31", name: "Spring 2031", start: "2031-01-15", end: "2031-05-16", courses: [{ code: "HF 690", title: "Thesis" }] },
  ],
};

// ---------- Path map: the same journey, shown as a tree from the goal down ----------
export type PathCategory = "classes" | "events" | "clubs" | "internships" | "networking" | "fairs";
/** On the plan, suggested, someone already in touch, or something to do first. */
export type PathState = "plan" | "suggested" | "touch" | "todo";
export type PathOpen =
  | { to: "/event" }
  | { to: "/explore"; search: { open: string } }
  | { to: "/explore"; search: { view: "people" } }
  | { to: "/degree"; search: { row: string; slot: string } }
  | { to: "/semester"; search: { term: string } };
export type PathVisual = { type: "school"; school: "bayview" | "northgate" } | { type: "org"; org: OrgId; club?: ClubId };
export type PathItem = {
  id: string;
  category: PathCategory;
  title: string;
  sub: string;
  about: string;
  state: PathState;
  /** Only items with a real date can go on a calendar. */
  date?: string;
  when?: string;
  place?: string;
  visual?: PathVisual;
  open?: PathOpen;
  openLabel?: string;
};
export type PathConnection = { from: string; to: string; why: string };

export const pathGoal = { role: "UX researcher", degree: "B.A. Psychology", route: "Transfer from Bayview to Northgate", finish: "Spring 2029" };

export const pathCategories: { id: PathCategory; label: string }[] = [
  { id: "classes", label: "Classes" },
  { id: "events", label: "Events" },
  { id: "clubs", label: "Clubs" },
  { id: "internships", label: "Internships" },
  { id: "networking", label: "Networking" },
  { id: "fairs", label: "Career fairs" },
];

export const pathItems: PathItem[] = [
  { id: "stat2", category: "classes", title: "STAT 2 · Statistics", sub: "Winter 2027, evening. Fills QR-1.", about: "Covers your statistics requirement before you transfer.", state: "plan", when: "Winter 2027", place: "Bayview CC", visual: { type: "school", school: "bayview" }, open: { to: "/degree", search: { row: "statistics", slot: "qr1" } }, openLabel: "See in Degree" },
  { id: "dsgn20", category: "classes", title: "DSGN 20 · Human-Centered Design", sub: "Fall 2027 elective. Fills your usability testing gap.", about: "A design elective at Northgate where you run usability tests.", state: "suggested", when: "Fall 2027", place: "Northgate State", visual: { type: "school", school: "northgate" }, open: { to: "/explore", search: { open: "dsgn20" } } },
  { id: "psych-symposium", category: "events", title: "Psych Research Symposium", sub: "Thu Nov 19, 4 PM.", about: "Student posters and faculty from the Northgate psychology department.", state: "plan", date: "2026-11-19", when: "Thursday, Nov 19, 4:00 to 6:30 PM", place: "Northgate Student Union Ballroom", open: { to: "/event" }, openLabel: "Open your plan" },
  { id: "ux-night", category: "events", title: "Watch Real People Use Things", sub: "UX night, Tue 5:30 PM. Eastshore Design Collective. Free.", about: "Watch usability tests happen live, then talk through them.", state: "suggested", date: "2026-11-17", when: "Tuesday, Nov 10, 5:30 PM", place: "Eastshore Makerspace", visual: { type: "org", org: "design-collective" }, open: { to: "/explore", search: { open: "ux-night" } } },
  { id: "design-club", category: "clubs", title: "People + Products Club", sub: "Tuesdays 3:30, Bayview Student Center. Practice usability tests.", about: "Members run small usability tests on campus services.", state: "suggested", when: "Tuesdays, 3:30 PM", place: "Bayview Student Center", visual: { type: "org", org: "bayview", club: "people-products" }, open: { to: "/explore", search: { open: "design-club" } } },
  { id: "research-club", category: "clubs", title: "Psych Research Club", sub: "Places members as RAs in faculty labs each spring.", about: "A way into faculty labs at Northgate.", state: "suggested" },
  { id: "ux-intern", category: "internships", title: "UX Research Intern", sub: "Harbor Health, summer. Sam Lee went from psych to this role.", about: "A summer research internship at Harbor Health.", state: "suggested", when: "Summer" },
  { id: "campus-ra", category: "internships", title: "Campus Spaces Lab RA", sub: "Spring research assistant spot. Apply by Jan 15.", about: "Research assistant work in the lab Dr. Reyes runs.", state: "suggested", date: "2027-01-15", when: "Apply by Jan 15" },
  { id: "priya", category: "networking", title: "Priya Shah", sub: "Met in April at Harbor Health. Judging posters Thursday.", about: "UX researcher at Harbor Health.", state: "touch", open: { to: "/explore", search: { view: "people" } }, openLabel: "Open in People" },
  { id: "reyes", category: "networking", title: "Dr. Elena Reyes", sub: "Meet at the symposium.", about: "Runs the Campus Spaces Lab at Northgate.", state: "suggested", open: { to: "/event" }, openLabel: "Open your plan" },
  { id: "winter-fair", category: "fairs", title: "Winter Career Fair", sub: "Dec 3, 11 AM. Three employers hire summer UX interns.", about: "Three employers here hire summer UX research interns.", state: "suggested", date: "2026-12-03", when: "Thursday, Dec 3, 11:00 AM", place: "Northgate State", open: { to: "/semester", search: { term: "sp27" } }, openLabel: "Open in Terms" },
  { id: "fair-resume", category: "fairs", title: "Before the fair: resume", sub: "Update it from Resume Lab.", about: "Bring the version you worked on at Resume Lab.", state: "todo" },
];

export const pathConnections: PathConnection[] = [
  { from: "psych-symposium", to: "priya", why: "Priya is judging posters at the symposium, so you can catch up there." },
  { from: "psych-symposium", to: "reyes", why: "Dr. Reyes will be at the symposium, so you can meet in person." },
  { from: "reyes", to: "campus-ra", why: "Dr. Reyes runs this lab. Meeting her Thursday is your way in." },
  { from: "priya", to: "ux-intern", why: "Priya works at Harbor Health, where this internship is." },
  { from: "winter-fair", to: "fair-resume", why: "Employers at the fair will ask for your resume." },
];
