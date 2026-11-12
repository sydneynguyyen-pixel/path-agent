import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Lock, Eye, EyeOff, FileText, CalendarDays, GraduationCap, ArrowRightLeft, Briefcase, Mail, MousePointerClick, ArrowRight, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useJourney, fmtStamp, type AgentId, type AccessKey } from "@/lib/journey";
import { PageHeader } from "@/components/app/bits";
import { useEvents } from "@/components/app/activityBits";
import { lastActive } from "@/lib/activity";
import { connectedSources } from "@/components/app/sourcesData";
import { helperInfo } from "@/routes/activity";
import { AgentAvatar } from "@/components/app/Brand";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/app/Brand";
import { ModePill } from "@/components/app/RunCard";
import { ActAskTable } from "@/components/app/ActAskTable";

export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "Controls — Trellis" },
      { name: "description", content: "Choose what Sprout does and what it can read." },
      { property: "og:title", content: "Controls — Trellis" },
      { property: "og:description", content: "Choose what Sprout does and what it can read." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Controls,
});

const HELPERS: AgentId[] = ["reader", "planner", "backup", "drafter"];
const agentAccess: Record<AgentId, AccessKey[]> = {
  reader: ["registration", "canvas", "sis", "audit", "handshake"],
  planner: ["audit", "articulation"],
  backup: ["sis", "canvas"],
  drafter: ["email"],
};
const never: Record<AgentId, string> = {
  reader: "Never reads other tabs, personal email, or grades you haven't released.",
  planner: "Never says a class counts without a source to point to.",
  backup: "Never adds, drops, or waitlists you.",
  drafter: "Never sends. You approve every email.",
};
const sourceIcon: Record<AccessKey, typeof FileText> = {
  registration: MousePointerClick, canvas: CalendarDays, sis: GraduationCap, audit: FileText, articulation: ArrowRightLeft, handshake: Briefcase, email: Mail,
};
const sourceLabel = (k: AccessKey) => (k === "registration" ? "Registration page" : connectedSources.find((s) => s.id === k)?.what ?? k);

const helperVisuals: Record<AgentId, { result: string; icon: typeof FileText }> = {
  reader: { result: "Your credits, in one place", icon: FileText },
  planner: { result: "Know what still counts", icon: GraduationCap },
  backup: { result: "Options when a class is full", icon: CalendarDays },
  drafter: { result: "A draft for you to review", icon: Mail },
};

