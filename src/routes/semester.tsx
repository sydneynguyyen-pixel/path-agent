import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { syllabi, options, terms, PILEUP_THRESHOLD } from "@/data/scenario";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { useJourney } from "@/lib/journey";
import { PageHeader, SimLabel, SourceChip } from "@/components/app/bits";
import { TermIcon, SubjectIcon } from "@/components/app/Brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/semester")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Summer term deadlines — Academic Path Agent" },
      { name: "description", content: "Week-by-week deadlines merged from three syllabi, with pile-ups highlighted." },
      { property: "og:title", content: "Summer term deadlines — Academic Path Agent" },
      { property: "og:description", content: "Three syllabi merged into one calm week-by-week view." },
    ],
  }),
  component: Semester,
});

function Semester() {
  const j = useJourney();
  const [sel, setSel] = useState("su27");
  const term = terms.find((t) => t.id === sel)!;
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
      <PageHeader title="Your terms" sub="Where you are now, what you're registering for, and what comes next." right={<SimLabel>Synthetic data</SimLabel>} />
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {terms.filter((t) => t.status !== "done").map((t) => (
          <Button variant="outline" key={t.id} onClick={() => setSel(t.id)} className={cn("h-auto min-h-16 shrink-0 justify-start gap-3 px-5 py-3 text-left text-sm", sel === t.id ? "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "bg-card")}>
            <TermIcon term={t.name} />
            <span className="min-w-0">
              <span className="block font-medium">{t.name}</span>
              <span className={cn("mt-0.5 block text-xs font-normal", sel === t.id ? "opacity-80" : "text-muted-foreground")}>
                {t.status === "in_progress" ? "Current term" : t.status === "registering" ? "Registering now" : "Planned"}
              </span>
            </span>
          </Button>
        ))}
      </div>
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
              <li key={c.code + c.title} className="flex items-center gap-3 py-2.5 text-sm"><SubjectIcon course={`${c.code} ${c.title}`} /><span className="flex-1"><b className="font-medium">{c.code}</b> <span className="text-muted-foreground">{c.title}</span></span><span className="text-muted-foreground">{c.units}</span></li>
            ))}
          </ul>
          {term.status === "planned" && <p className="mt-4 text-xs text-muted-foreground">Planned from your degree audit. When registration opens, the agent will check seats and deadlines the same way it does for summer.</p>}
        </div>
      ) : (
      <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div><b className="font-medium">Summer 2027, week by week.</b> <span className="text-muted-foreground">Your syllabi merged. Busy weeks are highlighted.</span></div>
        <Link to="/portal" className="text-xs underline">Registration open · closes Jun 18</Link>
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
  );
}
