import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { agents } from "@/data/scenario";
import { useJourney, type AgentId, type AccessKey } from "@/lib/journey";
import { PageHeader } from "@/components/app/bits";
import { SourceLogo } from "@/components/app/SourceLogo";
import { connectedSources } from "@/components/app/sourcesData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "Agent controls — Academic Path Agent" },
      { name: "description", content: "Turn each agent on or off, choose what it can read, and see what it can never do." },
      { property: "og:title", content: "Agent controls — Academic Path Agent" },
      { property: "og:description", content: "Full control over every agent and every part of the app it touches." },
    ],
  }),
  component: Controls,
});

const agentAccess: Record<AgentId, AccessKey[]> = {
  reader: ["registration", "canvas", "sis", "audit"],
  planner: ["audit", "articulation"],
  backup: ["sis", "canvas"],
  drafter: ["email"],
};

const agentDoes: Record<AgentId, { can: string; never: string }> = {
  reader: { can: "Reads records and the registration page when you're on it.", never: "Never reads other tabs, personal email, or grades you haven't released." },
  planner: { can: "Decides which courses still count and how confident it is.", never: "Never marks something as counting without a source." },
  backup: { can: "Finds open sections and checks your deadlines.", never: "Never adds, drops, or waitlists you." },
  drafter: { can: "Drafts emails for you to edit.", never: "Never sends without “Approve and send as Maya Torres”." },
};

const areas: { key: AccessKey; label: string; desc: string }[] = [
  { key: "registration", label: "Registration page", desc: "Watch only while you're on it, to catch errors like “Section full”." },
];

function Controls() {
  const j = useJourney();
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Agent controls"
        sub="Four agents work for you. Turn any of them off, or limit what they can read."
        right={
          <Button variant={j.paused ? "default" : "outline"} onClick={() => j.setPaused(!j.paused)}>
            {j.paused ? <><Play className="size-4" /> Resume all</> : <><Pause className="size-4" /> Pause all agents</>}
          </Button>
        }
      />

      {j.paused && <div className="mb-6 rounded-2xl bg-warning-soft p-4 text-sm">All agents are paused. Nothing is read or drafted until you resume.</div>}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium">Where it watches</h2>
        {areas.map((a) => (
          <div key={a.key} className="flex items-center gap-4 rounded-2xl border p-4">
            {j.access[a.key] && !j.paused ? <Eye className="size-5 text-success" /> : <EyeOff className="size-5 text-muted-foreground" />}
            <div className="flex-1"><div className="font-medium">{a.label}</div><div className="text-sm text-muted-foreground">{a.desc}</div></div>
            <Switch checked={j.access[a.key]} onCheckedChange={(v) => j.setAccess(a.key, v)} aria-label={a.label} />
          </div>
        ))}
        <p className="mt-2 text-xs text-muted-foreground">Nothing else in your browser is visible to the agent.</p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Each agent</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => {
            const id = a.id as AgentId;
            const on = j.agentOn[id] && !j.paused;
            return (
              <article key={a.id} className={cn("rounded-2xl border p-5", !on && "bg-secondary/50")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{on ? "On" : j.paused ? "Paused" : "Off"} · {a.role}</div>
                  </div>
                  <Switch checked={j.agentOn[id]} onCheckedChange={(v) => j.setAgentOn(id, v)} aria-label={`${a.name} on`} />
                </div>
                <p className="mt-3 text-sm">{agentDoes[id].can}</p>
                <div className="mt-3 text-xs text-muted-foreground">Can read</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {agentAccess[id].map((k) => {
                    const src = connectedSources.find((s) => s.id === k);
                    const allowed = j.access[k];
                    return (
                      <button key={k} onClick={() => j.setAccess(k, !allowed)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs", !allowed && "text-muted-foreground line-through opacity-60")} title={allowed ? "Click to block" : "Click to allow"}>
                        {src ? <SourceLogo id={k} className="size-4 rounded border-0 [&_img]:size-3.5" /> : <Eye className="size-3" />}
                        {src?.name.split(" (")[0] ?? "Registration page"}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-start gap-1.5 rounded-xl bg-secondary p-2.5 text-xs">
                  <Lock className="mt-0.5 size-3.5 shrink-0" /> {agentDoes[id].never}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <p className="mt-6 text-sm text-muted-foreground">
        See what each agent actually did in <Link to="/activity" className="underline">What it did</Link>. Turned-off agents are skipped and you'll see why.
      </p>
    </div>
  );
}
