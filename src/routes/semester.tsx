import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { syllabi, options, PILEUP_THRESHOLD } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { PageHeader, SimLabel, SourceChip } from "@/components/app/bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/semester")({
  head: () => ({
    meta: [
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
      <PageHeader title="Summer 2027, week by week" sub="Your three syllabi merged. Weeks with 3+ deadlines are marked so you can plan ahead." right={<SimLabel>Synthetic syllabi</SimLabel>} />
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <div className="grid min-w-[760px] grid-cols-[140px_repeat(8,1fr)]">
          <div className="border-b p-3 text-xs text-muted-foreground">Course</div>
          {weeks.map((w) => (
            <div key={w} className={cn("border-b border-l p-3 text-center text-xs font-medium", load(w) >= PILEUP_THRESHOLD && "bg-primary text-primary-foreground")}>
              Wk {w}
              {load(w) >= PILEUP_THRESHOLD && <div className="mt-1 flex items-center gap-1"><AlertTriangle className="size-3" /> Pile-up · {load(w)}</div>}
            </div>
          ))}
          {rows.map((r, ri) => (
            <div key={r.course} className="contents">
              <div className={cn("border-b p-3 text-sm font-medium", r.isNew && "bg-accent")}>
                {r.course} {r.isNew && <span className="block text-xs font-normal text-muted-foreground">Seat held by you</span>}
                <div className="mt-1"><SourceChip id={r.sourceId} /></div>
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
    </div>
  );
}
