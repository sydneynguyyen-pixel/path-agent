import { useEffect, useState } from "react";
import { Ban, Check, ChevronRight, CircleDashed, Code2 } from "lucide-react";
import { useJourney, type AgentId } from "@/lib/journey";
import { options } from "@/data/scenario";
import { checkResult, factPlain, HELPER_NAME, PICK_CHECKS, recheckSummary, runTitle, TOOL_HELPER, TOOLS, toolPlain, toolStates, traceRows, type RunGroup, type TraceRun } from "@/lib/run";
import { AgentAvatar } from "@/components/app/Brand";
import { ModePill } from "@/components/app/RunCard";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import "@/styles/motion-agents.css";

const FILL: Record<AgentId, string> = {
  reader: "var(--mesh-agent-reader-mid)",
  planner: "var(--mesh-agent-planner-mid)",
  backup: "var(--mesh-agent-backup-mid)",
  drafter: "var(--mesh-agent-drafter-mid)",
};
const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
const pickName = (r: TraceRun) => options.find((o) => o.id === r.result?.optionId)?.course.replace("BCC ", "");
const triggerLabel = { error: "First run", recheck: "Re-check", steer: "Re-plan" } as const;
const TECH_KEY = "pa-bts-tech";

/** "Show technical details" is remembered per browser, off by default so students see the plain version. */
function useTech() {
  const [tech, setTech] = useState(false);
  useEffect(() => {
    try { setTech(localStorage.getItem(TECH_KEY) === "1"); } catch { /* storage blocked */ }
  }, []);
  const set = (v: boolean) => {
    setTech(v);
    try { localStorage.setItem(TECH_KEY, v ? "1" : "0"); } catch { /* storage blocked */ }
  };
  return [tech, set] as const;
}

