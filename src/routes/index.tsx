import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CalendarClock, CalendarDays, CalendarPlus } from "lucide-react";
import { options, student, terms, progress, outsideSchool, DROP_DEADLINE, type Term } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { BlankHome } from "@/components/app/BlankState";
import { useJourney } from "@/lib/journey";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { Button } from "@/components/ui/button";
import { TermIcon, SubjectIcon, AgentAvatar, seasonFor } from "@/components/app/Brand";
import { cn } from "@/lib/utils";
import { defaultSelectedTermId, selectTerm } from "@/lib/term-selection";
import valleyHome from "@/assets/valley-home.jpg";
import mayaPhoto from "@/assets/maya.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { title: "Path — Academic Path Agent" },
    { name: "description", content: "Maya's current term and road to Northgate, with one clear next step." },
    { property: "og:title", content: "Path — Academic Path Agent" },
    { property: "og:description", content: "A calm view of where Maya is now and what comes next." },
  ] }),
  component: Home,
});

function Attention() {
  const j = useJourney();
  const chosen = options.find((o) => o.id === j.chosenId);
  let icon = <AgentAvatar agent="backup" bare />;
  let title = "Summer 2027 registration is open";
  let body = "Register as usual in your school portal. I'll watch for full sections and help you recover.";
  let action = <Button asChild><Link to="/portal">Go to registration <ArrowRight className="size-4" /></Link></Button>;
  if (j.atRisk) {
    title = j.counselor === "declined" ? "Your counselor declined that course" : "Statistics needs a new plan";
    body = j.counselor === "declined" ? `Drop ${chosen?.course} by ${DROP_DEADLINE}. MATH 13 still has open seats.` : "STAT 2 is full. I found three open options worth checking.";
    action = <Button onClick={() => j.setPanelOpen(true)}>See options</Button>;
  } else if (j.seatHeld && chosen && !j.counselor) {
    icon = <AgentAvatar agent="planner" bare />;
    const hold = recoveryPath(chosen) === "hold";
    title = hold ? `You hold a seat in ${chosen.course}` : `You're set with ${chosen.course}`;
    body = hold ? `Counselor confirmation is pending. Drop by ${DROP_DEADLINE} if not confirmed.` : "It counts toward Statistics. The agent didn't register anything — you did.";
    action = <Button variant="outline" asChild><Link to="/agents" search={{ tab: "decisions" }}>View your decisions</Link></Button>;
  } else if (j.counselor === "confirmed" && chosen) {
    icon = <AgentAvatar agent="planner" bare />;
    title = "All set for summer";
    body = `${student.counselor} confirmed ${chosen.course} counts toward Statistics.`;
    action = <Button variant="outline" asChild><Link to="/semester" search={{ term: "su27" }}>See this term</Link></Button>;
  }
  return (
    <section aria-label="Needs your attention" className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-5 shadow-frame">
      <div className="grid place-items-center">{icon}</div>
      <div className="min-w-0 flex-1"><div className="aqua-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold">Needs your attention</div><div className="mt-2 font-medium">{title}</div><div className="mt-1 text-sm text-muted-foreground">{body}</div></div>
      {action}
    </section>
  );
}

