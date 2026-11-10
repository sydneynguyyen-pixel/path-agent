import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Send, Scale, Info, Zap, Clock, Users, ListPlus, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { options, rankOptions, student, syllabi, PILEUP_THRESHOLD, DROP_DEADLINE, REQUIREMENT_LABEL, waitlist, type Option } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { useJourney, fmtStamp } from "@/lib/journey";
import { ConfidenceBadge, SourceChip } from "./bits";
import { AgentAvatar, SubjectIcon } from "./Brand";
import { Spot } from "./Illustrations";
import { cn } from "@/lib/utils";
import { AddsSkills } from "./SkillsBits";
import { Ink } from "./Ink";
import { bloom, once } from "@/lib/motion";

/** A paint bloom the first time this run reaches a good outcome, and never again on re-render. */
function BloomOnce({ id }: { id: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => once(id, () => bloom(ref.current, 340)), [id]);
  return <span ref={ref} className="absolute top-1/2 left-8" aria-hidden="true" />;
}

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
          <p className="flex items-center gap-1.5 text-sm text-primary"><Ink /> Waiting for you to Add and Submit in the portal…</p>
        ) : (
          <Button onClick={() => j.setGuide(true)}><Search className="size-4" /> Find it for me</Button>
        )}
        <p className="text-xs text-muted-foreground">I'll fill in the search. You click Add and Submit.</p>
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
      <p className="text-xs text-muted-foreground">Add it in your school's portal.</p>
      <div className="flex gap-2">
        <Button asChild><Link to="/portal" onClick={() => { j.setGuide(true); j.setPanelOpen(false); }}>Take me there</Link></Button>
        <Button variant="outline" onClick={j.markAdded}>I added it myself</Button>
      </div>
    </>
  );
}

