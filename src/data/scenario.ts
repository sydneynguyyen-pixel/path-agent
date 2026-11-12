// FULLY SYNTHETIC DATA. No real students, schools, or records.

export type Source = {
  id: string;
  doc: string;
  school: "Bayview Community College" | "Northgate State University" | "Bayview ↔ Northgate";
  section: string;
  passage: string;
};

export const sources = {
  "bcc-units": {
    id: "bcc-units",
    doc: "Bayview CC Academic Policy Manual 2026",
    school: "Bayview Community College",
    section: "§4.2 Unit Value",
    passage:
      "Bayview operates on the quarter system. One quarter unit represents 10 hours of instruction. For transfer to semester institutions, one quarter unit equals two-thirds (0.667) of a semester unit.",
  },
  "nsu-units": {
    id: "nsu-units",
    doc: "Northgate State Transfer Credit Policy, rev. 2025",
    school: "Northgate State University",
    section: "TC-3 Quarter Conversion",
    passage:
      "Credit earned at quarter-system institutions is converted at 2/3 semester unit per quarter unit and rounded to one decimal place. A 5-quarter-unit course is accepted as 3.3 semester units.",
  },
  "nsu-admit": {
    id: "nsu-admit",
    doc: "Northgate State Transfer Credit Policy, rev. 2025",
    school: "Northgate State University",
    section: "TC-1 Admission and Unit Load",
    passage:
      "Transfer students must complete at least 60 transferable semester units and Statistics (QR-1) before their first term. Students may enroll in up to 16 units per term; 17 or 18 units require advisor approval. A change of start term requires re-approval.",
  },
  "audit-stats": {
    id: "audit-stats",
    doc: "Northgate Degree Audit — M. Torres (synthetic)",
    school: "Northgate State University",
    section: "Req. QR-1 Statistics",
    passage:
      "QR-1 Statistics: one course in introductory statistics, minimum 3.0 semester units. Planned: BCC STAT 2 (Winter 2027).",
  },
  "audit-engl": {
    id: "audit-engl",
    doc: "Northgate Degree Audit — M. Torres (synthetic)",
    school: "Northgate State University",
    section: "Req. WC-1 Written Communication",
    passage: "WC-1 satisfied by BCC ENGL 1A (grade A-, 5 quarter units = 3.3 semester units).",
  },
  "artic-math1a": {
    id: "artic-math1a",
    doc: "Bayview ↔ Northgate Articulation File (2026-27)",
    school: "Bayview ↔ Northgate",
    section: "Row 112",
    passage: "BCC MATH 1A Calculus I (5 quarter units) → NSU MATH 150 Calculus I (3.3 semester units). Status: Articulated.",
  },
  "artic-bio": {
    id: "artic-bio",
    doc: "Bayview ↔ Northgate Articulation File (2026-27)",
    school: "Bayview ↔ Northgate",
    section: "Row 041",
    passage: "BCC BIO 10 + 10L → NSU Lab Science (GE-B2/B3). Status: Articulated.",
  },
  "audit-hum": {
    id: "audit-hum",
    doc: "Northgate Degree Audit — M. Torres (synthetic)",
    school: "Northgate State University",
    section: "Req. GE-C2 Humanities",
    passage: "GE-C2 Humanities: in progress — BCC HIST 17 (Spring 2027).",
  },
  "audit-major": {
    id: "audit-major",
    doc: "Northgate Degree Audit — M. Torres (synthetic)",
    school: "Northgate State University",
    section: "Req. MAJ-PREP Major Preparation",
    passage: "MAJ-PREP Psychology: PSYC 100 and PSYC 110 remain. Not available at Bayview; take at Northgate.",
  },
  "portal-full": {
    id: "portal-full",
    doc: "Simulated Registration Portal response",
    school: "Bayview Community College",
    section: "STAT 2 · Sec 01",
    passage: "Add failed: Section full (40/40). Waitlist 6/10.",
  },
  "counselor-confirm": {
    id: "counselor-confirm",
    doc: "Counselor decision (simulated)",
    school: "Northgate State University",
    section: "Counselor ruling",
    passage: "Dr. Jenna Baylor confirmed the course satisfies QR-1 Statistics for M. Torres. Recorded in the decision log.",
  },
  "bcc-drop": {
    id: "bcc-drop",
    doc: "Bayview CC Academic Policy Manual 2026",
    school: "Bayview Community College",
    section: "§6.1 Dropping a Course",
    passage:
      "Students may drop a course without a W notation through the end of the second week of the term (January 15, 2027 for Winter 2027). Drops are made by the student in the registration portal.",
  },
  "bcc-waitlist": {
    id: "bcc-waitlist",
    doc: "Bayview CC Academic Policy Manual 2026",
    school: "Bayview Community College",
    section: "§5.4 Waitlists",
    passage:
      "A student may hold one waitlist position on a full section while enrolled in an alternate section or course. If a seat opens, the student has 48 hours to accept and drop the alternate.",
  },
  "artic-math13": {
    id: "artic-math13",
    doc: "Bayview ↔ Northgate Articulation File (2026-27)",
    school: "Bayview ↔ Northgate",
    section: "Row 118",
    passage: "BCC MATH 13 Elementary Statistics (5 quarter units) → NSU STAT 101 (3.3 semester units). Satisfies QR-1. Status: Articulated.",
  },
  "artic-psyc5": {
    id: "artic-psyc5",
    doc: "Bayview ↔ Northgate Articulation File (2026-27)",
    school: "Bayview ↔ Northgate",
    section: "Row 203",
    passage:
      "BCC PSYC 5 Statistics for Behavioral Sciences (5 quarter units) → NSU STAT 101. Satisfies QR-1 only with a grade of C or better; C- or lower transfers as elective credit.",
  },
  "catalog-bus21": {
    id: "catalog-bus21",
    doc: "Northgate General Catalog 2026-27",
    school: "Northgate State University",
    section: "p. 88, QR-1 approved list",
    passage:
      "Courses satisfying QR-1 include … BUS 21 Business Statistics (or transfer equivalent) …",
  },
  "artic-bus21": {
    id: "artic-bus21",
    doc: "Bayview ↔ Northgate Articulation File (2026-27)",
    school: "Bayview ↔ Northgate",
    section: "Row 077",
    passage: "BCC BUS 21 Business Statistics (4 quarter units) → NSU elective credit (2.7 semester units). No QR-1 equivalency.",
  },
  "artic-math10": {
    id: "artic-math10",
    doc: "Bayview ↔ Northgate Articulation File (2026-27)",
    school: "Bayview ↔ Northgate",
    section: "Row 115",
    passage: "BCC MATH 10 Math for Liberal Arts (5 quarter units) → NSU GE-B4 elective. Does not satisfy QR-1.",
  },
  "syl-engl": {
    id: "syl-engl",
    doc: "ENGL 1B Syllabus, Winter 2027",
    school: "Bayview Community College",
    section: "Schedule",
    passage: "Wk 2 essay draft · Wk 4 research paper · Wk 7 portfolio due.",
  },
  "syl-bio": {
    id: "syl-bio",
    doc: "BIO 12 Syllabus, Winter 2027",
    school: "Bayview Community College",
    section: "Schedule",
    passage: "Wk 3 lab report · Wk 4 midterm · Wk 7 lab practical · Wk 8 final.",
  },
  "syl-hist": {
    id: "syl-hist",
    doc: "HIST 18 Syllabus, Winter 2027",
    school: "Bayview Community College",
    section: "Schedule",
    passage: "Wk 4 response essay · Wk 6 midterm · Wk 8 final paper.",
  },
} satisfies Record<string, Source>;
export type SourceId = keyof typeof sources;

export type ReqStatus = "done" | "in_progress" | "at_risk" | "remaining" | "transfer" | "pending";

export type Requirement = {
  id: string;
  code: string;
  name: string;
  status: ReqStatus;
  detail: string;
  units: string;
  sourceId: string;
  confidence: number;
};

export const requirements: Requirement[] = [
  { id: "wc1", code: "WC-1", name: "Written Communication", status: "done", detail: "BCC ENGL 1A · A-", units: "3.3 semester units", sourceId: "audit-engl", confidence: 0.97 },
  { id: "math", code: "MATH-150", name: "Calculus I", status: "transfer", detail: "BCC MATH 1A → NSU MATH 150", units: "3.3 semester units", sourceId: "artic-math1a", confidence: 0.95 },
  { id: "lab", code: "GE-B2/B3", name: "Lab Science", status: "transfer", detail: "BCC BIO 10 + 10L", units: "4.0 semester units", sourceId: "artic-bio", confidence: 0.93 },
  { id: "hum", code: "GE-C2", name: "Humanities", status: "in_progress", detail: "BCC HIST 17 · Spring 2027", units: "3.3 semester units", sourceId: "audit-hum", confidence: 0.88 },
  { id: "qr1", code: "QR-1", name: "Statistics", status: "remaining", detail: "Planned: BCC STAT 2 · Winter 2027", units: "3.0 semester units min", sourceId: "audit-stats", confidence: 0.9 },
  { id: "maj", code: "MAJ-PREP", name: "Psychology major preparation", status: "remaining", detail: "PSYC 100, PSYC 110 at Northgate", units: "6.0 semester units", sourceId: "audit-major", confidence: 0.86 },
];

export type Option = {
  id: string;
  course: string;
  title: string;
  section: string;
  sectionTime: string;
  seatsOpen: number;
  /** Lower is a better fit for QR-1 and Maya's plan. */
  fit: number;
  verdict: "counts" | "conditional" | "conflict" | "does_not_count";
  reason: string;
  rule: string;
  sourceIds: string[];
  confidence: number;
  conflict?: { catalog: { reading: string; sourceId: string }; articulation: { reading: string; sourceId: string } };
  deadlines: { week: number; label: string }[];
  deadlineNote: string;
};

