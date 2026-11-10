import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleHelp, RotateCcw } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { PageHeader, SimLabel, SourceChip } from "@/components/app/bits";
import { SubjectIcon } from "@/components/app/Brand";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { options, terms, TRANSFER_MIN_UNITS } from "@/data/scenario";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
import { useJourney } from "@/lib/journey";
import { cn } from "@/lib/utils";
import { explain, NO_CHANGE, OFF_TERM, parseWhatIf, project, STATS_CHOICES, statsFromSeat, statsName, SUMMER_CLASSES, termsMoved, type Projection, type StatsChoice, type TermBar, type TransferStatus } from "@/lib/whatif";

export const Route = createFileRoute("/what-if")({
  head: () => ({
    meta: [
      { title: "What if — Path Agent" },
      { name: "description", content: "Try a change to your plan and see what moves." },
      { property: "og:title", content: "What if — Path Agent" },
      { property: "og:description", content: "Try a change to your plan and see what moves." },
    ],
  }),
  component: WhatIfPage,
});

const SUGGESTIONS = ["Drop BIO 12", "Take MATH 13 instead", "Take Spring 2028 off", "Take summer off"];

const summerTerm = terms.find((t) => t.id === "su27");
const titleOf = (code: string) => summerTerm?.courses.find((c) => c.code === code)?.title ?? "";

const seatNote = (id: string) => {
  const seats = options.find((o) => o.id === id)?.seatsOpen ?? 0;
  return `${seats} seat${seats === 1 ? "" : "s"} open`;
};
const STATS_DETAIL: Record<StatsChoice, () => string> = {
  stat2: () => "Your plan · Full right now",
  math13: () => `Counts for QR-1 · ${seatNote("math13")}`,
  psyc5: () => `Counts with a C or better · ${seatNote("psyc5")}`,
  bus21: () => `Needs a counselor ruling · ${seatNote("bus21")}`,
  skip: () => "QR-1 stays open",
};

const TRANSFER: Record<TransferStatus, { label: (term: string) => string; tone: string; icon: typeof CheckCircle2 }> = {
  ready: { label: (t) => `Transfer on track for ${t}`, tone: "text-success", icon: CheckCircle2 },
  conditional: { label: (t) => `${t} transfer depends on a C or better`, tone: "text-warning", icon: CircleHelp },
  review: { label: (t) => `${t} transfer needs your counselor`, tone: "text-warning", icon: CircleHelp },
  blocked: { label: (t) => `Transfer moves to ${t}`, tone: "text-alert", icon: AlertTriangle },
};

const moveLabel = (moved: number) => (moved === 0 ? "Same as now" : `${Math.abs(moved)} term${Math.abs(moved) === 1 ? "" : "s"} ${moved > 0 ? "later" : "earlier"}`);
const money = (n: number) => (n === 0 ? "No change" : `${n > 0 ? "+" : "−"}$${Math.abs(n).toLocaleString("en-US")}`);
const PAUSED: Partial<Record<TermBar["state"], string>> = { off: "Off", bayview: "Bayview", unused: "Done" };
const BAR_SCALE = 5.4;

function Bar({ name, units, baseUnits, state }: Omit<TermBar, "id">) {
  const paused = PAUSED[state];
  return (
    <div className="flex min-w-0 flex-col items-center justify-end">
      <div className="relative flex h-[128px] w-full items-end justify-center">
        {(paused || units !== baseUnits) && baseUnits > 0 && <span className="plan-ghost" style={{ height: baseUnits * BAR_SCALE }} aria-hidden="true" />}
        <span className="plan-bar" data-state={state} style={{ height: units * BAR_SCALE }} aria-hidden="true" />
        <span className={cn("absolute inset-x-0 text-center text-xs tabular-nums", state === "same" ? "text-muted-foreground" : "font-semibold")} style={{ bottom: Math.max(units, baseUnits) * BAR_SCALE + 3 }}>{paused ?? units}</span>
      </div>
      <span className={cn("mt-1.5 w-full whitespace-pre-line text-center text-[11px] leading-tight", state === "new" ? "font-semibold" : "text-muted-foreground")}>{name.replace(" ", "\n")}</span>
    </div>
  );
}

