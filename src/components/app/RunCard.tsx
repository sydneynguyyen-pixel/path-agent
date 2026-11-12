import { Link } from "@tanstack/react-router";
import { options, sources, type Option } from "@/data/scenario";
import { useJourney, fmtStamp, type Decision } from "@/lib/journey";
import { HELPER_NAME, laterLine, recheckLine, recheckSummary, runHeadline, runTitle, storyLines, usableIn, type RunGroup, type TraceRun } from "@/lib/run";
import { AgentAvatar } from "@/components/app/Brand";
import { SafeSource } from "@/components/app/SafeSource";
import { HelperLanes } from "@/components/app/HelperLanes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** One chip per document, at most three, so a step that cited one rulebook five times shows it once. */
function uniqueSources(ids: string[]) {
  const seen = new Set<string>();
  return ids.filter((id) => {
    const doc = (sources as Record<string, { doc: string } | undefined>)[id]?.doc;
    if (!doc || seen.has(doc)) return false;
    seen.add(doc);
    return true;
  }).slice(0, 3);
}

const optionFor = (run: TraceRun | undefined): Option | undefined => options.find((o) => o.id === run?.result?.optionId);
const shortCourse = (o: Option) => o.course.replace("BCC ", "");
const verdictLine: Record<Option["verdict"], string> = {
  counts: "counts outright",
  conditional: "counts with a condition",
  conflict: "your counselor needs to confirm",
  does_not_count: "doesn't count",
};

/** Live AI or Ran without AI, with the model or the reason. */
export function ModePill({ run }: { run: TraceRun }) {
  if (run.mode === "live") return <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium">Live AI{run.result?.model ? ` · ${run.result.model}` : ""}</span>;
  if (run.mode === "scripted") return <span title={run.reason ?? undefined} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">Ran without AI{run.reason ? ` · ${run.reason}` : ""}</span>;
  return <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">Starting</span>;
}

/** The latest thing waiting on her, with one button. Nothing shows when nothing is waiting. */
export function NeedsYou({ latest }: { latest: TraceRun | null }) {
  const j = useJourney();
  let text: string | null = null;
  let action: React.ReactNode = null;
  if (latest?.status === "waiting" && latest.need) {
    text = latest.need.question;
    action = <Button size="sm" onClick={() => j.setPanelOpen(true)}>Answer</Button>;
  } else if (j.stage === "failed" && !j.chosenId && latest?.status === "done" && latest.result?.optionId) {
    text = `Pick a class for QR-1 Statistics.${latest.stale ? ` ${recheckLine(latest.stale.facts, true).replace(". I re-checked your options.", ", so I re-checked.")}` : ""}`;
    action = <Button size="sm" onClick={() => j.setPanelOpen(true)}>See my pick</Button>;
  } else if (j.draft && !j.emailSent) {
    text = "Drafter wrote your counselor an email. It waits for you to review it.";
    action = <Button size="sm" asChild><Link to="/counselor">Review the draft</Link></Button>;
  }
  if (!text) return null;
  return (
    <div role="status" className="surface flex flex-wrap items-center gap-3 p-4">
      <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">Needs you</span>
      <p className="min-w-0 flex-1 basis-56 text-[15px] font-medium">{text}</p>
      {action}
    </div>
  );
}

function Story({ run, earlier }: { run: TraceRun; earlier: TraceRun[] }) {
  const j = useJourney();
  return (
    <ul className="space-y-3">
      {storyLines(run, j.agentOn, earlier).map((l) => (
        <li key={l.helper} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", !l.used && "opacity-50")}>
          <AgentAvatar agent={l.helper} className="size-8" />
          <p className="min-w-0 flex-1 basis-56 text-[15px] leading-snug"><b className="font-semibold">{HELPER_NAME[l.helper]}</b> {l.used ? l.text.charAt(0).toLowerCase() + l.text.slice(1) : l.text.replace(`${HELPER_NAME[l.helper]} `, "").replace(`${HELPER_NAME[l.helper]}'s `, "'s ")}{l.used && !/[.!?]$/.test(l.text) ? "." : ""}</p>
          {l.sourceIds.length > 0 && <span className="flex flex-wrap gap-1 pl-11 sm:justify-end sm:pl-0">{uniqueSources(l.sourceIds).map((id) => <SafeSource key={id} id={id} />)}</span>}
        </li>
      ))}
    </ul>
  );
}

