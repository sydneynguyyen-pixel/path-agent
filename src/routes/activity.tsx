import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Lightbulb, UserRoundCheck, X, Target, ChevronDown, Check, Ban, ArrowRight, Download, SlidersHorizontal, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, SourceChip } from "@/components/app/bits";
import { useEvents, useScriptNow, When, PermChip, EventStatusChip } from "@/components/app/activityBits";
import { lastActive, type ActivityEvent } from "@/lib/activity";
import { useJourney, fmtClock, fmtStamp, fmtStampSec, type AgentId } from "@/lib/journey";
import { cn } from "@/lib/utils";

type Search = { tab?: "timeline" | "decisions" | undefined; helper?: AgentId | undefined };
const HELPERS: AgentId[] = ["reader", "planner", "backup", "drafter"];

export const Route = createFileRoute("/activity")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s["tab"] === "decisions" ? "decisions" : undefined,
    helper: HELPERS.includes(s["helper"] as AgentId) ? (s["helper"] as AgentId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Activity — Academic Path Agent" },
      { name: "description", content: "What your assistant did for you, step by step, and what it left for you to decide." },
      { property: "og:title", content: "Activity — Academic Path Agent" },
      { property: "og:description", content: "A plain-language timeline of everything your assistant read, suggested and handed back to you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Activity,
});

export const helperInfo: Record<AgentId, { name: string; plain: string }> = {
  reader: { name: "Reader", plain: "Reads your documents and shows where each answer came from." },
  planner: { name: "Planner", plain: "Works out what counts toward your degree and how heavy your term is." },
  backup: { name: "Backup finder", plain: "Looks for other classes that still count when one is full." },
  drafter: { name: "Drafter", plain: "Writes emails for you to review. Never sends on its own." },
};

