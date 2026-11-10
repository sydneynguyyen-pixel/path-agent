import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Lock, Eye, EyeOff, Check, UserRoundCheck, FileText, CalendarDays, GraduationCap, ArrowRightLeft, Briefcase, Mail, MousePointerClick, ArrowRight, ChevronDown } from "lucide-react";
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

export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "Agent controls — Academic Path Agent" },
      { name: "description", content: "Turn any of the four helpers off, limit what they can read, and see who decides each action." },
      { property: "og:title", content: "Agent controls — Academic Path Agent" },
      { property: "og:description", content: "Your assistant is a team of four helpers. You decide what each can do." },
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

const helperVisuals: Record<AgentId, { task: string; result: string; icon: typeof FileText }> = {
  reader: { task: "Read school records", result: "Your credits, in one place", icon: FileText },
  planner: { task: "Check your degree path", result: "Know what still counts", icon: GraduationCap },
  backup: { task: "Find an open class", result: "Options when a class is full", icon: CalendarDays },
  drafter: { task: "Prepare a counselor email", result: "A draft for you to review", icon: Mail },
};

export function Controls({ embedded = false }: { embedded?: boolean }) {
  const j = useJourney();
  const events = useEvents();
  return (
    <div className="w-full min-w-0">
      <PageHeader title="Agent controls" sub="Your helpers. Your choices."
        right={<Button variant={j.paused ? "default" : "outline"} onClick={() => j.setPaused(!j.paused)}>
          {j.paused ? <><Play className="size-4" /> Resume all</> : <><Pause className="size-4" /> Pause all helpers</>}
        </Button>}
      />
      {j.paused && <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl bg-warning-soft p-4 text-sm"><Pause className="size-4" />All helpers are paused. Nothing is read or drafted until you resume.</div>}

      <section aria-labelledby="helper-heading" className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="helper-heading" className="text-lg font-semibold">Meet your helpers</h2><span className="text-xs text-muted-foreground">{j.paused ? "Paused" : `${HELPERS.filter(h => j.agentOn[h]).length} of 4 on`}</span></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {HELPERS.map((id, index) => {
            const on = j.agentOn[id] && !j.paused;
            const t = lastActive(events, id);
            const visual = helperVisuals[id];
            const skippedEvent = events.find(e => e.steps.some(step => step.helper === id && step.skipped));
            return (
              <article key={id} className={cn("relative flex min-w-0 flex-col rounded-2xl border bg-card p-5 shadow-widget hover:shadow-widget-hover", !on && "bg-secondary/50")}>
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-muted-foreground">{on ? "On" : j.paused ? "Paused" : "Off"}</span><Switch checked={j.agentOn[id]} onCheckedChange={value => j.setAgentOn(id, value)} aria-label={`${helperInfo[id].name} on`} /></div>
                <div className={cn("flex flex-col items-center py-5 text-center", !on && "opacity-50")}>
                  <AgentAvatar agent={id} bare />
                  <h3 className="mt-3 font-semibold">{helperInfo[id].name}</h3>
                  <p className="mt-1 text-sm">{visual.task}</p>
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
                {index < 3 && <ArrowRight aria-hidden className="absolute -right-3 top-32 z-10 hidden size-5 bg-background text-muted-foreground xl:block" />}
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="decision-heading" className="mb-8">
        <h2 id="decision-heading" className="mb-4 text-lg font-semibold">You stay in charge</h2>
        <div className="grid gap-6 border-y py-5 md:grid-cols-3">
          <div className="flex gap-3"><Eye className="mt-1 size-6 shrink-0" /><div><h3 className="text-sm font-semibold">Helpers prepare</h3><p className="mt-1 text-sm text-muted-foreground">Read records · suggest classes · draft emails</p><span className="mt-2 inline-flex items-center gap-1 text-xs"><Check className="size-3.5 text-mark-yes" />Automatic when turned on</span></div></div>
          <div className="flex gap-3"><UserRoundCheck className="mt-1 size-6 shrink-0" /><div><h3 className="text-sm font-semibold">You approve</h3><p className="mt-1 text-sm text-muted-foreground">Review and edit before an email leaves</p><span className="mt-2 inline-flex items-center gap-1 text-xs"><Lock className="size-3.5" />Your OK, every time</span></div></div>
          <div className="flex gap-3"><MousePointerClick className="mt-1 size-6 shrink-0" /><div><h3 className="text-sm font-semibold">You register</h3><p className="mt-1 text-sm text-muted-foreground">Add · drop · join a waitlist</p><span className="mt-2 inline-flex items-center gap-1 text-xs"><Lock className="size-3.5" />Only you can make these clicks</span></div></div>
        </div>
      </section>

      <section aria-labelledby="watch-heading">
        <h2 id="watch-heading" className="mb-4 text-lg font-semibold">Where it watches</h2>
        <div className="flex flex-wrap items-center gap-4 border-y py-5">
          <div className="relative grid h-20 w-32 shrink-0 place-items-center rounded-lg border bg-secondary" aria-hidden><div className="absolute inset-x-0 top-0 flex gap-1 border-b px-2 py-2"><span className="size-1 rounded-full bg-muted-foreground" /><span className="size-1 rounded-full bg-muted-foreground" /><span className="size-1 rounded-full bg-muted-foreground" /></div><GraduationCap className="mt-3 size-7 text-muted-foreground" /><span className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full border bg-card">{j.access.registration && !j.paused ? <Eye className="size-4" /> : <EyeOff className="size-4" />}</span></div>
          <div className="min-w-[150px] flex-1"><h3 className="text-sm font-semibold">Registration page only</h3><p className="mt-1 text-sm text-muted-foreground">Catches “Section full” while you’re on the school page.</p><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" />Your other browser tabs stay private.</p></div>
          <Switch checked={j.access.registration} onCheckedChange={value => j.setAccess("registration", value)} aria-label="Registration page" />
        </div>
      </section>
    </div>
  );
}
