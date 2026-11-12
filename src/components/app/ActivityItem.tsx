import { useId } from "react";
import { Ban, ChevronDown, CircleAlert, CheckCircle2, FileText, Hourglass, Loader2, MinusCircle, Sparkle } from "lucide-react";
import { AgentAvatar } from "@/components/app/Brand";
import { SafeSource } from "@/components/app/SafeSource";
import { When } from "@/components/app/activityBits";
import type { ActivityEvent, EventStatus } from "@/lib/activity";
import { HELPER_NAME } from "@/lib/run";
import type { AgentId } from "@/lib/journey";
import { sources } from "@/data/scenario";
import { cn } from "@/lib/utils";
import "@/styles/motion-agents.css";

export type ItemStatus = "needs" | "running" | "done" | "nothing" | "waiting";

const chip: Record<ItemStatus, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  needs: { label: "Needs you", icon: CircleAlert, cls: "bg-warning-soft text-warning" },
  running: { label: "Running", icon: Loader2, cls: "bg-info-soft text-info" },
  done: { label: "Done", icon: CheckCircle2, cls: "bg-success-soft text-success" },
  nothing: { label: "Nothing needed", icon: MinusCircle, cls: "bg-secondary text-muted-foreground" },
  waiting: { label: "Waiting on counselor", icon: Hourglass, cls: "bg-info-soft text-info" },
};

/** A small status chip for the closed card. */
export function StatusChip({ s }: { s: ItemStatus }) {
  const m = chip[s];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", m.cls)}>
      <m.icon className={cn("size-3", s === "running" && "motion-safe:animate-spin")} aria-hidden="true" />
      <span className="max-[380px]:sr-only">{m.label}</span>
    </span>
  );
}

const fromEvent: Record<EventStatus, ItemStatus> = { needs_ok: "needs", handed: "needs", done: "done", waiting: "waiting", nothing: "nothing" };

/**
 * One activity as a light card: closed, a single line (helper, what happened, when, status);
 * open, whatever the caller puts inside. Height and opacity ease open; reduced motion just shows it.
 */
export function ActivityItem({ helper, summary, at, now, status, open, onToggle, children, label }: {
  helper: AgentId;
  summary: React.ReactNode;
  at: Date | null;
  now: number | null;
  status: ItemStatus;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  label: string;
}) {
  const id = useId();
  return (
    <li className={cn("act-item !rounded-[14px] border bg-card", open && "is-open")}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}
          className="flex w-full min-w-0 items-center gap-2.5 !rounded-[14px] px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4">
          <AgentAvatar agent={helper} className="size-6 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium" title={label}>{summary}</span>
          {at && <span className="hidden shrink-0 sm:inline"><When d={at} now={now} /></span>}
          <StatusChip s={status} />
          <ChevronDown className="act-chevron size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </h3>
      <div id={id} role="region" aria-label={label} className="act-body" inert={!open}>
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 border-t px-3 pt-3 pb-3.5 sm:px-4">
            {at && <p className="sm:hidden"><When d={at} now={now} /></p>}
            {children}
          </div>
        </div>
      </div>
    </li>
  );
}

