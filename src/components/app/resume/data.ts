import { useMemo } from "react";
import { opportunities, progress, schools, setupDirectory, terms } from "@/data/scenario";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { kindLabel } from "@/lib/activities";
import { attendance, wentTo, type Found } from "@/lib/experiences";
import { bulletsFromEvent, bulletsFromWords, experiencePhrase, KIND_LABEL, type ResumeDoc } from "@/lib/resume";
import { TOOLS } from "@/components/app/PathCard";

export const MAJOR = setupDirectory.major[0]!.name.replace(/ B\.[AS]\.$/, "");
export const DEGREE_SHORT = setupDirectory.major[0]!.name.match(/B\.[AS]\./)?.[0] ?? "";

/** Where an experience entry sits on the page. Things she did and events where she took part go under Experience. */
export type EntrySection = "experience" | "training" | "projects";

/** One thing she did or went to, with suggested bullets from her own words or the event's record. */
export type ResumeEntry = {
  id: string;
  section: EntrySection;
  role: string;
  org: string;
  when: string;
  /** For sorting, newest first. Empty sorts first (her own things carry free-text dates). */
  date: string;
  suggested: string[];
  /** Where the suggestion came from, for the form. */
  source: string;
  selfReported: boolean;
  /** One plain sentence for the cover letter template ("I competed in Civic Hack Weekend"). */
  phrase: string;
};

const DID: Record<string, (title: string, host: string) => string> = {
  Volunteered: (_t, h) => `I volunteered with ${h}`,
  Competed: (t) => `I competed in ${t}`,
  Presented: (t) => `I presented at ${t}`,
};

const ROLE: Record<string, (kind: string) => string> = {
  Volunteered: () => "Volunteer",
  Competed: (k) => `${k} participant`,
  Presented: () => "Presenter",
};

const month = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });

/** Her activities and the events she really went to. Never events she only saved. */
export function useResumeEntries(found: Found[]): ResumeEntry[] {
  const j = useJourney();
  return useMemo(() => {
    const own: ResumeEntry[] = j.activities.map((a) => ({
      id: a.id,
      section: a.kind === "project" ? "projects" : "experience",
      role: a.role || a.title,
      org: a.role ? a.title : a.kind === "other" || a.kind === "caring" ? "" : kindLabel(a.kind),
      when: a.when,
      date: "",
      suggested: bulletsFromWords(a.did),
      source: "Added by you",
      selfReported: true,
      phrase: experiencePhrase(a),
    }));
    const went = found.filter((e) => wentTo(attendance(e, SCRIPT_TODAY, j.eventChecks)));
    const events: ResumeEntry[] = went.map((e) => {
      const took = ROLE[e.role];
      return {
        id: `event-${e.id}`,
        section: took ? "experience" : "training",
        role: took ? took(e.kind) : e.title,
        org: took ? `${e.title}, ${e.host}` : e.host,
        when: month(e.date),
        date: e.date,
        suggested: took ? bulletsFromEvent(e) : bulletsFromEvent(e).slice(0, 1),
        source: "From the event's record",
        selfReported: false,
        phrase: DID[e.role]?.(e.title, e.host) ?? `I went to ${e.title}`,
      };
    });
    const titles = new Set(went.map((e) => e.title.toLowerCase()));
    const listings: ResumeEntry[] = opportunities
      .filter((o) => j.wentTo[o.id] && !titles.has(o.title.toLowerCase()))
      .map((o) => ({ id: `listing-${o.id}`, section: "training", role: o.title, org: o.host, when: "", date: "", suggested: [], source: "You said you went", selfReported: true, phrase: `I went to ${o.title}` }));
    const byDate = (a: ResumeEntry, b: ResumeEntry) => (a.date && b.date ? b.date.localeCompare(a.date) : a.date ? 1 : b.date ? -1 : 0);
    return [...own, ...events, ...listings].sort(byDate);
  }, [j.activities, j.eventChecks, j.wentTo, found]);
}

/** Courses from her transcript: finished and in progress, at her current school. */
export const transcriptCourses = terms
  .filter((t) => t.school === "bayview" && (t.status === "done" || t.status === "in_progress"))
  .flatMap((t) => t.courses.map((c) => ({ code: c.code, title: c.title, term: t.name, inProgress: t.status === "in_progress" })));

/** Suggested coursework line: courses close to her major and the careers she's looking at. She can change it. */
export const suggestedCourses = transcriptCourses.filter((c) => /^(PSYC|SOC|ANTH|COMM|ART|STAT)\b/.test(c.code)).map((c) => c.code);

const bayviewTerms = terms.filter((t) => t.school === "bayview");

export function educationFor(courseCodes: string[]) {
  const picked = transcriptCourses.filter((c) => courseCodes.includes(c.code));
  return [
    { id: "edu-northgate", school: schools.northgate.name, degree: `${DEGREE_SHORT ? `${DEGREE_SHORT}, ` : ""}${MAJOR} · planned transfer, ${terms.find((t) => t.school === "northgate")?.name ?? "Fall 2027"}`, when: `Expected ${progress.gradTerm}`, detail: "" },
    {
      id: "edu-bayview",
      school: schools.bayview.name,
      degree: `Transfer coursework toward ${MAJOR}`,
      when: `${bayviewTerms[0]?.name ?? ""} – ${bayviewTerms.at(-1)?.name ?? ""}`,
      detail: picked.length ? `Relevant coursework: ${picked.map((c) => `${c.title}${c.inProgress ? " (in progress)" : ""}`).join(", ")}` : "",
    },
  ];
}

/** The form section a page block opens. */
export const fieldId = (block: string) => `rs-f-${block.replace(/[^a-z0-9-]/gi, "-")}`;

/** Tools she uses now (Figma from a workshop, ones she added). Ones she's still learning stay off. */
export const RESUME_TOOLS = TOOLS.filter((t) => !("later" in t && t.later));

export const shortDate = (d: string) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
/** "Resume", "Resume v2", "Cover letter". */
export const docName = (d: ResumeDoc | undefined) => {
  if (!d) return "";
  const v = d.title.match(/\((v\d+)\)$/)?.[1];
  return `${KIND_LABEL[d.kind]}${v ? ` ${v}` : ""}`;
};
