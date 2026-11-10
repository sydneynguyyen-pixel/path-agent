import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2, Send, Scale, Info, Zap, Clock, Users, ListPlus, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { options, rankOptions, student, syllabi, PILEUP_THRESHOLD, DROP_DEADLINE, REQUIREMENT_LABEL, waitlist, type Option } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { useJourney, fmtStamp } from "@/lib/journey";
import { SourceChip } from "./bits";
import { AgentAvatar, SubjectIcon } from "./Brand";
import { Spot } from "./Illustrations";
import { cn } from "@/lib/utils";
import { AddsSkills } from "./SkillsBits";

const verdictLabel = {
  counts: "Counts toward QR-1",
  conditional: "Counts with grade C or better",
  conflict: "Needs counselor confirmation",
  does_not_count: "Does not count",
};

const weekLoad = (week: number) => syllabi.reduce((n, s) => n + s.items.filter((i) => i.week === week).length, 0);

function Availability({ o }: { o: Option }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <span className={cn("inline-flex items-center gap-1 font-medium", o.seatsOpen > 0 ? "text-success" : "text-muted-foreground")}>
        <Users className="size-3.5" /> {o.seatsOpen > 0 ? `${o.seatsOpen} seats open` : "Full · 0 seats"}
      </span>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Clock className="size-3.5" /> Section {o.section} · {o.sectionTime}
      </span>
    </div>
  );
}

function WaitlistAction() {
  const j = useJourney();
  if (!waitlist.allowed) return null;
  return (
    <div className="rounded-lg border border-dashed p-3 text-sm">
      <div className="flex items-center gap-1.5 font-medium"><ListPlus className="size-4" /> Optional: also join the waitlist for {waitlist.course}</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Bayview allows one waitlist spot while you're enrolled in an alternate. {waitlist.spots}. <SourceChip id={waitlist.sourceId} />
      </p>
      {j.waitlisted ? (
        <div className="mt-2 text-xs font-medium text-success">You joined the waitlist yourself (simulated).</div>
      ) : (
        <Button size="sm" variant="outline" className="mt-2" onClick={j.joinWaitlist}>I joined the waitlist</Button>
      )}
    </div>
  );
}

function SelfRegisterSteps({ o }: { o: Option }) {
  const j = useJourney();
  const onPortal = useRouterState({ select: (s) => s.location.pathname }) === "/portal";
  const code = o.course.replace("BCC ", "");
  if (j.seatHeld) return <div className="flex items-center gap-1.5 text-sm font-medium text-success"><CheckCircle2 className="size-4 text-mark-yes" /> You registered for {code} §{o.section}.</div>;
  if (onPortal) {
    return (
      <>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li className={cn(j.guide && "text-muted-foreground line-through")}>Let me find {code} in the class search.</li>
          <li>Pick <b>section {o.section}</b> ({o.sectionTime}) — I'll highlight it and check it fits your week.</li>
          <li>You click <b>Add</b>, then <b>Submit</b>.</li>
        </ol>
        {j.guide ? (
          <p className="flex items-center gap-1.5 text-sm text-primary"><Loader2 className="size-4 animate-spin" /> Waiting for you to Add and Submit in the portal…</p>
        ) : (
          <Button onClick={() => j.setGuide(true)}><Search className="size-4" /> Find it for me</Button>
        )}
        <p className="text-xs text-muted-foreground">I fill in the search and point. You click Add and Submit — I never register for you.</p>
      </>
    );
  }
  return (
    <>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>Open the registration portal.</li>
        <li><b>Add {code}, section {o.section}</b> ({o.sectionTime}).</li>
        <li>Confirm the add went through.</li>
      </ol>
      <p className="text-xs text-muted-foreground">You register yourself. The agent never registers or enrolls for you.</p>
      <div className="flex gap-2">
        <Button asChild><Link to="/portal" onClick={() => { j.setGuide(true); j.setPanelOpen(false); }}>Take me there</Link></Button>
        <Button variant="outline" onClick={j.markAdded}>I added it myself</Button>
      </div>
    </>
  );
}

