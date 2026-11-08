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
  "audit-stats": {
    id: "audit-stats",
    doc: "Northgate Degree Audit — M. Torres (synthetic)",
    school: "Northgate State University",
    section: "Req. QR-1 Statistics",
    passage:
      "QR-1 Statistics: one course in introductory statistics, minimum 3.0 semester units. Planned: BCC STAT 2 (Summer 2027).",
  },
  "audit-engl": {
    id: "audit-engl",
    doc: "Northgate Degree Audit — M. Torres (synthetic)",
    school: "Northgate State University",
    section: "Req. WC-1 Written Communication",
    passage: "WC-1 satisfied by BCC ENGL 1A (grade A-, 5 qu = 3.3 su).",
  },
  "artic-math1a": {
    id: "artic-math1a",
    doc: "Bayview ↔ Northgate Articulation File (2026-27)",
    school: "Bayview ↔ Northgate",
    section: "Row 112",
    passage: "BCC MATH 1A Calculus I (5 qu) → NSU MATH 150 Calculus I (3.3 su). Status: Articulated.",
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
    passage: "Dr. Priya Okafor confirmed the course satisfies QR-1 Statistics for M. Torres. Recorded in the decision log.",
  },
  "bcc-drop": {
    id: "bcc-drop",
    doc: "Bayview CC Academic Policy Manual 2026",
    school: "Bayview Community College",
    section: "§6.1 Dropping a Course",
    passage:
      "Summer students may drop a course without a W notation through the end of the second week of the term (July 2, 2027 for Summer 2027). Drops are made by the student in the registration portal.",
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
    passage: "BCC MATH 13 Elementary Statistics (5 qu) → NSU STAT 101 (3.3 su). Satisfies QR-1. Status: Articulated.",
  },
  "artic-psyc5": {
    id: "artic-psyc5",
    doc: "Bayview ↔ Northgate Articulation File (2026-27)",
    school: "Bayview ↔ Northgate",
    section: "Row 203",
    passage:
      "BCC PSYC 5 Statistics for Behavioral Sciences (5 qu) → NSU STAT 101. Satisfies QR-1 only with a grade of C or better; C- or lower transfers as elective credit.",
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
    passage: "BCC BUS 21 Business Statistics (4 qu) → NSU elective credit (2.7 su). No QR-1 equivalency.",
  },
  "artic-math10": {
    id: "artic-math10",
    doc: "Bayview ↔ Northgate Articulation File (2026-27)",
    school: "Bayview ↔ Northgate",
    section: "Row 115",
    passage: "BCC MATH 10 Math for Liberal Arts (5 qu) → NSU GE-B4 elective. Does not satisfy QR-1.",
  },
  "syl-engl": {
    id: "syl-engl",
    doc: "ENGL 1B Syllabus, Summer 2027",
    school: "Bayview Community College",
    section: "Schedule",
    passage: "Wk 2 essay draft · Wk 4 research paper · Wk 7 portfolio due.",
  },
  "syl-bio": {
    id: "syl-bio",
    doc: "BIO 12 Syllabus, Summer 2027",
    school: "Bayview Community College",
    section: "Schedule",
    passage: "Wk 3 lab report · Wk 4 midterm · Wk 7 lab practical · Wk 8 final.",
  },
  "syl-hist": {
    id: "syl-hist",
    doc: "HIST 18 Syllabus, Summer 2027",
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
  { id: "wc1", code: "WC-1", name: "Written Communication", status: "done", detail: "BCC ENGL 1A · A-", units: "3.3 su", sourceId: "audit-engl", confidence: 0.97 },
  { id: "math", code: "MATH-150", name: "Calculus I", status: "transfer", detail: "BCC MATH 1A → NSU MATH 150", units: "3.3 su", sourceId: "artic-math1a", confidence: 0.95 },
  { id: "lab", code: "GE-B2/B3", name: "Lab Science", status: "transfer", detail: "BCC BIO 10 + 10L", units: "4.0 su", sourceId: "artic-bio", confidence: 0.93 },
  { id: "hum", code: "GE-C2", name: "Humanities", status: "in_progress", detail: "BCC HIST 17 · Spring 2027", units: "3.3 su", sourceId: "audit-hum", confidence: 0.88 },
  { id: "qr1", code: "QR-1", name: "Statistics", status: "remaining", detail: "Planned: BCC STAT 2 · Summer 2027", units: "3.0 su min", sourceId: "audit-stats", confidence: 0.9 },
  { id: "maj", code: "MAJ-PREP", name: "Psychology major preparation", status: "remaining", detail: "PSYC 100, PSYC 110 at Northgate", units: "6.0 su", sourceId: "audit-major", confidence: 0.86 },
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
      articulation: { reading: "Elective credit only (2.7 su), not QR-1.", sourceId: "artic-bus21" },
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
export const DROP_DEADLINE = "July 2, 2027";
export const REQUIREMENT_LABEL = "QR-1 Statistics";

/** Synthetic Bayview policy allows one waitlist spot on a full section while enrolled in an alternate. */
export const waitlist = { allowed: true, course: "STAT 2-01", spots: "4 of 10 spots left", sourceId: "bcc-waitlist" };

export const syllabi = [
  { course: "ENGL 1B", sourceId: "syl-engl", items: [{ week: 2, label: "Essay draft" }, { week: 4, label: "Research paper" }, { week: 7, label: "Portfolio" }] },
  { course: "BIO 12", sourceId: "syl-bio", items: [{ week: 3, label: "Lab report" }, { week: 4, label: "Midterm" }, { week: 7, label: "Lab practical" }, { week: 8, label: "Final" }] },
  { course: "HIST 18", sourceId: "syl-hist", items: [{ week: 4, label: "Response essay" }, { week: 6, label: "Midterm" }, { week: 8, label: "Final paper" }] },
];

export const PILEUP_THRESHOLD = 3;

export const agents = [
  {
    id: "reader",
    why: "Every later claim must point to a passage, so it extracts before anyone reasons.",
    name: "Reader",
    role: "Reads records and documents",
    inputs: ["Transcript (Bayview, synthetic)", "Degree audit (Northgate)", "Articulation file 2026-27", "Northgate catalog", "3 summer syllabi", "Portal response: Section full"],
    outputs: ["Marked QR-1 Statistics as at risk", "Extracted 14 cited passages", "Converted 5 qu → 3.3 su (both policies cited)"],
  },
  {
    id: "planner",
    why: "Seats vanish in minutes, so it sorts by open seats first and only then by fit; anything uncertain is routed, not guessed.",
    name: "Planner",
    role: "Checks what still counts",
    inputs: ["QR-1 requirement", "Articulation rules", "Confidence threshold 0.75"],
    outputs: ["Ranked 5 options by open seats, then fit", "MATH 13 → Do this now (no email)", "PSYC 5, BUS 21 → Hold seat, confirm in parallel"],
  },
  {
    id: "backup",
    why: "A course that counts but collides with three deadlines in one week is a worse plan, so it checks workload.",
    name: "Backup finder",
    role: "Finds open sections and checks workload",
    inputs: ["Summer schedule (simulated)", "Merged syllabi deadlines"],
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
  counselor: "Dr. Priya Okafor",
  counselorEmail: "p.okafor@northgate.example",
};

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
    { code: "ENGL 1A", title: "Composition", units: "5 qu", grade: "A-" },
    { code: "MATH 1A", title: "Calculus I", units: "5 qu", grade: "B+" },
    { code: "PSYC 1", title: "General Psychology", units: "5 qu", grade: "A" },
  ] },
  { id: "w26", name: "Winter 2026", school: "bayview", system: "quarter", status: "done", courses: [
    { code: "BIO 10", title: "Biology + Lab", units: "6 qu", grade: "B" },
    { code: "COMM 1", title: "Public Speaking", units: "4 qu", grade: "A" },
    { code: "SOC 1", title: "Intro Sociology", units: "5 qu", grade: "A-" },
  ] },
  { id: "s26", name: "Spring 2026", school: "bayview", system: "quarter", status: "done", courses: [
    { code: "PHIL 2", title: "Ethics", units: "5 qu", grade: "B+" },
    { code: "PSYC 2", title: "Research Methods", units: "5 qu", grade: "A-" },
  ] },
  { id: "f26", name: "Fall 2026", school: "bayview", system: "quarter", status: "done", courses: [
    { code: "ANTH 2", title: "Cultural Anthropology", units: "5 qu", grade: "A" },
    { code: "ART 1", title: "Art History", units: "4 qu", grade: "B+" },
  ] },
  { id: "w27", name: "Winter 2027", school: "bayview", system: "quarter", status: "done", courses: [
    { code: "PSYC 14", title: "Developmental Psych", units: "5 qu", grade: "A" },
    { code: "ECON 1", title: "Macroeconomics", units: "5 qu", grade: "B" },
  ] },
  { id: "sp27", name: "Spring 2027", school: "bayview", system: "quarter", status: "in_progress", courses: [
    { code: "HIST 17", title: "U.S. History", units: "5 qu" },
    { code: "PSYC 33", title: "Personal Growth", units: "3 qu" },
  ] },
  { id: "su27", name: "Summer 2027", school: "bayview", system: "quarter", status: "registering", registration: "Open now · closes Jun 18", courses: [
    { code: "ENGL 1B", title: "Critical Thinking & Writing", units: "5 qu" },
    { code: "BIO 12", title: "Human Biology", units: "5 qu" },
    { code: "HIST 18", title: "Modern World History", units: "5 qu" },
    { code: "STAT 2", title: "Statistics (QR-1)", units: "5 qu", flag: "qr1" },
  ] },
  { id: "fa27", name: "Fall 2027", school: "northgate", system: "semester", status: "planned", registration: "Transfer orientation Jul 20 · registers Jul 22", courses: [
    { code: "PSYC 100", title: "Foundations of Psychology", units: "3 su" },
    { code: "PSYC 110", title: "Research Design", units: "3 su" },
    { code: "GE-D", title: "Social Science GE", units: "3 su" },
    { code: "Elective", title: "Open elective", units: "3 su" },
  ] },
  { id: "sp28", name: "Spring 2028", school: "northgate", system: "semester", status: "planned", registration: "Registers Nov 2027", courses: [
    { code: "PSYC 301", title: "Cognitive Psychology", units: "3 su" },
    { code: "PSYC 320", title: "Social Psychology", units: "3 su" },
    { code: "UD-GE", title: "Upper-division GE", units: "3 su" },
    { code: "Elective", title: "Open elective", units: "3 su" },
  ] },
  { id: "fa28", name: "Fall 2028", school: "northgate", system: "semester", status: "planned", registration: "Registers Apr 2028", courses: [
    { code: "PSYC 350", title: "Abnormal Psychology", units: "3 su" },
    { code: "PSYC 390", title: "Lab Seminar", units: "3 su" },
    { code: "Elective", title: "Minor course", units: "6 su" },
  ] },
  { id: "sp29", name: "Spring 2029", school: "northgate", system: "semester", status: "planned", registration: "Registers Nov 2028", courses: [
    { code: "PSYC 495", title: "Capstone", units: "3 su" },
    { code: "Elective", title: "Minor course", units: "6 su" },
    { code: "Elective", title: "Open elective", units: "3 su" },
  ] },
];

