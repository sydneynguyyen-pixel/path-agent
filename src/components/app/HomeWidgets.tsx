import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight, Bookmark, CalendarClock, CalendarDays, Check, GraduationCap, Map as MapIcon, Pin, Sparkles, Target, Users } from "lucide-react";
import { APPLY_DEADLINE, careerRoles, goTogetherEvent, fallWork, freeTime, opportunities, progress, terms, type Term } from "@/data/scenario";
import { buildSkillsFor, chosenGoals } from "@/lib/goals";
import { CareerMark } from "@/components/app/CareerMark";
import { canConfirm, confirmLabel, gapProgress, nextSuggestion, planTermId, suggestionWhy, hostLine } from "@/lib/opportunities";
import { useConfirmWent, useSaveToPlan } from "@/components/app/PlanActions";
import { daysUntil, dueThisWeek, weekStrip } from "@/lib/home";
import { addWidget, WIDGETS, type Placed, type WidgetKind } from "@/lib/desktop";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { RememberedNotes } from "@/components/app/RunTrace";
import { Button } from "@/components/ui/button";
import { TermIcon, SubjectIcon } from "@/components/app/Brand";
import { PersonPhoto } from "@/components/app/PersonPhoto";
import { usePeerState } from "@/components/app/GoTogether";
import { cn } from "@/lib/utils";
import { Flyer } from "@/components/app/Flyer";
import { photoUrl } from "@/lib/photos";

/** Home's widgets, shared so the agent's chat answers can show the same tile. */
export function NoteReply({ note, compact = false }: { note: string; compact?: boolean }) {
  if (compact) return <p>Got it. I'll remember: <span className="font-medium">{note}</span>.</p>;
  return (
    <>
      <p>Got it. I'll remember: <span className="font-medium">{note}</span>. The helpers use it every time they plan, until you remove it.</p>
      <RememberedNotes className="mt-3" />
    </>
  );
}

/** `answer`: what the live agent wrote. Without it, the scripted preview line for the topic is used. */
export function Reply({ topic, compact = false, answer }: { topic: WidgetKind | null; compact?: boolean; answer?: string | undefined }) {
  const j = useJourney();
  const due = dueThisWeek(fallWork, SCRIPT_TODAY);
  const goal = chosenGoals(careerRoles, j.interestedRoles)[0];
  const text: Record<WidgetKind, string> = {
    week: `${due.length} things are due in the next seven days. Here's how the week looks.`,
    path: `Right now, yes. You have ${progress.earned} of ${progress.needed} units and you're on track to graduate ${progress.gradTerm}.`,
    deadline: `Your Northgate application closes Nov 30, in ${daysUntil(APPLY_DEADLINE, SCRIPT_TODAY)} days. I've filled in what your records show. You review it and submit.`,
    next: "Here's one that fits your goal and your free time.",
    skills: goal ? `For ${goal.title}, these are the skills to build next.` : "You haven't chosen a goal yet. Pick one on Goals and I'll show what to build.",
    saved: "Here's what you've saved.",
    match: `Here's who you're going with, or who wants to go with you.`,
  };
  if (!topic) return <p>{answer ?? "I can't answer that one in this preview. Try asking about your week, your path, your deadline or a club."}</p>;
  const on = j.desk.widgets.some((w) => w.kind === topic);
  const size = WIDGETS[topic].sizes.includes("m") ? "m" : WIDGETS[topic].sizes[0]!;
  // The short answer above the bar shows the same card, so she can act on it right there; pinning waits for the full chat.
  return (
    <>
      <p>{answer ?? text[topic]}</p>
      <div className={cn("desk-glass desk-tile desk-answer mt-3", `desk-${size}`)}><WidgetBody w={{ kind: topic, size }} /></div>
      {compact ? null : on ? <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium"><Check className="size-3.5" aria-hidden="true" />On your Home</span>
        : <Button size="sm" variant="outline" className="mt-2 rounded-full" onClick={() => j.setDesk((d) => ({ ...d, widgets: addWidget(d.widgets, topic, size) }))}><Pin className="size-3.5" aria-hidden="true" />Pin to Home</Button>}
    </>
  );
}

