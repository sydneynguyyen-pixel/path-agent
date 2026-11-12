import { useState } from "react";
import { HELPER_NAME, LANE, laneLayout, type LaneDot, type TraceRun } from "@/lib/run";
import type { AgentId } from "@/lib/journey";
import { fmtClock } from "@/lib/journey";
import { SafeSource } from "@/components/app/SafeSource";
import { options } from "@/data/scenario";
import { cn } from "@/lib/utils";

const FILL: Record<AgentId, string> = {
  reader: "var(--mesh-agent-reader-mid)",
  planner: "var(--mesh-agent-planner-mid)",
  backup: "var(--mesh-agent-backup-mid)",
  drafter: "var(--mesh-agent-drafter-mid)",
};
const HELPERS: AgentId[] = ["reader", "planner", "backup", "drafter"];

/** A curve from one helper's step to the next helper's step, the "vine" between lanes. */
function vine(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

const secs = (ms: number) => `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;

/**
 * "How it ran": one lane per helper, time left to right. Each step is a dot you can tap for its
 * text, source and time. Handoffs are the curves; a dashed line marks what changed, and dashed
 * dots are helpers whose earlier result still held. Scrolls sideways inside the card on a phone.
 */
export function HelperLanes({ root, rechecks, lit = null, onLit }: { root: TraceRun; rechecks: TraceRun[]; lit?: AgentId | null; onLit?: (h: AgentId | null) => void }) {
  const layout = laneLayout(root, rechecks);
  const [picked, setPicked] = useState<string | null>(null);
  const dot = layout.dots.find((d) => d.id === picked) ?? null;
  const steps = layout.dots.filter((d) => !d.kept).length;
  const H = layout.height + 22;
  const label = (d: LaneDot) => `${HELPER_NAME[d.helper]}${d.kept ? ", kept its earlier result" : ""}${d.pick ? ", the pick" : ""}, at ${secs(d.ms)}: ${d.text}`;

  return (
    <section aria-label="How it ran">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h4 className="text-[15px] font-semibold">How it ran</h4>
        <span className="text-xs text-muted-foreground">· {steps} {steps === 1 ? "step" : "steps"} · tap a dot for its source and time</span>
      </div>
      <div className="-mx-2 mt-2 overflow-x-auto px-2 pb-1 [scrollbar-width:thin]">
        <div className="relative" style={{ width: layout.width, height: H }}>
          <svg width={layout.width} height={H} className="absolute inset-0" aria-hidden="true">
            {HELPERS.map((h) => (
              <g key={h}>
                <text x={0} y={layout.laneY[h] + 4} className="fill-foreground text-[13px] font-medium">{HELPER_NAME[h]}</text>
                <line x1={LANE.left} x2={layout.width - LANE.right / 2} y1={layout.laneY[h]} y2={layout.laneY[h]} className="stroke-border" strokeWidth={1} />
              </g>
            ))}
            {layout.links.map((l, i) => <path key={i} d={vine(l.from, l.to)} fill="none" className="stroke-muted-foreground/60" strokeWidth={1.25} />)}
            {layout.changes.map((c, i) => (
              <g key={i}>
                <line x1={c.x} x2={c.x} y1={10} y2={layout.height} className="stroke-alert" strokeWidth={1.5} strokeDasharray="4 4" />
              </g>
            ))}
            {layout.ticks.map((t, i) => <text key={i} x={t.x} y={H - 2} textAnchor={i === 0 ? "start" : t.x > layout.width - 48 ? "end" : "middle"} className="fill-muted-foreground text-[11px]">{t.label}</text>)}
          </svg>
          {layout.changes.map((c, i) => (
            <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-alert-soft px-2 py-0.5 text-[11px] font-medium text-alert" style={{ left: c.x, top: 0 }}>{c.label}</span>
          ))}
          {layout.dots.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-label={label(d)}
              aria-pressed={picked === d.id}
              onClick={() => setPicked(picked === d.id ? null : d.id)}
              onMouseEnter={() => onLit?.(d.helper)}
              onMouseLeave={() => onLit?.(null)}
              onFocus={() => onLit?.(d.helper)}
              onBlur={() => onLit?.(null)}
              className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              style={{ left: d.x, top: d.y }}
            >
              <span
                className={cn("block rounded-full motion-safe:transition-transform", d.pick ? "size-5 ring-2 ring-foreground" : "size-3.5", d.kept && "border-[1.5px] border-dashed border-muted-foreground bg-card", (picked === d.id || lit === d.helper) && "run-dot-lit scale-125")}
                style={d.kept ? undefined : { background: FILL[d.helper] }}
              />
            </button>
          ))}
          {layout.dots.filter((d) => d.pick).map((d) => (
            <span key={`${d.id}-label`} className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[11px] text-muted-foreground" style={{ left: d.x, top: d.y + 14 }}>{options.find((o) => o.id === d.optionId)?.course.replace("BCC ", "") ?? "Pick"}</span>
          ))}
        </div>
      </div>
      <div aria-live="polite" className="min-h-6">
        {dot && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-secondary px-4 py-2.5 text-sm">
            <span className="font-medium">{HELPER_NAME[dot.helper]}</span>
            <span className="min-w-0 flex-1">{dot.text}</span>
            <span className="flex flex-wrap gap-1">{dot.sourceIds.map((id) => <SafeSource key={id} id={id} />)}</span>
            <time dateTime={dot.at.toISOString()} className="font-mono text-xs text-muted-foreground">{dot.kept ? `from ${fmtClock(dot.at)}` : `${fmtClock(dot.at)} · ${secs(dot.ms)} in`}</time>
          </div>
        )}
      </div>
    </section>
  );
}