/** A small grey label with the technical name. Only shown when technical details are on. */
function Tech({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[11px] text-muted-foreground">{children}</span>;
}

/**
 * Behind the scenes for one run and its re-checks. Students get one sentence, one picture of the
 * steps and one line about the safety checks; the trace, tool names and timings sit behind a switch.
 */
export function BehindScenes({ group }: { group: RunGroup }) {
  const runs = [group.root, ...group.rechecks];
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [tech, setTech] = useTech();
  const [hoverTool, setHoverTool] = useState<string | null>(null);
  const found = runs.findIndex((r) => r.runId === pickedId);
  const selIdx = found >= 0 ? found : runs.length - 1;
  const run = runs[selIdx]!;
  const earlier = runs.slice(0, selIdx);
  const states = toolStates(run, earlier);
  const pick = pickName(run);
  const ran = Object.values(states).filter((s) => s === "ran").length;
  const kept = Object.values(states).filter((s) => s === "kept").length;

  const sentence = selIdx === 0
    ? `${runTitle(run)}, so the helpers took ${run.steps.length} steps to find you another class.`
    : `${runTitle(run)}. ${ran} ${ran === 1 ? "step" : "steps"} ran again and ${kept} kept ${kept === 1 ? "its" : "their"} answer.`;

  return (
    <section aria-label={`Behind the scenes: ${runTitle(group.root)}`} className="space-y-4">
      {/* The order things happened, plus the switch for the technical view. */}
      <div className="flex flex-wrap items-center gap-2">
        {runs.length > 1 && runs.map((r, i) => (
          <span key={r.runId ?? i} className="contents">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            <button type="button" aria-pressed={i === selIdx} onClick={() => setPickedId(r.runId)}
              className={cn("bts-run flex flex-col rounded-2xl bg-card px-3.5 py-1.5 text-left", i === selIdx && "is-on", hoverTool !== null && r.steps.some((s) => s.tool === hoverTool) && "is-lit")}>
              <span className="text-[11px] text-muted-foreground">{triggerLabel[r.trigger]}{tech && r.runId ? <> · <Tech>{r.runId}</Tech></> : null}</span>
              <b className="text-sm font-semibold">{runTitle(r)}</b>
            </button>
          </span>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Code2 className="size-3.5" aria-hidden="true" />Show technical details
          <Switch checked={tech} onCheckedChange={setTech} aria-label="Show technical details" />
        </label>
      </div>

      <div className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <p className="min-w-0 flex-1 basis-80 text-[15px] leading-relaxed">
            {sentence}
            {pick && run.ttvMs !== null && <> New pick: <b className="font-semibold">{pick}</b>, ready in {secs(run.ttvMs)}.</>}
          </p>
          <ModePill run={run} />
        </div>

        <StepPicture run={run} states={states} recheck={selIdx > 0} tech={tech} hoverTool={hoverTool} onHover={setHoverTool} />

        <SafetyLine run={run} pick={pick} tech={tech} />
      </div>

      {tech && <TechDetails run={run} earlier={earlier} hoverTool={hoverTool} onHover={setHoverTool} />}
    </section>
  );
}

/** What changed, then the five steps in order: filled ones ran, dashed ones kept their answer. */
function StepPicture({ run, states, recheck, tech, hoverTool, onHover }: { run: TraceRun; states: Record<string, string>; recheck: boolean; tech: boolean; hoverTool: string | null; onHover: (t: string | null) => void }) {
  const facts = run.stale?.facts ?? [];
  return (
    <div className="mt-5">
      <p className="text-xs text-muted-foreground">
        {recheck && facts.length > 0
          ? <>Because <span className="bts-fact rounded-full bg-alert-soft px-2 py-0.5 font-medium text-alert">{facts.map(factPlain).join(" and ")}</span></>
          : "Every step the helpers took"}
      </p>
      <ol className="relative mt-3 grid gap-2 md:grid-cols-5">
        <span aria-hidden="true" className="absolute left-4 right-4 top-1/2 hidden h-px bg-border md:block" />
        {TOOLS.map((t, i) => {
          const st = states[t.id] ?? "idle";
          const helper = TOOL_HELPER[t.id] ?? "planner";
          return (
            <li key={t.id} className="bts-row relative" style={{ animationDelay: `${i * 60}ms` }}>
              <button type="button" onMouseEnter={() => onHover(t.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(t.id)} onBlur={() => onHover(null)}
                className={cn("bts-node flex h-full w-full items-center gap-2.5 rounded-2xl bg-card px-3 py-2.5 text-left md:flex-col md:items-start md:gap-2", recheck && st === "ran" && "is-ran", st === "kept" && "is-kept", st === "idle" && "opacity-45", hoverTool === t.id && "is-lit")}>
                <AgentAvatar agent={helper} className="size-7 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-snug">{t.plain}</span>
                  <span className={cn("mt-0.5 block text-[11px]", recheck && st === "ran" ? "text-alert" : "text-muted-foreground")}>
                    {st === "ran" ? (recheck ? "Ran again" : `${HELPER_NAME[helper]} did this`) : st === "kept" ? "Kept its answer" : "Not needed"}
                  </span>
                  {tech && <span className="mt-0.5 block truncate"><Tech>{t.id}</Tech></span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {recheck && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full ring-[1.5px] ring-alert" aria-hidden="true" />Ran again</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border-[1.5px] border-dashed border-muted-foreground/60" aria-hidden="true" />Kept its answer, which is why it was fast</span>
        </p>
      )}
    </div>
  );
}

/** One line about the checks; opens to the five rules. */
function SafetyLine({ run, pick, tech }: { run: TraceRun; pick: string | undefined; tech: boolean }) {
  const checks = checkResult(run);
  const head = checks.state === "passed"
    ? checks.sentBack.length > 0 ? `Sent back ${checks.sentBack.length === 1 ? "once" : `${checks.sentBack.length} times`}, then passed every safety check` : `${pick ?? "The pick"} passed every safety check before you saw it`
    : checks.state === "running" ? "Safety checks run as soon as there's a pick" : "No pick to check in this run";
  return (
    <details className="group mt-5 border-t pt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
        {checks.state === "passed" ? <Check className="size-4 text-mark-yes" aria-hidden="true" /> : <CircleDashed className="size-4 text-muted-foreground" aria-hidden="true" />}
        <span className="font-medium">{head}</span>
        {tech && <Tech>rejectPick · enforced in code</Tech>}
        <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
      </summary>
      <p className="mt-3 text-[13px] text-muted-foreground">The AI suggests a class, but simple rules check it before you see it. If it fails one, it has to pick again. It can't skip these.</p>
      <ul className="mt-2">
        {PICK_CHECKS.map((c, i) => (
          <li key={c} className="bts-check flex items-center gap-2 py-1 text-[13px]" style={{ animationDelay: `${i * 70}ms` }}>
            {checks.state === "passed" ? <Check className="size-3.5 text-mark-yes" aria-label="Passed" /> : <CircleDashed className="size-3.5 text-muted-foreground" aria-label="Not checked" />}
            {c}
          </li>
        ))}
      </ul>
      {checks.sentBack.map((t) => <p key={t} className="bts-sentback mt-2 rounded-xl bg-alert-soft px-3 py-2 text-xs text-alert"><b>Sent back:</b> {t}</p>)}
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Ban className="size-3.5" aria-hidden="true" />It can't register, drop, waitlist or send anything. It has no way to.</p>
    </details>
  );
}

/** The engineer's view: step timings, handoffs, what went stale and how it's set up. */
function TechDetails({ run, earlier, hoverTool, onHover }: { run: TraceRun; earlier: TraceRun[]; hoverTool: string | null; onHover: (t: string | null) => void }) {
  const j = useJourney();
  const { rows, totalMs } = traceRows(run, earlier);
  const on = (Object.keys(HELPER_NAME) as AgentId[]).filter((h) => j.agentOn[h]).length;
  const summary = earlier.length > 0 ? recheckSummary(run, earlier) : null;
  const cols = "grid grid-cols-[24px_minmax(0,200px)_minmax(0,1fr)_48px] items-center gap-x-3";
  return (
    <section aria-label="Technical details" className="surface bts-swap p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-x-2"><h3 className="text-[15px] font-semibold">Trace</h3><Tech>{run.runId}{run.parentRunId ? ` ← ${run.parentRunId}` : ""}</Tech></div>
      {summary && <p className="mt-1 text-xs text-muted-foreground">{summary.line}</p>}
      <div className={cn(cols, "mt-3 text-[11px] text-muted-foreground")}><span /><span>Step</span><span className="flex justify-between"><span>0s</span><span>{secs(totalMs)}</span></span><span className="text-right">Time</span></div>
      <ol className="mt-1">
        {rows.map((row, i) => {
          if (row.kind === "handoff") {
            return <li key={row.id} className={cn(cols, "bts-row border-t py-1.5 text-[11px] text-muted-foreground")} style={{ animationDelay: `${i * 50}ms` }}><span /><span className="col-span-3 truncate">{HELPER_NAME[row.from]} → {HELPER_NAME[row.to]}: {row.summary}</span></li>;
          }
          const left = row.kind === "step" ? (row.startMs / totalMs) * 100 : 0;
          const width = row.kind === "step" ? Math.max(2, ((row.endMs - row.startMs) / totalMs) * 100) : 100;
          return (
            <li key={row.id} onMouseEnter={() => onHover(row.tool)} onMouseLeave={() => onHover(null)} className={cn(cols, "bts-row rounded-lg border-t py-1.5", row.kind === "kept" && "opacity-60", hoverTool === row.tool && "is-lit")} style={{ animationDelay: `${i * 50}ms` }}>
              <AgentAvatar agent={row.helper} className="size-6" />
              <span className="min-w-0"><span className="block truncate text-xs font-medium">{toolPlain(row.tool)}</span><span className="block truncate font-mono text-[10px] text-muted-foreground">{row.tool}</span></span>
              <span aria-hidden="true">{row.kind === "kept"
                ? <span className="block h-2 rounded-full border border-dashed border-muted-foreground/50" />
                : <span className="bts-bar block h-2 rounded-full" style={{ marginLeft: `${left}%`, width: `${width}%`, background: row.ok ? FILL[row.helper] : "var(--alert-soft)" }} />}</span>
              <span className="text-right font-mono text-[10px] text-muted-foreground">{row.kind === "kept" ? "cached" : secs(row.endMs - row.startMs)}</span>
            </li>
          );
        })}
      </ol>
      {run.stale && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <Tech>stale</Tech>{run.stale.facts.map((f) => <code key={f} className="rounded bg-alert-soft px-1.5 py-0.5 font-mono text-alert">{f}</code>)}
          <span className="text-muted-foreground">→ re-run</span>{run.stale.tools.map((t) => <code key={t} className="rounded bg-secondary px-1.5 py-0.5 font-mono">{t}</code>)}
        </p>
      )}
      <dl className="mt-5 grid gap-4 border-t pt-4 text-xs sm:grid-cols-4">
        {[
          ["Supervisor", "Sprout", "Picks which helper goes next"],
          ["Helpers on", String(on), "A helper that's off has no tools"],
          ["If the AI is down", "Same tools, scripted", "Labeled “Ran without AI”"],
          ["Pick checks", "rejectPick", "Code, not the model"],
        ].map(([k, v, d]) => (
          <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="mt-0.5 text-sm font-semibold">{v}</dd><dd className="text-muted-foreground">{d}</dd></div>
        ))}
      </dl>
    </section>
  );
}
