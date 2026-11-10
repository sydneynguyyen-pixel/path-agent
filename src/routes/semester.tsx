import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { syllabi, options, terms, PILEUP_THRESHOLD } from "@/data/scenario";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { useJourney } from "@/lib/journey";
import { PageHeader, SimLabel, SourceChip } from "@/components/app/bits";
import { TermIcon, SubjectIcon } from "@/components/app/Brand";
import { SeasonBanner } from "@/components/app/SeasonBanner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CourseLearningLink } from "@/components/app/SkillsBits";
import { skillCourses } from "@/data/scenario";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
import { Requirements } from "@/components/app/Requirements";

export const Route = createFileRoute("/semester")({
  validateSearch: (search: Record<string, unknown>): { term?: string } => {
    const term = search['term'];
    return typeof term === "string" && terms.some((t) => t.id === term) ? { term } : {};
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Term view — Academic Path Agent" },
      { name: "description", content: "Week-by-week deadlines merged from three syllabi, with pile-ups highlighted." },
      { property: "og:title", content: "Term view — Academic Path Agent" },
      { property: "og:description", content: "Three syllabi merged into one calm week-by-week view." },
    ],
  }),
  component: Semester,
});

function Semester() {
  const j = useJourney();
  const search = Route.useSearch();
  const [localSel, setSel] = useState<string>();
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  const sel = localSel ?? search.term ?? "su27";
  const term = terms.find((t) => t.id === sel);
  if (!term) return null;
  const chosen = j.seatHeld ? options.find((o) => o.id === j.chosenId) : undefined;
  const rows = [
    ...syllabi.map((s) => ({ course: s.course, items: s.items, sourceId: s.sourceId, isNew: false })),
    ...(chosen ? [{ course: chosen.course.replace("BCC ", ""), items: chosen.deadlines.map((d) => ({ week: d.week, label: d.label.split(" ").slice(2).join(" ") })), sourceId: chosen.sourceIds[0]!, isNew: true }] : []),
  ];
  const tints = ["bg-lilac", "bg-sky", "bg-butter", "bg-mint"];
  const weeks = Array.from({ length: 8 }, (_, i) => i + 1);
  const load = (w: number) => rows.reduce((n, r) => n + r.items.filter((i) => i.week === w).length, 0);

  return (
    <div>
      <SeasonBanner term={term.name} />
      <PageHeader title="Your terms" sub="Where you are now, what you're registering for, and what comes next." right={<SimLabel>Synthetic data</SimLabel>} />
      {/* The padding gives shadows room inside the scroller; the negative margins keep the row in place. */}
      <div ref={containerRef} className="term-tabs relative -mx-3 -mt-3 mb-3 flex gap-2 overflow-x-auto px-3 py-3">
        <span ref={pillRef} className="sliding-pill glass glass-tinted" aria-hidden="true" />
        {terms.filter((t) => t.status !== "done").map((t) => (
          <Button variant="outline" key={t.id} aria-pressed={sel === t.id} onClick={() => setSel(t.id)} className={cn("relative z-[1] h-auto min-h-16 shrink-0 justify-start gap-3 px-5 py-3 text-left text-sm shadow-none", sel === t.id ? "border-transparent bg-transparent hover:bg-transparent" : "lift bg-card")}>
            <TermIcon term={t.name} />
            <span className="min-w-0">
              <span className="block font-medium">{t.name}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {t.status === "done" ? "Completed" : t.status === "in_progress" ? "Current term" : t.status === "registering" ? "Registering now" : "Planned"}
              </span>
            </span>
          </Button>
        ))}
      </div>
      <div key={term.id} className="swap-enter">
      {term.id !== "su27" ? (
        <div className="rounded-2xl border p-6">
          <div className="flex items-center gap-3">
            <SchoolLogo school={term.school} />
            <div>
              <div className="font-medium">{term.name} · {term.school === "bayview" ? "Bayview CC" : "Northgate State"}</div>
              <div className="text-sm text-muted-foreground">{term.status === "in_progress" ? "In progress · finals week Jun 9–13" : term.registration}</div>
            </div>
          </div>
          <ul className="mt-5 divide-y">
            {term.courses.map((c) => (
               <li key={c.code + c.title} className="flex items-center gap-3 py-2.5 text-sm"><SubjectIcon course={`${c.code} ${c.title}`} /><span className="min-w-0 flex-1"><b className="font-medium">{c.code}</b> <span className="text-muted-foreground">{c.title}</span><span className="block"><CourseLearningLink course={c.code} /></span></span><span className="text-muted-foreground">{c.grade ?? c.units}</span></li>
            ))}
          </ul>
          {term.status === "planned" && <p className="mt-4 text-xs text-muted-foreground">Planned from your degree audit. When registration opens, the agent will check seats and deadlines the same way it does for summer.</p>}
        </div>
      ) : (
      <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div><b className="font-medium">Summer 2027, week by week</b></div>
        <Link to="/portal" className="text-xs text-muted-foreground underline-offset-4 hover:underline">Registration closes Jun 18</Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <div className="grid min-w-[1080px] grid-cols-[240px_repeat(8,minmax(105px,1fr))]">
          <div className="border-b px-5 py-4 text-xs text-muted-foreground">Course</div>
          {weeks.map((w) => (
            <div key={w} className={cn("border-b border-l p-3 text-center text-xs font-medium", load(w) >= PILEUP_THRESHOLD && "bg-primary text-primary-foreground")}>
              Wk {w}
              {load(w) >= PILEUP_THRESHOLD && <div className="mt-1 flex items-center gap-1"><AlertTriangle className="size-3" /> Pile-up · {load(w)}</div>}
            </div>
          ))}
          {rows.map((r, ri) => (
            <div key={r.course} className="contents">
              <div className={cn("min-w-0 border-b px-5 py-4 text-sm font-medium", r.isNew && "bg-accent")}>
                <div className="flex items-center gap-3"><SubjectIcon course={r.course} /><span className="min-w-0">{r.course}</span></div>
                <CourseLearningLink course={r.course} />
                {r.isNew && <span className="mt-2 block text-xs font-normal text-muted-foreground">Seat held by you</span>}
                <div className="mt-3 [&_button]:whitespace-nowrap [&_button]:text-left"><SourceChip id={r.sourceId} /></div>
              </div>
              {weeks.map((w) => (
                <div key={w} className={cn("border-b border-l p-2", r.isNew && "bg-accent/50")}>
                  {r.items.filter((i) => i.week === w).map((i) => (
                    <div key={i.label} className={cn("rounded-xl px-2.5 py-2 text-xs font-medium text-foreground/80", tints[ri % 4])}>{i.label}</div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {chosen && <p className="mt-4 text-sm text-muted-foreground">{chosen.course} added because you hold a seat. The agent registered nothing.</p>}
      </>
      )}
      </div>
      {j.draftCourses.some(code => skillCourses.find(c => c.code === code)?.termId === term.id) && <section className="mt-6"><h2 className="font-semibold">Draft courses from your role plan</h2><p className="mt-1 text-xs text-muted-foreground">Saved to your plan only. You still register in your school's portal.</p><ul className="mt-3 divide-y rounded-2xl border bg-card px-5">{j.draftCourses.map(code => skillCourses.find(c => c.code === code)).filter(c => c?.termId === term.id).map(c => c && <li key={c.code} className="flex items-center gap-3 py-4"><SubjectIcon course={c.code} /><div className="min-w-0 flex-1"><span className="text-sm font-medium">{c.code} · {c.title}</span><div><CourseLearningLink course={c.code} /></div></div><span className="rounded-full bg-secondary px-3 py-1 text-xs">Draft · {c.units}</span></li>)}</ul></section>}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Degree requirements</h2>
        <Requirements />
      </section>
      <details className="mt-10 rounded-2xl border bg-card p-5">
        <summary className="cursor-pointer text-sm font-medium">Completed terms · {terms.filter((t) => t.status === "done").length}</summary>
        <div className="stagger mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {terms.filter((t) => t.status === "done").map((t) => (
            <article key={t.id} className="lift rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2"><TermIcon term={t.name} /><span className="font-medium">{t.name}</span><span className="ml-auto"><SchoolLogo school={t.school} className="size-6" /></span></div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {t.courses.map((c) => <li key={c.code + c.title} className="flex justify-between gap-2"><span className="min-w-0 truncate"><b className="font-medium">{c.code}</b> <span className="text-muted-foreground">{c.title}</span></span><span className="shrink-0 text-muted-foreground">{c.grade}</span></li>)}
              </ul>
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}