export const options: Option[] = [
  {
    id: "stat2-02",
    course: "BCC STAT 2",
    title: "Introduction to Statistics · Evening",
    section: "02",
    sectionTime: "Mon/Wed 6:00–7:50 pm · In person",
    seatsOpen: 0,
    fit: 0,
    verdict: "counts",
    reason: "Same course as your plan, but this section is also full.",
    rule: "Degree audit QR-1: planned course.",
    sourceIds: ["audit-stats"],
    confidence: 0.95,
    deadlines: [],
    deadlineNote: "No seats — not actionable right now.",
  },
  {
    id: "math13",
    course: "BCC MATH 13",
    title: "Elementary Statistics · Online live",
    section: "02",
    sectionTime: "Mon/Wed 10:00–11:50 am",
    seatsOpen: 3,
    fit: 1,
    verdict: "counts",
    reason: "Directly articulated to Northgate STAT 101. Same requirement, same units.",
    rule: "Articulation row 118: MATH 13 → STAT 101, satisfies QR-1.",
    sourceIds: ["artic-math13", "nsu-units"],
    confidence: 0.94,
    deadlines: [
      { week: 3, label: "MATH 13 quiz" },
      { week: 5, label: "MATH 13 midterm" },
      { week: 8, label: "MATH 13 final" },
    ],
    deadlineNote: "Avoids your busiest weeks (4 and 7). Week 8 has two finals — manageable.",
  },
  {
    id: "psyc5",
    course: "BCC PSYC 5",
    title: "Statistics for Behavioral Sciences · In person",
    section: "01",
    sectionTime: "Tue/Thu 9:00–10:50 am",
    seatsOpen: 4,
    fit: 2,
    verdict: "conditional",
    reason: "Counts toward QR-1 only if you earn a C or better. Also useful for your psychology major.",
    rule: "Articulation row 203: QR-1 with grade ≥ C; otherwise elective.",
    sourceIds: ["artic-psyc5"],
    confidence: 0.82,
    deadlines: [
      { week: 4, label: "PSYC 5 exam 1" },
      { week: 7, label: "PSYC 5 project" },
    ],
    deadlineNote: "Lands in weeks 4 and 7, which already have 3 deadlines each. Heavy.",
  },
  {
    id: "bus21",
    course: "BCC BUS 21",
    title: "Business Statistics · Hybrid",
    section: "03",
    sectionTime: "Mon/Wed 1:00–2:50 pm",
    seatsOpen: 20,
    fit: 3,
    verdict: "conflict",
    reason: "The two sources disagree. I won't guess — your counselor needs to confirm.",
    rule: "Catalog lists it for QR-1; articulation file says elective only.",
    sourceIds: ["catalog-bus21", "artic-bus21"],
    confidence: 0.48,
    conflict: {
      catalog: { reading: "Satisfies QR-1 (Statistics).", sourceId: "catalog-bus21" },
      articulation: { reading: "Elective credit only (2.7 semester units), not QR-1.", sourceId: "artic-bus21" },
    },
    deadlines: [
      { week: 2, label: "BUS 21 case" },
      { week: 6, label: "BUS 21 midterm" },
    ],
    deadlineNote: "Spreads out nicely, but week 6 overlaps your HIST midterm.",
  },
  {
    id: "math10",
    course: "BCC MATH 10",
    title: "Math for Liberal Arts · Online",
    section: "01",
    sectionTime: "Asynchronous",
    seatsOpen: 30,
    fit: 99,
    verdict: "does_not_count",
    reason: "Shown so you don't lose time: it does not satisfy Statistics.",
    rule: "Articulation row 115: GE-B4 elective, not QR-1.",
    sourceIds: ["artic-math10"],
    confidence: 0.95,
    deadlines: [{ week: 5, label: "MATH 10 exam" }],
    deadlineNote: "Not recommended — does not count toward QR-1.",
  },
];

/** Rank by availability first (open seats), then by fit. */
export function rankOptions(list: Option[]): Option[] {
  return [...list].sort((a, b) => {
    const av = (o: Option) => (o.seatsOpen > 0 ? 0 : 1);
    return av(a) - av(b) || a.fit - b.fit;
  });
}

/** Synthetic Bayview policy (cited in sources): drop without a W through end of week 2. */
export const DROP_DEADLINE = "January 15, 2027";
/** Synthetic: the Northgate transfer application for Fall 2027 closes Nov 30. The agent drafts; Maya submits. */
export const APPLY_DEADLINE = "2026-11-30";
export const REQUIREMENT_LABEL = "QR-1 Statistics";

/** Synthetic Bayview policy allows one waitlist spot on a full section while enrolled in an alternate. */
export const waitlist = { allowed: true, course: "STAT 2-01", spots: "4 of 10 spots left", sourceId: "bcc-waitlist" };

export const syllabi = [
  { course: "ENGL 1B", sourceId: "syl-engl", items: [{ week: 2, label: "Essay draft", worth: "10% of grade" }, { week: 4, label: "Research paper", worth: "30% of grade" }, { week: 7, label: "Portfolio", worth: "35% of grade" }] },
  { course: "BIO 12", sourceId: "syl-bio", items: [{ week: 3, label: "Lab report", worth: "15% of grade" }, { week: 4, label: "Midterm", worth: "25% of grade" }, { week: 7, label: "Lab practical", worth: "20% of grade" }, { week: 8, label: "Final", worth: "30% of grade" }] },
  { course: "HIST 18", sourceId: "syl-hist", items: [{ week: 4, label: "Response essay", worth: "15% of grade" }, { week: 6, label: "Midterm", worth: "25% of grade" }, { week: 8, label: "Final paper", worth: "35% of grade" }] },
];

/** Fall 2026 coursework from the two current syllabi (synthetic). ANTH 2 grades by weight, ART 1 by points. */
export const FALL_2026_START = "2026-09-21";
export const FALL_2026_WEEKS = 12;
export type CourseWork = { course: string; date: string; label: string; worth: string; detail: string };
export const fallWork: CourseWork[] = [
  { course: "ANTH 2", date: "2026-09-30", label: "Reading response 1", worth: "5% of grade", detail: "One page on the first two chapters." },
  { course: "ART 1", date: "2026-10-09", label: "Visual analysis 1", worth: "50 of 400 points", detail: "Describe one painting from the course reader." },
  { course: "ANTH 2", date: "2026-10-14", label: "Fieldnotes 1", worth: "10% of grade", detail: "Two hours of observation in a public place." },
  { course: "ANTH 2", date: "2026-10-21", label: "Midterm", worth: "20% of grade", detail: "Short answers on readings and lectures." },
  { course: "ART 1", date: "2026-10-23", label: "Midterm", worth: "100 of 400 points", detail: "Slide identification and two short essays." },
  { course: "ANTH 2", date: "2026-11-04", label: "Fieldnotes 2", worth: "10% of grade", detail: "Return to your site and compare with your first visit." },
  { course: "ANTH 2", date: "2026-11-10", label: "Interview transcript", worth: "10% of grade", detail: "A 20-minute open-ended interview, transcribed." },
  { course: "ART 1", date: "2026-11-12", label: "Written critique", worth: "75 of 400 points", detail: "Three pages on a work you saw in person." },
  { course: "ART 1", date: "2026-11-13", label: "Museum visit notes", worth: "25 of 400 points", detail: "Notes and a photo from the museum visit." },
  { course: "ANTH 2", date: "2026-11-18", label: "Reading response 4", worth: "5% of grade", detail: "One page on the kinship readings." },
  { course: "ANTH 2", date: "2026-12-02", label: "Cultural analysis essay", worth: "25% of grade", detail: "Six pages built on your fieldnotes and interview." },
  { course: "ART 1", date: "2026-12-04", label: "Visual analysis essay", worth: "75 of 400 points", detail: "Compare two works from different periods." },
  { course: "ANTH 2", date: "2026-12-09", label: "Final exam", worth: "15% of grade", detail: "Cumulative. Finals week." },
  { course: "ART 1", date: "2026-12-10", label: "Final exam", worth: "75 of 400 points", detail: "Cumulative. Finals week." },
];

/** When each class meets (synthetic, from the schedule of classes). Days: 0 = Mon … 4 = Fri; 24-hour times. */
export type ClassMeeting = { course: string; days: number[]; start: string; end: string; room: string };
export const classMeetings: ClassMeeting[] = [
  { course: "ANTH 2", days: [0, 2], start: "10:30", end: "12:20", room: "Social Sciences 204" },
  { course: "ART 1", days: [1, 3], start: "13:30", end: "15:20", room: "Fine Arts 110" },
  { course: "ENGL 1B", days: [0, 2], start: "09:00", end: "10:50", room: "Humanities 118" },
  { course: "BIO 12", days: [1, 3], start: "10:00", end: "11:50", room: "Science 230" },
  { course: "BIO 12", days: [4], start: "09:00", end: "11:50", room: "Science lab 3" },
  { course: "HIST 18", days: [0, 2], start: "13:00", end: "14:50", room: "Social Sciences 112" },
  { course: "STAT 2", days: [1, 3], start: "13:30", end: "15:20", room: "Math 101" },
  { course: "MATH 13", days: [1, 3], start: "08:00", end: "09:50", room: "Math 105" },
  { course: "PSYC 5", days: [0, 2], start: "15:00", end: "16:50", room: "Social Sciences 210" },
  { course: "BUS 21", days: [1, 3], start: "16:00", end: "17:50", room: "Business 140" },
];

export const PILEUP_THRESHOLD = 3;
/** First Monday of Winter quarter (synthetic). Registration closes Nov 20. */
export const WINTER_2027_START = "2027-01-04";
export const WINTER_2027_WEEKS = 12;
/** Synthetic Northgate policy (cited in sources as nsu-admit). */
export const TRANSFER_MIN_UNITS = 60;
export const TERM_LOAD_LIMIT = 16;
export const TERM_LOAD_MAX = 18;
/** Per-unit fees behind the class costs shown in Opportunities (Bayview per quarter unit, Northgate per semester unit). */
export const TUITION_PER_UNIT = { bayview: 31, northgate: 396 };

