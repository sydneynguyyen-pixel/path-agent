import type { OrgId } from "@/data/scenario";

// ---------- People Maya could meet (all synthetic) ----------
// Only public, work-related facts plus a profile photo. No ratings, nothing about looks.
// Photos are free Unsplash images standing in for these fictional people.

export type Person = {
  id: string;
  name: string;
  /** Unsplash photo ID (see src/lib/photos.ts). */
  photo: string;
  /** Where they work or study, shown as a logo beside the photo. */
  org: OrgId;
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
    org: "northgate",
    photo: "photo-1581065178047-8ee15951ede6",
    name: "Dr. Elena Reyes",
    role: "Psychology faculty, Northgate State",
    fit: "Runs the Campus Spaces Lab, which studies where and how students study.",
    fitSource: "Symposium program, poster 14",
    shared: "Your ANTH 2 poster asked the same question.",
    opener: "I did a small fieldnote study on study spaces. How did your lab get started on it?",
  },
  {
    id: "sam",
    org: "northgate",
    photo: "photo-1757744705465-ea08b0ddc38a",
    name: "Sam Lee",
    role: "Northgate senior · UX research intern at Harbor Health",
    fit: "Went from a psych major to a UX research internship.",
    fitSource: "Handshake profile (public)",
    shared: "Also transferred from a community college.",
    opener: "How did you find the Harbor Health internship?",
  },
  {
    id: "club",
    org: "northgate",
    photo: "research-circle",
    name: "Psych Research Club table",
    role: "Student club, Northgate State",
    fit: "Places members as research assistants in faculty labs each spring.",
    fitSource: "Club page on Northgate Clubs",
    shared: "Open to incoming transfer students.",
    opener: "Can transfer students join before their first term?",
  },
  {
    id: "priya",
    org: "harbor-health",
    photo: "photo-1547212371-eb5e6a4b590c",
    name: "Priya Shah",
    role: "UX researcher, Harbor Health · poster judge",
    fit: "Judging the poster session and hires research interns.",
    fitSource: "Symposium program, judges",
    shared: "You met at the Harbor Health info session in April.",
    opener: "We met at the Harbor Health info session. I brought the poster I mentioned.",
  },
  {
    id: "marcus",
    org: "northgate",
    photo: "photo-1522529599102-193c0d76b5b6",
    name: "Marcus Hill",
    role: "Grad student, Campus Spaces Lab",
    fit: "Coordinates the lab's research assistant openings.",
    fitSource: "Campus Spaces Lab page",
    shared: "Started at Bayview CC too.",
    opener: "What does a first-semester RA do in the lab?",
  },
];

export type PastNote = { personId: string; event: string; date: string; text: string; promise?: string };
/** What Maya wrote down herself after earlier events. Sprout only recalls it. */
export const pastNotes: PastNote[] = [
  { personId: "priya", event: "Harbor Health info session", date: "2026-04-09", text: "Said diary studies are a good first research project.", promise: "Send Priya my ANTH 2 poster" },
];

/** Students she met and wrote a note about. Their card shows only what they chose to share (from goTogetherEvent.visiblePeers). */
export type MetStudent = { peerId: string; event: string; date: string; text: string };
export const metStudents: MetStudent[] = [
  { peerId: "jordan", event: "Figma for Non-Designers", date: "2025-11-15", text: "Sat next to me. Showed me how to check a screen with a screen reader. Also going to UX Night." },
];

/** Students she went to an event with before, after they both said yes. */
export const pastMatches: { peerId: string; event: string }[] = [
  { peerId: "tomas", event: "Fall Career Fair" },
];

/** Other upcoming events where students who chose to be seen are going. Only people she knows are pointed out. */
export const alsoGoing: Record<string, string[]> = {
  "diary-studies": ["jordan", "kai", "sofia"],
  "civic-data": ["lena", "nia"],
  "survey-lab": ["tomas", "ana", "ethan"],
};
