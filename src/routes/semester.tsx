import { createFileRoute } from "@tanstack/react-router";
import { PostingLink } from "@/components/app/PostingLink";
import { AlertTriangle, Check, X } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { syllabi, options, terms, SUMMER_2027_START } from "@/data/scenario";
import { OrgLogo, SchoolLogo } from "@/components/app/SchoolLogo";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { currentWeek, isPileup, pileupLine, shortDate, weekDates } from "@/lib/weeks";
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
import { ComingUp } from "@/components/app/EventBits";
import { psychologyDegree } from "@/data/degree";
import { useDegreeAudit } from "@/hooks/use-degree-audit";
import { placeOf } from "@/lib/degree";

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
  const items = opportunities.filter((o) => j.savedOpportunities.includes(o.id) && !(o.courseCode && j.draftCourses.includes(o.courseCode)) && planTermId(o, terms, SCRIPT_TODAY) === termId).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
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
                <button type="button" onClick={() => j.openOpportunity(o.id)} className="text-left text-sm font-medium underline-offset-4 hover:underline">{o.title}</button>
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

/** One line tying a class to its row in the degree, or to classes that could fill an empty one. */
function CountsToward({ termId, course }: { termId: string; course: { code: string; title: string; flag?: string | undefined } }) {
  const { audit } = useDegreeAudit();
  const place = placeOf(psychologyDegree, termId, course);
  if (!place) return null;
  const slot = audit.categories.flatMap((c) => c.slots).find((s) => s.id === place.slot);
  const line = "block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";
  if (slot?.status === "open" && place.slot !== "qr1") return <Link to="/explore" search={{ fills: place.slot }} className={line}>Find a class for this {place.need.toLowerCase()}</Link>;
  return <Link to="/degree" search={{ row: place.row, slot: place.slot }} className={line}>Counts toward {place.need}</Link>;
}

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
  const weeks = Array.from({ length: 8 }, (_, i) => i + 1);
  const load = (w: number) => rows.reduce((n, r) => n + r.items.filter((i) => i.week === w).length, 0);
  const nowWeek = currentWeek(SUMMER_2027_START, weeks.length, SCRIPT_TODAY);
  const notStarted = SCRIPT_TODAY < SUMMER_2027_START;

  return (
    <div>
      <PageBanner src={sceneTerms} position="50% 86%" />
      <PageHeader title="Your terms" sub="Your plan through graduation." right={<Button variant="outline" size="sm" asChild><Link to="/degree" search={{ view: "tree", try: true }}>Try a change</Link></Button>} />
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
      {/* Wide screens: the term on the left, coming up on the right, so the page fits on one screen. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0">
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
               <li key={c.code + c.title} className="flex items-center gap-3 py-2.5 text-sm"><SubjectIcon course={`${c.code} ${c.title}`} /><span className="min-w-0 flex-1"><b className="font-medium"><CourseLink course={c.code} /></b> <span className="text-muted-foreground">{c.title}</span><CountsToward termId={term.id} course={c} /></span><span className="text-muted-foreground">{c.grade ?? c.units}</span></li>
            ))}
          </ul>
          {term.status === "planned" && <p className="mt-4 text-xs text-muted-foreground">Planned from your degree audit.</p>}
        </div>
      ) : (
      <>
      <section aria-labelledby="weeks-title" className="surface overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-4">
          <div>
            <h2 id="weeks-title" className="font-semibold">Summer 2027, week by week</h2>
            {notStarted && <p className="text-xs text-muted-foreground">Starts {shortDate(SUMMER_2027_START)}. You're in {terms.find((t) => t.status === "in_progress")?.name}.</p>}
          </div>
          <span className="text-xs text-muted-foreground">From your 3 summer syllabi</span>
        </div>
        {/* A calendar: one row per term week, Monday to Sunday, with what's due that week. */}
        <div className="p-3 text-xs">
          <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))_40px] gap-1 px-2 pb-1.5 text-[11px] text-muted-foreground" aria-hidden="true">
            <span />
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d} className="text-center">{d}</span>)}
            <span className="text-right">Due</span>
          </div>
          <ol className="space-y-1" aria-label="Summer 2027 weeks">
            {weeks.map((w) => {
              const n = load(w);
              const pile = isPileup(n);
              const due = rows.flatMap((r) => r.items.filter((i) => i.week === w).map((i) => ({ course: r.course, label: i.label })));
              return (
                <li key={w} aria-current={nowWeek === w ? "date" : undefined} aria-label={`Week ${w}, ${weekDates(SUMMER_2027_START, w)}${nowWeek === w ? ", this week" : ""}: ${n} due${pile ? ", pile-up" : ""}`}
                  className={cn("grid grid-cols-[64px_repeat(7,minmax(0,1fr))_40px] items-center gap-1 rounded-xl px-2 py-1.5", pile && "week-pileup", nowWeek === w && "ring-1 ring-inset ring-foreground/25")}>
                  <span className={cn("flex items-center gap-1 font-medium", pile && "text-alert")}>{pile && <AlertTriangle className="size-3" aria-hidden="true" />}Week {w}</span>
                  {Array.from({ length: 7 }, (_, d) => {
                    const day = new Date(Date.parse(`${SUMMER_2027_START}T12:00:00Z`) + ((w - 1) * 7 + d) * 86_400_000);
                    const first = day.getUTCDate() === 1 || (w === 1 && d === 0);
                    return <span key={d} aria-hidden="true" className={cn("text-center tabular-nums", d >= 5 && "text-muted-foreground")}>{first ? day.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : day.getUTCDate()}</span>;
                  })}
                  <span className={cn("text-right", n ? "font-semibold" : "text-muted-foreground")}>{n || "–"}</span>
                  {due.length > 0 && (
                    <span className="col-span-7 col-start-2 flex flex-wrap items-center gap-1 pt-1">
                      {due.map((d) => <span key={d.course + d.label} className={cn("rounded-full px-2 py-0.5 text-[11px]", pile ? "bg-card text-alert" : "bg-secondary")}><b className="font-medium"><CourseLink course={d.course} /></b> {d.label}</span>)}
                      {pile && <span className="ml-1 text-[11px] text-alert">{pileupLine(w, weeks, load)}</span>}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>
      {chosen && <p className="mt-4 text-sm text-muted-foreground">{chosen.course} added because you hold a seat. Path Agent registered nothing.</p>}
      </>
      )}
      </div>
      {j.draftCourses.some(code => skillCourses.find(c => c.code === code)?.termId === term.id) && <section className="mt-6"><h2 className="font-semibold">Draft courses from your role plan</h2><p className="mt-1 text-xs text-muted-foreground">Saved to your plan.</p><ul className="surface mt-3 divide-y px-5">{j.draftCourses.map(code => skillCourses.find(c => c.code === code)).filter(c => c?.termId === term.id).map(c => c && <li key={c.code} className="flex items-center gap-3 py-4"><SubjectIcon course={c.code} /><div className="min-w-0 flex-1"><span className="text-sm font-medium"><CourseLink course={c.code} /> · {c.title}</span></div><span className="rounded-full bg-secondary px-3 py-1 text-xs">Draft · {c.units}</span></li>)}</ul></section>}
      <OutsideClass termId={term.id} />
      </div>
      <div className="scroll-pane min-w-0 space-y-6">
        {term.id === "su27" && (
          <section aria-labelledby="summer-classes" className="surface p-5">
            <div className="flex items-baseline justify-between gap-2"><h2 id="summer-classes" className="font-semibold">Summer classes</h2><span className="text-xs text-muted-foreground">Registration closes Jun 18</span></div>
            <ul className="mt-3 divide-y">
              {rows.map((r) => (
                <li key={r.course} className="flex min-w-0 items-start gap-3 py-2.5 text-sm">
                  <SubjectIcon course={r.course} />
                  <span className="min-w-0 flex-1"><span className="font-medium"><CourseLink course={r.course} /></span>{r.isNew && <span className="text-xs text-muted-foreground"> · Seat held by you</span>}<CountsToward termId={term.id} course={term.courses.find((c) => c.code === r.course) ?? { code: r.course, title: r.course, ...(r.isNew ? { flag: "qr1" } : {}) }} /></span>
                  <SourceChip id={r.sourceId} />
                </li>
              ))}
            </ul>
            <Button asChild className="mt-3 w-full"><Link to="/portal">Go to registration</Link></Button>
          </section>
        )}
        <ComingUp compact limit={3} />
      </div>
      </div>
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