export const agents = [
  {
    id: "reader",
    why: "Every later claim must point to a passage, so it extracts before anyone reasons.",
    name: "Reader",
    role: "Reads records and documents",
    inputs: ["Transcript (Bayview, synthetic)", "Degree audit (Northgate)", "Articulation file 2026-27", "Northgate catalog", "3 winter syllabi", "Portal response: Section full"],
    outputs: ["Marked QR-1 Statistics as at risk", "Extracted 14 cited passages", "Converted 5 quarter units → 3.3 semester units (both policies cited)"],
  },
  {
    id: "planner",
    why: "Seats vanish in minutes, so it sorts by open seats first and only then by fit; anything uncertain is routed, not guessed.",
    name: "Planner",
    role: "Checks what still counts",
    inputs: ["QR-1 requirement", "Articulation rules", "Confidence threshold 0.75"],
    outputs: ["Found 3 options that count; ruled out 2", "MATH 13 → Do this now (no email)", "PSYC 5, BUS 21 → Hold seat, confirm in parallel"],
  },
  {
    id: "backup",
    why: "A course that counts but collides with three deadlines in one week is a worse plan, so it checks workload.",
    name: "Backup finder",
    role: "Finds open sections and checks workload",
    inputs: ["Winter schedule (simulated)", "Merged syllabi deadlines"],
    outputs: ["Seat counts and section times for 5 sections", "Waitlist allowed per §5.4", "Deadline pile-up check per option"],
  },
  {
    id: "drafter",
    why: "Only uncertain options need a human ruling; it drafts so the counselor can decide in one read.",
    name: "Drafter",
    role: "Drafts the counselor email",
    inputs: ["Chosen option", "Evidence passages", "Drop deadline §6.1"],
    outputs: ["Hold-seat email to counselor (only for hold path; awaiting Maya's approval)"],
  },
] as const;

export const student = {
  name: "Maya Torres",
  from: "Bayview Community College (quarter)",
  to: "Northgate State University (semester)",
  counselor: "Dr. Jenna Baylor",
  counselorEmail: "j.baylor@northgate.example",
  email: "maya.torres@bayview.example",
  schoolIds: { bayview: "B00482913", northgate: "N07741025" },
};

// ---------- Onboarding directory (synthetic) ----------
export type DirectoryEntry = { id: string; name: string; detail: string; available: boolean };

/** What a new student can search during setup. Only Bayview to Northgate Psychology has a scripted path. */
export const setupDirectory: Record<"college" | "transfer" | "major", DirectoryEntry[]> = {
  college: [
    { id: "bayview", name: "Bayview Community College", detail: "Quarter system", available: true },
    { id: "cedar", name: "Cedar Hollow College", detail: "Semester system", available: false },
    { id: "marlin", name: "Marlin Coast College", detail: "Quarter system", available: false },
  ],
  transfer: [
    { id: "northgate", name: "Northgate State University", detail: "Semester system", available: true },
    { id: "alder", name: "Alder Ridge University", detail: "Semester system", available: false },
    { id: "harbor", name: "Harbor Lakes State University", detail: "Quarter system", available: false },
  ],
  major: [
    { id: "psych", name: "Psychology B.A.", detail: "College of Social Sciences", available: true },
    { id: "soc", name: "Sociology B.A.", detail: "College of Social Sciences", available: false },
    { id: "health", name: "Public Health B.S.", detail: "College of Health", available: false },
  ],
};

/** The prototype sends no email, so the sign-up code is fixed. */
export const DEMO_SIGNUP_CODE = "482913";

// ---------- Full academic path (synthetic) ----------
export type TermStatus = "done" | "in_progress" | "registering" | "planned";
export type Term = {
  id: string;
  name: string;
  school: "bayview" | "northgate";
  system: "quarter" | "semester";
  status: TermStatus;
  registration?: string;
  courses: { code: string; title: string; units: string; grade?: string; flag?: "qr1" }[];
};

export const terms: Term[] = [
  { id: "f25", name: "Fall 2025", school: "bayview", system: "quarter", status: "done", courses: [
    { code: "ENGL 1A", title: "Composition", units: "5 quarter units", grade: "A-" },
    { code: "MATH 1A", title: "Calculus I", units: "5 quarter units", grade: "B+" },
    { code: "PSYC 1", title: "General Psychology", units: "5 quarter units", grade: "A" },
  ] },
  { id: "w26", name: "Winter 2026", school: "bayview", system: "quarter", status: "done", courses: [
    { code: "BIO 10", title: "Biology + Lab", units: "6 quarter units", grade: "B" },
    { code: "COMM 1", title: "Public Speaking", units: "4 quarter units", grade: "A" },
    { code: "SOC 1", title: "Intro Sociology", units: "5 quarter units", grade: "A-" },
  ] },
  { id: "s26", name: "Spring 2026", school: "bayview", system: "quarter", status: "done", courses: [
    { code: "PHIL 2", title: "Ethics", units: "5 quarter units", grade: "B+" },
    { code: "PSYC 2", title: "Research Methods", units: "5 quarter units", grade: "A-" },
  ] },
  { id: "f26", name: "Fall 2026", school: "bayview", system: "quarter", status: "in_progress", courses: [
    { code: "ANTH 2", title: "Cultural Anthropology", units: "5 quarter units" },
    { code: "ART 1", title: "Art History", units: "4 quarter units" },
  ] },
  { id: "w27", name: "Winter 2027", school: "bayview", system: "quarter", status: "registering", registration: "Open now · closes Nov 20", courses: [
    { code: "ENGL 1B", title: "Critical Thinking & Writing", units: "5 quarter units" },
    { code: "BIO 12", title: "Human Biology", units: "5 quarter units" },
    { code: "HIST 18", title: "Modern World History", units: "5 quarter units" },
    { code: "STAT 2", title: "Statistics (QR-1)", units: "5 quarter units", flag: "qr1" },
  ] },
  { id: "sp27", name: "Spring 2027", school: "bayview", system: "quarter", status: "planned", registration: "Registers Feb 2027", courses: [
    { code: "HIST 17", title: "U.S. History", units: "5 quarter units" },
    { code: "PSYC 33", title: "Personal Growth", units: "3 quarter units" },
  ] },
  { id: "su27", name: "Summer 2027", school: "bayview", system: "quarter", status: "planned", registration: "Registers Apr 2027", courses: [
    { code: "PSYC 14", title: "Developmental Psych", units: "5 quarter units" },
    { code: "ECON 1", title: "Macroeconomics", units: "5 quarter units" },
  ] },
  { id: "fa27", name: "Fall 2027", school: "northgate", system: "semester", status: "planned", registration: "Transfer orientation Jul 20 · registers Jul 22", courses: [
    { code: "PSYC 100", title: "Foundations of Psychology", units: "3 semester units" },
    { code: "PSYC 110", title: "Research Design", units: "3 semester units" },
    { code: "GE-D", title: "Social Science GE", units: "3 semester units" },
    { code: "Elective", title: "Open elective", units: "3 semester units" },
  ] },
  { id: "sp28", name: "Spring 2028", school: "northgate", system: "semester", status: "planned", registration: "Registers Nov 2027", courses: [
    { code: "PSYC 301", title: "Cognitive Psychology", units: "3 semester units" },
    { code: "PSYC 320", title: "Social Psychology", units: "3 semester units" },
    { code: "UD-GE", title: "Upper-division GE", units: "3 semester units" },
    { code: "Elective", title: "Open elective", units: "3 semester units" },
  ] },
  { id: "fa28", name: "Fall 2028", school: "northgate", system: "semester", status: "planned", registration: "Registers Apr 2028", courses: [
    { code: "PSYC 350", title: "Abnormal Psychology", units: "3 semester units" },
    { code: "PSYC 390", title: "Lab Seminar", units: "3 semester units" },
    { code: "Elective", title: "Minor course", units: "6 semester units" },
    { code: "Elective", title: "Open elective", units: "4 semester units" },
  ] },
  { id: "sp29", name: "Spring 2029", school: "northgate", system: "semester", status: "planned", registration: "Registers Nov 2028", courses: [
    { code: "PSYC 495", title: "Capstone", units: "3 semester units" },
    { code: "Elective", title: "Minor course", units: "6 semester units" },
    { code: "Elective", title: "Open elective", units: "3 semester units" },
  ] },
];

/** Semester units. `planned` is what's still ahead at Bayview after Winter (Spring and Summer 2027). */
export const progress = { earned: 37.9, inProgress: 6.0, planned: 12.0, needed: 120, gradTerm: "Spring 2029" };

export const schools = {
  bayview: { name: "Bayview Community College", short: "Bayview CC", system: "Quarter system", role: "Current school" },
  northgate: { name: "Northgate State University", short: "Northgate State", system: "Semester system", role: "Transfer school · admitted Fall 2027" },
} as const;

// A third school: a class Maya can only take at another community college (synthetic).
export const outsideSchool = {
  name: "Lakeshore Community College",
  short: "Lakeshore CC",
  system: "Semester system",
  note: "Not your school. Taken as a visiting student.",
  course: { code: "LCC PSYC 20", title: "Abnormal Psychology", term: "Summer 2027 · online, 8 weeks", units: "3.0 semester units", reason: "Not offered at Bayview" },
  transfer: {
    lands: "Northgate PSYC 210 · Psychology major elective",
    units: "3.0 semester units, no conversion needed (both semester schools)",
    verdict: "Likely counts",
    confidence: 0.82,
    source: "Lakeshore to Northgate articulation file (synthetic), row 114",
    caution: "Counts only with a C or better. Not yet listed for the major prep requirement, so ask your counselor to confirm.",
  },
} as const;

