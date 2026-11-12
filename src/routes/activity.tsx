import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Ban } from "lucide-react";
import { PageHeader } from "@/components/app/bits";
import { useEvents, useScriptNow } from "@/components/app/activityBits";
import { useJourney, type AgentId } from "@/lib/journey";
import { runGroups, type RunGroup } from "@/lib/run";
import { needsHer, NeedsYou, RunCard } from "@/components/app/RunCard";
import { EventCard } from "@/components/app/ActivityItem";
import type { ActivityEvent } from "@/lib/activity";
import { useState } from "react";
import { Spot } from "@/components/app/Illustrations";

// `tab=decisions` is an old link (Your decisions used to be its own view). It still parses so those links land here, and is ignored.
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
 * Activity: one list, newest first, of everything Sprout's helpers did. Each run (with its re-checks
 * and re-plans) and each earlier item is a light one-line card that opens to show how they found it
 * and what she decided on it. The live conversation is in the chat; this is the history.
 */
export function Activity({ embedded = false }: { embedded?: boolean; tab?: "timeline" | "decisions" | undefined; helper?: AgentId | undefined }) {
  return (
    <div className="w-full min-w-0">
      <PageHeader title="Activity" sub="What Sprout and your helpers did, and what you decided along the way." />
      <Feed />
      <CanCantStrip embedded={embedded} />
    </div>
  );
}

type Item = { kind: "run"; key: string; at: number; group: RunGroup; until: number } | { kind: "event"; key: string; at: number; e: ActivityEvent };

function Feed() {
  const j = useJourney();
  const events = useEvents();
  const now = useScriptNow();
  // Finished runs, plus the one in progress if it has started and isn't in the history yet.
  const live = j.agentRun?.startedAt && !j.runs.some((r) => r.runId === j.agentRun!.runId) ? [j.agentRun] : [];
  const all = [...j.runs, ...live];
  const groups = runGroups(all);
  const latest = all.at(-1) ?? null;
  // The scripted "STAT 2 is full" item is the same thing as the first run, so it only shows before any run.
  const earlier = events.filter((e) => !(groups.length && e.id === "stat2-full"));
  const lastOf = (g: RunGroup) => (g.rechecks.at(-1) ?? g.root).startedAt?.getTime() ?? 0;
  const items: Item[] = [
    ...groups.map((g, i): Item => ({ kind: "run", key: `run-${g.root.runId ?? i}`, at: lastOf(g), group: g, until: groups[i - 1]?.root.startedAt?.getTime() ?? Infinity })),
    ...earlier.map((e): Item => ({ kind: "event", key: `ev-${e.id}`, at: e.at.getTime(), e })),
  ].sort((a, b) => b.at - a.at);
  // The newest run that needs her opens by default; anything she opens or closes stays that way.
  // Only the newest run can still be waiting on her; older ones were superseded.
  const newest = groups[0];
  const newestNeeds = !!newest && needsHer(newest.rechecks.at(-1) ?? newest.root, j);
  const defaultKey = newest && newestNeeds ? `run-${newest.root.runId ?? 0}` : null;
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (k: string) => toggled[k] ?? k === defaultKey;
  const toggle = (k: string) => setToggled((t) => ({ ...t, [k]: !isOpen(k) }));

  return (
    <div className="space-y-3">
      <NeedsYou latest={latest} />
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <Spot name="rocks" className="mx-auto mb-3 w-24" />
          <p className="font-medium text-foreground">Nothing yet</p>
          <p className="mt-1 text-sm text-balance">When a class you try to add is full, Sprout's helpers start a run. It shows up here with how they found your options.</p>
        </div>
      ) : (
        <ol aria-label="Activity, newest first" className="space-y-2">
          {items.map((it) => it.kind === "run"
            ? <RunCard key={it.key} group={it.group} decisions={j.decisions} until={it.until} needs={newestNeeds && it.group === newest} open={isOpen(it.key)} onToggle={() => toggle(it.key)} now={now} />
            : <EventCard key={it.key} e={it.e} now={now} open={isOpen(it.key)} onToggle={() => toggle(it.key)} />)}
        </ol>
      )}
    </div>
  );
}

export function CanCantStrip({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="mt-6 flex flex-col gap-2 rounded-xl border bg-card px-3 py-2.5 text-[13px] sm:flex-row sm:items-center sm:gap-4 sm:px-4">
      <dl className="min-w-0 flex-1 space-y-1 sm:space-y-0.5">
        <div className="flex gap-2"><dt className="inline-flex shrink-0 items-center gap-1 font-semibold"><Check className="size-3.5 text-mark-yes" aria-hidden="true" />Can</dt><dd className="text-muted-foreground">Read your files, suggest classes, draft emails.</dd></div>
        <div className="flex gap-2"><dt className="inline-flex shrink-0 items-center gap-1 font-semibold"><Ban className="size-3.5 text-mark-no" aria-hidden="true" />Can't</dt><dd className="text-muted-foreground">Register you, send anything without your OK, change your degree record, see anything you haven't shared.</dd></div>
      </dl>
      <Link to={embedded ? "/agents" : "/permissions"} search={embedded ? { tab: "controls" } : {}} className="shrink-0 self-start text-sm font-medium underline underline-offset-4 hover:text-foreground sm:self-center">Change what it can do</Link>
    </div>
  );
}
