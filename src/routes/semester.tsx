import { createFileRoute } from "@tanstack/react-router";
import { PostingLink } from "@/components/app/PostingLink";
import { AlertTriangle, Check, X } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { syllabi, options, terms, SUMMER_2027_START } from "@/data/scenario";
import { OrgLogo, SchoolLogo } from "@/components/app/SchoolLogo";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { currentWeek, firstWeekToShow, isPileup, pileupLine, shortDate, weekDates } from "@/lib/weeks";
import { canConfirm, confirmLabel, degreeLine, doneLabel, planTermId } from "@/lib/opportunities";
import { useConfirmWent } from "@/components/app/PlanActions";
import { PageHeader, SourceChip } from "@/components/app/bits";
import { TermIcon, SubjectIcon } from "@/components/app/Brand";
import { PageBanner } from "@/components/app/SeasonBanner";
import sceneTerms from "@/assets/scene-terms.jpg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CourseLink } from "@/components/app/SkillsBits";
import { opportunities, skillCourses } from "@/data/scenario";
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
      { title: "Terms — Path Agent" },
      { name: "description", content: "Every term from now until you graduate." },
      { property: "og:title", content: "Terms — Path Agent" },
      { property: "og:description", content: "Every term from now until you graduate." },
    ],
  }),
  component: Semester,
});

