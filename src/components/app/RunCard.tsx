import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Code2, MessageCircle } from "lucide-react";
import { sources } from "@/data/scenario";
import { useJourney, type Decision } from "@/lib/journey";
import { decisionsByRun, groupSummary, recheckLine, runSentence, toolStates, type RunGroup, type TraceRun } from "@/lib/run";
import { ActivityItem, SourcesLine, type ItemStatus } from "@/components/app/ActivityItem";
import { pickName, SafetyLine, secs, StepPicture, TechDetails, useTech } from "@/components/app/BehindScenes";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import "@/styles/motion-agents.css";

/** One chip per document, at most three, so a step that cited one rulebook five times shows it once. */
export function uniqueSources(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    const doc = (sources as Record<string, { doc: string } | undefined>)[id]?.doc;
    if (!doc || seen.has(doc)) return false;
    seen.add(doc);
    return true;
  }).slice(0, 3);
}

/** Live AI or Ran without AI, with the model or the reason. */
export function ModePill({ run }: { run: TraceRun }) {
  if (run.mode === "live") return <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium">Live AI{run.result?.model ? ` · ${run.result.model}` : ""}</span>;
  if (run.mode === "scripted") return <span title={run.reason ?? undefined} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">Ran without AI{run.reason ? ` · ${run.reason}` : ""}</span>;
  return <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">Starting</span>;
}

/** Whether the run waits on her: a helper asked a question, or there's a pick she hasn't chosen yet. */
export function needsHer(run: TraceRun | null, j: { stage: string; chosenId: string | null }) {
  if (!run) return false;
  if (run.status === "waiting" && !!run.need) return true;
  return j.stage === "failed" && !j.chosenId && run.status === "done" && !!run.result?.optionId;
}

/** The latest thing waiting on her, as a slim one-line notice with one button. Nothing shows when nothing is waiting. */
export function NeedsYou({ latest }: { latest: TraceRun | null }) {
  const j = useJourney();
  let text: string | null = null;
  let action: React.ReactNode = null;
  if (latest?.status === "waiting" && latest.need) {
    text = latest.need.question;
    action = <Button size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => j.setPanelOpen(true)}>Answer</Button>;
  } else if (needsHer(latest, j)) {
    text = `Pick a class for QR-1 Statistics.${latest!.stale ? ` ${recheckLine(latest!.stale.facts, true).replace(". I re-checked your options.", ", so I re-checked.")}` : ""}`;
    action = <Button size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => j.setPanelOpen(true)}>See my pick</Button>;
  } else if (j.draft && !j.emailSent) {
    text = "Drafter wrote your counselor an email. It waits for you to review it.";
    action = <Button size="sm" variant="outline" className="shrink-0 rounded-full" asChild><Link to="/counselor">Review the draft</Link></Button>;
  }
  if (!text) return null;
  return (
    <div key={text} role="status" className="notice run-settle flex items-center gap-3 py-2 pr-2 pl-3">
      <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm"><span className="sr-only">Needs you: </span><span className="font-medium">{text}</span></p>
      {action}
    </div>
  );
}

const TOLD = "Told the helpers: ";
const TRIGGER_LABEL = { error: "First run", recheck: "Re-check", steer: "Re-plan" } as const;

/**
 * One run group (the first run and its re-checks) as a light activity card. Closed: one line.
 * Open: which run you're looking at, one sentence, the five steps, the safety line, what she decided,
 * where it looked, and a way back to the chat.
 */
export function RunCard({ group, decisions, until, needs, open, onToggle, now }: {
  group: RunGroup;
  decisions: Decision[];
  /** When the next (newer) group started, so its decisions stay off this card. */
  until: number;
  needs: boolean;
  open: boolean;
  onToggle: () => void;
  now: number | null;
}) {
  const j = useJourney();
  const runs = [group.root, ...group.rechecks];
  const last = runs.at(-1)!;
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [tech, setTech] = useTech();
  const [hoverTool, setHoverTool] = useState<string | null>(null);
  const found = runs.findIndex((r) => r.runId === pickedId);
  const sel = found >= 0 ? found : runs.length - 1;
  const run = runs[sel]!;
  const earlier = runs.slice(0, sel);
  const pick = pickName(run);
  const byRun = decisionsByRun(runs, decisions, until);
  const mine = byRun[sel] ?? [];
  const status: ItemStatus = needs ? "needs" : last.status === "running" ? "running" : "done";
  const summary = groupSummary(group, pickName(last) ?? null);
  const ids = uniqueSources(run.steps.flatMap((s) => s.sourceIds));

  return (
    <ActivityItem helper={last.steps.at(-1)?.helper ?? "reader"} label={summary} at={last.startedAt ?? group.root.startedAt} now={now} status={status} open={open} onToggle={onToggle}
      summary={<>{summary}{group.rechecks.length > 0 && <span className="ml-1.5 font-normal text-muted-foreground max-sm:hidden">· {group.rechecks.length} {group.rechecks.length === 1 ? "re-check" : "re-checks"}</span>}</>}>
      {runs.length > 1 && (
        <div role="group" aria-label="Which run" className="flex flex-wrap items-center gap-1">
          {runs.map((r, i) => (
            <span key={r.runId ?? i} className="contents">
              {i > 0 && <ChevronRight className="size-3 text-muted-foreground" aria-hidden="true" />}
              <button type="button" aria-pressed={i === sel} onClick={() => setPickedId(r.runId)} title={r.startedAt ? r.startedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : undefined}
                className={cn("inline-flex h-7 items-center rounded-full px-2.5 text-xs", i === sel ? "glass-active font-medium" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground")}>
                {TRIGGER_LABEL[r.trigger]}
              </button>
            </span>
          ))}
        </div>
      )}

      <p key={`s-${sel}`} className="bts-swap text-sm leading-relaxed text-pretty">
        {runSentence(run, earlier)}
        {pick && run.ttvMs !== null && <> New pick: <b className="font-semibold">{pick}</b>, ready in {secs(run.ttvMs)}.</>}
      </p>

      {run.steps.length > 0 && <StepPicture run={run} states={toolStates(run, earlier)} recheck={sel > 0} tech={tech} hoverTool={hoverTool} onHover={setHoverTool} />}

      <SafetyLine run={run} pick={pick} tech={tech} />

      {mine.length > 0 && (
        <ul className="space-y-1 text-[13px]">
          {mine.map((d) => (
            <li key={d.id} className="text-pretty">
              {d.what.startsWith(TOLD)
                ? <><b className="font-medium">You told the helpers:</b> “{d.what.slice(TOLD.length)}”</>
                : <><b className="font-medium">You decided:</b> {d.what}</>}
              {d.next && <span className="text-muted-foreground"> · {d.next}</span>}
            </li>
          ))}
        </ul>
      )}

      <SourcesLine ids={ids} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3">
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => j.setPanelOpen(true)}><MessageCircle className="size-3.5" aria-hidden="true" />Open in chat</Button>
        {tech && <ModePill run={run} />}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Code2 className="size-3.5" aria-hidden="true" />Show technical details
          <Switch checked={tech} onCheckedChange={setTech} aria-label="Show technical details" />
        </label>
      </div>

      {tech && <TechDetails run={run} earlier={earlier} hoverTool={hoverTool} onHover={setHoverTool} />}
    </ActivityItem>
  );
}