function PlanRibbon({ base, next }: { base: Projection; next: Projection }) {
  const summary = next.bars.map((b) => `${b.name}: ${PAUSED[b.state] ?? `${b.units} units`}`).join(", ");
  return (
    <div role="img" aria-label={`Units per term. Summer 2027: ${next.summerUnits}. ${summary}.`} className="plan-ribbon grid auto-cols-[minmax(46px,1fr)] grid-flow-col gap-1.5 overflow-x-auto">
      <Bar name="Summer 2027" units={next.summerUnits} baseUnits={base.summerUnits} state={next.summerUnits === base.summerUnits ? "same" : next.summerUnits > base.summerUnits ? "heavier" : "lighter"} />
      {next.bars.map((b) => <Bar key={b.id} {...b} />)}
    </div>
  );
}

function WeekTicks({ loads }: { loads: number[] }) {
  return (
    <div className="mt-2 flex h-6 items-end gap-[3px]" aria-hidden="true">
      {loads.map((n, i) => <span key={i} className="plan-tick" data-peak={n >= 3 ? "" : undefined} style={{ height: 3 + n * 5 }} />)}
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium tabular-nums">{value}</div>
      {children}
    </div>
  );
}

function Row({ title, detail, icon, checked, onChange }: { title: string; detail: string; icon?: ReactNode; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-3">
      {icon}
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </label>
  );
}

function StatsPicker({ value, onPick }: { value: StatsChoice; onPick: (c: StatsChoice) => void }) {
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  return (
    <div ref={containerRef} className="has-pill relative mt-2 grid gap-1">
      <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
      {STATS_CHOICES.map((c) => (
        <button key={c} type="button" aria-pressed={value === c} onClick={() => onPick(c)} className="rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/60">
          <span className="block font-medium">{statsName(c)}</span>
          <span className="block text-xs text-muted-foreground">{STATS_DETAIL[c]()}</span>
        </button>
      ))}
    </div>
  );
}

