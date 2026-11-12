import { ArrowRight, Briefcase, CalendarDays, CalendarOff, FastForward, GraduationCap, Layers, RotateCcw, School, Sigma, Snowflake, Wallet, type LucideIcon } from "lucide-react";
import { SubjectIcon } from "@/components/app/Brand";
import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { SourceChip } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { options, terms } from "@/data/scenario";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
import type { DegreeAudit } from "@/lib/degree";
import { useJourney } from "@/lib/journey";
import { cn } from "@/lib/utils";
import { changedSlots, explain, NO_CHANGE, type WhatIf, OFF_TERM, parseWhatIf, project, STATS_CHOICES, statsFromSeat, statsName, WINTER_CLASSES, termsMoved, type StatsChoice, type TransferStatus } from "@/lib/whatif";

const SUGGESTIONS = ["Drop BIO 12", "Take MATH 13 instead", "Take Spring 2028 off", "Take winter off"];
const winterTerm = terms.find((t) => t.id === "w27");
const titleOf = (code: string) => winterTerm?.courses.find((c) => c.code === code)?.title ?? "";
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
const TRANSFER: Record<TransferStatus, (t: string) => string> = {
  ready: (t) => `Transfer on track for ${t}`,
  conditional: (t) => `${t} transfer depends on a C or better`,
  review: (t) => `${t} transfer needs your counselor`,
  blocked: (t) => `Transfer moves to ${t}`,
};
const moveLabel = (moved: number) => (moved === 0 ? "same as now" : `${Math.abs(moved)} term${Math.abs(moved) === 1 ? "" : "s"} ${moved > 0 ? "later" : "earlier"}`);
const money = (n: number) => (n === 0 ? "no change" : `${n > 0 ? "+" : "−"}$${Math.abs(n).toLocaleString("en-US")}`);

/** What one change would do on its own, before you try it: "Graduate Fall 2029 · +$1,033". */
function effectOf(change: WhatIf, currentStats: StatsChoice) {
  const base = project(NO_CHANGE, currentStats);
  const next = project(change, currentStats);
  const moved = termsMoved(base, next);
  const parts = [moved === 0 ? "Same graduation" : `Graduate ${next.graduation}`];
  if (next.transfer !== base.transfer || next.transferTerm !== base.transferTerm) parts.push(TRANSFER[next.transfer](next.transferTerm));
  if (next.tuition !== base.tuition) parts.push(money(next.tuition));
  if (next.pileups.length < base.pileups.length) parts.push("Fewer busy weeks");
  return parts.join(" · ");
}

function useProjection() {
  const j = useJourney();
  const change = j.whatIf;
  const currentStats = statsFromSeat(j.chosenId, j.seatHeld);
  const base = project(NO_CHANGE, currentStats);
  const next = project(change, currentStats);
  return { change, currentStats, base, next, moved: termsMoved(base, next), notes: explain(change, base, next) };
}

/** Which cards on the tree this change touches. */
export function useTryChange(audit: DegreeAudit) {
  const { change, currentStats, next, moved } = useProjection();
  const changed = useMemo(() => {
    const slots = audit.categories.flatMap((c) => c.slots);
    return changedSlots(change, slots, next.stats !== currentStats, moved !== 0, audit.gradTerm);
  }, [audit, change, next.stats, currentStats, moved]);
  return { changed };
}

export function TryStrip() {
  const { next, moved } = useProjection();
  return (
    <div className="map-glass try-strip" aria-live="polite">
      <span><GraduationCap aria-hidden="true" />Graduate <b>{next.graduation}</b>, {moveLabel(moved)}</span>
      <span><School aria-hidden="true" />{TRANSFER[next.transfer](next.transferTerm)}</span>
      <span><Wallet aria-hidden="true" />Tuition <b>{money(next.tuition)}</b></span>
      <span><CalendarDays aria-hidden="true" />Busy weeks <b>{next.pileups.length ? `Week ${next.pileups.join(", ")}` : "None"}</b></span>
    </div>
  );
}

/** One change as a card: what it is, and what it would do, shown before you flip it. */
function Row({ title, detail, effect, icon, checked, onChange }: { title: string; detail: string; effect: string; icon: ReactNode; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="try-card" data-on={checked || undefined}>
      <span className="try-card-icon">{icon}</span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
        <span className="try-card-effect">{effect}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </label>
  );
}

function StatsPicker({ value, onPick, effect }: { value: StatsChoice; onPick: (c: StatsChoice) => void; effect: (c: StatsChoice) => string }) {
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  return (
    <div ref={containerRef} className="has-pill relative mt-2 grid gap-1">
      <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
      {STATS_CHOICES.map((c) => (
        <button key={c} type="button" aria-pressed={value === c} onClick={() => onPick(c)} className="rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/60">
          <span className="block font-medium">{statsName(c)}</span>
          <span className="block text-xs text-muted-foreground">{STATS_DETAIL[c]()}</span>
          {value !== c && <span className="try-card-effect">{effect(c)}</span>}
        </button>
      ))}
    </div>
  );
}

