import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, PencilLine, Send, Scale, Info, Star, Zap, Clock, Users, ListPlus, LogOut, Search } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { options, rankOptions, student, syllabi, terms, PILEUP_THRESHOLD, DROP_DEADLINE, REQUIREMENT_LABEL, waitlist, type Option } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { buildDraft, draftGreeting, draftLines, draftSignoff, useJourney, fmtStamp } from "@/lib/journey";
import { CheckBadge, SourceChip } from "./bits";
import { AgentAvatar, SubjectIcon } from "./Brand";
import { Spot } from "./Illustrations";
import { cn } from "@/lib/utils";
import { AddsSkills } from "./SkillsBits";
import { Ink } from "./Ink";
import { NoteBox, RecheckBanner, RememberedNotes, RunTrace } from "./RunTrace";

const verdictLabel = {
  counts: "Counts toward QR-1",
  conditional: "Counts with grade C or better",
  conflict: "Needs counselor confirmation",
  does_not_count: "Does not count",
};

/** The term she is registering for, which is what the week-by-week check is about. */
const planTerm = terms.find((t) => t.status === "registering")?.name ?? "term";

const weekLoad = (week: number) => syllabi.reduce((n, s) => n + s.items.filter((i) => i.week === week).length, 0);

function Availability({ o, justFilled = false }: { o: Option; justFilled?: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span className={cn("inline-flex items-center gap-1 font-medium", o.seatsOpen > 0 ? "text-success" : "text-muted-foreground")}>
        <Users className="size-3.5" /> {justFilled ? "Just filled · 0 seats" : o.seatsOpen > 0 ? `${o.seatsOpen} seats open` : "Full · 0 seats"}
      </span>
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Clock className="size-3.5" /> Section {o.section} · {o.sectionTime}
      </span>
    </div>
  );
}

function WaitlistAction() {
  const j = useJourney();
  const onPortal = useRouterState({ select: (s) => s.location.pathname }) === "/portal";
  if (!waitlist.allowed) return null;
  return (
    <section className="swap-enter surface space-y-3 p-5 text-sm">
      <div className="flex items-center gap-2 text-lg font-semibold"><ListPlus className="size-5 text-primary" /> Next: join the {waitlist.course} waitlist?</div>
      <p className="text-muted-foreground">Optional. Bayview allows one waitlist spot while you're enrolled in another class. {waitlist.spots}.</p>
      <SourceChip id={waitlist.sourceId} />
      {j.waitlisted ? (
        <div className="font-medium text-success">You joined the waitlist yourself (simulated).</div>
      ) : j.waitlistGuide && onPortal ? (
        <p className="flex items-center gap-1.5 text-primary"><Ink /> Waiting for you to click Join waitlist in the portal…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {onPortal ? (
            <Button size="sm" onClick={() => j.setWaitlistGuide(true)}><Search className="size-4" /> Find it for me</Button>
          ) : (
            <Button size="sm" asChild><Link to="/portal" onClick={() => { j.setWaitlistGuide(true); j.setPanelOpen(false); }}><Search className="size-4" /> Find it for me</Link></Button>
          )}
          <Button size="sm" variant="outline" onClick={j.joinWaitlist}>I joined it myself</Button>
        </div>
      )}
    </section>
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
      <div className="flex gap-2">
        <Button asChild><Link to="/portal" onClick={() => { j.setGuide(true); j.setPanelOpen(false); }}>Take me there</Link></Button>
        <Button variant="outline" onClick={j.markAdded}>I added it myself</Button>
      </div>
    </>
  );
}

/** The counselor draft as a card: one claim per line with its source, until she edits it into her own words. */
function DraftCard({ id }: { id: string }) {
  const j = useJourney();
  const [editing, setEditing] = useState(false);
  const edited = j.draft !== buildDraft(id);
  if (editing || edited) {
    return (
      <div className="space-y-2">
        <Textarea value={j.draft} onChange={(e) => j.setDraft(e.target.value)} rows={12} className="text-sm" aria-label="Email to your counselor" autoFocus={editing} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{edited ? "Your words now. These sources stay attached:" : "Sources attached:"}</span>
          {[...new Set(draftLines(id).flatMap((l) => l.sourceIds))].map((s) => <SourceChip key={s} id={s} />)}
        </div>
        {edited && <Button variant="ghost" size="sm" onClick={() => { j.setDraft(buildDraft(id)); setEditing(false); }}>Undo my edits</Button>}
      </div>
    );
  }
  return (
    <div className="draft-card space-y-3 rounded-2xl bg-card p-4 text-sm shadow-soft">
      <p>{draftGreeting()}</p>
      <ol className="space-y-2.5">
        {draftLines(id).map((l) => (
          <li key={l.text} className="draft-line">
            <span>{l.text}</span>
            {l.sourceIds.map((s) => <SourceChip key={s} id={s} />)}
          </li>
        ))}
      </ol>
      <p className="whitespace-pre-line">{draftSignoff()}</p>
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}><PencilLine className="size-4" aria-hidden="true" />Edit in my words</Button>
    </div>
  );
}