// Skills ledger: fictional syllabus passages and role examples, not credentials.
export type EvidenceLevel = "Taught" | "Practiced" | "Demonstrated";
export type SkillConfidence = "High" | "Medium" | "Low";
export type Skill = { id: string; name: string; method: string; theme: string; course: string; level: EvidenceLevel; confidence: SkillConfidence; quote: string; source: string; work?: string };
export type SkillCourse = { code: string; title: string; term: string; termId: string; units: string; school: string; description: string; tools: string[]; assignments: string[]; thin?: boolean };
export const skillCourses: SkillCourse[] = [
  { code: "STAT 2", title: "Statistics", term: "Winter 2027", termId: "w27", units: "5 quarter units", school: "Bayview CC", description: "An introduction to statistical reasoning, data summaries and inference.", tools: ["Excel", "R"], assignments: ["Planned: data summary worksheet", "Planned: visualization exercise"] },
  { code: "PSYC 33", title: "Personal Growth", term: "Spring 2027", termId: "sp27", units: "3 quarter units", school: "Bayview CC", description: "Explore personal development through reflection and communication.", tools: [], assignments: ["Reflection journal", "Interview practice"] },
  { code: "HIST 17", title: "U.S. History", term: "Spring 2027", termId: "sp27", units: "5 quarter units", school: "Bayview CC", description: "Study U.S. history through primary sources and research writing.", tools: [], assignments: ["Primary-source analysis", "10-page research paper"] },
  { code: "ANTH 2", title: "Cultural Anthropology", term: "Fall 2026", termId: "f26", units: "5 quarter units · in progress", school: "Bayview CC", description: "Explore culture through observation, interviewing and ethnographic methods.", tools: [], assignments: ["Ethnography fieldnotes (synthetic attachment)", "Cultural analysis essay"] },
  { code: "ART 1", title: "Art History", term: "Fall 2026", termId: "f26", units: "4 quarter units · in progress", school: "Bayview CC", description: "Interpret works of art through visual analysis and historical context.", tools: [], assignments: ["Visual analysis essay", "Written critique", "Class discussion (thin description)"] },
  { code: "ENGL 1B", title: "Critical Thinking", term: "Winter 2027", termId: "w27", units: "5 quarter units", school: "Bayview CC", description: "Study arguments and develop evidence-based persuasive writing.", tools: [], assignments: ["Planned: argument analysis", "Planned: persuasive essay"] },
  { code: "PSYC 41", title: "Research Methods", term: "Fall 2027", termId: "fa27", units: "3 semester units", school: "Northgate State", description: "Design surveys and experiments to investigate research questions.", tools: [], assignments: ["Planned: survey proposal", "Planned: experiment design"] },
  { code: "DSGN 20", title: "Intro to Human-Centered Design", term: "Fall 2027", termId: "fa27", units: "3 semester units", school: "Northgate State", description: "Explore human-centered design through prototypes and usability studies.", tools: [], assignments: ["Planned: paper prototype", "Planned: usability study plan"] },
];
const skill = (id: string, name: string, course: string, level: EvidenceLevel, confidence: SkillConfidence, theme: string, quote: string, method: string, source = "Learning outcomes, line 3", work?: string): Skill => ({ id, name, course, level, confidence, theme, quote, method, source, ...(work ? { work } : {}) });
export const ledgerSkills: Skill[] = [
  skill("descriptive", "Descriptive statistics", "STAT 2", "Taught", "High", "Research and data", "Calculate and interpret measures of center and spread", "Measures of center and spread"),
  skill("hypothesis", "Hypothesis testing", "STAT 2", "Taught", "High", "Research and data", "Explain hypothesis tests and interpret their results", "Statistical inference", "Learning outcomes, line 4"),
  skill("visualization", "Data visualization", "STAT 2", "Taught", "Medium", "Tools", "Create and interpret charts using Excel and R", "Excel and R", "Learning outcomes, line 5"),
  skill("reflection", "Self-reflection methods", "PSYC 33", "Practiced", "Medium", "Analysis and critical thinking", "Use a reflection journal to examine personal growth", "Reflection journal", "Assignments, line 2"),
  skill("interview-basics", "Interviewing basics", "PSYC 33", "Taught", "Medium", "Writing and communication", "Describe listening techniques and introductory interview questions", "Listening and open questions"),
  skill("sources", "Source analysis", "HIST 17", "Practiced", "High", "Analysis and critical thinking", "Evaluate primary sources for bias and context", "Primary-source analysis"),
  skill("research-writing", "Research writing", "HIST 17", "Practiced", "High", "Writing and communication", "Write a 10-page research paper using primary sources", "Cited research paper", "Assignments, line 4"),
  skill("observation", "Qualitative observation", "ANTH 2", "Demonstrated", "High", "Research and data", "Record ethnographic observations in fieldnotes", "Ethnography fieldnotes", "Assignments, line 2", "Ethnography fieldnotes · synthetic work attached"),
  skill("culture", "Cultural analysis", "ANTH 2", "Practiced", "High", "Analysis and critical thinking", "Compare cultural practices using ethnographic evidence", "Comparative analysis"),
  skill("interviewing", "Interviewing", "ANTH 2", "Practiced", "Medium", "Writing and communication", "Practice open-ended interviews and document responses", "Open-ended interviews", "Assignments, line 5"),
  skill("visual-analysis", "Visual analysis", "ART 1", "Practiced", "High", "Analysis and critical thinking", "Interpret composition, form and context in a visual analysis essay", "Visual analysis essay", "Assignments, line 2"),
  skill("critique", "Critique and writing", "ART 1", "Practiced", "Medium", "Writing and communication", "Write a critique supported by observations of an artwork", "Written critique", "Assignments, line 4"),
  skill("argument", "Argument analysis", "ENGL 1B", "Taught", "High", "Analysis and critical thinking", "Identify assumptions and evaluate evidence in arguments", "Argument structure"),
  skill("persuasive", "Persuasive writing", "ENGL 1B", "Taught", "High", "Writing and communication", "Develop a persuasive argument supported by evidence", "Evidence-based essays", "Learning outcomes, line 4"),
  skill("speaking", "Public speaking", "ART 1", "Taught", "Low", "Writing and communication", "Class discussion", "Discussion · unclear syllabus wording", "Course schedule, line 6"),
];
export const gapSkills: Skill[] = [
  skill("survey", "Survey design", "PSYC 41", "Taught", "High", "Research and data", "Design survey questions appropriate to a research question", "Survey proposal"),
  skill("experimental", "Experimental design", "PSYC 41", "Taught", "High", "Research and data", "Describe controls and variables in an experimental design", "Experiment proposal", "Learning outcomes, line 4"),
  skill("usability", "Usability testing", "DSGN 20", "Taught", "High", "Research and data", "Plan a usability study and identify tasks to observe", "Usability study plan"),
  skill("prototyping", "Prototyping", "DSGN 20", "Taught", "High", "Tools", "Create a paper prototype to explore a design idea", "Paper prototype", "Learning outcomes, line 4"),
];
export const careerInterests = ["Working with people", "Working with data", "Creative work", "Helping communities", "Stable hours", "High pay", "Remote-friendly"];
export type CareerRole = { id: string; title: string; description: string; match: "Strong match" | "Possible match" | "A stretch"; why: string[]; missing: string[]; interests: string[]; suggestions: string[]; beyond: string[] };
export const careerRoles: CareerRole[] = [
  { id: "ux", title: "UX researcher", description: "Learn how people experience products and services.", match: "Strong match", why: ["Qualitative observation", "Interviewing", "Research writing"], missing: ["Usability testing", "Survey design"], interests: ["Working with people", "Creative work", "Remote-friendly"], suggestions: ["PSYC 41", "DSGN 20", "STAT 2"], beyond: ["Explore a community research internship.", "Make a portfolio project observing how people use a campus service."] },
  { id: "policy", title: "Policy analyst", description: "Read evidence to understand policies and their effects.", match: "Possible match", why: ["Source analysis", "Research writing", "Descriptive statistics"], missing: ["Policy evaluation", "Data analysis in R"], interests: ["Helping communities", "Working with data", "Stable hours"], suggestions: ["PSYC 41", "STAT 2"], beyond: ["Explore a public-policy research internship.", "Write a short evidence-based policy brief."] },
  { id: "market", title: "Market research analyst", description: "Explore what people need through data and research.", match: "Possible match", why: ["Descriptive statistics", "Survey interpretation", "Data visualization"], missing: ["Survey design", "SQL"], interests: ["Working with data", "High pay", "Remote-friendly"], suggestions: ["PSYC 41", "STAT 2"], beyond: ["Explore a research assistant internship.", "Create a small survey and describe its limitations."] },
  { id: "museum", title: "Museum or archive coordinator", description: "Help preserve collections and tell their stories.", match: "Possible match", why: ["Visual analysis", "Source analysis", "Critique and writing"], missing: ["Collections management"], interests: ["Creative work", "Helping communities", "Stable hours"], suggestions: ["DSGN 20", "PSYC 41"], beyond: ["Explore a museum or community archive internship.", "Create a small annotated digital collection."] },
  { id: "nonprofit", title: "Program evaluator at a nonprofit", description: "Help communities understand whether programs are working.", match: "A stretch", why: ["Interviewing", "Qualitative observation"], missing: ["Evaluation design", "Data analysis"], interests: ["Helping communities", "Working with people", "Working with data"], suggestions: ["PSYC 41", "STAT 2"], beyond: ["Explore a nonprofit evaluation internship.", "Draft an evaluation plan for a community program."] },
];
export const registrationSkills: Record<string, string[]> = {
  "STAT 2": ["Descriptive statistics", "Hypothesis testing"], "MATH 13": ["Descriptive statistics", "Hypothesis testing"],
  "PSYC 5": ["Hypothesis testing", "Data visualization"], "BUS 21": ["Descriptive statistics", "Data visualization"], "MATH 10": ["Statistical reasoning", "Chart interpretation"],
};