function WhatIfPage() {
  const j = useJourney();
  const [text, setText] = useState("");
  const [missed, setMissed] = useState(false);
  const change = j.whatIf;
  const currentStats = statsFromSeat(j.chosenId, j.seatHeld);
  const base = project(NO_CHANGE, currentStats);
  const next = project(change, currentStats);
  const notes = explain(change, base, next);
  const moved = termsMoved(base, next);
  const edited = JSON.stringify(change) !== JSON.stringify(NO_CHANGE);
  const transfer = TRANSFER[next.transfer];

  const tryText = (words: string) => {
    const parsed = parseWhatIf(words, change);
    setMissed(!parsed);
    if (!parsed) return;
    j.setWhatIf(parsed);
    setText("");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    tryText(text);
  };
  const toggleClass = (course: string, keep: boolean) => j.setWhatIf({ ...change, dropped: keep ? change.dropped.filter((c) => c !== course) : [...change.dropped, course] });
  const startOver = () => {
    j.setWhatIf(NO_CHANGE);
    setMissed(false);
  };

  return (
    <div>
      <PageHeader title="What if" sub="Try a change. Your real plan stays put." right={<SimLabel>Synthetic data</SimLabel>} />

      <form onSubmit={submit} className="what-if-ask flex items-center gap-2 rounded-full border bg-card py-1.5 pl-5 pr-1.5">
        <label htmlFor="what-if-text" className="sr-only">Describe a change to your plan</label>
        <span className="shrink-0 text-sm font-medium" aria-hidden="true">What if I</span>
        <input id="what-if-text" value={text} onChange={(e) => { setText(e.target.value); setMissed(false); }} autoComplete="off" placeholder="drop BIO 12" className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground" />
        <Button type="submit" size="sm" className="rounded-full" disabled={!text.trim()} aria-label="Try this change"><ArrowRight className="size-4" aria-hidden="true" /></Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => tryText(s)} className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">{s}</button>)}
        {edited && <Button type="button" variant="ghost" size="sm" className="ml-auto h-7" onClick={startOver}><RotateCcw className="size-3.5" aria-hidden="true" />Start over</Button>}
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-muted-foreground">{missed && "I can test dropping a summer class, swapping statistics, an internship, a term off, or finishing early."}</p>

      <div className="mt-3 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="surface order-last divide-y px-5 py-2 xl:order-first">
          <section className="pb-1 pt-3">
            <h2 className="text-xs font-medium text-muted-foreground">Summer 2027 classes</h2>
            <div className="divide-y">
              {SUMMER_CLASSES.map((c) => <Row key={c} title={c} detail={titleOf(c)} icon={<SubjectIcon course={c} />} checked={!change.dropped.includes(c)} onChange={(on) => toggleClass(c, on)} />)}
            </div>
          </section>
          <section className="py-4">
            <h2 className="text-xs font-medium text-muted-foreground">Statistics (QR-1)</h2>
            <StatsPicker value={next.stats} onPick={(c) => j.setWhatIf({ ...change, stats: c === currentStats ? null : c })} />
          </section>
          <section className="pb-1 pt-3">
            <h2 className="text-xs font-medium text-muted-foreground">Bigger moves</h2>
            <div className="divide-y">
              <Row title="Add a summer internship" detail="Library website usability · 8 hours a week" checked={change.internship} onChange={(on) => j.setWhatIf({ ...change, internship: on })} />
              <Row title={`Take ${OFF_TERM} off`} detail="Its classes move to other terms" checked={change.termOff} onChange={(on) => j.setWhatIf({ ...change, termOff: on })} />
              <Row title="Finish a term early" detail="Up to 18 units a term" checked={change.early} onChange={(on) => j.setWhatIf({ ...change, early: on })} />
            </div>
          </section>
        </div>

        <div className="surface p-5 sm:p-6 xl:sticky xl:top-20">
          <div aria-live="polite" className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <div className="text-xs text-muted-foreground">You'd graduate</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <span className="text-[2.5rem] font-medium leading-none tracking-tight">{next.graduation}</span>
                <span className={cn("text-sm", moved > 0 ? "font-medium text-alert" : moved < 0 ? "font-medium text-success" : "text-muted-foreground")}>{moveLabel(moved)}</span>
              </div>
            </div>
            <div className={cn("flex items-center gap-1.5 text-sm font-medium", transfer.tone)}>
              <transfer.icon className="size-4 shrink-0" aria-hidden="true" />
              {transfer.label(next.transferTerm)}
            </div>
          </div>

          <div className="mt-6"><PlanRibbon base={base} next={next} /></div>

          <div className="mt-5 grid grid-cols-3 gap-4 border-t pt-4 text-sm">
            <Stat label="Units at transfer" value={`${next.unitsAtTransfer} of ${TRANSFER_MIN_UNITS}`} />
            <Stat label="Summer pile-ups" value={next.pileups.length ? `Week ${next.pileups.join(", ")}` : "None"}><WeekTicks loads={next.weekLoad} /></Stat>
            <Stat label="Tuition" value={money(next.tuition)} />
          </div>

          {notes.length > 0 && (
            <ul className="mt-4 space-y-2.5 border-t pt-4 text-sm">
              {notes.map((n) => (
                <li key={n.text} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={cn("size-1.5 shrink-0 rounded-full", n.alert ? "bg-alert" : "bg-foreground/30")} aria-hidden="true" />
                  <span className="min-w-0">{n.text}</span>
                  {n.sourceId && <SourceChip id={n.sourceId} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
