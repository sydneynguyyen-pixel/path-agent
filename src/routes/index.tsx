import { createFileRoute, Link } from "@tanstack/react-router";
import { PostingLink } from "@/components/app/PostingLink";
import { Fragment, useState } from "react";
import { CheckCircle2, ArrowRight, AlertTriangle, CalendarClock, CalendarDays, CalendarPlus, Sparkles, ChevronDown } from "lucide-react";
import { requirements, options, student, terms, progress, schools, outsideSchool, DROP_DEADLINE, careerRoles, freeTime, opportunities, type ReqStatus, type Term } from "@/data/scenario";
import { canConfirm, confirmLabel, gapProgress, goalFor, nextSuggestion, planTermId, suggestionWhy, hostLine } from "@/lib/opportunities";
import { useConfirmWent, useSaveToPlan } from "@/components/app/PlanActions";
import { recoveryPath } from "@/lib/confidence";
import { BlankHome } from "@/components/app/BlankState";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { SourceChip, StatusBadge } from "@/components/app/bits";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TermIcon, SubjectIcon, AgentAvatar } from "@/components/app/Brand";
import { cn } from "@/lib/utils";
import { seasonFor } from "@/components/app/Brand";
import { defaultSelectedTermId, selectTerm } from "@/lib/term-selection";
import sceneHome from "@/assets/scene-home.jpg";
import { Flyer } from "@/components/app/Flyer";
import { photoUrl } from "@/lib/photos";
import { Spot } from "@/components/app/Illustrations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Home — Path Agent" },
      { name: "description", content: "Maya's full transfer path from Bayview to Northgate, with what needs attention now." },
      { property: "og:title", content: "Home — Path Agent" },
      { property: "og:description", content: "Your whole degree path, every term through graduation, with sources on every claim." },
    ],
  }),
  component: Home,
});

function Attention() {
  const j = useJourney();
  const chosen = options.find((o) => o.id === j.chosenId);
  let icon = <AgentAvatar agent="backup" bare />;
  let title = "Summer 2027 registration is open";
  let body = "Closes Jun 18. If a class is full, I'll find you a backup.";
  let action = <Button asChild><Link to="/portal" search={{ start: true }}>Go to registration <ArrowRight className="size-4" /></Link></Button>;
  if (j.atRisk) {
    icon = <AgentAvatar agent="backup" bare />;
    title = j.counselor === "declined" ? "Your counselor declined that course" : "Statistics needs a new plan";
    body = j.counselor === "declined" ? `Drop ${chosen?.course} by ${DROP_DEADLINE}. MATH 13 still has open seats.` : "STAT 2 is full. I found options that still count.";
    action = <Button onClick={() => j.setPanelOpen(true)}>See options</Button>;
  } else if (j.seatHeld && chosen && !j.counselor) {
    icon = <AgentAvatar agent="planner" bare />;
    const hold = recoveryPath(chosen) === "hold";
    title = hold ? `You hold a seat in ${chosen.course}` : `You're set with ${chosen.course}`;
    body = hold ? `Counselor confirmation is pending. Drop by ${DROP_DEADLINE} if not confirmed.` : "It counts toward Statistics.";
    action = <Button variant="outline" asChild><Link to="/agents" search={{ tab: "decisions" }}>View your decisions</Link></Button>;
  } else if (j.counselor === "confirmed" && chosen) {
    icon = <AgentAvatar agent="planner" bare />;
    title = "All set for summer";
    body = `${student.counselor} confirmed ${chosen.course} counts toward Statistics.`;
    action = <Button variant="outline" asChild><Link to="/semester">See your terms</Link></Button>;
  }
  return (
    <div className="surface flex flex-wrap items-center gap-4 p-5">
      <div className="grid place-items-center">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="aqua-chip mb-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold">Needs your attention</div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
      {action}
    </div>
  );
}

