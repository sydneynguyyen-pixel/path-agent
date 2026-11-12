import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CalendarPlus, CheckCircle2, Clock, RotateCw, X } from "lucide-react";
import { APPLY_DEADLINE, DROP_DEADLINE, goTogetherEvent, options, student } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { daysUntil, homeLayout, type HomeAlert } from "@/lib/home";
import { briefingLead } from "@/lib/chat";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { awaySummary } from "@/lib/run";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "./Brand";
import { PersonPhoto } from "./PersonPhoto";
import { usePeerState } from "./GoTogether";

/*
 * Sprout's morning briefing. It lives in the chat as the pinned "Today" thread, and opens itself
 * above the bar once a day on Home, so everything the agent says comes from the same place she types.
 */

type Alert = HomeAlert & { title: string; body: string; icon: ReactNode; action?: ReactNode };

/** Everything Home might raise right now, each at one of the four levels. */
export function useAlerts(): Alert[] {
  const j = useJourney();
  const chosen = options.find((o) => o.id === j.chosenId);
  const days = daysUntil(APPLY_DEADLINE, SCRIPT_TODAY);
  const peerState = usePeerState();
  const list: Alert[] = [
    { id: "apply", level: "deadline", icon: <CalendarClock className="size-4" aria-hidden="true" />, title: `Northgate application closes Nov 30, in ${days} days`, body: "I've filled in what your records show. You review it and submit.", action: <Button size="sm" variant="outline" className="desk-btn" asChild><Link to="/degree">Review</Link></Button> },
  ];
  if (j.atRisk) {
    const declined = j.counselor === "declined";
    list.push({ id: "stat", level: "deadline", icon: <AlertTriangle className="size-4" aria-hidden="true" />, title: declined ? `Your counselor declined ${chosen?.course ?? "that course"}` : "Statistics needs a new plan", body: declined ? `Drop it by ${DROP_DEADLINE}. MATH 13 still has open seats.` : "STAT 2 is full. I found options that still count.", action: <Button size="sm" className="desk-btn" onClick={() => j.setPanelOpen(true)}>See options</Button> });
  }
  // Someone asked to go with you. You see their card before you decide.
  for (const p of goTogetherEvent.visiblePeers.filter((x) => peerState(x) === "asked-you")) {
    list.push({ id: `ask-${p.id}`, level: "decision", icon: <PersonPhoto photo={p.photo} org={p.org} size="sm" />, title: `${p.name} wants to go to ${goTogetherEvent.name} with you`, body: `${p.note}. ${p.why}.`, action: <Button size="sm" variant="outline" className="desk-btn" onClick={() => j.openOpportunity(goTogetherEvent.id, { tab: "people", peer: p.id })}>See note</Button> });
  }
  // A run finished while she was elsewhere: say what changed, once.
  const away = j.awayRun && j.agentRun ? awaySummary(j.agentRun, options.find((o) => o.id === j.agentRun?.result?.optionId)?.course.replace("BCC ", "") ?? null) : null;
  if (away) {
    list.push({ id: "away", level: "update", icon: <RotateCw className="size-4" aria-hidden="true" />, title: away.title, body: away.body, action: <Button size="sm" variant="outline" className="desk-btn" onClick={() => j.setPanelOpen(true)}>See what changed</Button> });
  }
  if (j.seatHeld && chosen && !j.counselor) {
    const hold = recoveryPath(chosen) === "hold";
    list.push({ id: "seat", level: "update", icon: <AgentAvatar agent="planner" bare className="size-5" />, title: hold ? `You hold a seat in ${chosen.course}` : `You're set with ${chosen.course}`, body: hold ? `Counselor confirmation is pending. Drop by ${DROP_DEADLINE} if not confirmed.` : "It counts toward Statistics.", action: <Button size="sm" variant="outline" className="desk-btn" asChild><Link to="/agents">Activity</Link></Button> });
  } else if (j.counselor === "confirmed" && chosen) {
    list.push({ id: "confirmed", level: "update", icon: <CheckCircle2 className="size-4" aria-hidden="true" />, title: "All set for winter", body: `${student.counselor} confirmed ${chosen.course} counts toward Statistics.`, action: <Button size="sm" variant="outline" className="desk-btn" asChild><Link to="/semester" search={{ term: "w27" }}>See Winter</Link></Button> });
  } else if (!j.atRisk) {
    list.push({ id: "register", level: "update", icon: <CalendarPlus className="size-4" aria-hidden="true" />, title: "Your Winter 2027 classes are ready to register", body: "Registration closes Nov 20. If a class is full, I'll find you a backup.", action: <Button size="sm" variant="outline" className="desk-btn" asChild><Link to="/portal" search={{ start: true }}>Register</Link></Button> });
  }
  return list;
}

