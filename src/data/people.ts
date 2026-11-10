// ---------- People Maya could meet (all synthetic) ----------
// Only public, work-related facts. No photos up front, no ratings, nothing about looks.

export type Person = {
  id: string;
  name: string;
  role: string;
  /** Why this person fits her goal, and where that fact came from. */
  fit: string;
  fitSource: string;
  /** Something they have in common, from her own records. */
  shared: string;
  /** One opener she can say out loud. */
  opener: string;
};

export const people: Person[] = [
  {
    id: "reyes",
    name: "Dr. Elena Reyes",
    role: "Psychology faculty, Northgate State",
    fit: "Runs the Campus Spaces Lab, which studies where and how students study.",
    fitSource: "Symposium program, poster 14",
    shared: "Your ANTH 2 poster asked the same question.",
    opener: "I did a small fieldnote study on study spaces. How did your lab get started on it?",
  },
  {
    id: "sam",
    name: "Sam Lee",
    role: "Northgate senior · UX research intern at Harbor Health",
    fit: "Went from a psych major to a UX research internship.",
    fitSource: "Handshake profile (public)",
    shared: "Also transferred from a community college.",
    opener: "How did you find the Harbor Health internship?",
  },
  {
    id: "club",
    name: "Psych Research Club table",
    role: "Student club, Northgate State",
    fit: "Places members as research assistants in faculty labs each spring.",
    fitSource: "Club page on Northgate Clubs",
    shared: "Open to incoming transfer students.",
    opener: "Can transfer students join before their first term?",
  },
  {
    id: "priya",
    name: "Priya Shah",
    role: "UX researcher, Harbor Health · poster judge",
    fit: "Judging the poster session and hires research interns.",
    fitSource: "Symposium program, judges",
    shared: "You met at the Harbor Health info session in April.",
    opener: "We met at the Harbor Health info session. I brought the poster I mentioned.",
  },
  {
    id: "marcus",
    name: "Marcus Hill",
    role: "Grad student, Campus Spaces Lab",
    fit: "Coordinates the lab's research assistant openings.",
    fitSource: "Campus Spaces Lab page",
    shared: "Started at Bayview CC too.",
    opener: "What does a first-semester RA do in the lab?",
  },
];

export type PastNote = { personId: string; event: string; date: string; text: string; promise?: string };
/** What Maya wrote down herself after earlier events. Path Agent only recalls it. */
export const pastNotes: PastNote[] = [
  { personId: "priya", event: "Harbor Health info session", date: "2026-04-09", text: "Said diary studies are a good first research project.", promise: "Send Priya my ANTH 2 poster" },
];
