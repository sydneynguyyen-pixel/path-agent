// The shape of a degree: fixed for a major, so it only fills in as a student progresses. Fully synthetic.

export type TreeRowId = "major" | "statistics" | "ge" | "ux";

export type DegreeSlot = {
  id: string;
  /** What this slot asks for. Never changes. */
  need: string;
  /** What to take, shown while no class is picked. */
  hint?: string;
  /** Where the class sits in the student's plan: a term id, plus its course code or title. */
  term?: string;
  course?: string;
  upper?: boolean;
  /** Row on the graduation tree. Leave out to keep a slot off the tree. */
  row?: TreeRowId;
  source?: "earlier" | "statistics";
};

export type DegreeCategory = { id: string; name: string; about: string; needed: number; color: string; slots: DegreeSlot[] };
export type DegreeRule = { id: string; name: string; about: string; needed: number; measure: "northgate" | "upper" };
export type DegreeTemplate = { id: string; degree: string; school: string; totalNeeded: number; categories: DegreeCategory[]; rules: DegreeRule[] };

/** Credit from AP exams and earlier college, on the transcript but not tied to a Bayview term. */
export const earlierCredit = { label: "AP and earlier college", units: 11.27 };

export const psychologyDegree: DegreeTemplate = {
  id: "psychology-ba",
  degree: "B.A. Psychology",
  school: "Northgate State",
  totalNeeded: 120,
  categories: [
    {
      id: "major-prep", name: "Major preparation", about: "Psychology foundations", needed: 18, color: "var(--map-internship)",
      slots: [
        { id: "intro", need: "Intro to psychology", term: "f25", course: "PSYC 1", row: "major" },
        { id: "methods", need: "Research methods", term: "s26", course: "PSYC 2", row: "major" },
        { id: "development", need: "Developmental psychology", term: "w27", course: "PSYC 14", row: "major" },
        { id: "lower-elective", need: "Psychology elective", term: "sp27", course: "PSYC 33", row: "major" },
        { id: "foundations", need: "Foundations of psychology", term: "fa27", course: "PSYC 100", row: "major" },
        { id: "design", need: "Research design", term: "fa27", course: "PSYC 110", row: "major" },
      ],
    },
    {
      id: "major-upper", name: "Major upper division", about: "Advanced psychology and capstone", needed: 15, color: "var(--map-internship)",
      slots: [
        { id: "cognitive", need: "Cognitive psychology", term: "sp28", course: "PSYC 301", upper: true, row: "major" },
        { id: "social", need: "Social psychology", term: "sp28", course: "PSYC 320", upper: true, row: "major" },
        { id: "abnormal", need: "Abnormal psychology", term: "fa28", course: "PSYC 350", upper: true, row: "major" },
        { id: "lab", need: "Lab seminar", term: "fa28", course: "PSYC 390", upper: true, row: "major" },
        { id: "capstone", need: "Capstone", term: "sp29", course: "PSYC 495", upper: true, row: "major" },
      ],
    },
    {
      id: "statistics", name: "Statistics", about: "One approved statistics class", needed: 3, color: "var(--map-fair)",
      slots: [{ id: "qr1", need: "Statistics", hint: "Any class approved for QR-1", term: "su27", source: "statistics", row: "statistics" }],
    },
    {
      id: "general-ed", name: "General ed", about: "Writing, science, arts and society", needed: 45, color: "var(--map-club)",
      slots: [
        { id: "writing", need: "Written communication", term: "f25", course: "ENGL 1A", row: "ge" },
        { id: "critical", need: "Critical thinking", term: "su27", course: "ENGL 1B", row: "ge" },
        { id: "speaking", need: "Oral communication", term: "w26", course: "COMM 1", row: "ge" },
        { id: "math", need: "Mathematics", term: "f25", course: "MATH 1A", row: "statistics" },
        { id: "lab-science", need: "Lab science", term: "w26", course: "BIO 10", row: "ge" },
        { id: "life-science", need: "Life science", term: "su27", course: "BIO 12", row: "ge" },
        { id: "arts", need: "Arts", term: "f26", course: "ART 1", row: "ge" },
        { id: "humanities", need: "Humanities", term: "sp27", course: "HIST 17", row: "ge" },
        { id: "ethics", need: "Ethics", term: "s26", course: "PHIL 2", row: "ge" },
        { id: "world-history", need: "World history", term: "su27", course: "HIST 18", row: "ge" },
        { id: "society", need: "Society", term: "w26", course: "SOC 1", row: "ge" },
        { id: "economics", need: "Economics", term: "w27", course: "ECON 1", row: "ge" },
        { id: "social-science", need: "Social science", hint: "Any approved social science GE", term: "fa27", course: "GE-D", row: "ge" },
        { id: "upper-ge", need: "Upper-division GE", hint: "Any approved upper-division GE", term: "sp28", course: "UD-GE", upper: true, row: "ge" },
      ],
    },
    {
      id: "electives", name: "Electives", about: "Your minor and anything you choose", needed: 39, color: "var(--map-event)",
      slots: [
        { id: "earlier", need: "Earlier credit", source: "earlier" },
        { id: "anthropology", need: "Elective", term: "f26", course: "ANTH 2", row: "ux" },
        { id: "open-fa27", need: "Elective", hint: "Any class", term: "fa27", course: "Open elective" },
        { id: "open-sp28", need: "Elective", hint: "Any class", term: "sp28", course: "Open elective" },
        { id: "minor-fa28", need: "Minor course", hint: "Courses for your minor", term: "fa28", course: "Minor course", upper: true, row: "ux" },
        { id: "open-fa28", need: "Elective", hint: "Any class", term: "fa28", course: "Open elective" },
        { id: "minor-sp29", need: "Minor course", hint: "Courses for your minor", term: "sp29", course: "Minor course", upper: true, row: "ux" },
        { id: "open-sp29", need: "Elective", hint: "Any class", term: "sp29", course: "Open elective" },
      ],
    },
  ],
  rules: [
    { id: "residency", name: "Credits at Northgate", about: "Taken at Northgate, not transferred", needed: 30, measure: "northgate" },
    { id: "upper-division", name: "Upper-division credits", about: "Classes numbered 300 and above", needed: 30, measure: "upper" },
  ],
};

/** Classes that can fill open elective slots, in the order the slots fill. */
export const electiveClasses = [
  { id: "dsgn20", code: "DSGN 20", title: "Human-Centered Design", about: "Fills your usability testing gap.", slot: "open-fa27" },
  { id: "psyc41", code: "PSYC 41", title: "Research Methods", about: "Practice with surveys and experiments.", slot: "open-sp28" },
] as const;

export const treeRows: { id: TreeRowId; name: string; color: string }[] = [
  { id: "major", name: "Psychology major", color: "var(--map-internship)" },
  { id: "statistics", name: "Statistics", color: "var(--map-fair)" },
  { id: "ge", name: "General ed", color: "var(--map-club)" },
  { id: "ux", name: "Toward UX research", color: "var(--map-event)" },
];

export type TreeColumnId = "done" | "sp27" | "su27" | "fa27" | "later" | "grad";
export const treeColumns: { id: TreeColumnId; label: string; sub: string }[] = [
  { id: "done", label: "Done", sub: "Bayview" },
  { id: "sp27", label: "Now", sub: "Spring 27" },
  { id: "su27", label: "Summer 27", sub: "Bayview" },
  { id: "fa27", label: "Fall 27", sub: "Northgate" },
  { id: "later", label: "2028 to 2029", sub: "Northgate" },
  { id: "grad", label: "Graduate", sub: "Spring 29" },
];
