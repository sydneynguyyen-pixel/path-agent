import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronRight, CircleDashed, Clock, RotateCw, Users } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { options, REQUIREMENT_LABEL, type Option } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { fmtStamp, useJourney } from "@/lib/journey";
import { checkResult, factPlain, HELPER_NAME, PICK_CHECKS, runGroups, TOOL_HELPER, TOOLS, toolStates, usableIn, type TraceRun } from "@/lib/run";
import { cn } from "@/lib/utils";
import { AgentAvatar, AgentFace, SubjectIcon } from "./Brand";
import { SourceChip } from "./bits";
import { ModePill } from "./RunCard";
import { NextSteps, OptionsList } from "./AgentPanel";
import { RunTrace } from "./RunTrace";
import "@/styles/chat-run.css";

const short = (o: Option | undefined) => o?.course.replace("BCC ", "");
const pickOf = (r: TraceRun) => options.find((o) => o.id === r.result?.optionId);
const verdictLabel = { counts: "Counts toward QR-1", conditional: "Counts with a C or better", conflict: "Needs counselor confirmation", does_not_count: "Does not count" } as const;

/** Notes she can tap instead of typing. Each one is a real note the helpers know how to use. */
const STEERS = ["No classes before 10 am", "No Friday classes", "Pick classes that surely count", "Tue/Thu works better for classes"];

/** The runs in this conversation: the latest run and its re-checks, plus whatever is running now. */
function useThreadRuns(): TraceRun[] {
  const j = useJourney();
  const groups = runGroups(j.runs);
  const last = groups.at(-1);
  let list = last ? [last.root, ...last.rechecks] : [];
  const cur = j.agentRun;
  if (cur && !list.some((r) => r.runId !== null && r.runId === cur.runId)) {
    list = !cur.parentRunId && cur.runId ? [cur] : [...list, cur];
  }
  return list;
}

/** A small line in the thread for something that happened, not something anyone said. */
function EventLine({ icon, children, at }: { icon: React.ReactNode; children: React.ReactNode; at: Date | null }) {
  return (
    <div className="chat-event agent-in" role="status">
      {icon}
      <span className="min-w-0">{children}</span>
      {at && <time className="ml-auto shrink-0 text-[11px] text-muted-foreground" dateTime={at.toISOString()}>{fmtStamp(at)}</time>}
    </div>
  );
}