// Explore: synthetic classes, clubs, internships and events. There is deliberately no sponsor or paid field.
export type OpportunityKind = "class" | "club" | "internship" | "event";
/** Who runs a listing. Picks the logo shown next to its name. */
export type OrgId = "bayview" | "northgate" | "lakeshore" | "redwood-bend" | "eastshore-city" | "library" | "design-collective" | "open-eastshore" | "county" | "harbor-grocery" | "history-center" | "valley-museum" | "food-network" | "harbor-health";
export type ClubId = "people-products" | "research-circle" | "student-government" | "data-club";
export type FlyerStyle = "haze" | "poster" | "bands" | "cutout" | "checker" | "slab" | "ribbon" | "inset" | "scatter" | "marquee" | "masthead" | "scrawl" | "patch" | "collage" | "tape" | "expo";
/** A fictional flyer, the way a club or employer would upload one. `brand` also colors what surrounds it. */
export type FlyerSpec = { style: FlyerStyle; headline: string[]; when: string; note: string; brand: string; ink: string; accent: string; pop: string; deep?: string; /** Which part of the photo to keep when it is cropped. */ focus?: string };
export type WeekDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type DayPart = "morning" | "afternoon" | "evening";
export type WeekSlot = { day: WeekDay; part: DayPart };
export type Opportunity = {
  id: string;
  kind: OpportunityKind;
  title: string;
  host: string;
  org: OrgId;
  /** A campus club's own logo. `org` stays the school it belongs to. */
  club?: ClubId;
  when: string;
  /** Classes only: estimated tuition in dollars, units times the school's per-unit fee. */
  cost?: number;
  /** Classes at a school you don't attend. They stay hidden until you ask for schools nearby. */
  milesAway?: number;
  fills: string[];
  /** Term ids it runs in. */
  termIds: string[];
  /** Still open after the last term, so it never reads as "too late". */
  openToGrads?: boolean;
  slot?: WeekSlot;
  /** Plain fit reason when there is no weekly slot. */
  fitNote?: string;
  /** Classes only: whether it counts toward the degree. Nothing else ever does. */
  degree?: "major" | "elective" | "check";
  /** Catalog code when it can be added to the draft plan. */
  courseCode?: string;
  /** Card photo: a file name in src/assets/explore, or an Unsplash id starting "photo-". */
  photo: string;
  subject: string;
  industry: string;
  place: string;
  /** Classes and internships: last day to register or apply, YYYY-MM-DD. */
  deadline?: string;
  /** Events, clubs and internships. Classes just have a photo. */
  flyer?: FlyerSpec;
  /** Next date it happens or starts, YYYY-MM-DD, for the calendar. */
  startsOn: string;
};
export const freeTime: WeekSlot[] = [
  { day: "Tue", part: "afternoon" },
  { day: "Tue", part: "evening" },
  { day: "Fri", part: "afternoon" },
  { day: "Sat", part: "morning" },
];
const remainingTerms = ["su27", "fa27", "sp28", "fa28", "sp29"];
export const opportunities: Opportunity[] = [
  { id: "dsgn20", kind: "class", degree: "elective", title: "DSGN 20 · Intro to Human-Centered Design", host: "Northgate State", org: "northgate", when: "Fall 2027 · 3 semester units", cost: 1188, fills: ["Usability testing"], termIds: ["fa27"], fitNote: "Uses your open elective in Fall 2027", courseCode: "DSGN 20", photo: "photo-1586936893354-362ad6ae47ba", subject: "Design", industry: "Technology", place: "Northgate State", deadline: "2027-08-13", startsOn: "2027-08-23" },
  { id: "design-club", kind: "club", title: "People + Products Club", host: "Bayview CC", org: "bayview", club: "people-products", when: "Tuesdays, 3:30 PM · Student Center", fills: ["Usability testing"], termIds: remainingTerms, slot: { day: "Tue", part: "afternoon" }, photo: "design-club", subject: "Design", industry: "Technology", place: "Bayview CC", flyer: { style: "masthead", headline: ["People +", "Products"], when: "Tuesdays 3:30", note: "Student Center", brand: "#FFF04D", ink: "#0A0A0A", accent: "#0A0A0A", pop: "#0A0A0A", focus: "62% 55%" }, startsOn: "2026-11-10" },
  { id: "library-usability", kind: "internship", title: "Library website usability intern", host: "Eastshore Public Library", org: "library", when: "Summer · 8 hours a week · Paid", fills: ["Usability testing"], termIds: ["su27"], openToGrads: true, fitNote: "Set your own hours around summer classes", photo: "photo-1514513452089-17f8a9771ee8", subject: "Design", industry: "Libraries & museums", place: "Off campus", deadline: "2027-03-15", flyer: { style: "checker", headline: ["Library", "UX Intern"], when: "Apply by Mar 15", note: "Paid · Summer", brand: "#F5F5F5", ink: "#0A0A0A", accent: "#D41C72", pop: "#D41C72" }, startsOn: "2027-06-01" },
  { id: "ux-night", kind: "event", title: "Watch Real People Use Things: a UX night", host: "Eastshore Design Collective", org: "design-collective", when: "Next Tuesday, 5:30 PM · Free", fills: ["Usability testing"], termIds: remainingTerms, openToGrads: true, slot: { day: "Tue", part: "evening" }, photo: "ux-night", subject: "Design", industry: "Technology", place: "Off campus", flyer: { style: "scatter", headline: ["UX", "Night"], when: "Nov 10 · 5:30 PM", note: "Real people, real things", brand: "#1B2B6B", ink: "#FFFFFF", accent: "#FFF1A8", pop: "#FF5A5F", deep: "#7CF0A0", focus: "50% 100%" }, startsOn: "2026-11-10" },
  { id: "psyc41", kind: "class", degree: "major", title: "PSYC 41 · Research Methods", host: "Northgate State", org: "northgate", when: "Fall 2027 · 3 semester units", cost: 1188, fills: ["Survey design", "Evaluation design", "Policy evaluation"], termIds: ["fa27"], fitNote: "Also counts toward your Psychology major", courseCode: "PSYC 41", photo: "photo-1460518451285-97b6aa326961", subject: "Psychology", industry: "Education", place: "Northgate State", deadline: "2027-08-13", startsOn: "2027-08-23" },
  { id: "research-circle", kind: "club", title: "Student Research Circle", host: "Bayview CC", org: "bayview", club: "research-circle", when: "Fridays, 1:00 PM · Library room 204", fills: ["Survey design", "Data analysis"], termIds: remainingTerms, slot: { day: "Fri", part: "afternoon" }, photo: "research-circle", subject: "Research", industry: "Education", place: "Bayview CC", flyer: { style: "ribbon", headline: ["Research", "Circle"], when: "Fridays 1 PM", note: "Library 204", brand: "#5630E6", ink: "#FFFFFF", accent: "#FFFFFF", pop: "#FFFFFF", focus: "50% 0%" }, startsOn: "2026-11-13" },
  { id: "campus-survey", kind: "internship", title: "Campus climate survey assistant", host: "Bayview Office of Research", org: "bayview", when: "Fall · 6 hours a week · Paid", fills: ["Survey design"], termIds: ["fa27"], fitNote: "Hours are set around your classes", photo: "photo-1562774053-701939374585", subject: "Research", industry: "Education", place: "Bayview CC", deadline: "2027-06-30", flyer: { style: "cutout", headline: ["Survey", "Assistant"], when: "Apply by Jun 30", note: "Paid · Fall", brand: "#0A6B4E", ink: "#FFE36E", accent: "#FFE36E", pop: "#FFE36E" }, startsOn: "2027-08-30" },
  { id: "survey-lab", kind: "event", title: "Write Better Questions: a survey workshop", host: "Bayview Career Center", org: "bayview", when: "Saturday, 10:00 AM · Free", fills: ["Survey design"], termIds: remainingTerms, openToGrads: true, slot: { day: "Sat", part: "morning" }, photo: "survey-lab", subject: "Research", industry: "Education", place: "Bayview CC", flyer: { style: "scrawl", headline: ["Write Better", "Questions"], when: "Saturday, Nov 14", note: "Free · 10 AM workshop", brand: "#EE4A4F", ink: "#FFFFFF", accent: "#FFEE57", pop: "#FFEE57", focus: "60% 60%" }, startsOn: "2026-11-14" },
  { id: "policy-committee", kind: "club", title: "Student Government policy committee", host: "Bayview CC", org: "bayview", club: "student-government", when: "Thursdays, 6:00 PM · Student Center", fills: ["Policy evaluation"], termIds: remainingTerms, slot: { day: "Thu", part: "evening" }, photo: "policy-committee", subject: "Government", industry: "Government", place: "Bayview CC", flyer: { style: "slab", headline: ["Student", "Gov"], when: "Thursdays 6 PM", note: "Policy committee", brand: "#1F3FDC", ink: "#050508", accent: "#FFFFFF", pop: "#FFFFFF", focus: "50% 70%" }, startsOn: "2026-11-12" },
  { id: "county-policy", kind: "internship", title: "County budget office research intern", host: "Eastshore County", org: "county", when: "Summer · 10 hours a week · Paid", fills: ["Policy evaluation", "Data analysis in R"], termIds: ["su27"], openToGrads: true, fitNote: "Remote, so you choose the hours", photo: "photo-1565832077355-ad10f941cc11", subject: "Government", industry: "Government", place: "Online", deadline: "2027-03-01", flyer: { style: "collage", headline: ["Budget", "Office", "Intern"], when: "Apply by Mar 1", note: "Remote · Paid", brand: "#087380", ink: "#0B0B0B", accent: "#FBF3CF", pop: "#3CBCC8" }, startsOn: "2027-06-01" },
  { id: "r-group", kind: "club", title: "Eastshore R Users Group", host: "Open Eastshore", org: "open-eastshore", when: "Tuesdays, 6:00 PM · Online", fills: ["Data analysis in R", "Data analysis"], termIds: remainingTerms, openToGrads: true, slot: { day: "Tue", part: "evening" }, photo: "photo-1607799279861-4dd421887fb3", subject: "Data", industry: "Technology", place: "Online", flyer: { style: "expo", headline: ["R Users", "Group"], when: "Tuesdays 6 PM", note: "Online", brand: "#A8E8B0", ink: "#1D1D22", accent: "#79D98A", pop: "#C6B4EC" }, startsOn: "2026-11-10" },
  { id: "civic-data", kind: "event", title: "Civic Data Saturday", host: "Open Eastshore", org: "open-eastshore", when: "Saturday, 9:30 AM · Free", fills: ["Data analysis in R", "SQL", "Data analysis"], termIds: remainingTerms, openToGrads: true, slot: { day: "Sat", part: "morning" }, photo: "civic-data", subject: "Data", industry: "Government", place: "Off campus", flyer: { style: "patch", headline: ["Civic", "Data"], when: "Sat Nov 14 · 9:30 AM", note: "Free · All levels", brand: "#C42A72", ink: "#0A0A0A", accent: "#FFE94D", pop: "#C42A72" }, startsOn: "2026-11-14" },
  { id: "sql-sprint", kind: "club", title: "Data Club SQL sprint", host: "Northgate State", org: "northgate", club: "data-club", when: "Fridays, 2:00 PM · Six weeks", fills: ["SQL"], termIds: ["fa27", "sp28"], slot: { day: "Fri", part: "afternoon" }, photo: "sql-sprint", subject: "Data", industry: "Technology", place: "Northgate State", flyer: { style: "tape", headline: ["SQL", "Sprint"], when: "Fridays 2 PM", note: "Six weeks", brand: "#F6F7FF", ink: "#0A0A0A", accent: "#1F44E0", pop: "#AEBEFF" }, startsOn: "2027-08-27" },
  { id: "market-intern", kind: "internship", title: "Customer insights intern", host: "Harbor Grocery Co-op", org: "harbor-grocery", when: "Summer · 10 hours a week · Paid", fills: ["SQL"], termIds: ["su27"], openToGrads: true, fitNote: "Set your own hours around summer classes", photo: "photo-1542838132-92c53300491e", subject: "Business", industry: "Retail", place: "Off campus", deadline: "2027-04-01", flyer: { style: "bands", headline: ["Customer", "Insights"], when: "Apply by Apr 1", note: "Paid", brand: "#F4B93A", ink: "#1F5A2E", accent: "#1F5A2E", pop: "#F7E9B0", deep: "#D9481C" }, startsOn: "2027-06-01" },
  { id: "archive-volunteers", kind: "club", title: "Community Archive volunteers", host: "Eastshore History Center", org: "history-center", when: "Saturdays, 10:00 AM", fills: ["Collections management"], termIds: remainingTerms, openToGrads: true, slot: { day: "Sat", part: "morning" }, photo: "archive-volunteers", subject: "Art & history", industry: "Libraries & museums", place: "Off campus", flyer: { style: "haze", headline: ["Archive", "Volunteers"], when: "Saturdays", note: "10 AM", brand: "#CFF5EC", ink: "#0B5D52", accent: "#36C9B0", pop: "#FFD36E" }, startsOn: "2026-11-14" },
  { id: "museum-intern", kind: "internship", title: "Collections intern", host: "Valley Art Museum", org: "valley-museum", when: "Summer · 8 hours a week · Paid", fills: ["Collections management"], termIds: ["su27"], openToGrads: true, fitNote: "Shifts are chosen each week", photo: "museum-intern", subject: "Art & history", industry: "Libraries & museums", place: "Off campus", deadline: "2027-03-15", flyer: { style: "inset", headline: ["Collections", "Intern"], when: "Apply by Mar 15", note: "Paid · Summer", brand: "#FF6A2B", ink: "#0D0D0D", accent: "#0D0D0D", pop: "#0D0D0D", focus: "46% 45%" }, startsOn: "2027-06-01" },
  { id: "archives-day", kind: "event", title: "Inside the Archive open day", host: "Eastshore History Center", org: "history-center", when: "Saturday, 11:00 AM · Free", fills: ["Collections management"], termIds: remainingTerms, openToGrads: true, slot: { day: "Sat", part: "morning" }, photo: "archives-day", subject: "Art & history", industry: "Libraries & museums", place: "Off campus", flyer: { style: "marquee", headline: ["Inside the", "Archive"], when: "Nov 21 · 11 AM", note: "Free open day at the History Center", brand: "#F9D54A", ink: "#3A2300", accent: "#FFF6DC", pop: "#E2531B", focus: "50% 75%" }, startsOn: "2026-11-21" },
  { id: "nonprofit-eval", kind: "internship", title: "Program evaluation intern", host: "Bay Neighbors Food Network", org: "food-network", when: "Fall · 8 hours a week · Paid", fills: ["Evaluation design", "Data analysis"], termIds: ["fa27"], openToGrads: true, fitNote: "Hours are set around your classes", photo: "photo-1593113616828-6f22bca04804", subject: "Research", industry: "Nonprofit", place: "Off campus", deadline: "2027-07-15", flyer: { style: "poster", headline: ["Program", "Eval"], when: "Apply by Jul 15", note: "Paid · Fall", brand: "#C8F031", ink: "#0A0A0A", accent: "#1733E6", pop: "#1733E6" }, startsOn: "2027-08-30" },
  { id: "cis22", kind: "class", degree: "check", title: "CIS 22 · Databases and SQL", host: "Bayview CC", org: "bayview", when: "Summer 2027 · 4 quarter units", cost: 124, fills: ["SQL", "Data analysis"], termIds: ["su27"], fitNote: "Online, so it works around your other summer classes", photo: "photo-1551288049-bebda4e38f71", subject: "Data", industry: "Technology", place: "Bayview CC", deadline: "2027-06-18", startsOn: "2027-06-21" },
  { id: "math17", kind: "class", degree: "check", title: "MATH 17 · Data Analysis with R", host: "Bayview CC", org: "bayview", when: "Summer 2027 · 5 quarter units", cost: 155, fills: ["Data analysis in R", "Data analysis"], termIds: ["su27"], fitNote: "Meets one evening a week", photo: "photo-1517694712202-14dd9538aa97", subject: "Data", industry: "Technology", place: "Bayview CC", deadline: "2027-06-18", startsOn: "2027-06-21" },
  { id: "lcc-psyc20", kind: "class", degree: "check", title: "LCC PSYC 20 · Abnormal Psychology", host: "Lakeshore CC", org: "lakeshore", when: "Summer 2027 · 3 semester units", cost: 138, milesAway: 9, fills: ["Psychological assessment"], termIds: ["su27"], fitNote: "Online for 8 weeks and likely counts at Northgate", photo: "photo-1434030216411-0b793f4b4173", subject: "Psychology", industry: "Education", place: "Lakeshore CC", deadline: "2027-06-07", startsOn: "2027-06-14" },
  { id: "lcc-libr10", kind: "class", degree: "check", title: "LCC LIBR 10 · Archives and Collections", host: "Lakeshore CC", org: "lakeshore", when: "Summer 2027 · 3 semester units", cost: 138, milesAway: 9, fills: ["Collections management"], termIds: ["su27"], fitNote: "Online for 8 weeks", photo: "photo-1524995997946-a1c2e315a42f", subject: "Art & history", industry: "Libraries & museums", place: "Lakeshore CC", deadline: "2027-06-07", startsOn: "2027-06-14" },
  { id: "rbc-soc31", kind: "class", degree: "check", title: "SOC 31 · Program Evaluation Basics", host: "Redwood Bend College", org: "redwood-bend", when: "Fall 2027 · 3 semester units", cost: 138, milesAway: 14, fills: ["Evaluation design", "Policy evaluation"], termIds: ["fa27"], fitNote: "Saturday mornings, so it stays clear of your weekdays", photo: "photo-1522202176988-66273c2fd55f", subject: "Research", industry: "Nonprofit", place: "Redwood Bend College", deadline: "2027-08-14", startsOn: "2027-08-28" },
  { id: "ecc-dsgn14", kind: "class", degree: "check", title: "DSGN 14 · UX Research Studio", host: "Eastshore City College", org: "eastshore-city", when: "Fall 2027 · 3 semester units", cost: 138, milesAway: 6, fills: ["Usability testing"], termIds: ["fa27"], fitNote: "Tuesday evenings, when you're usually free", photo: "photo-1586717791821-3f44a563fa4c", subject: "Design", industry: "Technology", place: "Eastshore City College", deadline: "2027-08-10", startsOn: "2027-08-24" },
];
/** A student going to the same event who chose to be seen. Their card shows only what they picked; their email appears only after you both say yes. */
export type EventPeer = { id: string; name: string; note: string; photo: string; org: "bayview"; major: string; standing: string; ask: string; fact: string; skills: string[]; tools: string[]; why: string; email: string;
  /** The note they wrote with their ask, in their own words. */
  message?: string;
  /** Classmates they've added as friends, so you can see who you both know. */
  friendsWith?: string[] };