/** Brings up one thing outside class: a check-in if something's on the plan, otherwise a suggestion. */
function NextOutsideClass() {
  const j = useJourney();
  const save = useSaveToPlan();
  const confirm = useConfirmWent();
  const saved = opportunities.filter((o) => j.savedOpportunities.includes(o.id));
  const went = Object.keys(j.wentTo);
  const upcoming = saved.filter((o) => !went.includes(o.id) && canConfirm(o, terms, SCRIPT_TODAY)).sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0];
  const goal = goalFor(careerRoles, j.interestedRoles);
  const open = goal.missing.filter((g) => { const p = gapProgress(g, saved, went); return !p || p.stage === "planned"; });
  const pick = upcoming || !j.agentOn.planner || j.paused ? undefined : nextSuggestion(opportunities, open, freeTime, [...j.savedOpportunities, ...j.skippedSuggestions], SCRIPT_TODAY);
  const o = upcoming ?? pick;
  if (!o) return null;
  return (
    <div data-plan-card className="surface flex flex-wrap items-center gap-4 p-5">
      {o.flyer && <Flyer flyer={o.flyer} photo={photoUrl(o.photo, 300)} className="size-24 shrink-0 rounded-xl" />}
      <div className="min-w-0 flex-1 basis-60">
        <div className="aqua-chip mb-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold">{upcoming ? "On your plan" : `For your ${goal.title} goal`}</div>
        <div className="font-medium">{o.title}</div>
        <div className="text-xs text-muted-foreground">{hostLine(o)} · {o.when}</div>
        <PostingLink item={o} className="mt-1" />
        {!upcoming && <p className="mt-1.5 text-sm text-muted-foreground">{suggestionWhy(o, open, goal.title)}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {upcoming ? <>
          <Button variant="outline" onClick={(e) => confirm(o, e.currentTarget)}>{confirmLabel(o)}</Button>
          <Button variant="ghost" asChild><Link to="/semester" search={{ term: planTermId(o, terms, SCRIPT_TODAY) }}>See your plan</Link></Button>
        </> : <>
          <Button variant="outline" onClick={(e) => save(o, e.currentTarget)}>Add to my plan</Button>
          <Button variant="ghost" asChild><Link to="/explore" search={{ open: o.id }}>See details</Link></Button>
          <Button variant="ghost" onClick={() => j.skipSuggestion(o.id)}>Not for me</Button>
        </>}
      </div>
    </div>
  );
}

const termTone: Record<Term["status"], string> = {
  done: "term-status-completed",
  in_progress: "aqua-chip",
  registering: "term-status-registering",
  planned: "term-status-planned",
};
const termLabel: Record<Term["status"], string> = { done: "Completed", in_progress: "Current term", registering: "Registering now", planned: "Planned" };
const termAction: Record<Term["status"], string> = { done: "See grades", in_progress: "See this term", registering: "Go to registration", planned: "Edit plan" };

function TransferReadiness() {
  const pre = requirements.filter((r) => r.detail.startsWith("BCC") || r.detail.startsWith("Planned: BCC"));
  const done = pre.filter((r) => r.status === "done" || r.status === "transfer").length;
  const ip = pre.filter((r) => r.status === "in_progress" || r.status === "pending").length;
  const left = pre.length - done - ip;
  return (
    <div className="surface mb-3 flex items-center gap-6 p-5">
      <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <b className="font-medium">Ready to transfer: {done} of {pre.length} Bayview requirements</b>
        <span className="text-xs text-muted-foreground">{ip} in progress · {left} still to take</span>
      </div>
      <div className="mt-2 flex h-2 gap-1" role="img" aria-label={`${done} of ${pre.length} requirements complete`}>
        {pre.map((r) => <div key={r.id} title={`${r.code} ${r.name}`} className={cn("flex-1 rounded-full", r.status === "done" || r.status === "transfer" ? "aqua-chip" : r.status === "in_progress" || r.status === "pending" ? "aqua-chip opacity-50" : "bg-secondary")} />)}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {pre.map((r) => <li key={r.id} className="flex items-center gap-1">{r.status === "done" || r.status === "transfer" ? <CheckCircle2 className="size-3 text-mark-yes" /> : <span className="size-3 rounded-full border" />}{r.name}</li>)}
      </ul>
      </div>
      <Spot name="bridge" className="hidden w-32 sm:block" />
    </div>
  );
}

function OutsideClass() {
  const o = outsideSchool;
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium">A class from another school that counts</h2>
      <div className="mb-3 flex items-center gap-3">
        <SchoolLogo school="lakeshore" className="size-9" />
        <div>
          <div className="font-medium">{o.name}</div>
          <div className="text-xs text-muted-foreground">{o.note} · {o.system}</div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <div className="surface flex flex-col justify-center p-5">
          <div className="text-xs text-muted-foreground">{o.course.term}</div>
          <div className="mt-1 font-medium">{o.course.code} <span className="font-normal text-muted-foreground">{o.course.title}</span></div>
          <div className="mt-2 text-xs text-muted-foreground">{o.course.units} · {o.course.reason}</div>
        </div>
        <ArrowRight className="hidden size-5 self-center text-muted-foreground md:block" aria-hidden="true" />
        <div className="surface p-5">
          <div className="flex items-center justify-between gap-2 text-xs"><span className="aqua-chip rounded-full px-2 py-0.5 font-medium">{o.transfer.verdict}</span><span className="text-muted-foreground">{Math.round(o.transfer.confidence * 100)}% confident</span></div>
          <div className="mt-2 font-medium">{o.transfer.lands}</div>
          <div className="mt-1 text-xs text-muted-foreground">{o.transfer.units}</div>
          <p className="mt-2 text-xs text-muted-foreground">{o.transfer.caution}</p>
          <div className="mt-2 text-[11px] text-muted-foreground">Source: {o.transfer.source}</div>
        </div>
      </div>
    </section>
  );
}