/** One line in the briefing. Deadlines stay; decisions snooze; updates dismiss. */
function BriefRow({ alert: a }: { alert: Alert }) {
  const j = useJourney();
  const deadline = a.level === "deadline";
  const decision = a.level === "decision";
  return (
    <li className="desk-row">
      <span className={cn("desk-row-icon", deadline && "desk-row-icon-urgent")}>{a.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold" title={a.title}>{deadline && <span className="sr-only">Deadline: </span>}{a.title}</div>
        <div className="truncate text-xs text-muted-foreground" title={a.body}>{a.body}</div>
      </div>
      <span className="flex shrink-0 items-center gap-0.5">
        {a.action}
        {!deadline && (
          <Button size="icon" variant="ghost" className="size-8 rounded-full" onClick={() => j.clearHomeItem(a.id, decision ? "snoozed" : "dismissed")} aria-label={`${decision ? "Later" : "Dismiss"}: ${a.title}`} title={decision ? "Later" : "Dismiss"}>
            {decision ? <Clock className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
          </Button>
        )}
      </span>
    </li>
  );
}

/** What the briefing holds right now: the rows that need her, and everything else she's put away or that didn't fit. */
export function useBriefing() {
  const j = useJourney();
  const alerts = useAlerts();
  // When the Deadline widget is on Home, the application countdown lives there instead of in the briefing.
  const deadlineShown = j.desk.widgets.some((w) => w.kind === "deadline");
  const urgent = alerts.filter((a) => a.level === "deadline" && !(deadlineShown && a.id === "apply"));
  const { rows, inbox, unread } = homeLayout(alerts, j.homeCleared, Math.max(1, 3 - urgent.length));
  const items = [...urgent, ...rows];
  return { items, inbox, unread, lead: briefingLead(items.length) };
}

/** The briefing as Sprout's message: the lead line and the rows, each with its own action. */
export function BriefingMessage({ compact = false }: { compact?: boolean }) {
  const { items, lead } = useBriefing();
  return (
    <div>
      <p className={cn("font-semibold", compact ? "text-[15px]" : "text-base")}>{lead}</p>
      {items.length > 0 && <ul className="mt-3 space-y-2">{items.map((a) => <BriefRow key={a.id} alert={a} />)}</ul>}
    </div>
  );
}

/** Older and put-away updates, under today's briefing in the Today thread. Nothing is lost. */
export function BriefingEarlier() {
  const j = useJourney();
  const { inbox } = useBriefing();
  if (inbox.length === 0) return null;
  return (
    <section aria-label="Earlier updates" className="mt-6">
      <h3 className="agent-group">Earlier</h3>
      <ul className="mt-2 space-y-2">
        {inbox.map((a) => {
          const how = j.homeCleared[a.id];
          return (
            <li key={a.id} className="desk-row">
              <span className="desk-row-icon">{a.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{a.title}</div>
                <div className="truncate text-xs text-muted-foreground">{how === "snoozed" ? "Snoozed" : how === "dismissed" ? "Read" : "More from this morning"}</div>
              </div>
              {how ? <Button size="sm" variant="ghost" className="desk-btn" onClick={() => j.restoreHomeItem(a.id)}>Put back</Button> : a.action}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
