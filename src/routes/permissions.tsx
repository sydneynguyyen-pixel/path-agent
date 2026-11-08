import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Lock, Eye, EyeOff, Zap, UserRoundCheck, Ban, FileText, CalendarDays, GraduationCap, ArrowRightLeft, Mail, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  reader: ["registration", "canvas", "sis", "audit"],
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
  registration: MousePointerClick, canvas: CalendarDays, sis: GraduationCap, audit: FileText, articulation: ArrowRightLeft, email: Mail,
};
const sourceLabel = (k: AccessKey) => (k === "registration" ? "Registration page" : connectedSources.find((s) => s.id === k)?.what ?? k);

type Decider = "auto" | "auto_draft" | "ok" | "blocked";
const deciderMap: Record<Decider, { label: string; icon: typeof Zap; cls: string }> = {
  auto: { label: "Automatic", icon: Zap, cls: "bg-secondary text-foreground" },
  auto_draft: { label: "Automatic, never sent", icon: Zap, cls: "bg-secondary text-foreground" },
  ok: { label: "Needs your OK every time", icon: UserRoundCheck, cls: "aqua-chip" },
  blocked: { label: "Blocked. Only you can do this", icon: Ban, cls: "confidence-low text-foreground" },
};
const actions: [string, Decider][] = [
  ["Read your documents and registration page", "auto"],
  ["Suggest classes that still count", "auto"],
  ["Draft an email to your counselor", "auto_draft"],
  ["Send an email", "ok"],
  ["Register, drop or waitlist you", "blocked"],
];

function Controls() {
  const j = useJourney();
  const events = useEvents();
  return (
    <div className="w-full min-w-0">
      <PageHeader
        title="Agent controls"
        sub="Your assistant is a team of four helpers. Turn any off, or limit what it can read."
        right={
          <Button variant={j.paused ? "default" : "outline"} onClick={() => j.setPaused(!j.paused)}>
            {j.paused ? <><Play className="size-4" /> Resume all</> : <><Pause className="size-4" /> Pause all agents</>}
          </Button>
        }
      />

      {j.paused && <div className="mb-6 rounded-2xl bg-warning-soft p-4 text-sm">All helpers are paused. Nothing is read or drafted until you resume.</div>}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Where it watches</h2>
        <div className="flex items-center gap-4 rounded-2xl border p-4">
          {j.access.registration && !j.paused ? <Eye className="size-5 text-success" /> : <EyeOff className="size-5 text-muted-foreground" />}
          <div className="min-w-0 flex-1"><div className="font-medium">Registration page</div><div className="text-sm text-muted-foreground">Watch only while you're on it, to catch errors like “Section full”.</div></div>
          <Switch checked={j.access.registration} onCheckedChange={(v) => j.setAccess("registration", v)} aria-label="Registration page" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Nothing else in your browser is visible to the assistant.</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-lg font-medium">Actions</h2>
        <p className="mb-3 text-sm text-muted-foreground">How much the assistant may do on its own.</p>
        <TooltipProvider>
          <div role="radiogroup" aria-label="Permission level" className="mb-4 inline-flex flex-wrap rounded-full border bg-card p-1 text-sm">
            <span role="radio" aria-checked="true" className="rounded-full bg-primary px-4 py-1.5 text-primary-foreground">Watch only (current)</span>
            <span role="radio" aria-checked="false" aria-disabled="true" className="rounded-full px-4 py-1.5 text-muted-foreground">Suggest</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span role="radio" aria-checked="false" aria-disabled="true" tabIndex={0} className="cursor-not-allowed rounded-full px-4 py-1.5 text-muted-foreground/60">Act with your OK</span>
              </TooltipTrigger>
              <TooltipContent>Not available in this version.</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
        <div className="overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr><th className="p-3">What it can do</th><th className="p-3">Who decides</th></tr></thead>
            <tbody>
              {actions.map(([what, d]) => {
                const m = deciderMap[d];
                return (
                  <tr key={what} className="border-t">
                    <td className="p-3">{what}</td>
                    <td className="p-3"><span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", m.cls)}><m.icon className="size-3.5" aria-hidden /> {m.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Each helper</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {HELPERS.map((id) => {
            const on = j.agentOn[id] && !j.paused;
            const t = lastActive(events, id);
            const skippedEvent = events.find((e) => e.steps.some((s) => s.helper === id && s.skipped));
            return (
              <article key={id} className={cn("rounded-2xl border p-5", !on && "bg-secondary/50")}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:justify-between">
                  <div className={cn("min-w-0", !on && "opacity-60")}>
                    <div className="flex items-center gap-2 font-semibold"><AgentAvatar agent={id} />{helperInfo[id].name}</div>
                    <div className="text-xs text-muted-foreground">{on ? "On" : j.paused ? "Paused" : "Off"} · {t ? `Last active ${fmtStamp(t)}` : "Not active yet"}</div>
                  </div>
                  <Switch checked={j.agentOn[id]} onCheckedChange={(v) => j.setAgentOn(id, v)} aria-label={`${helperInfo[id].name} on`} />
                </div>
                {!j.agentOn[id] && (
                  <p className="mt-3 rounded-xl border border-dashed p-2.5 text-sm">
                    Off. Skipped on your last registration.{" "}
                    {skippedEvent && <Link to="/activity" hash={`event-${skippedEvent.id}`} className="text-primary underline">See what was skipped</Link>}
                  </p>
                )}
                <div className={cn(!on && "opacity-60")}>
                  <p className="mt-3 text-sm">{helperInfo[id].plain}</p>
                  <div className="mt-3 text-xs text-muted-foreground">Can read</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {agentAccess[id].map((k) => {
                      const Icon = sourceIcon[k];
                      const allowed = j.access[k];
                      return (
                        <button key={k} onClick={() => j.setAccess(k, !allowed)} aria-pressed={allowed} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs", !allowed && "text-muted-foreground line-through")} title={allowed ? "Click to block" : "Click to allow"}>
                          <Icon className="size-3.5" aria-hidden /> {sourceLabel(k)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-secondary p-2.5 text-xs">
                    <Lock className="mt-0.5 size-3.5 shrink-0" /> {never[id]}
                  </div>
                </div>
                <Link to="/activity" search={{ helper: id }} className="mt-3 inline-block text-sm text-primary underline">See what it did</Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
