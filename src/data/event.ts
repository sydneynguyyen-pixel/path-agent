// ---------- The one scripted event: Psych Research Symposium (synthetic) ----------
import { student } from "@/data/scenario";

export const symposiumEvent = {
  /** Matches the Experiences entry so Grow and /event show the same event. */
  id: "psych-symposium",
  title: "Psych Research Symposium",
  shortName: "symposium",
  date: "2026-11-19",
  day: "Thursday",
  time: "4:00 to 6:30 PM",
  place: "Northgate State · Student Union Ballroom",
  /** Why it's worth her evening, each with where it came from. */
  why: [
    { text: "Three posters study how people use spaces and services, the same work UX researchers do.", source: "Symposium program" },
    { text: "Your Thursday is free after 3 PM.", source: "Your Fall 2026 schedule" },
  ],
  goals: [
    "Talk to one researcher about how they got started",
    "Ask about research assistant spots for spring",
    "Learn what a UX research internship looks like",
  ],
  /** People in the deck, in the order the agent suggests them. */
  deck: ["reyes", "priya", "sam", "club", "marcus"],
  /** How many Bayview students are going. Only the ones listed below chose to be seen. */
  going: 5,
  classmates: [
    { id: "ana", name: "Ana M.", note: "Bayview · Psychology", optedIn: true },
    { id: "jo", name: "Jo T.", note: "Bayview · Sociology", optedIn: true },
    { id: "hidden-1", name: "", note: "", optedIn: false },
    { id: "hidden-2", name: "", note: "", optedIn: false },
    { id: "hidden-3", name: "", note: "", optedIn: false },
  ],
  /** The course skill a real conversation at the event gives practice in. */
  skillId: "interview-basics",
  student: student.name,
};

export type Classmate = (typeof symposiumEvent.classmates)[number];
