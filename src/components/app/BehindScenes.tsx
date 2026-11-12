import { useState } from "react";
import { Check, Ban, CircleDashed } from "lucide-react";
import { useJourney, type AgentId } from "@/lib/journey";
import { options } from "@/data/scenario";
import { checkResult, factPlain, HELPER_NAME, PICK_CHECKS, recheckSummary, runTitle, TOOL_HELPER, toolPlain, TOOLS, toolStates, traceRows, type RunGroup, type TraceRun } from "@/lib/run";
import { AgentAvatar } from "@/components/app/Brand";
import { ModePill } from "@/components/app/RunCard";
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
const triggerLabel = { error: "first run", recheck: "re-check", steer: "re-plan" } as const;

/** A small grey label with the technical name, for anyone who wants it. */
function Tech({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[11px] text-muted-foreground">{children}</span>;
}

/** The blue "In plain words" line that sits under every panel title. */
function Plain({ children }: { children: React.ReactNode }) {
  return <p className="bts-plain mt-2 rounded-xl px-3 py-2 text-[13px] leading-relaxed"><b className="font-semibold">In plain words:</b> {children}</p>;
}

/**
 * Behind the scenes for one run and its re-checks: the order things happened, each step with its
 * timing, what had to be redone, and the safety checks. Hovering a step lights it up everywhere.
 */
export function BehindScenes({ group }: { group: RunGroup }) {
  const j = useJourney();
  const runs = [group.root, ...group.rechecks];
  const [pickedId, setPickedId] = useState<string | null>(null);
  const found = runs.findIndex((r) => r.runId === pickedId);
  const selIdx = found >= 0 ? found : runs.length - 1;
  const run = runs[selIdx]!;
  const earlier = runs.slice(0, selIdx);
  const [hoverTool, setHoverTool] = useState<string | null>(null);
  const { rows, totalMs } = traceRows(run, earlier);
  const states = toolStates(run, earlier);
  const checks = checkResult(run);
  const summary = selIdx > 0 ? recheckSummary(run, earlier) : null;
  const pick = pickName(run);
  const on = (Object.keys(HELPER_NAME) as AgentId[]).filter((h) => j.agentOn[h]).length;

  return (
    <section aria-label={`Behind the scenes: ${runTitle(group.root)}`} className="space-y-4">
      {/* What happened, in order */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 flex flex-col"><b className="text-[13px] font-semibold">What happened, in order</b><Tech>run lineage</Tech></div>
        {runs.map((r, i) => {
          const st = toolStates(r, runs.slice(0, i));
          const re = Object.values(st).filter((x) => x === "ran").length;
          const kept = Object.values(st).filter((x) => x === "kept").length;
          const lit = hoverTool !== null && r.steps.some((s) => s.tool === hoverTool);
          return (
            <span key={r.runId ?? i} className="contents">
              {i > 0 && <span aria-hidden="true" className="text-muted-foreground">→</span>}
              <button type="button" aria-pressed={i === selIdx} onClick={() => setPickedId(r.runId)} className={cn("bts-run flex flex-col rounded-2xl bg-card px-3.5 py-2 text-left", i === selIdx && "is-on", lit && "is-lit")}>
                <Tech>{r.runId ?? `run ${i + 1}`} · {triggerLabel[r.trigger]}</Tech>
                <b className="text-sm font-semibold">{runTitle(r)}</b>
                <span className="text-xs text-muted-foreground">{i === 0 ? `${re} steps` : `${re} redone · ${kept} kept`}{pickName(r) ? ` · pick ${pickName(r)}` : ""}{r.ttvMs !== null ? ` · ${i === 0 ? "" : "+"}${Math.round(r.ttvMs / 1000)}s` : ""}</span>
              </button>
            </span>
          );
        })}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* Step by step */}
          <section aria-labelledby="bts-steps" className="surface p-5">
            <div className="flex flex-wrap items-baseline gap-x-2"><h3 id="bts-steps" className="text-[17px] font-semibold">Step by step</h3><Tech>trace · {run.runId}</Tech><span className="ml-auto"><ModePill run={run} /></span></div>
            <Plain>
              {selIdx === 0 ? `${runTitle(run)}, so the helpers took ${run.steps.length} steps.` : `${runTitle(run)}. ${summary!.line}`}
              {pick && run.ttvMs !== null ? ` You had a pick (${pick}) ${secs(run.ttvMs)} after it started.` : ""}
            </Plain>
            <div className="mt-3 grid grid-cols-[28px_minmax(0,220px)_minmax(0,1fr)_56px] gap-x-3 text-[11px] text-muted-foreground">
              <span /><span>Which helper did what</span><span className="flex justify-between"><span>0s</span><span>{secs(totalMs)}</span></span><span className="text-right">How long</span>
            </div>
            <ol className="mt-1">
              {rows.map((row, i) => {
                if (row.kind === "handoff") {
                  return (
                    <li key={row.id} className="bts-row grid grid-cols-[28px_minmax(0,220px)_minmax(0,1fr)_56px] items-center gap-x-3 border-t py-1.5 text-xs text-muted-foreground" style={{ animationDelay: `${i * 60}ms` }}>
                      <span /><span>{HELPER_NAME[row.from]} handed to {HELPER_NAME[row.to]}</span><span className="truncate">{row.summary}</span><span />
                    </li>
                  );
                }
                const lit = hoverTool === row.tool;
                const left = row.kind === "step" ? (row.startMs / totalMs) * 100 : 0;
                const width = row.kind === "step" ? Math.max(2, ((row.endMs - row.startMs) / totalMs) * 100) : 100;
                return (
                  <li key={row.id} onMouseEnter={() => setHoverTool(row.tool)} onMouseLeave={() => setHoverTool(null)} onFocus={() => setHoverTool(row.tool)} onBlur={() => setHoverTool(null)} tabIndex={0}
                    className={cn("bts-row grid grid-cols-[28px_minmax(0,220px)_minmax(0,1fr)_56px] items-center gap-x-3 rounded-lg border-t py-2 outline-none", row.kind === "kept" && "opacity-60", lit && "is-lit")} style={{ animationDelay: `${i * 60}ms` }}>
                    <AgentAvatar agent={row.helper} className="size-7" />
                    <div className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{toolPlain(row.tool)}</span>
                      <span className="block truncate text-xs text-muted-foreground">{row.kind === "kept" ? `Already knew this: ${row.text}` : row.text}</span>
                    </div>
                    <div aria-hidden="true">
                      {row.kind === "kept" ? <div className="h-2.5 rounded-full border-[1.5px] border-dashed border-muted-foreground/50" /> : (
                        <div className="bts-bar h-2.5 rounded-full" style={{ marginLeft: `${left}%`, width: `${width}%`, background: row.ok ? FILL[row.helper] : "var(--alert-soft)", animationDelay: `${i * 60 + 80}ms` }} />
                      )}
                    </div>
                    <span className="text-right font-mono text-[11px] text-muted-foreground">{row.kind === "kept" ? "skipped" : secs(row.endMs - row.startMs)}</span>
                  </li>
                );
              })}
            </ol>
            {run.stale && (
              <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs">
                <Tech>stale</Tech>{run.stale.facts.map(factPlain).join(", ")} → redo {run.stale.tools.map((t) => <code key={t} className="rounded bg-card px-1.5 py-0.5 font-mono text-[11px]">{t}</code>)}
              </p>
            )}
          </section>

          {/* Runtime */}
          <section aria-label="How it's set up" className="surface grid gap-4 p-5 sm:grid-cols-4">
            {[
              ["Who's in charge", "Sprout", "Decides which helper goes next"],
              ["Helpers", `${on} on`, "Turn one off and it can't act at all"],
              ["If the AI is down", "Same steps, no AI", "Labeled “Ran without AI”"],
              ["Waiting on you", j.stage === "failed" && !j.chosenId ? "1 choice" : "Nothing", "When unsure, it asks instead of guessing"],
            ].map(([k, v, d]) => (
              <div key={k}><div className="text-xs text-muted-foreground">{k}</div><div className="mt-0.5 text-[15px] font-semibold">{v}</div><div className="text-xs text-muted-foreground">{d}</div></div>
            ))}
          </section>
        </div>

        <div className="space-y-4">
          {/* What had to be redone */}
          <section aria-labelledby="bts-redo" className="surface p-5">
            <div className="flex flex-wrap items-baseline gap-x-2"><h3 id="bts-redo" className="text-[17px] font-semibold">What had to be redone</h3><Tech>dependency graph</Tech></div>
            <Plain>
              {run.stale
                ? `${run.stale.facts.map(factPlain).join(" and ")} only affects some steps. Red ones ran again; dashed ones kept their answer, which is why the new pick came back fast.`
                : "This was the first run, so every step that was needed ran once."}
            </Plain>
            <RedoGraph run={run} states={states} hoverTool={hoverTool} onHover={setHoverTool} />
          </section>

          {/* Safety checks */}
          <section aria-labelledby="bts-checks" className="surface p-5">
            <div className="flex flex-wrap items-baseline gap-x-2"><h3 id="bts-checks" className="text-[17px] font-semibold">Safety checks on every pick</h3><Tech>rejectPick · enforced in code</Tech></div>
            <Plain>The AI suggests a class, but simple rules check it before you see it. If it fails one, the AI has to pick again. It can't skip these.</Plain>
            <ul className="mt-3">
              {PICK_CHECKS.map((c, i) => (
                <li key={c} className="bts-check flex items-center gap-2 border-t py-1.5 text-[13px]" style={{ animationDelay: `${i * 70}ms` }}>
                  {checks.state === "passed" ? <Check className="size-4 text-mark-yes" aria-label="Passed" /> : <CircleDashed className="size-4 text-muted-foreground" aria-label={checks.state === "running" ? "Not checked yet" : "Not needed"} />}
                  {c}
                </li>
              ))}
            </ul>
            {checks.sentBack.map((t) => <p key={t} className="bts-sentback mt-2 rounded-xl bg-alert-soft px-3 py-2 text-xs text-alert"><b>Sent back:</b> {t}</p>)}
            {checks.state === "passed" && pick && <p className="bts-pick mt-3 rounded-xl bg-success-soft px-3 py-2 text-sm" style={{ animationDelay: `${PICK_CHECKS.length * 70 + 60}ms` }}>Passed every check: <b className="font-semibold">{pick}</b></p>}
            <p className="mt-2 flex items-center gap-2 text-xs text-alert"><Ban className="size-3.5" aria-hidden="true" />It can't register, drop, waitlist or send. It has no way to do those.</p>
          </section>
        </div>
      </div>
    </section>
  );
}

/** Facts on the left, steps on the right. A red curve goes from a change to each step it made redo. */
function RedoGraph({ run, states, hoverTool, onHover }: { run: TraceRun; states: Record<string, string>; hoverTool: string | null; onHover: (t: string | null) => void }) {
  const ROW = 50;
  const facts = run.stale?.facts ?? [];
  const H = TOOLS.length * ROW;
  const factY = (i: number) => (H / (facts.length + 1)) * (i + 1);
  const toolY = (i: number) => i * ROW + ROW / 2 - 4;
  return (
    <div className="relative mt-4" style={{ height: H }}>
      <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        {facts.flatMap((f, fi) => (run.stale?.tools ?? []).map((t, k) => {
          const ti = TOOLS.findIndex((x) => x.id === t);
          if (ti < 0) return null;
          const y1 = factY(fi), y2 = toolY(ti);
          return <path key={`${f}-${t}`} className="bts-edge" d={`M110,${y1} C140,${y1} 140,${y2} 170,${y2}`} fill="none" stroke="var(--alert)" strokeWidth={1.75} style={{ animationDelay: `${k * 160}ms` }} />;
        }))}
      </svg>
      {facts.map((f, i) => (
        <span key={f} className="bts-fact absolute left-0 -translate-y-1/2 rounded-full bg-alert-soft px-2.5 py-1 font-mono text-[11px] text-alert" style={{ top: factY(i) }}>{factPlain(f)}</span>
      ))}
      {facts.length === 0 && <span className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-secondary px-2.5 py-1 text-[11px]">{runTitle(run)}</span>}
      {TOOLS.map((t, i) => {
        const st = states[t.id];
        return (
          <button key={t.id} type="button" onMouseEnter={() => onHover(t.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(t.id)} onBlur={() => onHover(null)}
            className={cn("bts-node absolute left-[170px] right-0 flex items-center gap-2 rounded-xl bg-card px-3 py-1.5 text-left", st === "ran" && "is-ran", st === "kept" && "is-kept", st === "idle" && "opacity-50", hoverTool === t.id && "is-lit")}
            style={{ top: i * ROW, height: ROW - 10 }}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: FILL[TOOL_HELPER[t.id] ?? "planner"] }} />
            <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium">{t.plain}</span><span className="block truncate font-mono text-[10px] text-muted-foreground">{t.id}</span></span>
            <span className={cn("shrink-0 text-[11px]", st === "ran" ? "text-alert" : "text-muted-foreground")}>{st === "ran" ? "ran" : st === "kept" ? "kept its answer" : "not needed"}</span>
          </button>
        );
      })}
    </div>
  );
}

