import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Ban } from "lucide-react";
import { PageHeader } from "@/components/app/bits";
import { useEvents, useScriptNow, When, EventStatusChip } from "@/components/app/activityBits";
import { useJourney, type AgentId } from "@/lib/journey";
import { runGroups } from "@/lib/run";
import { NeedsYou, RunCard } from "@/components/app/RunCard";
import { BehindScenes } from "@/components/app/BehindScenes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Spot } from "@/components/app/Illustrations";

type Search = { tab?: "timeline" | "decisions" | undefined; helper?: AgentId | undefined };
const HELPERS: AgentId[] = ["reader", "planner", "backup", "drafter"];

export const Route = createFileRoute("/activity")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s["tab"] === "decisions" ? "decisions" : undefined,
    helper: HELPERS.includes(s["helper"] as AgentId) ? (s["helper"] as AgentId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Activity — Trellis" },
      { name: "description", content: "What Sprout did for you, step by step, and what it left for you to decide." },
      { property: "og:title", content: "Activity — Trellis" },
      { property: "og:description", content: "A plain-language timeline of everything Sprout read, suggested and handed back to you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

export const helperInfo: Record<AgentId, { name: string; plain: string }> = {
  reader: { name: "Read records", plain: "Reads your documents and shows where each answer came from." },
  planner: { name: "Check your degree", plain: "Works out what counts toward your degree and how heavy your term is." },
  backup: { name: "Find open classes", plain: "Looks for other classes that still count when one is full." },
  drafter: { name: "Draft emails", plain: "Writes emails for you to review." },
};

function ActivityPage() {
  const { tab, helper } = Route.useSearch();
  return <Activity tab={tab} helper={helper} />;
}

/**
 * Runs: each agent run as a card, newest first, with the decision she made on it. Your decisions
 * now live on their runs, so the old Decisions tab and the table view are gone.
 */
export function Activity({ embedded = false }: { embedded?: boolean; tab?: "timeline" | "decisions" | undefined; helper?: AgentId | undefined }) {
  return (
    <div className="w-full min-w-0">
      <PageHeader title="Activity" sub="What Sprout and your helpers did, and what's waiting on you." />
      <Runs />
      <CanCantStrip embedded={embedded} />
    </div>
  );
}

const VIEW_KEY = "pa-runs-view";

/** Simple for students; Behind the scenes for anyone who wants to see how it worked. Remembered in this browser. */
function useView() {
  const [view, setView] = useState<"simple" | "behind">("simple");
  useEffect(() => {
    try { if (localStorage.getItem(VIEW_KEY) === "behind") setView("behind"); } catch { /* storage blocked */ }
  }, []);
  const set = (v: "simple" | "behind") => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };
  return [view, set] as const;
}

function Runs() {
  const j = useJourney();
  const events = useEvents();
  const now = useScriptNow();
  // Finished runs, plus the one in progress if it has started and isn't in the history yet.
  const live = j.agentRun?.startedAt && !j.runs.some((r) => r.runId === j.agentRun!.runId) ? [j.agentRun] : [];
  const all = [...j.runs, ...live];
  const groups = runGroups(all);
  const latest = all.at(-1) ?? null;
  const earlier = events.filter((e) => !(groups.length && e.id === "stat2-full"));
  const [view, setView] = useView();
  return (
    <div className="space-y-4">
      <NeedsYou latest={latest} />
      {groups.length > 0 && (
        <div role="tablist" aria-label="How much detail" className="inline-flex gap-1 rounded-full border bg-card p-1 text-sm">
          {([["simple", "Simple"], ["behind", "Behind the scenes"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("inline-flex h-8 items-center rounded-full px-4", view === v ? "glass-active font-medium" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
      )}
      {groups.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
          <Spot name="rocks" className="mx-auto mb-3 w-28" />
          <p className="font-medium text-foreground">No runs yet</p>
          <p className="mt-1 text-sm">When a class you try to add is full, Sprout's helpers start a run. It shows up here with what each one did.</p>
        </div>
      ) : (
        groups.map((g, i) => {
          const from = g.root.startedAt?.getTime() ?? 0;
          const until = groups[i - 1]?.root.startedAt?.getTime() ?? Infinity;
          const decisions = j.decisions.filter((d) => d.when.getTime() >= from && d.when.getTime() < until);
          // Keyed by view so switching plays the swap motion instead of jumping.
          return view === "behind"
            ? <div key={`b-${g.root.runId ?? i}`} className="bts-swap"><BehindScenes group={g} /></div>
            : <div key={`s-${g.root.runId ?? i}`} className="bts-swap"><RunCard group={g} decisions={decisions} latest={i === 0} /></div>;
        })
      )}
      {earlier.length > 0 && (
        <section aria-labelledby="earlier" className="space-y-2 pt-2">
          <h2 id="earlier" className="text-sm font-medium text-muted-foreground">Earlier</h2>
          <ol className="space-y-2">
            {earlier.map((e) => (
              <li key={e.id} className="surface flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3.5">
                <span className="min-w-0 flex-1 basis-56 text-[15px] font-medium">{e.headline}</span>
                <EventStatusChip s={e.status} />
                <When d={e.at} now={now} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export function CanCantStrip({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="z-30 mt-8 flex flex-col sm:sticky sm:bottom-4 gap-3 rounded-3xl border bg-card/95 px-5 py-4 text-sm shadow-frame backdrop-blur sm:flex-row sm:items-center sm:gap-6">
      {/* Two aligned rows, label then list, so the eye reads straight down; the change link sits apart as a button. */}
      <dl className="grid min-w-0 flex-1 grid-cols-[auto_1fr] items-start gap-x-3 gap-y-2">
        <dt className="inline-flex items-center gap-1.5 font-semibold"><Check className="size-4 text-mark-yes" aria-hidden="true" />Can</dt>
        <dd className="text-muted-foreground">Read your files, suggest classes, draft emails.</dd>
        <dt className="inline-flex items-center gap-1.5 font-semibold"><Ban className="size-4 text-mark-no" aria-hidden="true" />Can't</dt>
        <dd className="text-muted-foreground">Register you, send anything without your OK, change your degree record, see anything you haven't shared.</dd>
      </dl>
      <Link to={embedded ? "/agents" : "/permissions"} search={embedded ? { tab: "controls" } : {}} className="inline-flex h-9 shrink-0 items-center self-start rounded-full border bg-background px-4 text-sm font-medium hover:bg-muted sm:self-center">Change what it can do</Link>
    </div>
  );
}
