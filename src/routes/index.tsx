import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ArrowRight, AlertTriangle, CalendarClock, Sparkles } from "lucide-react";
import { requirements, options, student, terms, progress, schools, DROP_DEADLINE, type ReqStatus, type Term } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { useJourney } from "@/lib/journey";
import { ConfidenceBadge, SourceChip, StatusBadge } from "@/components/app/bits";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TermIcon, SubjectIcon, AgentAvatar } from "@/components/app/Brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Home — Academic Path Agent" },
      { name: "description", content: "Maya's full transfer path from Bayview to Northgate, with what needs attention now." },
      { property: "og:title", content: "Home — Academic Path Agent" },
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
  let body = "Register as usual in your school portal. I'll watch for problems like full sections and help you recover.";
  let action = <Button asChild><Link to="/portal">Go to registration <ArrowRight className="size-4" /></Link></Button>;
  let tone = "bg-secondary";
  if (j.atRisk) {
    icon = <AgentAvatar agent="backup" bare />;
    title = j.counselor === "declined" ? "Your counselor declined that course" : "Statistics needs a new plan";
    body = j.counselor === "declined" ? `Drop ${chosen?.course} by ${DROP_DEADLINE}. MATH 13 still has open seats.` : "STAT 2 is full. I found options that still count, ranked by open seats.";
    action = <Button onClick={() => j.setPanelOpen(true)}>See options</Button>;
    tone = "bg-secondary";
  } else if (j.seatHeld && chosen && !j.counselor) {
    icon = <AgentAvatar agent="planner" bare />;
    const hold = recoveryPath(chosen) === "hold";
    title = hold ? `You hold a seat in ${chosen.course}` : `You're set with ${chosen.course}`;
    body = hold ? `Counselor confirmation is pending. Drop by ${DROP_DEADLINE} if not confirmed.` : "It clearly counts toward Statistics. The agent didn't register anything — you did.";
    action = <Button variant="outline" asChild><Link to="/activity" search={{ tab: "decisions" }}>View your decisions</Link></Button>;
    tone = "bg-secondary";
  } else if (j.counselor === "confirmed" && chosen) {
    icon = <AgentAvatar agent="planner" bare />;
    title = "All set for summer";
    body = `${student.counselor} confirmed ${chosen.course} counts toward Statistics.`;
    action = <Button variant="outline" asChild><Link to="/semester">See your terms</Link></Button>;
    tone = "bg-secondary";
  }
  return (
    <div className={cn("flex flex-wrap items-center gap-4 rounded-2xl p-5", tone)}>
      <div className="grid place-items-center">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="aqua-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold">Needs your attention</div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
      {action}
    </div>
  );
}

const termTone: Record<Term["status"], string> = {
  done: "term-band-chip opacity-75",
  in_progress: "aqua-chip",
  registering: "aqua-chip",
  planned: "term-band-chip opacity-75",
};
const termLabel: Record<Term["status"], string> = { done: "Completed", in_progress: "Current term", registering: "Registering now", planned: "Planned" };

function PathTimeline() {
  const j = useJourney();
  const chosen = options.find((o) => o.id === j.chosenId);
  return (
    <div className="space-y-8">
      {(["bayview", "northgate"] as const).map((sch) => (
        <section key={sch}>
          <div className="mb-3 flex items-center gap-3">
            <SchoolLogo school={sch} className="size-9" />
            <div>
              <div className="font-medium">{schools[sch].name}</div>
              <div className="text-xs text-muted-foreground">{schools[sch].role} · {schools[sch].system}</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {terms.filter((t) => t.school === sch).map((t) => (
              <article key={t.id} className={cn("term-card rounded-2xl border", t.status === "registering" && "border-2 border-primary")}>
                <div className="term-band term-band-solid">
                  <div className="flex min-w-0 items-center gap-2 text-lg font-semibold"><TermIcon term={t.name} /><span className={cn("term-band-name", (t.status === "done" || t.status === "planned") && "opacity-75")}>{t.name}</span></div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px]", termTone[t.status])}>{termLabel[t.status]}</span>
                </div>
                {t.registration && <div className="mt-3 px-4 text-xs text-muted-foreground">{t.registration}</div>}
                <ul className="mt-3 space-y-1.5 text-sm">
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
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Requirements() {
  const j = useJourney();
  const chosen = options.find((o) => o.id === j.chosenId);
  return (
      <div className="divide-y rounded-2xl border bg-card shadow-soft">
        {requirements.map((r) => {
          let status: ReqStatus = r.status;
          let detail = r.detail;
          let src = r.sourceId;
          let conf = r.confidence;
          let conflict = false;
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
              : `Enrolled (by you): ${chosen.course} §${chosen.section} · Summer 2027`;
            src = chosen.sourceIds[0]!;
            conf = chosen.confidence;
            conflict = !!chosen.conflict;
          }
          if (r.id === "qr1" && chosen && j.counselor === "confirmed") {
            status = "done";
            detail = `${chosen.course} §${chosen.section} · confirmed by ${student.counselor}`;
            src = "counselor-confirm";
            conf = 0.99;
            conflict = false;
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
                  <ConfidenceBadge score={conf} conflict={conflict} />
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
            <div key={id} className="rounded-xl border bg-card p-5">
              <div className="text-xs text-muted-foreground">{h}</div>
              <div className="mt-1 font-serif text-lg">{rule}</div>
              <div className="mt-3 flex gap-2"><SourceChip id={id} /><ConfidenceBadge score={0.97} /></div>
            </div>
          ))}
        </div>
      </section>
  );
}

function Home() {
  const pct = Math.round((progress.earned / progress.needed) * 100);
  const pctIp = Math.round(((progress.earned + progress.inProgress) / progress.needed) * 100);
  return (
    <div className="space-y-8">
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
              <div className="absolute inset-y-0 left-0 rounded-full aqua-chip" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="mt-1.5 text-xs text-muted-foreground">{pct}% complete · {progress.inProgress} su in progress</div>
        </div>
      </div>

      <Attention />

      <Tabs defaultValue="path">
        <TabsList className="rounded-full">
          <TabsTrigger value="path" className="rounded-full">Your path</TabsTrigger>
          <TabsTrigger value="reqs" className="rounded-full">Requirements</TabsTrigger>
          <TabsTrigger value="units" className="rounded-full">How units convert</TabsTrigger>
        </TabsList>
        <TabsContent value="path" className="mt-6"><PathTimeline /></TabsContent>
        <TabsContent value="reqs" className="mt-6"><Requirements /></TabsContent>
        <TabsContent value="units" className="mt-6"><Conversion /></TabsContent>
      </Tabs>
    </div>
  );
}