export const progress = { earned: 50.6, inProgress: 5.3, needed: 120, gradTerm: "Spring 2029" };

export const schools = {
  bayview: { name: "Bayview Community College", short: "Bayview CC", system: "Quarter system", role: "Current school" },
  northgate: { name: "Northgate State University", short: "Northgate State", system: "Semester system", role: "Transfer school · admitted Fall 2027" },
} as const;

// Skills ledger: fictional syllabus passages and role examples, not credentials.
export type EvidenceLevel = "Taught" | "Practiced" | "Demonstrated";
export type SkillConfidence = "High" | "Medium" | "Low";
export type Skill = { id: string; name: string; method: string; theme: string; course: string; level: EvidenceLevel; confidence: SkillConfidence; quote: string; source: string; work?: string };
export type SkillCourse = { code: string; title: string; term: string; termId: string; units: string; school: string; description: string; tools: string[]; assignments: string[]; thin?: boolean };
export const skillCourses: SkillCourse[] = [
  { code: "STAT 2", title: "Statistics", term: "Summer 2027", termId: "su27", units: "5 qu", school: "Bayview CC", description: "An introduction to statistical reasoning, data summaries and inference.", tools: ["Excel", "R"], assignments: ["Planned: data summary worksheet", "Planned: visualization exercise"] },
  { code: "PSYC 33", title: "Personal Growth", term: "Spring 2027", termId: "sp27", units: "3 qu", school: "Bayview CC", description: "Explore personal development through reflection and communication.", tools: [], assignments: ["Reflection journal", "Interview practice"] },
  { code: "HIST 17", title: "U.S. History", term: "Spring 2027", termId: "sp27", units: "5 qu", school: "Bayview CC", description: "Study U.S. history through primary sources and research writing.", tools: [], assignments: ["Primary-source analysis", "10-page research paper"] },
  { code: "ANTH 2", title: "Cultural Anthropology", term: "Fall 2026", termId: "f26", units: "5 qu · grade A", school: "Bayview CC", description: "Explore culture through observation, interviewing and ethnographic methods.", tools: [], assignments: ["Ethnography fieldnotes (synthetic attachment)", "Cultural analysis essay"] },
  { code: "ART 1", title: "Art History", term: "Fall 2026", termId: "f26", units: "4 qu · grade B+", school: "Bayview CC", description: "Interpret works of art through visual analysis and historical context.", tools: [], assignments: ["Visual analysis essay", "Written critique", "Class discussion (thin description)"] },
  { code: "ENGL 1B", title: "Critical Thinking", term: "Summer 2027", termId: "su27", units: "5 qu", school: "Bayview CC", description: "Study arguments and develop evidence-based persuasive writing.", tools: [], assignments: ["Planned: argument analysis", "Planned: persuasive essay"] },
  { code: "PSYC 41", title: "Research Methods", term: "Fall 2027", termId: "fa27", units: "3 su", school: "Northgate State", description: "Design surveys and experiments to investigate research questions.", tools: [], assignments: ["Planned: survey proposal", "Planned: experiment design"] },
  { code: "DSGN 20", title: "Intro to Human-Centered Design", term: "Fall 2027", termId: "fa27", units: "3 su", school: "Northgate State", description: "Explore human-centered design through prototypes and usability studies.", tools: [], assignments: ["Planned: paper prototype", "Planned: usability study plan"] },
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
