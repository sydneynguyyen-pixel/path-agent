/** The setup tour: five short slides, each a looping script for a miniature of the app. */

export type TourBeat = {
  /** How long this beat lasts. */
  ms: number;
  /** `data-cursor` name of the element the pointer moves to. Omit to leave it at rest. */
  cursor?: string;
  /** Whether the pointer clicks on arrival. A scene shows the result from this beat on. */
  click?: boolean;
};

export type TourSlide = {
  id: "home" | "terms" | "register" | "choose" | "explore";
  agent: "reader" | "planner" | "backup";
  title: string;
  body: string;
  beats: TourBeat[];
};

export const tourSlides: TourSlide[] = [
  {
    id: "home",
    agent: "planner",
    title: "See your whole path",
    body: "Home shows how close you are to transferring, and the one thing that needs you today.",
    beats: [{ ms: 800 }, { ms: 1100 }, { ms: 1000, cursor: "go" }, { ms: 1800, cursor: "go", click: true }],
  },
  {
    id: "terms",
    agent: "planner",
    title: "Plan term by term",
    body: "Open any term to see its classes and exactly what each one counts toward.",
    beats: [{ ms: 700 }, { ms: 1000, cursor: "summer" }, { ms: 900, cursor: "summer", click: true }, { ms: 1000, cursor: "stat" }, { ms: 2200, cursor: "stat", click: true }],
  },
  {
    id: "register",
    agent: "backup",
    title: "Register like you always do",
    body: "You sign up in your school's own portal. If a class is full, Sprout steps in with backups.",
    beats: [{ ms: 700 }, { ms: 1000, cursor: "add" }, { ms: 1000, cursor: "add", click: true }, { ms: 1200, cursor: "add" }, { ms: 900, cursor: "see" }, { ms: 1600, cursor: "see", click: true }],
  },
  {
    id: "choose",
    agent: "backup",
    title: "You make every call",
    body: "Pick a backup and add it yourself. If a class needs a counselor's OK, I can draft a note, and sending it is up to you.",
    beats: [{ ms: 700 }, { ms: 1000, cursor: "pick" }, { ms: 1200, cursor: "pick", click: true }, { ms: 1000, cursor: "add" }, { ms: 2200, cursor: "add", click: true }],
  },
  {
    id: "explore",
    agent: "planner",
    title: "See what else fits",
    body: "Your classes become skills. I show the clubs, internships and events that fill what's missing.",
    beats: [{ ms: 800 }, { ms: 1100, cursor: "show" }, { ms: 1000, cursor: "show", click: true }, { ms: 1200, cursor: "hi" }, { ms: 2800, cursor: "hi", click: true }],
  },
];

/** The beat after this one, looping back to the start. */
export function nextBeat(beat: number, count: number) {
  return beat + 1 < count ? beat + 1 : 0;
}