/** Sprout as the coordinator above the four helpers. The model name and mode come from the latest run. */
function SproutBand() {
  const j = useJourney();
  const last = j.runs.at(-1) ?? null;
  return (
    <div className="surface flex flex-wrap items-center gap-x-4 gap-y-3 p-5">
      <BrandLogo className="size-11 shrink-0" />
      <div className="min-w-0 flex-1 basis-64">
        <h3 className="text-[17px] font-semibold">Sprout coordinates your four helpers</h3>
        <p className="text-sm text-muted-foreground">It chooses which helper to use next. Trellis checks every result before you see it.</p>
      </div>
      {last ? <ModePill run={last} /> : <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">No runs yet</span>}
      {/* TODO: "Use AI" needs recover() in src/lib/agent/client.ts to skip the live call; that's backend work outside this change. Shown on, and not switchable yet. */}
      <label className="flex items-center gap-2 text-sm font-medium" title="Turning AI off isn't available yet">
        Use AI
        <Switch checked disabled aria-describedby="use-ai-note" />
      </label>
      <span id="use-ai-note" className="sr-only">Turning AI off isn't available yet. When it is, the same checks run without AI and say so.</span>
    </div>
  );
}

/** Her notes to the helpers, each removable. */
function Remembers() {
  const j = useJourney();
  return (
    <section aria-labelledby="remembers" className="surface p-5 sm:p-6">
      <h2 id="remembers" className="text-lg font-semibold">What Sprout remembers</h2>
      <p className="mt-1 text-sm text-muted-foreground">Only what you tell it. Your helpers follow these until you remove them.</p>
      {j.notes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing yet. Tell Sprout something like "I can't do mornings" and it shows up here.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {j.notes.map((n) => (
            <li key={n.id} className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-1 pl-3 pr-1 text-sm">
              {n.text}
              <button type="button" onClick={() => j.forgetNote(n.id)} aria-label={`Remove: ${n.text}`} className="grid size-6 place-items-center rounded-full hover:bg-foreground/10"><X className="size-3.5" aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Rules are checked in code. Preferences only change the order.</p>
    </section>
  );
}

export function Controls({ embedded = false }: { embedded?: boolean }) {
  const j = useJourney();
  const events = useEvents();
  return (
    <div className="w-full min-w-0">
      <PageHeader title="Controls" sub="Choose what Sprout and your helpers do on their own, and what waits for you."
        right={<Button variant={j.paused ? "default" : "outline"} onClick={() => j.setPaused(!j.paused)}>
          {j.paused ? <><Play className="size-4" /> Resume</> : <><Pause className="size-4" /> Pause Sprout</>}
        </Button>}
      />
      {j.paused && <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl bg-warning-soft p-4 text-sm"><Pause className="size-4" />Sprout is paused. Nothing is read or drafted until you resume.</div>}

      <section aria-labelledby="helper-heading" className="mb-8">
        <h2 id="helper-heading" className="sr-only">Sprout and your helpers</h2>
        <SproutBand />
        <div className="mt-4 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {HELPERS.map((id) => {
            const on = j.agentOn[id] && !j.paused;
            const t = lastActive(events, id);
            const visual = helperVisuals[id];
            const skippedEvent = events.find(e => e.steps.some(step => step.helper === id && step.skipped));
            return (
              <article key={id} className={cn("surface surface-hover relative flex min-w-0 flex-col p-5", !on && "opacity-70")}>
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{on ? "On" : j.paused ? "Paused" : "Off"}</span><Switch checked={j.agentOn[id]} onCheckedChange={value => j.setAgentOn(id, value)} aria-label={`${helperInfo[id].name} on`} /></div>
                <div className={cn("flex flex-col items-center py-5 text-center", !on && "opacity-50")}>
                  <AgentAvatar agent={id} bare />
                  <h3 className="mt-3 font-semibold">{helperInfo[id].name}</h3>
                                  </div>
                <div className="flex items-center gap-2 border-t py-3 text-xs"><visual.icon className="size-4 shrink-0 text-muted-foreground" /><span>{visual.result}</span></div>
                <p className="flex min-h-12 items-start gap-2 text-xs text-muted-foreground"><Lock className="mt-0.5 size-3.5 shrink-0" />{never[id]}</p>
                {!j.agentOn[id] && skippedEvent && <Link to={embedded ? "/agents" : "/activity"} search={embedded ? { tab: "timeline" } : {}} hash={`event-${skippedEvent.id}`} className="mb-3 text-xs underline">See what was skipped</Link>}
                <details className="group mt-auto border-t pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring">School access <span className="flex items-center gap-1 text-muted-foreground">{agentAccess[id].filter(k => j.access[k]).length}/{agentAccess[id].length}<ChevronDown className="size-3.5 transition-transform group-open:rotate-180" /></span></summary>
                  <div className="mt-3 space-y-3">{agentAccess[id].map(k => {
                    const source = connectedSources.find(s => s.id === k);
                    const Icon = sourceIcon[k];
                    return <div key={k} className="flex items-center gap-2"><span className="grid size-7 shrink-0 place-items-center">{source ? <img src={source.logo} alt="" className="max-h-6 max-w-6 object-contain" /> : <Icon className="size-5" />}</span><span className="min-w-0 flex-1 text-xs" title={sourceLabel(k)}>{k === "registration" ? "Registration page" : source?.name}</span><Switch checked={j.access[k]} onCheckedChange={value => j.setAccess(k, value)} aria-label={`${helperInfo[id].name}: ${sourceLabel(k)}`} /></div>;
                  })}</div>
                </details>
                <Link to={embedded ? "/agents" : "/activity"} search={embedded ? { tab: "timeline", helper: id } : { helper: id }} title={t ? `Last active ${fmtStamp(t)}` : "Not active yet"} className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground hover:text-foreground">See activity <ArrowRight className="size-3.5" /></Link>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mb-8"><ActAskTable /></div>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <Remembers />
      <section aria-labelledby="watch-heading" className="surface p-5 sm:p-6">
        <h2 id="watch-heading" className="mb-3 text-lg font-semibold">Where it watches</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative grid h-20 w-32 shrink-0 place-items-center rounded-lg border bg-secondary" aria-hidden><div className="absolute inset-x-0 top-0 flex gap-1 border-b px-2 py-2"><span className="size-1 rounded-full bg-muted-foreground" /><span className="size-1 rounded-full bg-muted-foreground" /><span className="size-1 rounded-full bg-muted-foreground" /></div><GraduationCap className="mt-3 size-7 text-muted-foreground" /><span className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full border bg-card">{j.access.registration && !j.paused ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</span></div>
          <div className="min-w-[150px] flex-1"><h3 className="text-sm font-semibold">Registration page only</h3><p className="mt-1 text-sm text-muted-foreground">Catches “Section full” while you’re on the school page.</p><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" />Your other browser tabs stay private.</p></div>
          <Switch checked={j.access.registration} onCheckedChange={value => j.setAccess("registration", value)} aria-label="Registration page" />
        </div>
      </section>
      </div>
    </div>
  );
}
