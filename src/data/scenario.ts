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
    passage: "Add failed: Section full (40/40). Waitlist full (10/10).",
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
  rank: number;
  course: string;
  title: string;
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
    id: "math13",
    rank: 1,
    course: "BCC MATH 13",
    title: "Elementary Statistics · Online · 12 seats open",
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
    rank: 2,
    course: "BCC PSYC 5",
    title: "Statistics for Behavioral Sciences · In person · 4 seats",
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
    rank: 3,
    course: "BCC BUS 21",
    title: "Business Statistics · Hybrid · 20 seats",
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
    rank: 4,
    course: "BCC MATH 10",
    title: "Math for Liberal Arts · Online · 30 seats",
    verdict: "does_not_count",
    reason: "Shown so you don't lose time: it does not satisfy Statistics.",
    rule: "Articulation row 115: GE-B4 elective, not QR-1.",
    sourceIds: ["artic-math10"],
    confidence: 0.95,
    deadlines: [{ week: 5, label: "MATH 10 exam" }],
    deadlineNote: "Not recommended — does not count toward QR-1.",
  },
];

export const syllabi = [
  { course: "ENGL 1B", sourceId: "syl-engl", items: [{ week: 2, label: "Essay draft" }, { week: 4, label: "Research paper" }, { week: 7, label: "Portfolio" }] },
  { course: "BIO 12", sourceId: "syl-bio", items: [{ week: 3, label: "Lab report" }, { week: 4, label: "Midterm" }, { week: 7, label: "Lab practical" }, { week: 8, label: "Final" }] },
  { course: "HIST 18", sourceId: "syl-hist", items: [{ week: 4, label: "Response essay" }, { week: 6, label: "Midterm" }, { week: 8, label: "Final paper" }] },
];

export const PILEUP_THRESHOLD = 3;

export const agents = [
  {
    id: "reader",
    name: "Reader",
    role: "Reads records and documents",
    inputs: ["Transcript (Bayview, synthetic)", "Degree audit (Northgate)", "Articulation file 2026-27", "Northgate catalog", "3 summer syllabi", "Portal response: Section full"],
    outputs: ["Marked QR-1 Statistics as at risk", "Extracted 14 cited passages", "Converted 5 qu → 3.3 su (both policies cited)"],
  },
  {
    id: "planner",
    name: "Planner",
    role: "Checks what still counts",
    inputs: ["QR-1 requirement", "Articulation rules", "Confidence threshold 0.75"],
    outputs: ["Ranked 4 options", "Flagged BUS 21 conflict → counselor", "Flagged PSYC 5 grade condition"],
  },
  {
    id: "backup",
    name: "Backup finder",
    role: "Finds open sections and checks workload",
    inputs: ["Summer schedule (simulated)", "Merged syllabi deadlines"],
    outputs: ["Seat counts for 4 sections", "Deadline pile-up check per option"],
  },
  {
    id: "drafter",
    name: "Drafter",
    role: "Drafts the counselor email",
    inputs: ["Chosen option", "Evidence passages"],
    outputs: ["Draft email to counselor (awaiting Maya's approval)"],
  },
] as const;

export const student = {
  name: "Maya Torres",
  from: "Bayview Community College (quarter)",
  to: "Northgate State University (semester)",
  counselor: "Dr. Priya Okafor",
  counselorEmail: "p.okafor@northgate.example",
};