export const ICONS: Record<WidgetKind, ReactNode> = {
  week: <CalendarDays className="size-4" aria-hidden="true" />,
  deadline: <CalendarClock className="size-4" aria-hidden="true" />,
  path: <MapIcon className="size-4" aria-hidden="true" />,
  next: <Sparkles className="size-4" aria-hidden="true" />,
  skills: <Target className="size-4" aria-hidden="true" />,
  saved: <Bookmark className="size-4" aria-hidden="true" />,
  match: <Users className="size-4" aria-hidden="true" />,
};

function TileHead({ kind, title, to, icon }: { kind: WidgetKind; title?: string; to?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon ?? <span className="desk-icon">{ICONS[kind]}</span>}
      <h3 className="truncate text-sm font-semibold">{title ?? WIDGETS[kind].title}</h3>
      {to && <span className="ml-auto shrink-0">{to}</span>}
    </div>
  );
}

const more = "grid size-7 place-items-center rounded-full hover:bg-white/70";
/** This week, then each week until the deadline (at most five marks), as ISO dates. */
const runway = (from: string, to: string) => {
  const out: string[] = [];
  const end = Date.parse(`${to}T12:00:00Z`);
  let t = Date.parse(`${from}T12:00:00Z`);
  for (; t < end; t += 7 * 86400000) out.push(new Date(t).toISOString().slice(0, 10));
  // The deadline takes the last week's place when it falls inside it, so two marks never sit a day apart.
  if (out.length > 1 && end - Date.parse(`${out.at(-1)}T12:00:00Z`) < 4 * 86400000) out.pop();
  out.push(to);
  // Far out, keep this week plus the last few before it closes, which is when it matters.
  return out.length > 5 ? [out[0]!, ...out.slice(-4)] : out;
};
const day = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { ...o, timeZone: "UTC" });

/** Brings up one thing outside class: a check-in if something's on the plan, otherwise a suggestion. */
function useNextPick() {
  const j = useJourney();
  const saved = opportunities.filter((o) => j.savedOpportunities.includes(o.id));
  const went = Object.keys(j.wentTo);
  const upcoming = saved.filter((o) => !went.includes(o.id) && canConfirm(o, terms, SCRIPT_TODAY)).sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];
  const goal = chosenGoals(careerRoles, j.interestedRoles)[0];
  const open = (goal?.missing ?? []).filter((g) => { const p = gapProgress(g, saved, went); return !p || p.stage === "planned"; });
  const pick = upcoming || !j.agentOn.planner || j.paused ? undefined : nextSuggestion(opportunities, open, freeTime, [...j.savedOpportunities, ...j.skippedSuggestions], SCRIPT_TODAY);
  return { o: upcoming ?? pick, upcoming: !!upcoming, open, goal };
}

const termLabel: Record<Term["status"], string> = { done: "completed", in_progress: "current term", registering: "registering", planned: "planned" };