const PERM: Record<ActivityEvent["steps"][number]["perm"], string> = { read: "Read", suggested: "Suggested", needs_ok: "Needs your OK", handed: "Your move" };
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const took = (ms: number) => (ms < 1000 ? "under a second" : ms < 60000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60000)} min`);

/**
 * An earlier activity, read the way an agent report reads: what it found and what that means for
 * her first, then why it ran, the work it did step by step with how long it took, what it read
 * and made, and what it didn't do.
 */
export function EventCard({ e, now, open, onToggle }: { e: ActivityEvent; now: number | null; open: boolean; onToggle: () => void }) {
  const helper = e.steps.find((s) => !s.skipped)?.helper ?? e.steps[0]?.helper ?? "planner";
  const ids = [...new Set(e.details.sourceIds)].filter((id) => id in sources);
  const done = e.steps.filter((s) => !s.skipped);
  const t0 = done[0]?.at.getTime() ?? e.at.getTime();
  const span = (done.at(-1)?.at.getTime() ?? t0) - t0;
  const teaser = e.found?.[0];
  return (
    <ActivityItem helper={helper} label={e.headline} at={e.at} now={now} status={fromEvent[e.status]} open={open} onToggle={onToggle}
      summary={<>{e.headline}{teaser && <span className="font-normal text-muted-foreground"> · {teaser}</span>}</>}>
      {(e.found?.length || e.suggest?.length) ? (
        <div className="act-outcome rounded-lg bg-secondary/70 px-3 py-2.5">
          {e.found?.length ? (
            <>
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">What I found</p>
              <ul className="mt-1 space-y-0.5 text-sm">{e.found.map((f) => <li key={f}>{f}</li>)}</ul>
            </>
          ) : null}
          {e.suggest?.length ? (
            <p className="mt-2 text-sm"><b className="font-semibold">What this means for you:</b> {e.suggest.join(" ")}</p>
          ) : null}
        </div>
      ) : null}

      {e.because && <p className="text-[13px] text-muted-foreground"><b className="font-medium text-foreground">Why it ran:</b> {cap(e.because)}</p>}

      {done.length > 0 && (
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Worked for {took(span)} · {done.length} {done.length === 1 ? "step" : "steps"}
          </p>
          <ol className="act-flow mt-1.5">
            {e.steps.map((s, i) => (
              <li key={i} className={cn("act-flow-step", s.skipped && "opacity-50")}>
                <AgentAvatar agent={s.helper} className="size-5 shrink-0" />
                <span className="min-w-0 flex-1 text-[13px]">
                  <b className="font-medium">{HELPER_NAME[s.helper]}</b>{" "}
                  <span className="text-muted-foreground">{s.skipped ? `was off, so it skipped this: ${s.text.charAt(0).toLowerCase()}${s.text.slice(1)}` : s.text}</span>
                </span>
                {!s.skipped && <span className="shrink-0 rounded-full bg-secondary px-1.5 py-px text-[10px] text-muted-foreground">{PERM[s.perm]}</span>}
                <span className="w-9 shrink-0 text-right font-mono text-[10px] text-muted-foreground">+{Math.max(0, Math.round((s.at.getTime() - t0) / 1000))}s</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(e.details.inputs.length > 0 || e.details.outputs.length > 0) && (
        <div className="grid gap-3 text-[13px] sm:grid-cols-2">
          {e.details.inputs.length > 0 && (
            <div>
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">What it read</p>
              <ul className="mt-1 space-y-0.5">{e.details.inputs.map((x) => <li key={x} className="flex gap-1.5"><FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />{x}</li>)}</ul>
            </div>
          )}
          {e.details.outputs.length > 0 && (
            <div>
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">What it made</p>
              <ul className="mt-1 space-y-0.5">{e.details.outputs.map((x) => <li key={x} className="flex gap-1.5"><Sparkle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {ids.length > 0 && (
        <div>
          <SourcesLine ids={ids} label="See the exact lines it used" />
          {e.details.confidence && <p className="mt-1 text-xs text-muted-foreground">{e.details.confidence}</p>}
        </div>
      )}

      {e.didNot.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <Ban className="size-3.5" aria-hidden="true" />
          {e.didNot.map((d) => <span key={d}>{d}</span>)}
        </p>
      )}
    </ActivityItem>
  );
}

/** "Where it looked": the documents a run or event read, as small chips on one line. */
export function SourcesLine({ ids, label = "Where it looked" }: { ids: string[]; label?: string }) {
  const known = ids.filter((id) => id in sources);
  if (!known.length) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>{label}</span>
      {known.map((id) => <SafeSource key={id} id={id} />)}
    </p>
  );
}
