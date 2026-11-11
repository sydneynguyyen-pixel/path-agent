import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ReaderCredit, SkillRow } from "@/components/app/SkillsBits";
import { electiveClasses } from "@/data/degree";
import { gapSkills, ledgerSkills, skillCourses, terms } from "@/data/scenario";
import { useDegreeAudit } from "@/hooks/use-degree-audit";
import { slotForCourse } from "@/lib/degree";
import { useJourney } from "@/lib/journey";

/** What the syllabus or catalog says about a class, wherever it's shown. */
function aboutClass(code: string) {
  const course = skillCourses.find((c) => c.code === code);
  if (course) return course;
  const elective = electiveClasses.find((e) => e.code === code);
  for (const t of terms) {
    const c = t.courses.find((x) => x.code === code);
    if (c) return { code, title: c.title, term: t.name, units: c.units, description: elective?.about ?? "", tools: [] as string[], assignments: [] as string[] };
  }
  return { code, title: elective?.title ?? "", term: "", units: "", description: elective?.about ?? "", tools: [] as string[], assignments: [] as string[] };
}

/** One class details panel, opened from Degree, Terms, Map, Explore and Portfolio. */
export function ClassDetails() {
  const j = useJourney();
  const { audit } = useDegreeAudit();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const code = j.classDetails;
  const c = code ? aboutClass(code) : null;
  const skills = code ? [...ledgerSkills, ...gapSkills].filter((s) => s.course === code && s.confidence !== "Low") : [];
  const place = code ? slotForCourse(audit, code) : undefined;
  const close = () => j.openClass(null);

  return (
    <Sheet open={!!c} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="brand-app z-[60] overflow-y-auto sm:max-w-md">
        {c && (
          <>
            <SheetHeader>
              <SheetDescription>{[c.term, c.units].filter(Boolean).join(" · ")}</SheetDescription>
              <SheetTitle>{c.code}{c.title ? ` · ${c.title}` : ""}</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-8">
              {place && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm">
                  <span>Counts toward <b className="font-medium">{place.need}</b></span>
                  {path !== "/degree" && <Link to="/degree" search={{ row: place.row, slot: place.slot }} {...(path === "/map" ? { state: { backTo: "map" as const } } : {})} onClick={close} className="inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline">See in Degree <ArrowRight className="size-3" aria-hidden="true" /></Link>}
                </div>
              )}
              {c.description
                ? <blockquote className="rounded-2xl border bg-card p-4 text-sm leading-relaxed">“{c.description}”</blockquote>
                : <p className="text-sm text-muted-foreground">No syllabus for this class yet.</p>}
              {skills.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium">What you'll learn</h3>
                  <div className="divide-y">{skills.map((s) => <SkillRow key={s.id} skill={s} actions={false} />)}</div>
                </section>
              )}
              {c.tools.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium">Tools</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">{c.tools.map((t) => <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs">{t}</span>)}</div>
                </section>
              )}
              {c.assignments.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium">What you'll make</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">{c.assignments.map((a) => <li key={a}>{a}</li>)}</ul>
                </section>
              )}
              {skills.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <ReaderCredit />
                  <Button variant="outline" size="sm" onClick={() => { skills.forEach((s) => j.reviewSkill(s.id, { confirmed: true })); toast("Saved to your skills"); }}>Add all to my skills</Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