export function AgentPanel({ docked = false }: { docked?: boolean }) {
  const j = useJourney();
  const run = j.agentRun;
  const scanning = run?.status === "running";
  const pick = options.find((o) => o.id === run?.result?.optionId);
  const helpersOff = (["reader", "planner", "backup"] as const).filter((h) => !j.agentOn[h]);
  const chosen = options.find((o) => o.id === j.chosenId);
  const path = chosen ? recoveryPath(chosen) : null;
  const ranked = rankOptions(options).filter((o) => ["math13", "psyc5", "bus21"].includes(o.id));
  const ruledOut = options.filter((o) => ["math10", "stat2-02"].includes(o.id));
  const plannerOff = !j.agentOn.reader || !j.agentOn.planner;
  const drafterOff = !j.agentOn.drafter;

  const header = (
    <div className="agent-panel px-4 pt-4 pb-2">
      <p className="text-sm text-muted-foreground">Path Agent</p>
      <h2 className="font-serif text-2xl">Seats go fast. Here's what to do now.</h2>
    </div>
  );
  const content = (
        <div className="agent-panel space-y-6 px-4 pb-10">
          <div className="nudge rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-warning"><AlertTriangle className="size-4" /> STAT 2 is full</div>
            <p className="mt-1 text-foreground">
              QR-1 Statistics is now <b>at risk</b>, not lost. You don't need to wait for your counselor to act. <SourceChip id="portal-full" />
            </p>
          </div>

          {run && (
            <section aria-label="What Path Agent did" aria-live="polite" className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-secondary px-2.5 py-1 font-medium">{run.mode === "live" ? `Live AI${run.result?.model ? ` · ${run.result.model}` : ""}` : run.mode === "scripted" ? "Scripted run" : "Connecting"}</span>
              </div>
              {run.mode === "scripted" && run.reason && <p className="text-xs text-muted-foreground">{run.reason} These are the same checks in a fixed order, with no AI choosing them.</p>}
              <ol className="space-y-2 text-sm">
                {run.steps.map((s, i) => (
                  <li key={i} className="step-in flex items-center gap-2">
                    {s.ok ? <CheckCircle2 className="check-pop size-4 shrink-0 text-mark-yes" /> : <Info className="size-4 shrink-0 text-warning" />}
                    <AgentAvatar agent={s.helper} /><span>{s.text}</span>
                  </li>
                ))}
                {scanning && <li className="flex items-center gap-2 text-muted-foreground"><Ink /> Working on the next step…</li>}
                {helpersOff.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-muted-foreground"><span className="w-4 shrink-0 text-xs">Off</span><AgentAvatar agent={h} /><span>This task is off, so it was skipped.</span></li>
                ))}
              </ol>
            </section>
          )}

          {plannerOff && j.stage === "failed" && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Read records or Check your degree is off in <Link to="/agents" search={{ tab: "controls" }} className="underline" onClick={() => j.setPanelOpen(false)}>Controls</Link>, so I can't suggest options.
            </div>
          )}
          {!plannerOff && !scanning && j.stage === "failed" && (
            <section className="deal space-y-3">
              {pick && run?.result?.why ? (
                <div className="surface p-4 text-sm">
                  <div className="font-semibold">My pick: {pick.course.replace("BCC ", "")}, section {pick.section}</div>
                  <p className="mt-1">{run.result.why}</p>
                  <p className="mt-2 text-xs text-muted-foreground">It passed the check for open seats and for counting toward your requirement. Whether to take it is up to you.</p>
                </div>
              ) : run?.result?.gaveUp && helpersOff.length === 0 && (
                <p className="text-sm text-muted-foreground">I couldn't settle on one recommendation, so here's every option, ranked.</p>
              )}
              <h3 className="text-lg font-semibold">Options with open seats</h3>
              <div className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground xl:hidden">For the side-by-side portal and recovery view, open on desktop.</div>
              {ranked.map((o, idx) => {
                const p = recoveryPath(o);
                const heavy = o.deadlines.some((d) => weekLoad(d.week) >= PILEUP_THRESHOLD);
                const actionable = o.seatsOpen > 0 && o.verdict !== "does_not_count";
                return (
                  <article key={o.id} className={cn("rounded-xl border bg-card p-4 shadow-soft", !actionable && "opacity-70", actionable && (pick ? o.id === pick.id : idx === 0) && "best-option")}>
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
                        <Button size="sm" variant={(pick ? o.id === pick.id : idx === 0) ? "default" : "outline"} className="mt-3" onClick={() => j.choose(o.id)}>
                          Choose {o.course} §{o.section}
                        </Button>
                      </>
                    )}
                  </article>
                );
              })}
              {ruledOut.length > 0 && (
                <details className="rounded-xl border border-dashed bg-card/60 px-4 py-3 text-sm">
                  <summary className="cursor-pointer font-medium">{ruledOut.length} ruled out · why</summary>
                  <ul className="mt-2 space-y-1.5 text-muted-foreground">
                    {ruledOut.map((o) => (
                      <li key={o.id}><span className="font-medium text-foreground">{o.course.replace("BCC ", "")} §{o.section}</span>: {o.reason}</li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}

          {chosen && path === "now" && (
            <section className="swap-enter surface space-y-3 p-5">
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
              <section className="surface space-y-3 p-5">
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

              <section className="surface space-y-3 p-5">
                <h3 className="flex items-center gap-2 text-lg font-semibold"><AgentAvatar agent="drafter" />In parallel: counselor email</h3>
                {drafterOff ? (
                  <p className="text-sm text-muted-foreground">The Drafter is turned off, so no email was drafted. You can write to {student.counselor} yourself.</p>
                ) : j.emailSent ? (
                  <div className="flex items-center gap-3"><Spot name="envelope" className="w-16" /><p className="text-sm"><CheckCircle2 className="mr-1 inline size-4 text-mark-yes" />Approved by {student.name} at {fmtStamp(j.decisions.at(-1)!.when)}. Demo only: no email was sent.</p></div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">Doesn't block your seat. Draft to {student.counselor} ({student.counselorEmail}). Edit it before you send.</p>
                    <Textarea value={j.draft} onChange={(e) => j.setDraft(e.target.value)} rows={12} className="font-mono text-xs" />
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Evidence attached</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">{[...chosen.sourceIds, "bcc-drop"].map((s) => <SourceChip key={s} id={s} />)}</div>
                    </div>
                    <Button onClick={() => { j.approve(); toast("Demo only: no email was sent.", { description: "Your approval was recorded in the decision log." }); }}>
                      <Send className="size-4" /> Approve and send as {student.name}
                    </Button>
                    <p className="text-xs text-muted-foreground">Demo only: no email will be sent.</p>
                  </>
                )}
              </section>
            </>
          )}

          {chosen && j.seatHeld && (
            <section className="success-in relative space-y-2 rounded-xl bg-success-soft p-5 text-sm">
              <BloomOnce id={`seat-${j.startedAt}`} />
              <div className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5 text-mark-yes" /> {path === "hold" ? "You hold a seat." : `You're set with ${chosen.course}.`}</div>
              {path === "hold" ? (
                <p>Counselor confirmation is pending. Drop by {DROP_DEADLINE} if not confirmed.{!j.emailSent && " Approve the email above to ask your counselor."}</p>
              ) : (
                <p>It counts toward {REQUIREMENT_LABEL}. </p>
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
          <SheetDescription>Path Agent</SheetDescription>
          <SheetTitle className="font-serif text-2xl">Seats go fast. Here's what to do now.</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