/** Everyone is synthetic. Only peers listed here chose to be visible; the rest exist only in the count. */
export const goTogetherEvent: { id: string; shortName: string; name: string; when: string; going: number; visiblePeers: EventPeer[]; asksYou: string[] } = {
  id: "ux-night",
  shortName: "UX night",
  name: "UX Night",
  when: "Tue Nov 10 · 5:30 PM",
  going: 48,
  visiblePeers: [
    { id: "lena", name: "Lena K.", note: "Bayview · Graphic Design", photo: "photo-1571234018566-1d3cc5d2991a", org: "bayview", major: "Graphic Design", standing: "Sophomore", ask: "Turning messy research notes into clear visuals.", fact: "I've sketched every bus stop on my route.", skills: ["Visual design", "User interviews", "Prototyping"], tools: ["figma", "notion"], why: "You both picked user research and are going alone", email: "lena.k@bayview.example", message: "Hey, I'm Lena! I saw you're going to UX Night and I'm going alone too. Your card says you like observing how people use spaces, which is so my thing. Want to go together? I can meet you by the front doors.", friendsWith: ["jordan"] },
    { id: "tomas", name: "Tomás R.", note: "Bayview · Psychology", photo: "photo-1525457136159-8878648a7ad0", org: "bayview", major: "Psychology", standing: "Freshman", ask: "Why people click the wrong button.", fact: "I've run the same 5K every Sunday for two years.", skills: ["Survey design", "Note taking"], tools: ["gforms"], why: "You're both in Psychology and new to UX events", email: "tomas.r@bayview.example" },
    { id: "jordan", name: "Jordan P.", note: "Bayview · Computer Science", photo: "photo-1544168190-79c17527004f", org: "bayview", major: "Computer Science", standing: "Sophomore", ask: "Making apps work with a screen reader.", fact: "I fix old film cameras.", skills: ["Accessibility checks", "Prototyping"], tools: ["figma"], why: "You both want to practice usability testing", email: "jordan.p@bayview.example" },
    { id: "ana", name: "Ana M.", note: "Bayview · Psychology", photo: "photo-1494790108377-be9c29b29330", org: "bayview", major: "Psychology", standing: "Junior", ask: "How sleep changes the way students study.", fact: "I've kept a paper planner since 6th grade.", skills: ["Survey design", "Data analysis"], tools: ["gforms"], why: "You both take PSYC 5 this term", email: "ana.m@bayview.example", friendsWith: ["jordan"] },
    { id: "devon", name: "Devon T.", note: "Bayview · Business", photo: "photo-1546525848-3ce03ca516f6", org: "bayview", major: "Business", standing: "Sophomore", ask: "Why some sign-up forms get finished and others don't.", fact: "I DJ at friends' birthday parties.", skills: ["Note taking", "Interviewing"], tools: ["notion"], why: "You're both new to UX events", email: "devon.t@bayview.example" },
    { id: "mei", name: "Mei L.", note: "Bayview · Graphic Design", photo: "photo-1534528741775-53994a69daeb", org: "bayview", major: "Graphic Design", standing: "Freshman", ask: "Icons people understand without words.", fact: "I collect transit maps from every city I visit.", skills: ["Visual design", "Prototyping"], tools: ["figma"], why: "You both saved People + Products Club", email: "mei.l@bayview.example", friendsWith: ["lena"] },
    { id: "sofia", name: "Sofia G.", note: "Bayview · Sociology", photo: "photo-1517841905240-472988babdf9", org: "bayview", major: "Sociology", standing: "Junior", ask: "How neighborhoods share news.", fact: "I volunteer at the food pantry on Saturdays.", skills: ["Interviewing", "Field notes"], tools: ["notion"], why: "You both like field research", email: "sofia.g@bayview.example" },
    { id: "kai", name: "Kai W.", note: "Bayview · Computer Science", photo: "photo-1527980965255-d3b416303d12", org: "bayview", major: "Computer Science", standing: "Sophomore", ask: "Apps that work on a slow connection.", fact: "I build tiny keyboards.", skills: ["Prototyping", "Accessibility checks"], tools: ["figma"], why: "You both want to practice usability testing", email: "kai.w@bayview.example", friendsWith: ["jordan"] },
    { id: "marisol", name: "Marisol V.", note: "Bayview · Communication", photo: "photo-1524504388940-b1c1722653e1", org: "bayview", major: "Communication", standing: "Senior", ask: "Plain-language health info.", fact: "I've read every book in our library's comics section.", skills: ["Writing", "User interviews"], tools: ["notion"], why: "You're both going alone", email: "marisol.v@bayview.example" },
    { id: "ethan", name: "Ethan B.", note: "Bayview · Psychology", photo: "photo-1539571696357-5a69c17a67c6", org: "bayview", major: "Psychology", standing: "Freshman", ask: "Why people trust some reviews and not others.", fact: "I play bass in a jazz trio.", skills: ["Survey design"], tools: ["gforms"], why: "You're both in Psychology", email: "ethan.b@bayview.example" },
    { id: "nia", name: "Nia O.", note: "Bayview · Anthropology", photo: "photo-1531123897727-8f129e1688ce", org: "bayview", major: "Anthropology", standing: "Sophomore", ask: "How students pick where to study.", fact: "I've hiked every trail in Eastshore Park.", skills: ["Field notes", "Interviewing"], tools: ["notion"], why: "You both took ANTH 2", email: "nia.o@bayview.example", friendsWith: ["ana"] },
    { id: "sam-r", name: "Sam R.", note: "Bayview · Undeclared", photo: "photo-1463453091185-61582044d556", org: "bayview", major: "Undeclared", standing: "Freshman", ask: "Where people get stuck on the bus app.", fact: "I bake bread every Sunday.", skills: ["Note taking"], tools: ["notion"], why: "You're both new to UX events", email: "sam.r@bayview.example" },
  ],
  // Lena turned on matching and asked to go with Maya. She only sees Maya once Maya shows herself as going.
  asksYou: ["lena"],
};

