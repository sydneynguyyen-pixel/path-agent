import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { skillCourses, ledgerSkills, gapSkills } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { courseCode } from "@/lib/skills";
import { AgentAvatar, SubjectIcon, TermIcon } from "@/components/app/Brand";
import { SkillRow, ReaderCredit } from "@/components/app/SkillsBits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/course-skills")({
  validateSearch: (s: Record<string, unknown>): { course?: string; state?: string } => ({ ...(typeof s["course"] === "string" ? { course: s["course"] } : {}), ...(typeof s["state"] === "string" ? { state: s["state"] } : {}) }),
  head: () => ({ meta: [{ title: "What you'll learn — Path Agent" }, { name: "description", content: "Synthetic course skills with syllabus quotes and evidence levels." }, { property: "og:title", content: "What you'll learn — Path Agent" }, { property: "og:description", content: "Review skills read from a fictional course syllabus." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CourseSkills,
});
function CourseSkills() {
  const search = Route.useSearch(); const j = useJourney();
  const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(search.state === "error");
  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), 650); return () => clearTimeout(t); }, [search.course]);
  const code = courseCode(search.course ?? "STAT 2");
  const course = skillCourses.find(c => c.code === code);
  const rows = [...ledgerSkills, ...gapSkills].filter(s => s["course"] === code);
  if (loading) return <div className="flex flex-col items-center py-24"><AgentAvatar agent="reader" className="size-24 motion-safe:animate-bounce" /><p className="mt-4">Reading your syllabi...</p></div>;
  if (failed) return <div className="py-20 text-center"><AgentAvatar agent="reader" className="mx-auto size-20" /><h1 className="mt-4 text-xl font-semibold">I couldn't read this syllabus.</h1><Button className="mt-4" onClick={() => { setLoading(true); setTimeout(() => { setFailed(false); setLoading(false); }, 650); }}><RefreshCw className="size-4" />Retry</Button></div>;
  const fallback = { code, title: "Course details", term: "Your term", units: "See your course record", description: "Catalog description only; a full syllabus has not been provided.", tools: [] as string[], assignments: [] as string[] };
  const c = course ?? fallback;
  const lowRows = rows.length ? rows : [{ id: `thin-${code}`, name: "Course discussion", method: "Catalog description only", theme: "Writing and communication", course: code, level: "Taught" as const, confidence: "Low" as const, quote: "Catalog description only; a full syllabus has not been provided.", source: "Synthetic catalog description" }];
  return <div className="mx-auto max-w-4xl space-y-7"><Button variant="ghost" asChild><Link to="/skills"><ArrowLeft className="size-4" />My skills</Link></Button><header className="flex flex-wrap items-center gap-4"><SubjectIcon course={code} /><div><h1 className="text-2xl font-semibold">{c.code} · {c.title}</h1><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><TermIcon term={c.term} />{c.term} · {c.units}</div></div></header><ReaderCredit /><section><h2 className="font-semibold">From the course description</h2><blockquote className="surface mt-3 p-5">“{c.description}”<cite className="mt-2 block text-xs not-italic text-muted-foreground">Source: course syllabus · synthetic</cite></blockquote></section>{!course && <div className="flex items-center gap-3 rounded-2xl bg-warning-soft p-4"><AgentAvatar agent="reader" /><p className="text-sm">I only found the catalog description for this course. Check the full syllabus before confirming these.</p></div>}<section><h2 className="font-semibold">Skills</h2><div className="surface mt-3 divide-y px-5">{lowRows.filter(s => s.confidence !== "Low").map(s => <SkillRow key={s.id} skill={s} actions={false} />)}</div>{lowRows.some(s => s.confidence === "Low") && <details className="surface mt-3 p-5"><summary className="cursor-pointer font-medium">Not sure yet</summary>{lowRows.filter(s => s.confidence === "Low").map(s => <SkillRow key={s.id} skill={s} />)}</details>}</section><section><h2 className="font-semibold">Tools and software</h2><div className="mt-3 flex gap-2">{c.tools.length ? c.tools.map(t => <span key={t} className="rounded-full border bg-card px-3 py-1 text-sm">{t}</span>) : <span className="text-sm text-muted-foreground">None listed</span>}</div></section><section><h2 className="font-semibold">What you'll make</h2><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{c.assignments.length ? c.assignments.map(a => <li key={a}>{a}</li>) : <li>No assignments found in this description.</li>}</ul></section><footer className="border-t pt-5"><Button variant="outline" onClick={() => { lowRows.filter(s => s.confidence !== "Low").forEach(s => j.reviewSkill(s.id, { confirmed: true })); toast("Saved to your skills"); }}>Add all to my skills</Button><p className="mt-3 text-xs text-muted-foreground">I read this from the syllabus. Please check it.</p></footer></div>;
}