function PathTimeline() {
  const j = useJourney();
  const [selectedId, setSelectedId] = useState(defaultSelectedTermId);
  const chosen = options.find((o) => o.id === j.chosenId);
  const now = terms.filter((t) => t.status === "in_progress" || t.status === "registering");
  const past = terms.filter((t) => t.status === "done").length;
  const planned = terms.filter((t) => t.status === "planned").length;
  const isOpen = (_t: Term) => true;
  return (
    <div className="stagger space-y-8">
      <OutsideClass />
      <section>
        <h2 className="mb-3 text-sm font-medium">Happening now</h2>
        <div className="grid items-start gap-3 sm:grid-cols-2">
          {now.map((t) => (
            <article key={t.id} role="button" tabIndex={0} aria-label={t.name} aria-pressed={selectedId === t.id}
                onClick={() => setSelectedId((current) => selectTerm(current, t.id))}
                onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedId((current) => selectTerm(current, t.id)); } }}
                className={cn("term-card edge-term-card", `term-state-${t.status}`, selectedId === t.id && "term-selected", !isOpen(t) && "term-compact")}>
                <div className={cn("term-edge-stripe", `mesh-${seasonFor(t.name)}`)} />
                <div className="term-edge-header">
                  <div className="flex min-w-0 items-center gap-2"><TermIcon term={t.name} /><div className="min-w-0">{t.status === "in_progress" && <div className="term-here">You are here</div>}<span className="term-edge-name">{t.name}</span></div></div>
                  <span className={cn("term-status-chip", termTone[t.status])}>
                    {t.status === "done" && <CheckCircle2 className="size-3 text-mark-yes" />}
                    {t.status === "in_progress" && <><CalendarDays className="size-3 shrink-0" aria-hidden="true" /><span className="term-current-dot animate-pulse-dot" /></>}
                    {t.status === "registering" && <CalendarPlus className="size-3 shrink-0" aria-hidden="true" />}
                    {termLabel[t.status]}
                  </span>
                </div>
                {!isOpen(t) && <div className="term-compact-meta">{t.courses.length} {t.courses.length === 1 ? "course" : "courses"}</div>}
                {isOpen(t) && t.registration && <div className="mt-3 flex items-center gap-1.5 px-4 text-xs text-muted-foreground">{t.status === "registering" && <CalendarClock className="size-3 shrink-0" />}{t.status === "registering" ? "Open now, closes Jun 18." : t.registration}</div>}
                {isOpen(t) && <ul className="mt-3 space-y-1.5 text-sm">
                  {t.courses.map((c) => {
                    const isQr = c.flag === "qr1";
                    const replaced = isQr && j.seatHeld && chosen;
                    return (
                      <li key={c.code + c.title} className={cn("term-course flex items-center justify-between gap-2", isQr && j.atRisk && "bg-warning-soft")}>
                        <SubjectIcon course={replaced ? chosen.course : `${c.code} ${c.title}`} />
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{replaced ? chosen.course.replace("BCC ", "") : c.code}</span>{" "}
                          <span className="text-muted-foreground">{replaced ? "Statistics (QR-1)" : c.title}</span>
                          {isQr && j.atRisk && <span className="ml-1 text-xs text-warning">· full</span>}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{c.grade ?? c.units}</span>
                      </li>
                    );
                  })}
                </ul>}
                {selectedId === t.id && <div className="term-selected-footer"><span>Selected</span><Button size="sm" className="h-8 font-semibold" asChild onClick={(event) => event.stopPropagation()}><Link to={t.status === "registering" ? "/portal" : "/semester"} search={t.status === "registering" ? { start: true } : { term: t.id }}>{termAction[t.status]}</Link></Button></div>}
              </article>
          ))}
        </div>
        <Link to="/semester" className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          See all terms: {past} completed, {planned} planned <ArrowRight className="size-3.5" />
        </Link>
      </section>
    </div>
  );
}

