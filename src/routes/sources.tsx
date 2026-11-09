import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { PageHeader, SimLabel } from "@/components/app/bits";
import { SourceLogo } from "@/components/app/SourceLogo";
import { Spot } from "@/components/app/Illustrations";
import { connectedSources } from "@/components/app/sourcesData";
import { useJourney } from "@/lib/journey";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Connected sources — Academic Path Agent" },
      { name: "description", content: "Canvas, the student system, degree audit, articulation data and email: what the agent reads and why." },
      { property: "og:title", content: "Connected sources — Academic Path Agent" },
      { property: "og:description", content: "See and control every system the agent reads from." },
    ],
  }),
  component: Sources,
});

function Sources() {
  const j = useJourney();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Connected sources" sub="Your school connected these systems. Turn any off and the agent stops reading it." right={<div className="flex items-center gap-4"><Spot name="stones" className="hidden w-40 sm:block" /><SimLabel>Simulated connections</SimLabel></div>} />
      <div className="divide-y rounded-2xl border">
        {connectedSources.map((s) => (
          <div key={s.id} className="flex items-center gap-4 p-4">
            <SourceLogo id={s.id} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{s.name}</div>
              <div className="text-sm text-muted-foreground">{s.what}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.vendor} · used by {s.usedBy.join(", ")} · {j.access[s.id] ? "Last synced 2 min ago" : "Off"}</div>
            </div>
            <Switch checked={j.access[s.id]} onCheckedChange={(v) => j.setAccess(s.id, v)} aria-label={`Allow ${s.name}`} />
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Logos show the kind of vendor a school would connect. No real connection is made; all records here are synthetic.</p>
    </div>
  );
}
