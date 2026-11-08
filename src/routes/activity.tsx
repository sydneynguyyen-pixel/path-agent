import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { agents } from "@/data/scenario";
import { useJourney, fmtTime } from "@/lib/journey";
import { PageHeader } from "@/components/app/bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Agent activity — Academic Path Agent" },
      { name: "description", content: "Reader, Planner, Backup finder and Drafter: handoffs, inputs and outputs." },
      { property: "og:title", content: "Agent activity — Academic Path Agent" },
      { property: "og:description", content: "See what each agent read and produced, in order." },
    ],
  }),
  component: Activity,
});

function Activity() {
  const j = useJourney();
  const [sel, setSel] = useState<string>("reader");
  const agent = agents.find((a) => a.id === sel)!;
  const t = j.agentTimes[sel];

  return (
    <div>
      <PageHeader title="Agent activity" sub="Four helpers hand work to each other. Click one to see exactly what it read and what it produced." />
      <div className="flex flex-wrap items-stretch gap-2">
        {agents.map((a, i) => {
          const time = j.agentTimes[a.id];
          return (
            <div key={a.id} className="flex items-center gap-2">
              <button
                onClick={() => setSel(a.id)}
                className={cn("min-w-44 rounded-xl border bg-card p-4 text-left shadow-soft transition-colors", sel === a.id && "border-primary ring-2 ring-primary/20")}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  {time ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                  {a.name}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{time ? `Done · ${fmtTime(time)}` : "Not started"}</div>
              </button>
              {i < agents.length - 1 && <ArrowRight className="size-4 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border bg-card p-6 shadow-soft">
        <div className="text-xs text-muted-foreground">{agent.role}</div>
        <h2 className="text-2xl font-semibold">{agent.name}</h2>
        <div className="text-sm text-muted-foreground">{t ? `Ran at ${fmtTime(t)}` : "Waiting — try the registration demo."}</div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Inputs (what it read)</h3>
            <ul className="mt-2 space-y-1.5 text-sm">{agent.inputs.map((x) => <li key={x} className="rounded-md bg-secondary px-3 py-1.5">{x}</li>)}</ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Outputs (what it produced)</h3>
            <ul className={cn("mt-2 space-y-1.5 text-sm", !t && "opacity-50")}>{agent.outputs.map((x) => <li key={x} className="rounded-md bg-accent px-3 py-1.5">{x}</li>)}</ul>
          </div>
        </div>
      </div>
    </div>
  );
}
