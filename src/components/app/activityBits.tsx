import { useEffect, useMemo, useState } from "react";
import { BookOpen, Lightbulb, Hand, UserRoundCheck, CheckCircle2, Hourglass, MinusCircle, CircleAlert } from "lucide-react";
import { buildEvents, type EventStatus, type Permission } from "@/lib/activity";
import { useJourney, fmtStamp, fmtAgo } from "@/lib/journey";
import { cn } from "@/lib/utils";

export function useEvents() {
  const j = useJourney();
  return useMemo(() => (j.pathBuilt ? buildEvents(j) : []), [j.pathBuilt, j.savedAt, j.wentTo, j.stage, j.chosenId, j.seatHeld, j.emailSent, j.counselor, j.agentOn, j.agentTimes, j.agentRun, j.decisions, j.goTogether, j.startedAt]);
}

/** Scripted "now", ticking. Null until hydrated so SSR matches. */
export function useScriptNow() {
  const j = useJourney();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(j.scriptNow());
    const t = setInterval(() => setNow(j.scriptNow()), 15000);
    return () => clearInterval(t);
  }, [j.startedAt]);
  return now;
}

/** Relative time with the exact time on hover; exact time also visible on touch devices. */
export function When({ d, now }: { d: Date; now: number | null }) {
  return (
    <time dateTime={d.toISOString()} title={fmtStamp(d)} className="text-xs text-muted-foreground">
      <span className="[@media(hover:none)]:hidden">{now ? fmtAgo(d, now) : fmtStamp(d)}</span>
      <span className="hidden [@media(hover:none)]:inline">{fmtStamp(d)}</span>
    </time>
  );
}

const permMap: Record<Permission, { label: string; icon: typeof BookOpen }> = {
  read: { label: "Read only", icon: BookOpen },
  suggested: { label: "Suggested", icon: Lightbulb },
  needs_ok: { label: "Needs your OK", icon: UserRoundCheck },
  handed: { label: "Handed to you", icon: Hand },
};
export function PermChip({ p }: { p: Permission }) {
  const m = permMap[p];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
      <m.icon className="size-3" aria-hidden /> {m.label}
    </span>
  );
}

const statusMap: Record<EventStatus, { label: string; icon: typeof BookOpen; cls: string }> = {
  needs_ok: { label: "Needs your OK", icon: CircleAlert, cls: "bg-warning-soft text-warning" },
  handed: { label: "Handed to you", icon: Hand, cls: "bg-warning-soft text-warning" },
  done: { label: "Done", icon: CheckCircle2, cls: "bg-success-soft text-success" },
  waiting: { label: "Waiting on counselor", icon: Hourglass, cls: "bg-info-soft text-info" },
  nothing: { label: "Nothing needed", icon: MinusCircle, cls: "bg-secondary text-muted-foreground" },
};
export function EventStatusChip({ s, className }: { s: EventStatus; className?: string }) {
  const m = statusMap[s];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", m.cls, className)}>
      <m.icon className="size-3.5" aria-hidden /> {m.label}
    </span>
  );
}