function Activity() {
  const { tab, helper } = Route.useSearch();
  return (
    <div className="max-w-4xl">
      <PageHeader title="Activity" sub="Here's what your assistant did for you, and what it left for you to decide." />
      <div role="tablist" className="mb-6 inline-flex rounded-full border bg-card p-1 text-sm">
        {([["timeline", "Timeline"], ["decisions", "Your decisions"]] as const).map(([k, l]) => {
          const active = (tab ?? "timeline") === k;
          return (
            <Link key={k} role="tab" aria-selected={active} to="/activity" search={k === "decisions" ? { tab: "decisions" } : {}} className={cn("rounded-full px-4 py-1.5", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {l}
            </Link>
          );
        })}
      </div>
      {tab === "decisions" ? <Decisions /> : <Timeline helper={helper} />}
      <CanCantStrip />
    </div>
  );
}

function Intro() {
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(window.localStorage.getItem("pa-activity-intro") !== "dismissed"), []);
  const set = (v: boolean) => { window.localStorage.setItem("pa-activity-intro", v ? "shown" : "dismissed"); setShown(v); };
  if (!shown) return <button onClick={() => set(true)} className="mb-4 inline-flex items-center gap-1 text-sm text-primary underline"><Info className="size-4" /> How this works</button>;
  return (
    <section className="relative mb-6 rounded-2xl border bg-lilac p-5">
      <button aria-label="Dismiss" onClick={() => set(false)} className="absolute right-3 top-3 text-muted-foreground"><X className="size-4" /></button>
      <p className="max-w-2xl pr-6">
        Path Agent is your teammate for your degree plan. It reads your documents and watches your plan. It can suggest and draft. It can never register you for a class or send anything without your OK.
      </p>
      <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <li className="flex items-center gap-2"><BookOpen className="size-4" /> <b>Reads</b> your school documents</li>
        <li className="flex items-center gap-2"><Lightbulb className="size-4" /> <b>Suggests</b> what to do next</li>
        <li className="flex items-center gap-2"><UserRoundCheck className="size-4" /> <b>Asks you first</b> before anything leaves</li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">These four helpers are the agent: Reader, Planner, Backup finder and Drafter.</p>
    </section>
  );
}

function Timeline({ helper }: { helper?: AgentId | undefined }) {
  const j = useJourney();
  const events = useEvents();
  const now = useScriptNow();
  const shown = helper ? events.filter((e) => e.steps.some((s) => s.helper === helper)) : events;
  return (
    <>
      <Intro />
      <div className="mb-5 flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm shadow-soft">
        <Target className="size-4 text-primary" /> <b>Goal:</b> get you the credits your degree needs and graduate on time.
      </div>
      {helper && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          Showing only the <b>{helperInfo[helper].name}</b>'s steps.
          <Link to="/activity" className="text-primary underline">Show everything</Link>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          Nothing has happened yet. When you register or upload a document, your assistant will show its work here.
        </div>
      ) : (
        <ol className="space-y-4">{shown.map((e) => <EventCard key={e.id} e={e} now={now} helper={helper} />)}</ol>
      )}

      <details className="group mt-8 rounded-2xl border bg-card shadow-soft">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl p-4 font-medium focus-visible:ring-2 focus-visible:ring-ring">
          Who does what <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
          {HELPERS.map((h) => {
            const t = lastActive(events, h);
            return (
              <div key={h} className={cn("rounded-xl border p-4", !j.agentOn[h] && "opacity-60")}>
                <div className="font-medium">{helperInfo[h].name}</div>
                <p className="mt-1 text-sm">{helperInfo[h].plain}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{!j.agentOn[h] ? "Off" : t ? `Last active ${fmtStamp(t)}` : "Not active yet"}</span>
                  <Link to="/activity" search={{ helper: h }} className="text-primary underline">See their steps</Link>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </>
  );
}

function EventCard({ e, now, helper }: { e: ActivityEvent; now: number | null; helper?: AgentId | undefined }) {
  const j = useJourney();
  const navigate = useNavigate();
  const act = () => {
    if (!e.action) return;
    if (e.action.kind === "portal") { j.setGuide(true); navigate({ to: "/portal" }); }
    else if (e.action.kind === "counselor") navigate({ to: "/counselor" });
    else j.setPanelOpen(true);
  };
  const steps = helper ? e.steps.filter((s) => s.helper === helper) : e.steps;
  return (
    <li id={`event-${e.id}`} className={cn("rounded-2xl border bg-card p-5 shadow-soft", e.handoff && "border-2 border-warning/50")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{e.headline}</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <When d={e.at} now={now} />
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Target className="size-3" /> {e.goal === "credits" ? "Serves: the credits you need" : "Serves: graduating on time"}</span>
          </div>
        </div>
        <EventStatusChip s={e.status} />
      </div>
      <p className="mt-2 text-sm"><b>Because:</b> {e.because}</p>

      <ol className="mt-3 space-y-1.5 border-l-2 pl-4">
        {steps.map((s, i) => (
          <li key={i} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm", s.skipped && "text-muted-foreground line-through")}>
            <time className="w-16 shrink-0 font-mono text-xs text-muted-foreground" title={fmtStampSec(s.at)}>{fmtClock(s.at)}</time>
            <span className="flex-1">{s.text}{s.skipped && <span className="ml-1 no-underline">(skipped — {helperInfo[s.helper].name} is off)</span>}</span>
            <PermChip p={s.perm} />
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        {e.found && <Outcome title="What I found" items={e.found} />}
        {e.suggest && <Outcome title="What I suggest" items={e.suggest} />}
        <Outcome title="What I did NOT do" items={e.didNot} icon="no" />
      </div>

      {e.handoff && <p className="mt-4 rounded-xl bg-warning-soft p-3 text-sm"><b>I stopped here. This part is yours.</b> Registering is a click only you can make.</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {e.action && <Button size="sm" onClick={act}>{e.action.label} <ArrowRight className="size-4" /></Button>}
        {e.change && (
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              <SlidersHorizontal className="size-3.5" /> Change what I'm doing
            </summary>
            <div className="absolute z-10 mt-1 w-64 rounded-xl border bg-card p-1 shadow-frame">
              {e.change.map((c) => (
                <button key={c} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary" onClick={(ev) => { (ev.currentTarget.closest("details") as HTMLDetailsElement).open = false; toast(`Got it: “${c}”`, { description: "Demo only — I'll remember this preference next time." }); }}>
                  {c}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      <details className="group mt-4">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm text-primary focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" /> Show the details
        </summary>
        <div className="mt-3 grid gap-4 rounded-xl bg-secondary p-4 text-sm md:grid-cols-2">
          <div><div className="text-xs font-semibold text-muted-foreground">Inputs read</div><ul className="mt-1 list-disc space-y-0.5 pl-4">{e.details.inputs.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><div className="text-xs font-semibold text-muted-foreground">Outputs produced</div><ul className="mt-1 list-disc space-y-0.5 pl-4">{e.details.outputs.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="md:col-span-2"><div className="text-xs font-semibold text-muted-foreground">Source passages (click to read)</div><div className="mt-1 flex flex-wrap gap-1.5">{e.details.sourceIds.map((s) => <SourceChip key={s} id={s} />)}</div></div>
          {e.details.confidence && <div className="md:col-span-2"><div className="text-xs font-semibold text-muted-foreground">How sure (confidence)</div><p>{e.details.confidence}</p></div>}
        </div>
      </details>
    </li>
  );
}

function Outcome({ title, items, icon }: { title: string; items: string[]; icon?: "no" }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs font-semibold text-muted-foreground">{title}</div>
      <ul className="mt-1 space-y-1">
        {items.map((x) => (
          <li key={x} className="flex gap-1.5">{icon === "no" ? <Ban className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />}{x}</li>
        ))}
      </ul>
    </div>
  );
}

function Decisions() {
  const { decisions } = useJourney();
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">This is your record of what you chose. The assistant never decides for you.</p>
        <Button size="sm" variant="outline" disabled={!decisions.length} onClick={() => toast("Record exported (simulated)", { description: "Demo only: no file was created or shared." })}>
          <Download className="size-4" /> Export record
        </Button>
      </div>
      {decisions.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">You haven't decided anything yet. Your choices will be recorded here.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary text-left text-xs text-muted-foreground">
              <tr><th className="p-3">When</th><th className="p-3">You decided</th><th className="p-3">What the assistant had suggested</th><th className="p-3">What happened next</th></tr>
            </thead>
            <tbody>
              {decisions.map((d) => (
                <tr key={d.id} className="border-t align-top">
                  <td className="whitespace-nowrap p-3">{fmtStamp(d.when)}</td>
                  <td className="p-3">{d.who !== "Maya Torres" && <span className="text-xs text-muted-foreground">{d.who} decided: </span>}<b>{d.what}</b></td>
                  <td className="p-3">{d.suggested ?? "—"}<div className="mt-1.5 flex flex-wrap gap-1">{[...new Set(d.evidence)].map((e) => <SourceChip key={e} id={e} />)}</div></td>
                  <td className="p-3">{d.next ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function CanCantStrip() {
  return (
    <div className="sticky bottom-4 z-30 mt-8 rounded-2xl border bg-card/95 px-4 py-2.5 text-xs shadow-frame backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span><Check className="mr-1 inline size-3.5" /><b>Can:</b> read your files, suggest classes, draft emails, say how sure it is.</span>
        <span><Ban className="mr-1 inline size-3.5" /><b>Can't:</b> register you, send anything without your OK, change your degree record, see anything you haven't shared.</span>
        <Link to="/permissions" className="text-primary underline">Change what it's allowed to do</Link>
      </div>
    </div>
  );
}