/** The options run. In the chat it shows without its own header, and the chat's reply box replaces the note box. */
export function AgentPanel({ docked = false, inChat = false }: { docked?: boolean; inChat?: boolean }) {
  const j = useJourney();
  const run = j.agentRun;
  const scanning = run?.status === "running";
  const pick = options.find((o) => o.id === run?.result?.optionId);
  const plannerOff = !j.agentOn.reader || !j.agentOn.planner;

  const header = (
    <div className="agent-panel px-4 pt-4 pb-2">
      <p className="text-sm text-muted-foreground">Sprout</p>
      <h2 className="font-serif text-2xl">Seats go fast. Here's what to do now.</h2>
    </div>
  );
  const content = (
        <div className="agent-panel space-y-6 px-4 pb-10">
          <div className="nudge flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning-soft p-5 text-sm">
            <div className="flex items-center gap-2 font-medium text-warning"><AlertTriangle className="size-4" /> STAT 2 is full</div>
            <SourceChip id="portal-full" />
          </div>

          {run && <RecheckBanner run={run} />}
          {run && <RunTrace run={run} waitingOn={!scanning && pick && j.stage === "failed" ? "planner" : null} pickedName={pick?.course.replace("BCC ", "")} />}
          {!inChat && run?.status === "done" && j.stage === "failed" && !plannerOff && (
            <div className="space-y-2">
              <NoteBox />
              <RememberedNotes />
            </div>
          )}

          {plannerOff && j.stage === "failed" && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Read records or Check your degree is off in <Link to="/agents" search={{ tab: "controls" }} className="underline" onClick={() => j.setPanelOpen(false)}>Controls</Link>, so I can't suggest options.
            </div>
          )}
          {!plannerOff && !scanning && j.stage === "failed" && <OptionsList />}

          <NextSteps />
        </div>
  );
  if (inChat) return content;
  if (docked) return <div>{header}{content}</div>;
  return (
    <Sheet open={j.panelOpen} onOpenChange={j.setPanelOpen}>
      <SheetContent side="right" className="brand-app agent-panel w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetDescription>Sprout</SheetDescription>
          <SheetTitle className="font-serif text-2xl">Seats go fast. Here's what to do now.</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}

/** Every option with open seats, the helpers' pick first, and what was ruled out. */
export function OptionsList({ showTitle = true }: { showTitle?: boolean }) {
  const j = useJourney();
  const run = j.agentRun;
  const pick = options.find((o) => o.id === run?.result?.optionId);
  const helpersOff = (["reader", "planner", "backup"] as const).filter((h) => !j.agentOn[h]);
  const ranked = rankOptions(options.map((o) => (j.justFilled.includes(o.id) ? { ...o, seatsOpen: 0 } : o))).filter((o) => ["math13", "psyc5", "bus21"].includes(o.id))
    .sort((a, b) => Number(b.id === pick?.id) - Number(a.id === pick?.id));
  const ruledOut = options.filter((o) => ["math10", "stat2-02"].includes(o.id));
  return (

            <section className="deal space-y-3">
              {!pick && run?.result?.gaveUp && helpersOff.length === 0 && (
                <p className="text-sm text-muted-foreground">I couldn't settle on one recommendation, so here's every option.</p>
              )}
              {showTitle && <h3 className="text-lg font-semibold">Options with open seats</h3>}
              <div className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground xl:hidden">For the side-by-side portal and recovery view, open on desktop.</div>
              {ranked.map((o, idx) => {
                const p = recoveryPath(o);
                const heavy = o.deadlines.some((d) => weekLoad(d.week) >= PILEUP_THRESHOLD);
                const actionable = o.seatsOpen > 0 && o.verdict !== "does_not_count";
                const isPick = o.id === pick?.id;
                return (
                  <article key={o.id} className={cn("relative rounded-xl border bg-card p-5 shadow-soft", !actionable && "opacity-70", actionable && isPick && "best-option", isPick && "mt-6 pt-7")}>
                    {isPick && <div className="my-pick absolute -top-3.5 left-5"><Star className="size-3.5" aria-hidden /> My pick</div>}
                    <div className="flex items-center gap-3">
                      <SubjectIcon course={`${o.course} ${o.title}`} />
                      <div className="min-w-0">
                        <div className="text-lg leading-tight font-semibold">{o.course}</div>
                        <div className="text-sm text-muted-foreground">{o.title}</div>
                      </div>
                    </div>
                    <Availability o={o} justFilled={j.justFilled.includes(o.id)} />

                    <div className="agent-note mt-4 space-y-3 border-t pt-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <div className="flex items-center gap-2 font-medium"><AgentAvatar agent="planner" /> {verdictLabel[o.verdict]}</div>
                        <CheckBadge score={o.confidence} conflict={!!o.conflict} plain />
                      </div>
                      <p>{o.reason}</p>
                      {o.conflict && (
                        <dl className="space-y-1">
                          {([["Catalog says", o.conflict.catalog], ["Articulation file says", o.conflict.articulation]] as const).map(([lbl, r]) => (
                            <div key={lbl}><dt className="inline font-medium">{lbl}: </dt><dd className="inline">{r.reading}</dd></div>
                          ))}
                        </dl>
                      )}
                      {o.deadlines.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 font-medium">{heavy ? <AlertTriangle className="size-4 shrink-0" aria-hidden /> : <CalendarDays className="size-4 shrink-0" aria-hidden />} Your {planTerm} plan</div>
                          <p className="mt-0.5">{o.deadlineNote}</p>
                        </div>
                      )}
                      <AddsSkills course={o.course} />
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer font-medium">See the rule</summary>
                        <p className="mt-2">{o.rule}</p>
                        <div className="mt-2 flex flex-wrap gap-2">{(o.conflict ? [o.conflict.catalog.sourceId, o.conflict.articulation.sourceId] : o.sourceIds).map((s) => <SourceChip key={s} id={s} />)}</div>
                      </details>
                    </div>

                    {actionable && (
                      <>
                        {p === "hold" && <p className="mt-3 text-xs font-medium text-muted-foreground">Hold the seat now, confirm with your counselor in parallel.</p>}
                        <Button size="sm" variant={isPick ? "default" : "outline"} className="mt-4" onClick={() => j.choose(o.id)}>
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
          
  );
}

/** What happens after she chooses: register steps, the counselor email for her OK, and the waitlist. */
export function NextSteps() {
  const j = useJourney();
  const chosen = options.find((o) => o.id === j.chosenId);
  const path = chosen ? recoveryPath(chosen) : null;
  const drafterOff = !j.agentOn.drafter;
  return (
    <>
          {chosen && path === "now" && (
            <section className="swap-enter surface space-y-3 p-5">
              <div className="flex items-center gap-2 text-lg font-semibold"><Zap className="size-5 text-primary" /> Do this now</div>
              <div className="flex flex-wrap gap-2"><CheckBadge score={chosen.confidence} />{chosen.sourceIds.map((s) => <SourceChip key={s} id={s} />)}</div>
              <SelfRegisterSteps o={chosen} />
              {!j.seatHeld && <Button variant="ghost" size="sm" onClick={j.backToOptions}>Back to options</Button>}
            </section>
          )}

          {chosen && path === "hold" && (
            <>
              <section className="surface space-y-3 p-5">
                <div className="flex items-center gap-2 text-lg font-semibold"><Zap className="size-5 text-primary" /> Hold the seat now, confirm in parallel</div>
                <div className="flex flex-wrap gap-2"><CheckBadge score={chosen.confidence} conflict={!!chosen.conflict} /></div>
                <SelfRegisterSteps o={chosen} />
                <div className="rounded-lg bg-secondary p-3 text-sm">
                  <div className="flex items-center gap-1.5 font-medium"><LogOut className="size-4" /> Your way out</div>
                  <p className="mt-1">If your counselor says it doesn't count, drop it yourself in the portal by <b>{DROP_DEADLINE}</b> — no W on your transcript.</p>
                  <div className="mt-2"><SourceChip id="bcc-drop" /></div>
                  <p className="mt-2 text-xs text-muted-foreground">For refund or financial-aid questions, ask the financial aid office.</p>
                </div>
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
                    <p className="text-sm text-muted-foreground">Doesn't block your seat. Draft to {student.counselor} ({student.counselorEmail}). Each line shows where it comes from.</p>
                    <DraftCard id={chosen.id} />
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
            <section className="success-in space-y-2 rounded-xl bg-success-soft p-5 text-sm">
              <div className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5 text-mark-yes" /> {path === "hold" ? "You hold a seat." : `You're set with ${chosen.course}.`}</div>
              {path === "hold" ? (
                <p>Counselor confirmation is pending. Drop by {DROP_DEADLINE} if not confirmed.{!j.emailSent && " Approve the email above to ask your counselor."}</p>
              ) : (
                <p>It counts toward {REQUIREMENT_LABEL}. </p>
              )}
              <div className="flex gap-3">
                <Link to="/" className="text-primary underline" onClick={() => j.setPanelOpen(false)}>See degree view</Link>
                <Link to="/activity" className="text-primary underline" onClick={() => j.setPanelOpen(false)}>See it in Activity</Link>
                {path === "hold" && j.emailSent && <Link to="/counselor" className="text-primary underline" onClick={() => j.setPanelOpen(false)}>Counselor view</Link>}
              </div>
            </section>
          )}

          {chosen && j.seatHeld && <WaitlistAction />}
    </>
  );
}