function Requirements() {
  const j = useJourney();
  const chosen = options.find((o) => o.id === j.chosenId);
  return (
      <div className="surface divide-y">
        {requirements.map((r) => {
          let status: ReqStatus = r.status;
          let detail = r.detail;
          let src = r.sourceId;
          if (r.id === "qr1" && j.atRisk) {
            status = "at_risk";
            detail = "STAT 2 is full — replacement options found";
            src = "portal-full";
          }
          if (r.id === "qr1" && j.seatHeld && chosen) {
            const hold = recoveryPath(chosen) === "hold";
            status = hold ? "pending" : "in_progress";
            detail = hold
              ? `Seat held: ${chosen.course} §${chosen.section} · awaiting ${student.counselor} · drop by ${DROP_DEADLINE} if not confirmed`
              : `Enrolled: ${chosen.course} §${chosen.section} · Summer 2027`;
            src = chosen.sourceIds[0]!;
          }
          if (r.id === "qr1" && chosen && j.counselor === "confirmed") {
            status = "done";
            detail = `${chosen.course} §${chosen.section} · confirmed by ${student.counselor}`;
            src = "counselor-confirm";
          }
          if (r.id === "qr1" && chosen && j.counselor === "declined") {
            status = "at_risk";
            detail = `Counselor declined ${chosen.course}. Drop it by ${DROP_DEADLINE}; MATH 13 still has seats.`;
          }
          return (
            <div key={r.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">{r.code} · {r.units}</div>
                <div className="font-serif text-lg">{r.name}</div>
                <div className="text-sm text-muted-foreground">{detail}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SourceChip id={src} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={status} />
                {status === "at_risk" && (
                  <button onClick={() => j.setPanelOpen(true)} className="text-sm text-primary underline">See options</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
  );
}

function Conversion() {
  return (
      <section>
        
        <p className="mt-1 text-sm text-muted-foreground">Bayview uses quarters; Northgate uses semesters. Both schools' rules agree:</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {([
            ["Bayview CC policy", "1 quarter unit = 0.667 semester units", "bcc-units"],
            ["Northgate State policy", "5 quarter units → 3.3 semester units (rounded)", "nsu-units"],
          ] as const).map(([h, rule, id]) => (
            <div key={id} className="surface p-5">
              <div className="text-xs text-muted-foreground">{h}</div>
              <div className="mt-1 font-serif text-lg">{rule}</div>
              <div className="mt-3 flex gap-2"><SourceChip id={id} /></div>
            </div>
          ))}
        </div>
      </section>
  );
}

function Home() {
  const j = useJourney();
  if (j.pathBuilt === false) return <BlankHome />;
  const pct = Math.round((progress.earned / progress.needed) * 100);
  const pctIp = Math.round(((progress.earned + progress.inProgress) / progress.needed) * 100);
  return (
    <div className="space-y-8">
      <div className="home-cover">
      <img src={sceneHome} alt="" className="home-cover-art" width={1376} height={768} />
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="home-greeting font-semibold">Hi {student.name.split(" ")[0]}, you're on track.</h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <SchoolLogo school="bayview" className="size-6" /> Bayview CC
            <ArrowRight className="size-4" />
            <SchoolLogo school="northgate" className="size-6" /> Northgate State · Psychology B.A.
          </div>
        </div>
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.earned} of {progress.needed} semester units</span>
            <span>Graduate {progress.gradTerm}</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
            <div className="relative h-full">
              <div className="absolute inset-y-0 left-0 rounded-full bg-secondary" style={{ width: `${pctIp}%` }} />
              <div className="bar-fill absolute inset-y-0 left-0 rounded-full aqua-chip" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">{pct}% complete · {progress.inProgress} semester units in progress</div>
        </div>
      </div>

      <div className="home-cover-card"><Attention /></div>
      </div>

      <NextOutsideClass />

      <Tabs defaultValue="path">
        <TabsList className="rounded-full">
          <TabsTrigger value="path" className="rounded-full">Your path</TabsTrigger>
          <TabsTrigger value="reqs" className="rounded-full">Requirements</TabsTrigger>
          <TabsTrigger value="units" className="rounded-full">How units convert</TabsTrigger>
        </TabsList>
        <TabsContent value="path" className="mt-6"><PathTimeline /></TabsContent>
        <TabsContent value="reqs" className="mt-6"><TransferReadiness /><Requirements /></TabsContent>
        <TabsContent value="units" className="mt-6"><Conversion /></TabsContent>
      </Tabs>
    </div>
  );
}