// ---------- Experiences: events from the student's own event accounts (synthetic) ----------
/** Event services a student signs in to. Handshake arrives through the school; Luma and Eventbrite are personal accounts. */
export type EventPlatform = "luma" | "eventbrite" | "handshake";
/** How strongly a service knows the student was there. Only a check-in counts without asking. */
export type AttendanceProof = "checked-in" | "ticket" | "rsvp";
export type ExperienceRole = "Attended" | "Volunteered" | "Competed" | "Presented";
export type ExperienceKind = "Career fair" | "Workshop" | "Hackathon" | "Info session" | "Training" | "Conference" | "Volunteering" | "Meetup";
export type ExperienceSkill = { id: string; name: string; level: EvidenceLevel; theme: string };
export type Experience = {
  id: string;
  title: string;
  host: string;
  kind: ExperienceKind;
  role: ExperienceRole;
  /** YYYY-MM-DD */
  date: string;
  time: string;
  place: string;
  /** Cover photo: a file name in src/assets/explore, or an Unsplash id starting "photo-". */
  photo: string;
  /** The same event can be listed on more than one service. */
  foundOn: { platform: EventPlatform; proof: AttendanceProof }[];
  /** A line from the event listing. Skills come only from what the listing says happens there. */
  listing: string;
  skills: ExperienceSkill[];
  outcome?: string;
  /** Upcoming only: why Sprout thinks it's worth the time. */
  prep?: string;
  /** The matching Explore listing, when there is one. */
  opportunityId?: string;
};

/** Where a listing was first posted. Event services use their real address shape; fictional schools and groups use .example addresses. */
export type Posting = { site: string; url: string };
export const postings: Record<string, Posting> = {
  "fall-fair-25": { site: "Handshake", url: "https://app.joinhandshake.com/stu/events/1482207" },
  "figma-intro": { site: "Luma", url: "https://lu.ma/figma-non-designers-esdc" },
  "mhfa": { site: "Eventbrite", url: "https://www.eventbrite.com/e/mental-health-first-aid-eastshore-tickets-918204415527" },
  "civic-hack": { site: "Luma", url: "https://lu.ma/civic-hack-weekend-eastshore" },
  "harbor-info": { site: "Handshake", url: "https://app.joinhandshake.com/stu/events/1516348" },
  "psych-symposium": { site: "Handshake", url: "https://app.joinhandshake.com/stu/events/1532907" },
  "symposium": { site: "Eventbrite", url: "https://www.eventbrite.com/e/undergraduate-research-symposium-bapc-tickets-861530927117" },
  "food-pack": { site: "Eventbrite", url: "https://www.eventbrite.com/e/saturday-pack-shift-bay-neighbors-tickets-948377102214" },
  "resume-lab": { site: "Handshake", url: "https://app.joinhandshake.com/stu/events/1590442" },
  "winter-fair": { site: "Handshake", url: "https://app.joinhandshake.com/stu/events/1620518" },
  "diary-studies": { site: "Eventbrite", url: "https://www.eventbrite.com/e/ux-research-meetup-diary-studies-tickets-1029384756120" },
  "civic-data": { site: "Luma", url: "https://lu.ma/civic-data-saturday-eastshore" },
  "survey-lab": { site: "Handshake", url: "https://app.joinhandshake.com/stu/events/1611093" },
  "ux-night": { site: "Luma", url: "https://lu.ma/ux-night-esdc" },
  "archives-day": { site: "Eventbrite", url: "https://www.eventbrite.com/e/inside-the-archive-open-day-tickets-1004417758203" },
  "r-group": { site: "Luma", url: "https://lu.ma/eastshore-r-users" },
  "library-usability": { site: "Handshake", url: "https://app.joinhandshake.com/stu/jobs/9184402" },
  "campus-survey": { site: "Handshake", url: "https://app.joinhandshake.com/stu/jobs/9201775" },
  "market-intern": { site: "Handshake", url: "https://app.joinhandshake.com/stu/jobs/9233610" },
  "nonprofit-eval": { site: "Handshake", url: "https://app.joinhandshake.com/stu/jobs/9240157" },
  "county-policy": { site: "Eastshore County jobs", url: "https://jobs.eastshore-county.example/budget-research-intern" },
  "museum-intern": { site: "Valley Art Museum", url: "https://valleyart.example/jobs/collections-intern" },
  "archive-volunteers": { site: "Eastshore History Center", url: "https://eastshorehistory.example/volunteer" },
  "design-club": { site: "Bayview clubs", url: "https://clubs.bayview.example/people-products" },
  "research-circle": { site: "Bayview clubs", url: "https://clubs.bayview.example/research-circle" },
  "policy-committee": { site: "Bayview clubs", url: "https://clubs.bayview.example/student-government" },
  "sql-sprint": { site: "Northgate clubs", url: "https://clubs.northgate.example/data-club" },
  "dsgn20": { site: "Northgate catalog", url: "https://catalog.northgate.example/courses/dsgn-20" },
  "psyc41": { site: "Northgate catalog", url: "https://catalog.northgate.example/courses/psyc-41" },
  "cis22": { site: "Bayview catalog", url: "https://catalog.bayview.example/courses/cis-22" },
  "math17": { site: "Bayview catalog", url: "https://catalog.bayview.example/courses/math-17" },
  "lcc-psyc20": { site: "Lakeshore catalog", url: "https://catalog.lakeshore.example/courses/psyc-20" },
  "lcc-libr10": { site: "Lakeshore catalog", url: "https://catalog.lakeshore.example/courses/libr-10" },
  "rbc-soc31": { site: "Redwood Bend catalog", url: "https://catalog.redwoodbend.example/courses/soc-31" },
  "ecc-dsgn14": { site: "Eastshore City catalog", url: "https://catalog.eastshorecity.example/courses/dsgn-14" },
};

export const eventPlatforms: Record<EventPlatform, { name: string; what: string; signIn: string; via: string }> = {
  luma: { name: "Luma", what: "Events you RSVP'd to and check-ins", signIn: "lu.ma", via: "Your Luma account" },
  eventbrite: { name: "Eventbrite", what: "Tickets you've registered for", signIn: "eventbrite.com", via: "Your Eventbrite account" },
  handshake: { name: "Handshake", what: "Career-center events and check-ins", signIn: "sso.bayview.example", via: "Bayview's career center" },
};