function Group({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return <section className="pt-4"><p role="heading" aria-level={2} className="flex items-center gap-1.5 text-xs font-semibold"><Icon className="size-3.5" aria-hidden="true" />{title}</p><div className="mt-2 space-y-1.5">{children}</div></section>;
}

/** The controls for trying a change. Nothing here touches the real plan. */
export function TryPanel() {
  const j = useJourney();
  const { change, currentStats, next, notes } = useProjection();
  const inputId = useId();
  const [text, setText] = useState("");
  const [missed, setMissed] = useState(false);
  const edited = JSON.stringify(change) !== JSON.stringify(NO_CHANGE);
  const tryText = (words: string) => {
    const parsed = parseWhatIf(words, change);
    setMissed(!parsed);
    if (!parsed) return;
    j.setWhatIf(parsed);
    setText("");
  };
  const submit = (e: FormEvent) => { e.preventDefault(); tryText(text); };
  const toggleClass = (course: string, keep: boolean) => j.setWhatIf({ ...change, dropped: keep ? change.dropped.filter((c) => c !== course) : [...change.dropped, course] });

  return (
    <div>
      <form onSubmit={submit} className="flex items-center gap-2 rounded-full border bg-card py-1 pl-4 pr-1">
        <label htmlFor={inputId} className="sr-only">Describe a change to your plan</label>
        <span className="shrink-0 text-sm font-medium" aria-hidden="true">What if I</span>
        <input id={inputId} value={text} onChange={(e) => { setText(e.target.value); setMissed(false); }} autoComplete="off" placeholder="drop BIO 12" className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground" />
        <Button type="submit" size="sm" className="size-8 rounded-full p-0" disabled={!text.trim()} aria-label="Try this change"><ArrowRight className="size-4" aria-hidden="true" /></Button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => tryText(s)} className="rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">{s}</button>)}
        {edited && <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => { j.setWhatIf(NO_CHANGE); setMissed(false); }}><RotateCcw className="size-3.5" aria-hidden="true" />Start over</Button>}
      </div>
      {missed && <p role="status" className="mt-2 text-xs text-muted-foreground">I can test dropping a winter class, swapping statistics, an internship, a term off, or finishing early.</p>}
      {notes.length > 0 && (
        <ul className="mt-3 space-y-2 text-xs">
          {notes.map((n) => (
            <li key={n.text} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cn("size-1.5 shrink-0 rounded-full", n.alert ? "bg-alert" : "bg-foreground/30")} aria-hidden="true" />
              <span className="min-w-0 flex-1">{n.text}</span>
              {n.sourceId && <SourceChip id={n.sourceId} />}
            </li>
          ))}
        </ul>
      )}
      <Group title="Winter 2027 classes" icon={Snowflake}>{WINTER_CLASSES.map((c) => {
        const kept = !change.dropped.includes(c);
        const flipped = { ...change, dropped: kept ? [...change.dropped, c] : change.dropped.filter((d) => d !== c) };
        return <Row key={c} icon={<SubjectIcon course={`${c} ${titleOf(c)}`} bare />} title={c} detail={titleOf(c)} effect={`${kept ? "Drop it" : "Keep it"}: ${effectOf(flipped, currentStats)}`} checked={kept} onChange={(on) => toggleClass(c, on)} />;
      })}</Group>
      <Group title="Statistics" icon={Sigma}><StatsPicker value={next.stats} effect={(c) => effectOf({ ...change, stats: c }, currentStats)} onPick={(c) => j.setWhatIf({ ...change, stats: c === currentStats ? null : c })} /></Group>
      <Group title="Bigger moves" icon={Layers}>
        <Row icon={<Briefcase aria-hidden="true" />} title="Add a summer internship" detail="Library website usability · 8 hours a week" effect={effectOf({ ...change, internship: !change.internship }, currentStats)} checked={change.internship} onChange={(on) => j.setWhatIf({ ...change, internship: on })} />
        <Row icon={<CalendarOff aria-hidden="true" />} title={`Take ${OFF_TERM} off`} detail="Its classes move to other terms" effect={effectOf({ ...change, termOff: !change.termOff }, currentStats)} checked={change.termOff} onChange={(on) => j.setWhatIf({ ...change, termOff: on })} />
        <Row icon={<FastForward aria-hidden="true" />} title="Finish a term early" detail="Up to 18 units a term" effect={effectOf({ ...change, early: !change.early }, currentStats)} checked={change.early} onChange={(on) => j.setWhatIf({ ...change, early: on })} />
      </Group>
    </div>
  );
}