export function AgentPanel({ docked = false }: { docked?: boolean }) {
  const j = useJourney();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (j.stage !== "failed" || j.agentTimes["drafter"]) return;
    setStep(0);
    const t = [setTimeout(() => setStep(1), 1400), setTimeout(() => setStep(2), 2800), setTimeout(() => setStep(3), 4000)];
    return () => t.forEach(clearTimeout);
  }, [j.stage, j.agentTimes["reader"]]);

  const scanning = j.stage === "failed" && step < 3 && !j.agentTimes["drafter"];
  const chosen = options.find((o) => o.id === j.chosenId);
  const path = chosen ? recoveryPath(chosen) : null;
  const ranked = rankOptions(options).filter((o) => ["math13", "psyc5", "bus21"].includes(o.id));
  const ruledOut = options.filter((o) => ["math10", "stat2-02"].includes(o.id));
  const plannerOff = !j.agentOn.reader || !j.agentOn.planner;
  const drafterOff = !j.agentOn.drafter;

  const header = (
    <div className="agent-panel px-4 pt-4 pb-2">
      <p className="text-sm text-muted-foreground">Agent · proposes and drafts only</p>
      <h2 className="font-serif text-2xl">Seats go fast. Here's what to do now.</h2>
    </div>
  );
  const content = (
        <div className="agent-panel space-y-6 px-4 pb-10">
          <div className="rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-warning"><AlertTriangle className="size-4" /> STAT 2 is full</div>
            <p className="mt-1 text-foreground">
              QR-1 Statistics is now <b>at risk</b>, not lost. You don't need to wait for your counselor to act. <SourceChip id="portal-full" />
            </p>
          </div>

          <ol className="space-y-2 text-sm">
            {[
              ["Reader", "Read the portal response, audit and articulation file"],
              ["Planner", "Checked which courses still count"],
              ["Backup finder", "Checked open seats, section times and your deadlines"],
            ].map(([n, d], i) => (
              <li key={n} className="flex items-center gap-2">
                {j.agentOn[(["reader", "planner", "backup"] as const)[i]!] === false ? <span className="text-xs text-muted-foreground">Off</span> : !scanning || step > i ? <CheckCircle2 className="size-4 text-mark-yes" /> : step === i ? <Loader2 className="size-4 animate-spin text-primary" /> : <span className="size-4 rounded-full border" />}
                <AgentAvatar agent={n === "Reader" ? "reader" : n === "Planner" ? "planner" : "backup"} /><b>{n}</b> <span className="text-muted-foreground">{d}</span>
              </li>
            ))}
          </ol>

          {plannerOff && j.stage === "failed" && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              The Reader or Planner is turned off in <Link to="/agents" search={{ tab: "controls" }} className="underline" onClick={() => j.setPanelOpen(false)}>Agent controls</Link>, so I won't suggest options. Turn them back on to continue.
            </div>
          )}
          {!plannerOff && !scanning && j.stage === "failed" && (
            <section className="space-y-3">
              <h3 className="text-lg font-semibold">Three options with open seats</h3>
              <div className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground xl:hidden">For the side-by-side portal and recovery view, open on desktop.</div>
              {ranked.map((o) => {
                const p = recoveryPath(o);
                const heavy = o.deadlines.some((d) => weekLoad(d.week) >= PILEUP_THRESHOLD);
                const actionable = o.seatsOpen > 0 && o.verdict !== "does_not_count";
                return (
                  <article key={o.id} className={cn("rounded-xl border bg-card p-4 shadow-soft", !actionable && "opacity-70")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">#{idx + 1} · {verdictLabel[o.verdict]}</div>
                        <div className="flex items-center gap-2 font-semibold"><SubjectIcon course={`${o.course} ${o.title}`} />{o.course}</div>
                        <div className="text-sm text-muted-foreground">{o.title}</div>
                      </div>
                      <ConfidenceBadge score={o.confidence} conflict={!!o.conflict} />
                    </div>
                    <Availability o={o} />
                    <AddsSkills course={o.course} />
                    <p className="mt-2 text-sm">{o.reason}</p>

                    {o.conflict && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {([["Catalog says", o.conflict.catalog], ["Articulation file says", o.conflict.articulation]] as const).map(([lbl, r]) => (
                          <div key={lbl} className="rounded-lg border border-dashed bg-secondary p-3 text-sm">
                            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Scale className="size-3" /> {lbl}</div>
                            <div className="mt-1">{r.reading}</div>
                            <div className="mt-2"><SourceChip id={r.sourceId} /></div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      Rule: {o.rule} {!o.conflict && o.sourceIds.map((s) => <SourceChip key={s} id={s} />)}
                    </div>
                    {o.deadlines.length > 0 && (
                      <div className={cn("mt-2 flex items-start gap-1.5 text-xs", heavy ? "text-warning" : "text-muted-foreground")}>
                        <Info className="mt-0.5 size-3.5 shrink-0" /> Deadline check: {o.deadlineNote}
                      </div>
                    )}
                    {actionable && (
                      <>
                        <div className="mt-2 text-xs font-medium text-muted-foreground">
                          {p === "now" ? "Clearly counts → add it now, no email needed." : "Hold the seat now, confirm with your counselor in parallel."}
                        </div>
                        <Button size="sm" variant={idx === 0 ? "default" : "outline"} className="mt-3" onClick={() => j.choose(o.id)}>
                          Choose {o.course} §{o.section}
                        </Button>
                      </>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {chosen && path === "now" && (
            <section className="space-y-3 rounded-xl border-2 border-primary/30 bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-lg font-semibold"><Zap className="size-5 text-primary" /> Do this now</div>
              <div className="flex flex-wrap gap-2"><ConfidenceBadge score={chosen.confidence} />{chosen.sourceIds.map((s) => <SourceChip key={s} id={s} />)}</div>
              <SelfRegisterSteps o={chosen} />
              <p className="text-xs text-muted-foreground">No counselor email needed — this course clearly counts toward {REQUIREMENT_LABEL}.</p>
              <WaitlistAction />
              {!j.seatHeld && <Button variant="ghost" size="sm" onClick={j.backToOptions}>Back to options</Button>}
            </section>
          )}

          {chosen && path === "hold" && (
            <>
              <section className="space-y-3 rounded-xl border-2 border-primary/30 bg-card p-5 shadow-soft">
                <div className="flex items-center gap-2 text-lg font-semibold"><Zap className="size-5 text-primary" /> Hold the seat now, confirm in parallel</div>
                <div className="flex flex-wrap gap-2"><ConfidenceBadge score={chosen.confidence} conflict={!!chosen.conflict} /></div>
                <SelfRegisterSteps o={chosen} />
                <div className="rounded-lg bg-secondary p-3 text-sm">
                  <div className="flex items-center gap-1.5 font-medium"><LogOut className="size-4" /> Your way out</div>
                  <p className="mt-1">If your counselor says it doesn't count, drop it yourself in the portal by <b>{DROP_DEADLINE}</b> — no W on your transcript.</p>
                  <div className="mt-2"><SourceChip id="bcc-drop" /></div>
                  <p className="mt-2 text-xs text-muted-foreground">For refund or financial-aid questions, ask the financial aid office.</p>
                </div>
                <WaitlistAction />
                {!j.seatHeld && !j.emailSent && <Button variant="ghost" size="sm" onClick={j.backToOptions}>Back to options</Button>}
              </section>

              <section className="space-y-3 rounded-xl border bg-card p-4 shadow-soft">
                <h3 className="flex items-center gap-2 text-lg font-semibold"><AgentAvatar agent="drafter" />In parallel: counselor email</h3>
                {drafterOff ? (
                  <p className="text-sm text-muted-foreground">The Drafter is turned off, so no email was drafted. You can write to {student.counselor} yourself.</p>
                ) : j.emailSent ? (
                  <div className="flex items-center gap-3"><Spot name="envelope" className="w-16" /><p className="text-sm"><CheckCircle2 className="mr-1 inline size-4 text-mark-yes" />Approved by {student.name} at {fmtStamp(j.decisions.at(-1)!.when)}. Demo only: no email was sent.</p></div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Doesn't block your seat. Draft to {student.counselor} ({student.counselorEmail}). Edit anything; nothing is sent until you approve.</p>
                    <Textarea value={j.draft} onChange={(e) => j.setDraft(e.target.value)} rows={12} className="font-mono text-xs" />
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Evidence attached</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">{[...chosen.sourceIds, "bcc-drop"].map((s) => <SourceChip key={s} id={s} />)}</div>
                    </div>
                    <Button onClick={() => { j.approve(); toast("Demo only: no email was sent.", { description: "Your approval was recorded in the decision log." }); }}>
                      <Send className="size-4" /> Approve and send as {student.name}
                    </Button>
                    <p className="text-xs text-muted-foreground">Simulated send. Demo only: no email will actually be sent.</p>
                  </>
                )}
              </section>
            </>
          )}

          {chosen && j.seatHeld && (
            <section className="space-y-2 rounded-xl border border-success/30 bg-success-soft p-5 text-sm">
              <div className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5 text-mark-yes" /> {path === "hold" ? "You hold a seat." : `You're set with ${chosen.course}.`}</div>
              {path === "hold" ? (
                <p>Counselor confirmation is pending. Drop by {DROP_DEADLINE} if not confirmed.{!j.emailSent && " Approve the email above to ask your counselor."}</p>
              ) : (
                <p>It counts toward {REQUIREMENT_LABEL}. The agent didn't register anything — you did.</p>
              )}
              <div className="flex gap-3">
                <Link to="/" className="text-primary underline" onClick={() => j.setPanelOpen(false)}>See degree view</Link>
                <Link to="/activity" search={{ tab: "decisions" }} className="text-primary underline" onClick={() => j.setPanelOpen(false)}>Your decisions</Link>
                {path === "hold" && j.emailSent && <Link to="/counselor" className="text-primary underline" onClick={() => j.setPanelOpen(false)}>Counselor view</Link>}
              </div>
            </section>
          )}
        </div>
  );
  if (docked) return <div>{header}{content}</div>;
  return (
    <Sheet open={j.panelOpen} onOpenChange={j.setPanelOpen}>
      <SheetContent side="right" className="brand-app agent-panel w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetDescription>Agent · proposes and drafts only</SheetDescription>
          <SheetTitle className="font-serif text-2xl">Seats go fast. Here's what to do now.</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