function Sprout({ children }: { children: React.ReactNode }) {
  return (
    <div className="agent-says agent-in">
      <AgentFace className="!size-8 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3 pt-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function You({ children }: { children: React.ReactNode }) {
  return <p className="agent-you agent-in">{children}</p>;
}

/** "Looked at 3 things, reused 2 · ready in 2s ▸". Opens to the steps and the safety checks. */
function WorkFold({ run, earlier }: { run: TraceRun; earlier: TraceRun[] }) {
  const states = toolStates(run, earlier);
  const ran = TOOLS.filter((t) => states[t.id] === "ran");
  const kept = TOOLS.filter((t) => states[t.id] === "kept");
  const checks = checkResult(run);
  const ready = usableIn(run.ttvMs)?.replace("Usable option in", "ready in");
  const recheck = earlier.length > 0;
  return (
    <details className="chat-fold group">
      <summary>
        <span className="chat-fold-dots" aria-hidden="true">{TOOLS.map((t) => <i key={t.id} data-s={states[t.id]} />)}</span>
        <span>Looked at {ran.length} {ran.length === 1 ? "thing" : "things"}{kept.length ? `, reused ${kept.length}` : ""}{ready ? ` · ${ready}` : ""}</span>
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
      </summary>
      <div className="chat-fold-body">
        <ol className="space-y-1.5">
          {TOOLS.map((t) => {
            const st = states[t.id] ?? "idle";
            const step = run.steps.find((s) => s.tool === t.id);
            return (
              <li key={t.id} className={cn("chat-step", st === "idle" && "opacity-50")} data-s={st}>
                <AgentAvatar agent={TOOL_HELPER[t.id] ?? "planner"} className="size-6 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t.plain}</span>
                  <span className="block text-xs text-muted-foreground">
                    {st === "ran" ? (step?.text ?? `${HELPER_NAME[TOOL_HELPER[t.id] ?? "planner"]} did this`) : st === "kept" ? "Nothing it depends on changed, so it kept its answer" : "Not needed this time"}
                  </span>
                </span>
                <span className="chat-step-tag">{st === "ran" ? (recheck ? "Ran again" : "Ran") : st === "kept" ? "Reused" : "Skipped"}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 border-t pt-3">
          <p className="flex items-center gap-1.5 text-xs font-medium">
            {checks.state === "passed" ? <Check className="size-3.5 text-mark-yes" aria-hidden="true" /> : <CircleDashed className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            {checks.state === "passed" ? "Passed every safety check before you saw it" : checks.state === "running" ? "Safety checks run as soon as there's a pick" : "No pick to check"}
          </p>
          <ul className="mt-1.5 grid gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
            {PICK_CHECKS.map((c) => <li key={c}>· {c}</li>)}
          </ul>
          {checks.sentBack.map((t) => <p key={t} className="mt-2 rounded-lg bg-alert-soft px-2.5 py-1.5 text-xs text-alert"><b>Sent back:</b> {t}</p>)}
        </div>
        <div className="mt-3"><ModePill run={run} /></div>
      </div>
    </details>
  );
}

/** The pick as a small card inside Sprout's message, with the one decision she has to make. */
function PickCard({ o, total, onAll }: { o: Option; total: number; onAll: () => void }) {
  const j = useJourney();
  const p = recoveryPath(o);
  return (
    <div className="chat-card">
      <div className="flex items-start gap-3">
        <SubjectIcon course={`${o.course} ${o.title}`} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">{short(o)} · {o.title}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-success"><Users className="size-3" aria-hidden="true" />{o.seatsOpen} seats</span>
            <span className="inline-flex items-center gap-1"><Clock className="size-3" aria-hidden="true" />§{o.section} · {o.sectionTime}</span>
          </p>
          <p className="mt-1 text-xs">{verdictLabel[o.verdict]}{p === "hold" ? " · hold the seat, confirm with your counselor" : ""}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => j.choose(o.id)}>Choose {short(o)}</Button>
        <Button size="sm" variant="outline" onClick={onAll}>See all {total} options</Button>
      </div>
    </div>
  );
}

/**
 * The "STAT 2 is full" conversation. What happened shows as small event lines, what Sprout did as its
 * messages with the work folded into one line, her notes and choices as her own bubbles.
 */
export function RunChat() {
  const j = useJourney();
  const runs = useThreadRuns();
  const [allOpen, setAllOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const latest = runs.at(-1) ?? null;
  const chosen = options.find((o) => o.id === j.chosenId);
  const plannerOff = !j.agentOn.reader || !j.agentOn.planner;
  const deciding = j.stage === "failed" && !chosen && latest?.status === "done";
  const openCount = options.filter((o) => ["math13", "psyc5", "bus21"].includes(o.id) && o.seatsOpen > 0 && !j.justFilled.includes(o.id)).length;
  const usedNotes = new Set(j.notes.map((n) => n.text));

  // Keep the newest message in view as the conversation grows.
  const size = `${runs.length}-${latest?.steps.length}-${latest?.status}-${j.chosenId}-${j.seatHeld}-${j.emailSent}`;
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [size]);

  return (
    <>
      <EventLine icon={<AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />} at={runs[0]?.startedAt ?? null}>
        <b className="font-medium">STAT 2 is full</b> <span className="text-muted-foreground">· the class you tried to add</span> <SourceChip id="portal-full" />
      </EventLine>

      {runs.map((r, i) => {
        const earlier = runs.slice(0, i);
        const pick = pickOf(r);
        const prev = earlier.map(pickOf).filter(Boolean).at(-1);
        const isLatest = i === runs.length - 1;
        const filled = pick && j.justFilled.includes(pick.id);
        return (
          <div key={r.runId ?? `run-${i}`} className="contents">
            {r.trigger === "recheck" && r.stale && (
              <EventLine icon={<RotateCw className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />} at={r.startedAt}>
                <b className="font-medium">{r.stale.facts.map(factPlain).join(" and ")}</b> <span className="text-muted-foreground">· seen on the class list</span>
              </EventLine>
            )}
            {r.trigger === "steer" && r.cause && <You>{r.cause}</You>}

            {r.status !== "done" ? (
              <Sprout><RunTrace run={r} waitingOn={null} /></Sprout>
            ) : (
              <Sprout>
                <p>
                  {i === 0
                    ? `It filled up, so I looked for backups that still count toward ${REQUIREMENT_LABEL}.`
                    : r.trigger === "steer"
                      ? "Got it, I'll remember that. I re-planned with it and only redid what it touches."
                      : `That touches only part of what I did, so ${(r.stale?.helpers ?? []).map((h) => HELPER_NAME[h]).join(" and ") || "the helpers"} redid just that part.`}
                </p>
                <WorkFold run={r} earlier={earlier} />
                {pick ? (
                  <p>
                    <b className="font-semibold">{i > 0 && prev?.id === pick.id ? `${short(pick)} is still my pick.` : `My pick: ${short(pick)}.`}</b>{" "}
                    {r.result?.why}
                    {!isLatest && filled && <span className="text-muted-foreground"> (It filled after this.)</span>}
                  </p>
                ) : r.result?.why ? <p>{r.result.why}</p> : null}
                {isLatest && deciding && !plannerOff && (pick
                  ? <PickCard o={pick} total={openCount} onAll={() => setAllOpen(true)} />
                  : <Button size="sm" variant="outline" onClick={() => setAllOpen(true)}>See every option</Button>)}
                {isLatest && deciding && plannerOff && <p className="text-muted-foreground">Read records or Check your degree is off in Agent controls, so I can't suggest options.</p>}
              </Sprout>
            )}
          </div>
        );
      })}

      {chosen && (
        <>
          <You>I'll take {short(chosen)} §{chosen.section}</You>
          <Sprout>
            <p>{recoveryPath(chosen) === "hold" ? "Good choice. Hold the seat now, and I'll help you confirm it counts in parallel." : `Good choice. ${short(chosen)} counts toward ${REQUIREMENT_LABEL}, so you can register for it now.`}</p>
            <div className="chat-steps space-y-3"><NextSteps /></div>
          </Sprout>
        </>
      )}

      {deciding && !plannerOff && (
        <div className="chat-steers agent-in" aria-label="Tell the helpers something">
          {STEERS.filter((s) => !usedNotes.has(s)).map((s) => (
            <button key={s} type="button" className="run-choice" onClick={() => j.steer(s)}>{s}</button>
          ))}
        </div>
      )}

      <div ref={endRef} />

      <Sheet open={allOpen} onOpenChange={setAllOpen}>
        <SheetContent side="right" className="brand-app agent-panel w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetDescription>Sprout · STAT 2 is full</SheetDescription>
            <SheetTitle>Options with open seats</SheetTitle>
          </SheetHeader>
          <div className="agent-panel px-4 pb-10" onClickCapture={(e) => { if ((e.target as HTMLElement).closest("button")?.textContent?.startsWith("Choose")) setAllOpen(false); }}>
            <OptionsList showTitle={false} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
