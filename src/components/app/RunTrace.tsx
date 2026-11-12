import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, ArrowUp, Bookmark, CheckCircle2, Info, Lock, MessageCircleQuestion, RotateCw, Timer, X } from "lucide-react";
import { sources } from "@/data/scenario";
import { fmtStampSec, useJourney, type AgentId } from "@/lib/journey";
import { atAGlance, glanceLabel, HELPER_NAME, OFF_LINE, recheckLine, runHeadline, usableIn, type TraceRun } from "@/lib/run";
import { cn } from "@/lib/utils";
import { AgentAvatar } from "./Brand";
import { SourceChip } from "./bits";
import { Ink } from "./Ink";

/** A source chip only for sources the app knows, so a new id from the backend never breaks the page. */
function Source({ id }: { id: string }) {
  return id in sources ? <SourceChip id={id} /> : null;
}

/** "MATH 13 just filled. Re-checking your options." Shown while a re-check runs and after it. */
export function RecheckBanner({ run }: { run: TraceRun }) {
  if (!run.stale) return null;
  const running = run.status === "running";
  return (
    <div role="status" className="run-recheck flex items-start gap-3 rounded-2xl p-4 text-sm">
      <RotateCw className={cn("mt-0.5 size-4 shrink-0", running && "animate-spin [animation-duration:2s]")} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium">{recheckLine(run.stale.facts, !running)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Only {run.stale.helpers.map((h) => HELPER_NAME[h]).join(" and ")} {run.stale.helpers.length === 1 ? "is" : "are"} redoing work that depended on it. Everything else stays as it was.
        </p>
      </div>
    </div>
  );
}