function CurrentPick({ run }: { run: TraceRun }) {
  const j = useJourney();
  const o = optionFor(run);
  if (!o) return <p className="rounded-2xl bg-secondary px-4 py-3 text-sm">{run.result?.gaveUp ? "Nothing open fits yet. I'll check again if a seat opens." : "No pick this time."}</p>;
  const chosen = j.chosenId === o.id;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-success-soft px-4 py-3.5">
      <p className="min-w-0 flex-1 basis-60 text-[15px] font-medium">My pick now: {shortCourse(o)} §{o.section} · {o.sectionTime} · {verdictLine[o.verdict]}</p>
      {chosen ? <span className="text-sm font-medium">You chose {shortCourse(o)}</span> : (
        <>
          <Button size="sm" variant="outline" onClick={() => j.setPanelOpen(true)}>See all options</Button>
          <Button size="sm" onClick={() => j.choose(o.id)}>Choose {shortCourse(o)}</Button>
        </>
      )}
    </div>
  );
}

/** One run as a card: what happened in plain words, any re-checks nested inside, then how it ran. */
export function RunCard({ group, decisions, latest }: { group: RunGroup; decisions: Decision[]; latest: boolean }) {
  const { root, rechecks } = group;
  const last = rechecks.at(-1) ?? root;
  const firstPick = optionFor(root);
  const replaced = rechecks.length > 0 && firstPick && optionFor(last)?.id !== firstPick.id;
  const filled = rechecks[0]?.stale?.facts.some((f) => f.startsWith("seats."));
  const t0 = root.startedAt?.getTime() ?? 0;
  const ttv = usableIn(root.ttvMs);
  return (
    <article className="surface space-y-4 p-5 sm:p-7" aria-label={runTitle(root)}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h3 className="text-xl font-semibold">{runTitle(root)}</h3>
        <ModePill run={root} />
        <span className="ml-auto text-xs text-muted-foreground">{[ttv, root.startedAt && fmtStamp(root.startedAt), root.status === "running" && "running now"].filter(Boolean).join(" · ")}</span>
      </header>

      <Story run={root} earlier={[]} />

      {replaced && firstPick && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-secondary px-4 py-3 text-sm">
          <span className="text-muted-foreground line-through">First pick: {shortCourse(firstPick)} §{firstPick.section} · {verdictLine[firstPick.verdict]}</span>
          <span className="text-xs font-medium text-alert">{filled ? "filled" : "replaced"} {laterLine(t0, rechecks[0]!.startedAt?.getTime() ?? t0)}</span>
        </p>
      )}

      {rechecks.map((r, i) => {
        const earlier = [root, ...rechecks.slice(0, i)];
        const s = recheckSummary(r, earlier);
        return (
          <section key={r.runId ?? i} aria-label={runHeadline(r)} className="space-y-2.5 border-l-2 border-alert pl-4 sm:pl-5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h4 className="text-[17px] font-semibold">{runHeadline(r)}</h4>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{s.redid.length} {s.redid.length === 1 ? "helper" : "helpers"} redid work</span>
              {r.ttvMs !== null && <span className="text-xs text-muted-foreground">+{Math.round(r.ttvMs / 1000)}s</span>}
            </div>
            <p className="text-sm text-muted-foreground">{s.line}</p>
            {i === rechecks.length - 1 && r.status === "done" && latest && <CurrentPick run={r} />}
          </section>
        );
      })}

      {rechecks.length === 0 && root.status === "done" && latest && <CurrentPick run={root} />}

      {decisions.length > 0 && (
        <ul className="space-y-1.5 border-t pt-3 text-sm">
          {decisions.map((d) => <li key={d.id} className="flex flex-wrap gap-x-2"><span className="text-muted-foreground">{fmtStamp(d.when)}</span><span><b className="font-medium">You decided:</b> {d.what}</span>{d.next && <span className="text-muted-foreground">· {d.next}</span>}</li>)}
        </ul>
      )}

      {root.steps.length > 0 && <HelperLanes root={root} rechecks={rechecks} />}
    </article>
  );
}