export function WidgetBody({ w }: { w: Placed }) {
  const j = useJourney();
  const save = useSaveToPlan();
  const confirm = useConfirmWent();
  const next = useNextPick();
  switch (w.kind) {
    case "week": {
      const due = dueThisWeek(fallWork, SCRIPT_TODAY);
      const days = weekStrip(fallWork, SCRIPT_TODAY);
      const busiest = [...days].sort((a, b) => b.items.length - a.items.length)[0];
      return (
        <>
          <TileHead kind="week" to={<Link to="/semester" className={more} aria-label="Open calendar"><ArrowRight className="size-4" aria-hidden="true" /></Link>} />
          <ol className="home-strip desk-strip mt-3" aria-label="Next seven days">
            {days.map((d) => (
              <li key={d.date} aria-current={d.date === SCRIPT_TODAY ? "date" : undefined} data-busy={d.items.length > 0 || undefined}>
                <span className="text-[10px] font-semibold uppercase">{day(d.date, { weekday: "short" })}</span>
                <span className="home-strip-date">{day(d.date, { day: "numeric" })}</span>
                <span className="home-strip-dots" aria-label={`${d.items.length} due`}>{d.items.map((it) => <i key={it.course + it.label} />)}</span>
              </li>
            ))}
          </ol>
          {w.size === "l" ? (
            due.length === 0 ? <p className="mt-3 text-sm">Nothing due this week.</p> : (
              <ul className="mt-3 space-y-1.5">
                {due.slice(0, 3).map((it) => (
                  <li key={it.course + it.label} className="desk-row py-1.5">
                    <SubjectIcon course={it.course} className="size-7 shrink-0" />
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{it.label}</div><div className="truncate text-xs text-muted-foreground">{it.course}{it.worth ? ` · ${it.worth}` : ""}</div></div>
                    <span className="shrink-0 text-xs font-medium">{day(it.date, { weekday: "short" })}</span>
                  </li>
                ))}
              </ul>
            )
          ) : <p className="mt-2 text-xs font-medium">{due.length} due{busiest && busiest.items.length > 1 ? ` · busiest ${day(busiest.date, { weekday: "long" })}` : ""}</p>}
        </>
      );
    }
    case "deadline": {
      const d = daysUntil(APPLY_DEADLINE, SCRIPT_TODAY);
      return (
        <>
          <TileHead kind="deadline" />
          <div className={cn("mt-2 flex gap-3", w.size === "m" ? "items-center" : "flex-col gap-0")}>
            <div><b className="desk-big">{d}</b><span className="ml-1 text-sm font-medium">days</span></div>
            <div className="min-w-0 flex-1 text-xs"><div className="font-semibold">Northgate application</div><div className="text-muted-foreground">Closes Nov 30</div></div>
            {w.size === "m" && <Button size="sm" variant="outline" className="desk-btn shrink-0" asChild><Link to="/degree">Review</Link></Button>}
          </div>
          {/* Medium fills its space with the weeks left, so "22 days" reads as a runway, not just a number. */}
          {w.size === "m" && (
            <ol className="desk-runway mt-auto" aria-label="Weeks until it closes">
              {runway(SCRIPT_TODAY, APPLY_DEADLINE).map((wk, i, all) => (
                <li key={wk} data-now={i === 0 || undefined} data-due={i === all.length - 1 || undefined}>
                  <i aria-hidden="true" />
                  <span>{i === 0 ? "This week" : i === all.length - 1 ? `${day(APPLY_DEADLINE, { month: "short", day: "numeric" })} · due` : day(wk, { month: "short", day: "numeric" })}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      );
    }
    case "path": {
      const pct = Math.round((progress.earned / progress.needed) * 100);
      const pctIp = Math.round(((progress.earned + progress.inProgress) / progress.needed) * 100);
      const bar = (
        <span className="relative block h-2.5 overflow-hidden rounded-full bg-white/80">
          <span className="absolute inset-y-0 left-0 rounded-full bg-foreground/15" style={{ width: `${pctIp}%` }} />
          <span className="home-units-fill absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%` }} />
        </span>
      );
      return (
        <>
          <TileHead kind="path" to={w.size !== "s" && <Link to="/map" className={more} aria-label="Open your map"><ArrowRight className="size-4" aria-hidden="true" /></Link>} />
          <Link to="/degree" aria-label={`${progress.earned} of ${progress.needed} units. Open your degree`} className="mt-2 block">
            <span className="flex flex-wrap items-baseline gap-x-1"><b className="desk-big">{progress.earned}</b><span className="text-sm font-medium">of {progress.needed} units</span></span>
            <span className="mt-2 block">{bar}</span>
            <span className="mt-2 block text-xs font-medium">Graduate {progress.gradTerm}</span>
          </Link>
          {w.size === "l" && (
            <ol className="mini-map desk-mini mt-5" aria-label="Terms">
              {terms.map((t) => (
                <li key={t.id} data-status={t.status} aria-current={t.status === "in_progress" ? "step" : undefined}>
                  <Link to="/semester" search={{ term: t.id }} className="mini-stop" aria-label={`${t.name}, ${termLabel[t.status]}`} title={t.name}>
                    <span className="mini-dot"><TermIcon term={t.name} className="size-5" /></span>
                  </Link>
                </li>
              ))}
              <li data-status="grad"><Link to="/degree" className="mini-stop" aria-label={`Graduate ${progress.gradTerm}`}><span className="mini-dot"><GraduationCap className="size-4" aria-hidden="true" /></span></Link></li>
            </ol>
          )}
        </>
      );
    }
    case "next": {
      const { o, upcoming, open, goal } = next;
      if (!o) return <><TileHead kind="next" /><p className="mt-3 text-sm">Nothing to suggest right now.</p></>;
      return (
        <>
          <TileHead kind="next" title={upcoming ? "On your plan" : "Next outside class"} />
          <div className={cn("mt-3 flex gap-3", w.size === "l" && "flex-col")}>
            {o.flyer && <Flyer flyer={o.flyer} photo={photoUrl(o.photo, 300)} className={cn("shrink-0 rounded-xl", w.size === "l" ? "h-32 w-full" : "size-[72px]")} />}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{o.title}</div>
              <div className="truncate text-xs text-muted-foreground">{hostLine(o)} · {o.when}</div>
              {w.size === "l" && !upcoming && goal && <p className="mt-1.5 line-clamp-2 text-xs">{suggestionWhy(o, open, goal.title)}</p>}
              <div className="mt-2 flex gap-1.5">
                {upcoming ? <>
                  <Button size="sm" variant="outline" className="desk-btn" onClick={() => confirm(o)}>{confirmLabel(o)}</Button>
                  {w.size === "l" && <Button size="sm" variant="ghost" className="desk-btn" asChild><Link to="/semester" search={{ term: planTermId(o, terms, SCRIPT_TODAY) }}>See plan</Link></Button>}
                </> : <>
                  <Button size="sm" variant="outline" className="desk-btn" onClick={(e) => save(o, e.currentTarget)}>Add to plan</Button>
                  <Button size="sm" variant="ghost" className="desk-btn" onClick={() => j.openOpportunity(o.id)}>Details</Button>
                </>}
              </div>
            </div>
          </div>
        </>
      );
    }
    case "skills": {
      // Both sides of the goal fill the tile: what she has proof for and what's next, then a way to act on it.
      const goal = chosenGoals(careerRoles, j.interestedRoles)[0];
      if (!goal) {
        return (
          <>
            <TileHead kind="skills" title="Your goal" to={<Link to="/career" className={more} aria-label="Open Career"><ArrowRight className="size-4" aria-hidden="true" /></Link>} />
            <p className="mt-3 text-sm text-muted-foreground">Pick a career you're curious about and this shows what you have and what to build.</p>
            <Link to="/career" className="desk-row mt-3 py-2 text-sm font-medium"><Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 flex-1">Choose your goals</span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /></Link>
          </>
        );
      }
      const tags = (list: string[], have: boolean) => (
        <ul className="mt-1.5 flex flex-wrap gap-1.5 text-xs">{list.map((s) => <li key={s} className={cn("desk-tag inline-flex items-center gap-1", have && "desk-tag-have")}>{have && <Check className="size-3" aria-hidden="true" />}{s}</li>)}</ul>
      );
      return (
        <>
          <TileHead kind="skills" icon={<CareerMark id={goal.id} size="sm" className="size-7 rounded-[9px]" />} title={`Toward ${goal.title}`} to={<Link to="/career" className={more} aria-label="Open Career"><ArrowRight className="size-4" aria-hidden="true" /></Link>} />
          <div className="mt-3 grid grid-cols-2 gap-4">
            {/* Medium keeps each side to what fits without crowding; large shows everything. */}
            <div><p className="text-xs font-medium text-muted-foreground">You have proof for</p>{tags(w.size === "l" ? goal.why : goal.why.slice(0, 1), true)}{w.size !== "l" && goal.why.length > 1 && <p className="mt-1.5 text-xs text-muted-foreground">and {goal.why.length - 1} more</p>}</div>
            <div><p className="text-xs font-medium text-muted-foreground">To build next</p>{tags(buildSkillsFor(goal, j.buildSkills), false)}</div>
          </div>
          {w.size === "l" && goal.beyond.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">Ways to build them</p>
              <ul className="mt-1.5 space-y-1.5">{goal.beyond.map((b) => <li key={b}><Link to="/explore" className="desk-row py-2 text-sm"><Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 flex-1">{b}</span><ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /></Link></li>)}</ul>
            </div>
          )}
        </>
      );
    }
    case "saved": {
      const saved = opportunities.filter((o) => j.savedOpportunities.includes(o.id));
      const shown = saved.slice(0, w.size === "l" ? 5 : 2);
      return (
        <>
          <TileHead kind="saved" to={<Link to="/explore" className={more} aria-label="Open Explore"><ArrowRight className="size-4" aria-hidden="true" /></Link>} />
          {saved.length === 0 ? (
            <div className="mt-3 flex flex-1 items-center gap-3 rounded-2xl bg-white/50 px-4 py-3">
              <span className="desk-icon">{ICONS.saved}</span>
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold">Nothing saved yet</div><div className="text-xs text-muted-foreground">Events, clubs and internships you add land here.</div></div>
              <Button size="sm" variant="outline" className="desk-btn shrink-0" asChild><Link to="/explore">Browse</Link></Button>
            </div>
          ) : (
            <ul className="mt-2 space-y-1">
              {shown.map((o) => (
                <li key={o.id}><button type="button" onClick={() => j.openOpportunity(o.id)} className="desk-row w-full py-1.5 text-left">
                  {o.flyer && <Flyer flyer={o.flyer} photo={photoUrl(o.photo, 120)} className="size-8 shrink-0 rounded-lg" />}
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{o.title}</span><span className="block truncate text-xs text-muted-foreground">{o.when}</span></span>
                </button></li>
              ))}
            </ul>
          )}
        </>
      );
    }
    case "match":
      return <MatchTile />;
  }
}

/** Going together: who said yes, who asked you, or a way to see who's going. */
function MatchTile() {
  const j = useJourney();
  const state = usePeerState();
  const peers = goTogetherEvent.visiblePeers;
  const p = peers.find((x) => state(x) === "matched") ?? peers.find((x) => state(x) === "asked-you");
  return (
    <>
      <TileHead kind="match" />
      {p ? (
        <div className="mt-3 flex flex-1 items-center gap-3 rounded-2xl bg-white/50 px-4 py-3">
          <PersonPhoto photo={p.photo} org={p.org} size="md" />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{state(p) === "matched" ? `Going with ${p.name}` : `${p.name} wants to go with you`}</div><div className="truncate text-xs text-muted-foreground">{goTogetherEvent.name} · {goTogetherEvent.when}</div></div>
          <Button size="sm" variant="outline" className="desk-btn shrink-0" onClick={() => j.openOpportunity(goTogetherEvent.id, { tab: "people", peer: p.id })}>{state(p) === "matched" ? "Contact" : "See note"}</Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-1 items-center gap-3 rounded-2xl bg-white/50 px-4 py-3">
          <span className="flex shrink-0 -space-x-2">{peers.slice(0, 3).map((x) => <PersonPhoto key={x.name} photo={x.photo} org={x.org} size="sm" className="ring-2 ring-white" />)}</span>
          <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{goTogetherEvent.going} Bayview students are going</div><div className="truncate text-xs text-muted-foreground">{goTogetherEvent.name} · {goTogetherEvent.when}</div></div>
          <Button size="sm" variant="outline" className="desk-btn shrink-0" onClick={() => j.openOpportunity(goTogetherEvent.id, { tab: "people" })}>See who</Button>
        </div>
      )}
    </>
  );
}