const es = (id: string, name: string, level: EvidenceLevel, theme: string): ExperienceSkill => ({ id, name, level, theme });
export const experiences: Experience[] = [
  { id: "fall-fair-25", title: "Fall Career & Internship Fair", host: "Bayview Career Center", kind: "Career fair", role: "Attended", date: "2025-10-08", time: "11:00 AM", place: "Bayview CC gym", photo: "archives-day", foundOn: [{ platform: "handshake", proof: "checked-in" }], listing: "Meet 40+ employers hiring for internships and part-time roles. Bring a resume and practice a 30-second introduction.", skills: [es("networking", "Professional networking", "Practiced", "Writing and communication")] },
  { id: "figma-intro", title: "Figma for Non-Designers", host: "Eastshore Design Collective", kind: "Workshop", role: "Attended", date: "2025-11-15", time: "10:00 AM", place: "Eastshore Makerspace", photo: "photo-1586717791821-3f44a563fa4c", foundOn: [{ platform: "luma", proof: "checked-in" }], listing: "Hands-on: everyone builds a clickable prototype of one mobile screen before they leave.", skills: [es("prototyping", "Prototyping", "Practiced", "Tools")] },
  { id: "mhfa", title: "Mental Health First Aid training", host: "Eastshore County Behavioral Health", kind: "Training", role: "Attended", date: "2026-02-21", time: "9:00 AM", place: "Eastshore Library", photo: "photo-1460518451285-97b6aa326961", foundOn: [{ platform: "eventbrite", proof: "ticket" }], listing: "An 8-hour certification course: practice listening without judgment and guiding someone toward support.", skills: [es("active-listening", "Active listening", "Practiced", "Writing and communication")], outcome: "Certificate issued by the county" },
  { id: "civic-hack", title: "Civic Hack Weekend", host: "Open Eastshore", kind: "Hackathon", role: "Competed", date: "2026-03-14", time: "9:00 AM", place: "Eastshore City Hall annex", photo: "sql-sprint", foundOn: [{ platform: "luma", proof: "checked-in" }, { platform: "handshake", proof: "rsvp" }], listing: "Teams interview residents about a city service, then build and demo a working prototype in 30 hours.", skills: [es("user-interviews", "User interviews", "Demonstrated", "Research and data"), es("prototyping", "Prototyping", "Demonstrated", "Tools"), es("teamwork", "Teamwork", "Practiced", "Writing and communication")], outcome: "Team placed 2nd with a map of food pantry hours" },
  { id: "harbor-info", title: "UX Research at Harbor Health: info session", host: "Harbor Health", kind: "Info session", role: "Attended", date: "2026-04-09", time: "4:00 PM", place: "Online", photo: "photo-1522202176988-66273c2fd55f", foundOn: [{ platform: "handshake", proof: "rsvp" }], listing: "Researchers walk through a real usability study and how they hire summer interns.", skills: [es("ux-methods", "UX research methods", "Taught", "Research and data")] },
  { id: "symposium", title: "Undergraduate Research Symposium", host: "Bay Area Psychology Consortium", kind: "Conference", role: "Presented", date: "2026-05-02", time: "1:00 PM", place: "Northgate State", photo: "policy-committee", foundOn: [{ platform: "eventbrite", proof: "ticket" }], listing: "Students present posters on their own research to faculty and peers, with five minutes of questions each.", skills: [es("presenting", "Presenting research", "Demonstrated", "Writing and communication"), es("observation", "Qualitative observation", "Demonstrated", "Research and data")], outcome: "Poster: how students choose study spaces (from ANTH 2 fieldnotes)" },
  { id: "food-pack", title: "Saturday pack shift", host: "Bay Neighbors Food Network", kind: "Volunteering", role: "Volunteered", date: "2026-08-15", time: "8:30 AM", place: "Bay Neighbors warehouse", photo: "photo-1593113616828-6f22bca04804", foundOn: [{ platform: "eventbrite", proof: "ticket" }], listing: "Volunteers sort and pack grocery boxes in teams of six for 300 families.", skills: [es("teamwork", "Teamwork", "Practiced", "Writing and communication")] },
  { id: "resume-lab", title: "Resume Lab", host: "Bayview Career Center", kind: "Workshop", role: "Attended", date: "2026-10-01", time: "3:00 PM", place: "Bayview Student Center", photo: "photo-1434030216411-0b793f4b4173", foundOn: [{ platform: "handshake", proof: "checked-in" }], listing: "Bring a draft. Rewrite three bullets with a counselor so each one shows a result.", skills: [es("resume", "Resume writing", "Practiced", "Writing and communication")] },
  { id: "civic-data-up", title: "Civic Data Saturday", host: "Open Eastshore", kind: "Hackathon", role: "Attended", date: "2026-11-14", time: "9:30 AM", place: "Off campus", photo: "civic-data", foundOn: [{ platform: "luma", proof: "rsvp" }], listing: "Work in pairs on a city data set. Beginner tracks in R and SQL.", skills: [es("r", "Data analysis in R", "Practiced", "Tools")], prep: "Fills the R and SQL gaps for the policy analyst role you're looking at.", opportunityId: "civic-data" },
  { id: "survey-lab-up", title: "Write Better Questions: a survey workshop", host: "Bayview Career Center", kind: "Workshop", role: "Attended", date: "2026-11-14", time: "10:00 AM", place: "Bayview CC", photo: "survey-lab", foundOn: [{ platform: "handshake", proof: "rsvp" }], listing: "Rewrite a real survey so it doesn't lead people to an answer.", skills: [es("survey", "Survey design", "Practiced", "Research and data")], prep: "Survey design is one of the two gaps for UX researcher.", opportunityId: "survey-lab" },
  { id: "psych-symposium", title: "Psych Research Symposium", host: "Northgate Psychology Department", kind: "Conference", role: "Attended", date: "2026-11-19", time: "4:00 PM", place: "Northgate State", photo: "research-circle", foundOn: [{ platform: "handshake", proof: "rsvp" }], listing: "Faculty and students present research posters. Open to incoming transfer students.", skills: [es("networking", "Talking with researchers", "Practiced", "Writing and communication")] },
  { id: "winter-fair", title: "Winter Career Fair", host: "Northgate Career Services", kind: "Career fair", role: "Attended", date: "2026-12-03", time: "11:00 AM", place: "Northgate State", photo: "photo-1562774053-701939374585", foundOn: [{ platform: "handshake", proof: "rsvp" }], listing: "Open to transfer students. 60 employers, including summer research internships.", skills: [es("networking", "Professional networking", "Practiced", "Writing and communication")], prep: "Three employers on the list hire summer UX research interns. Bring the resume from Resume Lab." },
  { id: "diary-studies", title: "UX Research Meetup: diary studies", host: "Eastshore UX Research Group", kind: "Meetup", role: "Attended", date: "2026-12-09", time: "6:30 PM", place: "Online", photo: "photo-1586936893354-362ad6ae47ba", foundOn: [{ platform: "eventbrite", proof: "ticket" }], listing: "A researcher shares a two-week diary study, then small groups plan one.", skills: [es("ux-methods", "UX research methods", "Practiced", "Research and data")] },
];

// ---------- Manual setup, for schools without a sign-in agreement (synthetic) ----------
export type UploadKey = "transcript" | "audit" | "calendar" | "syllabus";
export type UploadRow = { id: string; label: string; detail: string; unclear?: boolean };
export type UploadSample = { key: UploadKey; title: string; action: string; school: "bayview" | "northgate"; required: boolean; why: string; file: string; feedUrl?: string; where: string; noun: string; rows: UploadRow[] };

export const UPLOAD_ORDER: UploadKey[] = ["transcript", "audit", "calendar", "syllabus"];

export const uploadSamples: Record<UploadKey, UploadSample> = {
  transcript: {
    key: "transcript", title: "Unofficial transcript", action: "Upload", school: "bayview", required: true, why: "Your classes and grades", file: "bayview_unofficial_transcript.pdf",
    where: "your Bayview student portal, under Academic records.", noun: "completed classes",
    rows: terms.filter((term) => term.school === "bayview" && term.status === "done").flatMap((term) => term.courses).map((c) => ({ id: c.code, label: `${c.code} · ${c.title}`, detail: c.grade ?? "", ...(c.code === "PHIL 2" ? { unclear: true } : {}) })),
  },
  audit: {
    key: "audit", title: "Degree audit", action: "Upload", school: "northgate", required: true, why: "Requirements you have left", file: "northgate_degree_audit.pdf",
    where: "your Northgate student portal, under Degree audit. Save it as a PDF.", noun: "requirements",
    rows: requirements.map((r) => ({ id: r.id, label: r.name, detail: r.status === "remaining" ? "Still needed" : r.status === "in_progress" ? "In progress" : "Met", ...(r.id === "maj" ? { unclear: true } : {}) })),
  },
  calendar: {
    key: "calendar", title: "Canvas calendar feed", action: "Add feed", school: "bayview", required: false, why: "Due dates for your classes", file: "Canvas calendar feed", feedUrl: "https://canvas.bayview.example/feeds/calendars/sample.ics",
    where: "Canvas, under Calendar. Copy the calendar feed link.", noun: "deadlines",
    rows: syllabi.flatMap((s) => s.items.map((i) => ({ id: `${s.course}-${i.week}`, label: `${s.course} · ${i.label}`, detail: `Week ${i.week}` }))),
  },
  syllabus: {
    key: "syllabus", title: "Class syllabus", action: "Upload", school: "bayview", required: false, why: "Skills each class teaches", file: "art_1_syllabus.pdf",
    where: "Canvas, on your class's Syllabus page.", noun: "skills",
    rows: ledgerSkills.filter((s) => s.course === "ART 1").map((s) => ({ id: s.id, label: s.name, detail: s.level, ...(s.confidence === "Low" ? { unclear: true } : {}) })),
  },
};