/** Who did what in one run: the header, each helper at a glance, then every step with its source. */
export function RunTrace({ run, waitingOn, pickedName }: { run: TraceRun; waitingOn: AgentId | null; pickedName?: string | undefined }) {
  const j = useJourney();
  const glance = atAGlance(run, j.agentOn, waitingOn);
  const off = glance.filter((g) => g.state === "off");

  if (run.status === "running") {
    const latest = run.steps.at(-1);
    return (
      <div className="space-y-3">
        <div aria-live="polite" className="flex min-h-11 items-center gap-2 text-sm">
          <Ink />
          {latest ? (
            <span key={run.steps.length} className="step-in flex items-center gap-2"><AgentAvatar agent={latest.helper} /><span><span className="font-medium">{HELPER_NAME[latest.helper]}</span> · {latest.text}</span></span>
          ) : (
            <span className="text-muted-foreground">{run.trigger === "recheck" ? "Re-checking…" : "Getting started…"}</span>
          )}
        </div>
        <Glance glance={glance} />
      </div>
    );
  }

  if (run.status === "waiting" && run.need) {
    return (
      <section aria-label="A helper needs a note from you" className="run-need space-y-3 rounded-2xl p-4 text-sm">
        <div className="flex items-center gap-2">
          <AgentAvatar agent={run.need.helper} />
          <p className="font-medium">{HELPER_NAME[run.need.helper]} needs a note from you</p>
        </div>
        <p className="text-base">{run.need.question}</p>
        <div className="flex flex-wrap gap-2">
          {run.need.choices.map((c) => <button key={c} type="button" className="run-choice" onClick={() => j.steer(c)}>{c}</button>)}
        </div>
        <NoteBox placeholder="Or tell me in your own words" />
        <p className="text-xs text-muted-foreground">I'll remember your answer and use it next time, until you remove it.</p>
        <Glance glance={glance} />
      </section>
    );
  }

  const ttv = usableIn(run.ttvMs);
  return (
    <section aria-label="What Sprout did" className="run-card space-y-3 rounded-2xl p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("run-mode", run.mode === "scripted" && "run-mode-offline")}>{runHeadline(run)}</span>
        {ttv && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Timer className="size-3.5" aria-hidden="true" />{ttv}</span>}
      </div>
      {run.mode === "scripted" && <p className="text-xs text-muted-foreground">These are the same checks in a fixed order, with no AI choosing them.</p>}
      <Glance glance={glance} />
      {off.map((g) => (
        <p key={g.helper} className="flex flex-wrap items-center gap-x-2 text-xs">
          <span>{OFF_LINE[g.helper]}</span>
          <Link to="/agents" search={{ tab: "controls" }} onClick={() => j.setPanelOpen(false)} className="font-medium underline underline-offset-4">Turn it on</Link>
        </p>
      ))}
      {pickedName && run.result?.why && <p><span className="font-medium">Why I picked {pickedName}:</span> {run.result.why}</p>}
      {!pickedName && run.result?.gaveUp && run.result.why && <p>{run.result.why}</p>}
      <details className="run-steps">
        <summary className="cursor-pointer text-xs font-medium">See every step · {run.steps.length}</summary>
        <ol className="mt-3 space-y-2.5">
          {run.entries.map((e, i) => {
            if (e.kind === "handoff") {
              return (
                <li key={i} className="run-handoff flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{HELPER_NAME[e.from]}</span><ArrowRight className="size-3" aria-label="handed to" /><span className="font-medium text-foreground">{HELPER_NAME[e.to]}:</span><span>{e.summary}</span>
                </li>
              );
            }
            if (e.kind === "blocked") {
              return <li key={i} className="flex items-center gap-2"><Lock className="size-4 shrink-0" aria-hidden="true" /><span><span className="font-medium">Blocked:</span> {e.rule}</span></li>;
            }
            return (
              <li key={i} className="flex items-start gap-2">
                {e.ok ? <CheckCircle2 className="mt-1 size-4 shrink-0 text-mark-yes" aria-label="Done" /> : <Info className="mt-1 size-4 shrink-0 text-warning" aria-label="Sent back" />}
                <AgentAvatar agent={e.helper} />
                <div className="min-w-0 flex-1">
                  <p><span className="font-medium">{HELPER_NAME[e.helper]}</span> · {e.text}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {e.sourceIds.map((id) => <Source key={id} id={id} />)}
                    <time className="text-[11px] text-muted-foreground" dateTime={e.at.toISOString()}>{fmtStampSec(e.at)}</time>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}

function Glance({ glance }: { glance: ReturnType<typeof atAGlance> }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Each helper at a glance">
      {glance.map((g) => (
        <li key={g.helper} className={cn("run-glance", `run-glance-${g.state}`)}>
          <AgentAvatar agent={g.helper} className="size-5" />
          <span><span className="font-medium">{HELPER_NAME[g.helper]}</span> · {glanceLabel(g)}</span>
        </li>
      ))}
    </ul>
  );
}

/** One line to tell the helpers something. It's remembered and, while she's choosing, they re-plan with it. */
export function NoteBox({ placeholder = "Tell the helpers something, like “no classes before 10”" }: { placeholder?: string }) {
  const j = useJourney();
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    j.steer(text);
    setText("");
  };
  return (
    <form onSubmit={submit} className="run-note" aria-label="Tell the helpers">
      <MessageCircleQuestion className="size-4 shrink-0 opacity-60" aria-hidden="true" />
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label="Tell the helpers" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
      <button type="submit" disabled={!text.trim()} className="desk-send" aria-label="Send note"><ArrowUp className="size-4" aria-hidden="true" /></button>
    </form>
  );
}

/** What the helpers remember. Each note can be removed, and they stop using it. */
export function RememberedNotes({ className }: { className?: string }) {
  const j = useJourney();
  if (j.notes.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 text-xs", className)}>
      <span className="inline-flex items-center gap-1 font-medium"><Bookmark className="size-3.5" aria-hidden="true" />Remembered</span>
      {j.notes.map((n) => (
        <span key={n.id} className="run-memory">
          {n.text}
          <button type="button" onClick={() => j.forgetNote(n.id)} aria-label={`Forget: ${n.text}`} className="grid size-4 place-items-center rounded-full hover:bg-black/5"><X className="size-3" aria-hidden="true" /></button>
        </span>
      ))}
    </div>
  );
}
