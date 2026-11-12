import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { syllabi, options, terms, WINTER_2027_START, WINTER_2027_WEEKS, FALL_2026_START, FALL_2026_WEEKS, fallWork } from "@/data/scenario";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { fridayOf, shortDate, type DueItem } from "@/lib/weeks";
import { TermCalendar } from "@/components/app/TermCalendar";
import { PageHeader, SourceChip } from "@/components/app/bits";
import { TermIcon, SubjectIcon } from "@/components/app/Brand";
import { PageBanner } from "@/components/app/SeasonBanner";
import sceneTerms from "@/assets/scene-terms.jpg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CourseLink } from "@/components/app/SkillsBits";
import { opportunities, skillCourses } from "@/data/scenario";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
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
      { title: "Terms — Trellis" },
      { name: "description", content: "Every term from now until you graduate." },
      { property: "og:title", content: "Terms — Trellis" },
      { property: "og:description", content: "Every term from now until you graduate." },
    ],
  }),
  component: Semester,
});

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

/** A class's title, units and where it counts, shown under it in the calendar's class list. */
function ClassLines({ termId, course }: { termId: string; course: (typeof terms)[number]["courses"][number] }) {
  return (
    <>
      <span className="block">{course.title}</span>
      <span className="block opacity-75">{course.units}</span>
      <CountsToward termId={termId} course={course} />
    </>
  );
}

function Semester() {
  const j = useJourney();
  const search = Route.useSearch();
  const [localSel, setSel] = useState<string>();
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  const current = terms.find((t) => t.status === "in_progress");
  const sel = localSel ?? search.term ?? current?.id ?? "w27";
  const term = terms.find((t) => t.id === sel);
  if (!term) return null;
  const chosen = j.seatHeld ? options.find((o) => o.id === j.chosenId) : undefined;
  const winter = [
    ...syllabi.map((s) => ({ course: s.course, items: s.items, sourceId: s.sourceId, isNew: false })),
    ...(chosen ? [{ course: chosen.course.replace("BCC ", ""), items: chosen.deadlines.map((d) => ({ week: d.week, label: d.label.split(" ").slice(2).join(" "), worth: undefined })), sourceId: chosen.sourceIds[0]!, isNew: true }] : []),
  ];
  const winterDue: DueItem[] = winter.flatMap((r) => r.items.map((i) => ({ course: r.course, date: fridayOf(WINTER_2027_START, i.week), label: i.label, worth: i.worth })));

  return (
    <div>
      <PageBanner src={sceneTerms} position="50% 86%" />
      <PageHeader title="Your terms" sub="Your classes and what's due, term by term." />
      {/* The padding gives shadows room inside the scroller; the negative margins keep the row in place. */}
      <div ref={containerRef} className="term-tabs relative -mx-3 -mt-3 mb-3 flex gap-2 overflow-x-auto px-3 py-3">
        <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
        {terms.filter((t) => t.status !== "done").map((t) => (
          <Button variant="outline" key={t.id} aria-pressed={sel === t.id} onClick={() => setSel(t.id)} className={cn("relative z-[1] h-auto min-h-16 shrink-0 justify-start gap-3 px-5 py-3 text-left text-sm shadow-none", sel === t.id ? "border-transparent bg-transparent hover:bg-transparent" : "lift bg-card")}>
            <TermIcon term={t.name} />
            <span className="min-w-0">
              <span className="block font-medium">{t.name}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {t.status === "in_progress" ? "Current term" : t.status === "registering" ? "Registering now" : "Planned"}
              </span>
            </span>
          </Button>
        ))}
      </div>
      <div key={term.id} className="swap-enter space-y-6">
      {term.status === "in_progress" ? (
        <>
          <TermCalendar title={term.name} note="finals Dec 7–11" courses={term.courses.map((c) => c.code)} details={Object.fromEntries(term.courses.map((c) => [c.code, <ClassLines key={c.code} termId={term.id} course={c} />]))} start={FALL_2026_START} weekCount={FALL_2026_WEEKS} items={fallWork} today={SCRIPT_TODAY} />
        </>
      ) : term.status === "registering" ? (
        <>
          <section aria-labelledby="winter-classes" className="surface p-5">
            <div className="flex flex-wrap items-center gap-3">
              <SchoolLogo school="bayview" />
              <div className="min-w-0 flex-1"><h2 id="winter-classes" className="font-semibold">{term.name} classes</h2><p className="text-xs text-muted-foreground">Registration closes Nov 20 · classes start {shortDate(WINTER_2027_START)}</p></div>
              <Button asChild size="sm"><Link to="/portal">Go to registration</Link></Button>
            </div>
            <ul className="mt-3 grid gap-x-6 divide-y sm:grid-cols-2 sm:divide-y-0">
              {winter.map((r) => (
                <li key={r.course} className="flex min-w-0 items-start gap-3 py-2.5 text-sm">
                  <SubjectIcon course={r.course} />
                  <span className="min-w-0 flex-1"><span className="font-medium"><CourseLink course={r.course} /></span>{r.isNew && <span className="text-xs text-muted-foreground"> · Seat held by you</span>}<CountsToward termId={term.id} course={term.courses.find((c) => c.code === r.course) ?? { code: r.course, title: r.course, ...(r.isNew ? { flag: "qr1" } : {}) }} /></span>
                  <SourceChip id={r.sourceId} />
                </li>
              ))}
            </ul>
            {chosen && <p className="mt-2 text-xs text-muted-foreground">{chosen.course} added because you hold a seat. Sprout registered nothing.</p>}
          </section>
          <TermCalendar title={term.name} note={`starts ${shortDate(WINTER_2027_START)}`} courses={winter.map((r) => r.course)} start={WINTER_2027_START} weekCount={WINTER_2027_WEEKS} items={winterDue} today={SCRIPT_TODAY} />
        </>
      ) : (
        <div className="surface p-6">
          <div className="flex items-center gap-3">
            <SchoolLogo school={term.school} />
            <div>
              <div className="font-medium">{term.name} · {term.school === "bayview" ? "Bayview CC" : "Northgate State"}</div>
              <div className="text-sm text-muted-foreground">{term.registration}</div>
            </div>
          </div>
          <ul className="mt-5 divide-y">
            {term.courses.map((c) => (
               <li key={c.code + c.title} className="flex items-center gap-3 py-2.5 text-sm"><SubjectIcon course={`${c.code} ${c.title}`} /><span className="min-w-0 flex-1"><b className="font-medium"><CourseLink course={c.code} /></b> <span className="text-muted-foreground">{c.title}</span><CountsToward termId={term.id} course={c} /></span><span className="text-muted-foreground">{c.units}</span></li>
            ))}
          </ul>
        </div>
      )}
      </div>
      {j.draftCourses.some(code => skillCourses.find(c => c.code === code)?.termId === term.id) && <section className="mt-6"><h2 className="font-semibold">Draft courses from your role plan</h2><p className="mt-1 text-xs text-muted-foreground">Saved to your plan.</p><ul className="surface mt-3 divide-y px-5">{j.draftCourses.map(code => skillCourses.find(c => c.code === code)).filter(c => c?.termId === term.id).map(c => c && <li key={c.code} className="flex items-center gap-3 py-4"><SubjectIcon course={c.code} /><div className="min-w-0 flex-1"><span className="text-sm font-medium"><CourseLink course={c.code} /> · {c.title}</span></div><span className="rounded-full bg-secondary px-3 py-1 text-xs">Draft · {c.units}</span></li>)}</ul></section>}
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