function OutsideClass({ termId }: { termId: string }) {
  const j = useJourney();
  const confirm = useConfirmWent();
  const items = opportunities.filter((o) => j.savedOpportunities.includes(o.id) && planTermId(o, terms, SCRIPT_TODAY) === termId).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  if (items.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="font-semibold">Also on your plan</h2>
      <ul className="surface mt-3 divide-y px-5">
        {items.map((o) => {
          const done = !!j.wentTo[o.id];
          return (
            <li key={o.id} className="flex flex-wrap items-center gap-3 py-4">
              <OrgLogo org={o.org} club={o.club} className="size-9" />
              <div className="min-w-0 flex-1 basis-48">
                <div className="text-sm font-medium">{o.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{o.when} · {degreeLine(o)}</div>
                <PostingLink item={o} className="mt-1" />
              </div>
              <div className="flex items-center gap-1">
                {done ? <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs"><Check className="size-3" aria-hidden="true" />{doneLabel(o)}</span>
                  <Button size="sm" variant="ghost" onClick={() => j.undoWent(o.id)}>Undo</Button>
                </> : <>
                  {canConfirm(o, terms, SCRIPT_TODAY) ? <Button size="sm" variant="outline" onClick={() => confirm(o)}>{confirmLabel(o)}</Button> : <span className="rounded-full bg-secondary px-3 py-1 text-xs">Planned</span>}
                  <Button size="icon" variant="ghost" className="size-8" aria-label={`Remove ${o.title} from your plan`} onClick={() => j.toggleSavedOpportunity(o.id)}><X className="size-4" aria-hidden="true" /></Button>
                </>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Semester() {
  const j = useJourney();
  const search = Route.useSearch();
  const [localSel, setSel] = useState<string>();
  const [pickedWeek, setPickedWeek] = useState<number>();
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  const weekPill = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  const sel = localSel ?? search.term ?? "su27";
  const term = terms.find((t) => t.id === sel);
  if (!term) return null;
  const chosen = j.seatHeld ? options.find((o) => o.id === j.chosenId) : undefined;
  const rows = [
    ...syllabi.map((s) => ({ course: s.course, items: s.items, sourceId: s.sourceId, isNew: false })),
    ...(chosen ? [{ course: chosen.course.replace("BCC ", ""), items: chosen.deadlines.map((d) => ({ week: d.week, label: d.label.split(" ").slice(2).join(" ") })), sourceId: chosen.sourceIds[0]!, isNew: true }] : []),
  ];
  const weeks = Array.from({ length: 8 }, (_, i) => i + 1);
  const load = (w: number) => rows.reduce((n, r) => n + r.items.filter((i) => i.week === w).length, 0);
  const nowWeek = currentWeek(SUMMER_2027_START, weeks.length, SCRIPT_TODAY);
  const notStarted = SCRIPT_TODAY < SUMMER_2027_START;
  const week = pickedWeek ?? nowWeek ?? firstWeekToShow(weeks, load);
  const dueThisWeek = rows.flatMap((r) => r.items.filter((i) => i.week === week).map((i) => ({ course: r.course, label: i.label })));

  return (
    <div>
      <PageBanner src={sceneTerms} position="50% 86%" />
      <PageHeader title="Your terms" sub="Your plan through graduation." right={<Button variant="outline" size="sm" asChild><Link to="/what-if">What if…</Link></Button>} />
      {/* The padding gives shadows room inside the scroller; the negative margins keep the row in place. */}
      <div ref={containerRef} className="term-tabs relative -mx-3 -mt-3 mb-3 flex gap-2 overflow-x-auto px-3 py-3">
        <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
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
        <div className="surface p-6">
          <div className="flex items-center gap-3">
            <SchoolLogo school={term.school} />
            <div>
              <div className="font-medium">{term.name} · {term.school === "bayview" ? "Bayview CC" : "Northgate State"}</div>
              <div className="text-sm text-muted-foreground">{term.status === "in_progress" ? "In progress · finals week Jun 9–13" : term.registration}</div>
            </div>
          </div>
          <ul className="mt-5 divide-y">
            {term.courses.map((c) => (
               <li key={c.code + c.title} className="flex items-center gap-3 py-2.5 text-sm"><SubjectIcon course={`${c.code} ${c.title}`} /><span className="min-w-0 flex-1"><b className="font-medium"><CourseLink course={c.code} /></b> <span className="text-muted-foreground">{c.title}</span></span><span className="text-muted-foreground">{c.grade ?? c.units}</span></li>
            ))}
          </ul>
          {term.status === "planned" && <p className="mt-4 text-xs text-muted-foreground">Planned from your degree audit.</p>}
        </div>
      ) : (
      <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div><b className="font-medium">Summer 2027, week by week</b>{notStarted && <span className="text-muted-foreground"> · Starts {shortDate(SUMMER_2027_START)}. You're in {terms.find((t) => t.status === "in_progress")?.name}.</span>}</div>
        <Link to="/portal" className="text-xs text-muted-foreground underline-offset-4 hover:underline">Registration closes Jun 18</Link>
      </div>
      <div className="surface overflow-hidden">
        <div ref={weekPill.containerRef} className="week-strip relative grid grid-cols-4 gap-1.5 border-b p-3 xl:grid-cols-8">
          <span ref={weekPill.pillRef} className="sliding-pill liquid" aria-hidden="true" />
          {weeks.map((w) => (
            <button key={w} type="button" aria-pressed={week === w} aria-current={nowWeek === w ? "date" : undefined} aria-label={`Week ${w}, ${weekDates(SUMMER_2027_START, w)}${nowWeek === w ? ", this week" : ""}: ${load(w)} due${isPileup(load(w)) ? ", pile-up" : ""}`} onClick={() => setPickedWeek(w)} className={cn("rounded-xl px-1 py-2 text-center text-xs outline-offset-2 transition-colors", isPileup(load(w)) ? "week-pileup font-semibold text-alert" : load(w) > 0 ? "bg-secondary font-medium hover:bg-secondary/70" : "text-muted-foreground hover:bg-secondary/50", nowWeek === w && "ring-1 ring-inset ring-foreground/25")}>
              <span className="flex items-center justify-center gap-1 whitespace-nowrap">{isPileup(load(w)) && <AlertTriangle className="size-3" aria-hidden="true" />}Week {w}</span>
              <span className="mt-0.5 block whitespace-nowrap text-[11px] font-normal opacity-80">{weekDates(SUMMER_2027_START, w)}</span>
              <span className="block text-[11px] font-normal">{nowWeek === w && "Now · "}{load(w) > 0 ? `${load(w)} due` : "Clear"}</span>
            </button>
          ))}
        </div>
        <div key={week} className="swap-enter p-4 sm:px-5">
          {isPileup(load(week)) && <div className="mb-3 flex items-start gap-2 rounded-xl bg-alert-soft p-3 text-sm"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-alert" aria-hidden="true" /><span><b className="font-semibold text-alert">Pile-up.</b> {pileupLine(week, weeks, load)}</span></div>}
          <h3 className="text-sm font-medium">Due in Week {week} <span className="font-normal text-muted-foreground">· {weekDates(SUMMER_2027_START, week)}</span></h3>
          {dueThisWeek.length === 0
            ? <p className="mt-2 text-sm text-muted-foreground">Nothing due this week.</p>
            : <ul className="mt-1 divide-y">{dueThisWeek.map((d) => <li key={d.course + d.label} className="flex items-center gap-3 py-2.5 text-sm"><SubjectIcon course={d.course} /><span className="min-w-0 flex-1"><b className="font-medium"><CourseLink course={d.course} /></b> <span className="text-muted-foreground">{d.label}</span></span></li>)}</ul>}
        </div>
        <ul className="grid gap-x-6 gap-y-3 border-t p-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-3">
          {rows.map((r) => (
            <li key={r.course} className="flex min-w-0 items-center gap-2 text-sm">
              <SubjectIcon course={r.course} />
              <span className="min-w-0"><span className="font-medium"><CourseLink course={r.course} /></span>{r.isNew && <span className="text-xs text-muted-foreground"> · Seat held by you</span>}<span className="mt-1 block"><SourceChip id={r.sourceId} /></span></span>
            </li>
          ))}
        </ul>
      </div>
      {chosen && <p className="mt-4 text-sm text-muted-foreground">{chosen.course} added because you hold a seat. Path Agent registered nothing.</p>}
      </>
      )}
      </div>
      {j.draftCourses.some(code => skillCourses.find(c => c.code === code)?.termId === term.id) && <section className="mt-6"><h2 className="font-semibold">Draft courses from your role plan</h2><p className="mt-1 text-xs text-muted-foreground">Saved to your plan.</p><ul className="surface mt-3 divide-y px-5">{j.draftCourses.map(code => skillCourses.find(c => c.code === code)).filter(c => c?.termId === term.id).map(c => c && <li key={c.code} className="flex items-center gap-3 py-4"><SubjectIcon course={c.code} /><div className="min-w-0 flex-1"><span className="text-sm font-medium"><CourseLink course={c.code} /> · {c.title}</span></div><span className="rounded-full bg-secondary px-3 py-1 text-xs">Draft · {c.units}</span></li>)}</ul></section>}
      <OutsideClass termId={term.id} />
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Degree requirements</h2>
        <Requirements />
      </section>
      <details className="mt-10 rounded-2xl border bg-card p-5">
        <summary className="cursor-pointer text-sm font-medium">Completed terms · {terms.filter((t) => t.status === "done").length}</summary>
        <div className="stagger mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {terms.filter((t) => t.status === "done").map((t) => (
            <article key={t.id} className="surface lift p-5">
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