function PathRoad() {
  const upcoming = terms.filter((t) => t.status !== "done");
  const pct = Math.round((progress.earned / progress.needed) * 100);
  const pctIp = Math.round(((progress.earned + progress.inProgress) / progress.needed) * 100);
  return (
    <section className="overflow-hidden rounded-[28px] border bg-card shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-6 p-6">
        <div><h1 className="text-3xl font-semibold">Hi {student.name.split(" ")[0]}, you're on track.</h1><div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><SchoolLogo school="bayview" className="size-6" /> Bayview CC <ArrowRight className="size-4" /><SchoolLogo school="northgate" className="size-6" /> Northgate State · Psychology B.A.</div></div>
        <div className="w-full max-w-sm"><div className="flex justify-between text-xs text-muted-foreground"><span>{progress.earned} of {progress.needed} semester units</span><span>Graduate {progress.gradTerm}</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary"><div className="relative h-full"><div className="absolute inset-y-0 left-0 rounded-full bg-secondary" style={{ width: `${pctIp}%` }} /><div className="bar-fill absolute inset-y-0 left-0 rounded-full aqua-chip" style={{ width: `${pct}%` }} /></div></div><div className="mt-1.5 text-xs text-muted-foreground">{pct}% complete · {progress.inProgress} su in progress</div></div>
      </div>
      <div className="relative h-[290px] overflow-hidden border-t sm:h-[320px]">
        <img src={valleyHome} alt="A watercolor road through the terms toward graduation" className="absolute inset-0 size-full object-cover object-[50%_bottom]" width={1376} height={768} />
        <div className="absolute inset-x-0 bottom-0 overflow-x-auto px-4 pb-4 pt-16">
          <ol className="flex min-w-[720px] items-end justify-between gap-2">
            {upcoming.map((term) => <li key={term.id} className="relative flex w-28 flex-col items-center text-center">
              {term.status === "in_progress" && <div className="mb-1 flex flex-col items-center"><span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">Maya</span><img src={mayaPhoto} alt="Maya at the current term" className="mt-1 size-8 rounded-full border-2 border-card object-cover" /></div>}
              <Link to="/semester" search={{ term: term.id }} className="flex w-full flex-col items-center rounded-2xl border bg-card/95 p-2 shadow-soft backdrop-blur transition-transform hover:-translate-y-1"><TermIcon term={term.name} /><span className="mt-1 text-xs font-medium">{term.name}</span><span className="text-[10px] text-muted-foreground">{term.status === "in_progress" ? "You are here" : term.status === "registering" ? "Next" : "Upcoming"}</span></Link>
            </li>)}
          </ol>
        </div>
      </div>
    </section>
  );
}

const termTone: Record<Term["status"], string> = { done: "term-status-completed", in_progress: "aqua-chip", registering: "term-status-registering", planned: "term-status-planned" };
const termLabel: Record<Term["status"], string> = { done: "Completed", in_progress: "Current term", registering: "Registering now", planned: "Planned" };

function CurrentTerms() {
  const j = useJourney();
  const [selectedId, setSelectedId] = useState(defaultSelectedTermId);
  const chosen = options.find((o) => o.id === j.chosenId);
  const now = terms.filter((t) => t.status === "in_progress" || t.status === "registering");
  return (
    <section><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-medium">Current term → next term</h2><Link to="/semester" search={{ term: "su27" }} className="text-xs text-muted-foreground underline">All upcoming terms</Link></div><div className="grid items-start gap-4 lg:grid-cols-2">
      {now.map((t) => <article key={t.id} role="button" tabIndex={0} aria-label={t.name} aria-pressed={selectedId === t.id} onClick={() => setSelectedId((current) => selectTerm(current, t.id))} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedId((current) => selectTerm(current, t.id)); } }} className={cn("term-card edge-term-card", `term-state-${t.status}`, selectedId === t.id && "term-selected")}>
        <div className={cn("term-edge-stripe", `mesh-${seasonFor(t.name)}`)} /><div className="term-edge-header"><div className="flex min-w-0 items-center gap-2"><TermIcon term={t.name} /><div className="min-w-0">{t.status === "in_progress" && <div className="term-here">You are here</div>}<span className="term-edge-name">{t.name}</span></div></div><span className={cn("term-status-chip", termTone[t.status])}>{t.status === "in_progress" ? <><CalendarDays className="size-3" /><span className="term-current-dot animate-pulse-dot" /></> : <CalendarPlus className="size-3" />}{termLabel[t.status]}</span></div>
        {t.registration && <div className="mt-3 flex items-center gap-1.5 px-4 text-xs text-muted-foreground"><CalendarClock className="size-3" />{t.status === "registering" ? "Open now, closes Jun 18." : t.registration}</div>}
        <ul className="mt-3 space-y-1.5 text-sm">{t.courses.map((c) => { const isQr = c.flag === "qr1"; const replaced = isQr && j.seatHeld && chosen; return <li key={c.code + c.title} className={cn("term-course flex items-center justify-between gap-2", isQr && j.atRisk && "bg-warning-soft")}><SubjectIcon course={replaced ? chosen.course : `${c.code} ${c.title}`} /><span className="min-w-0 flex-1"><span className="font-medium">{replaced ? chosen.course.replace("BCC ", "") : c.code}</span> <span className="text-muted-foreground">{replaced ? "Statistics (QR-1)" : c.title}</span>{isQr && j.atRisk && <span className="ml-1 text-xs text-warning">· full</span>}</span><span className="shrink-0 text-xs text-muted-foreground">{c.grade ?? c.units}</span></li>; })}</ul>
        {t.id === "su27" && <div className="mx-4 mb-4 rounded-xl border bg-secondary p-3"><div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl border bg-card text-[10px] font-semibold">LCC</div><div className="min-w-0 flex-1"><div className="text-xs font-medium">Visiting-student class · {outsideSchool.short}</div><div className="mt-1 text-sm">{outsideSchool.course.code} · {outsideSchool.course.title}</div><div className="mt-1 text-xs text-muted-foreground">{outsideSchool.transfer.lands} · C or better</div><div className="mt-1 text-[11px] text-muted-foreground">Source: {outsideSchool.transfer.source}</div></div></div></div>}
        {selectedId === t.id && <div className="term-selected-footer"><span>Selected</span><Button size="sm" className="h-8 font-semibold" asChild onClick={(event) => event.stopPropagation()}><Link to={t.status === "registering" ? "/portal" : "/semester"} search={t.status === "registering" ? {} : { term: t.id }}>{t.status === "registering" ? "Go to registration" : "See this term"}</Link></Button></div>}
      </article>)}
    </div></section>
  );
}

function Home() {
  const j = useJourney();
  if (j.pathBuilt === false) return <BlankHome />;
  return <div className="flex flex-col gap-7"><div className="order-first md:order-2"><Attention /></div><div className="order-2 md:order-1"><PathRoad /></div><div className="order-3"><CurrentTerms /></div></div>;
}
