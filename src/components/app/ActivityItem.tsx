import { useId } from "react";
import { ChevronDown, CircleAlert, CheckCircle2, Hourglass, Loader2, MinusCircle } from "lucide-react";
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
    <li className={cn("act-item rounded-xl border bg-card", open && "is-open")}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}
          className="flex w-full min-w-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4">
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

/** An earlier activity (from the scripted timeline) in the same card style: why, each step and who took it, sources. */
export function EventCard({ e, now, open, onToggle }: { e: ActivityEvent; now: number | null; open: boolean; onToggle: () => void }) {
  const helper = e.steps.find((s) => !s.skipped)?.helper ?? e.steps[0]?.helper ?? "planner";
  const ids = [...new Set(e.details.sourceIds)].filter((id) => id in sources).slice(0, 3);
  return (
    <ActivityItem helper={helper} summary={e.headline} label={e.headline} at={e.at} now={now} status={fromEvent[e.status]} open={open} onToggle={onToggle}>
      {e.because && <p className="text-sm text-pretty">{e.because}</p>}
      {e.steps.length > 0 && (
        <ol className="space-y-1.5">
          {e.steps.map((s, i) => (
            <li key={i} className={cn("flex items-start gap-2 text-[13px]", s.skipped && "opacity-50")}>
              <AgentAvatar agent={s.helper} className="mt-px size-5 shrink-0" />
              <span className="min-w-0 flex-1"><b className="font-medium">{HELPER_NAME[s.helper]}</b> <span className="text-muted-foreground">{s.skipped ? `was off, so it skipped this: ${s.text.charAt(0).toLowerCase()}${s.text.slice(1)}` : s.text}</span></span>
            </li>
          ))}
        </ol>
      )}
      <SourcesLine ids={ids} />
    </ActivityItem>
  );
}

/** "Where it looked": the documents a run or event read, as small chips on one line. */
export function SourcesLine({ ids }: { ids: string[] }) {
  const known = ids.filter((id) => id in sources);
  if (!known.length) return null;
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>Where it looked</span>
      {known.map((id) => <SafeSource key={id} id={id} />)}
    </p>
  );
}
