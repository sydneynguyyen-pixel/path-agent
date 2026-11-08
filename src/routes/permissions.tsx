import { createFileRoute } from "@tanstack/react-router";
import { Check, X, Eye, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJourney } from "@/lib/journey";
import { PageHeader } from "@/components/app/bits";

export const Route = createFileRoute("/permissions")({
  head: () => ({
    meta: [
      { title: "Permissions — Academic Path Agent" },
      { name: "description", content: "What the agent can see and do, with a watching indicator and pause control." },
      { property: "og:title", content: "Permissions — Academic Path Agent" },
      { property: "og:description", content: "The agent watches only the registration page and can be paused anytime." },
    ],
  }),
  component: Permissions,
});

const can = ["See the registration page while you're on it", "Read your transcript, degree audit and syllabi", "Draft emails for you to edit"];
const cannot = ["Click, add, drop or register for courses", "Send any email or message without your named approval", "See other tabs, pages or personal accounts", "Give legal, financial-aid or immigration advice"];

function Permissions() {
  const j = useJourney();
  return (
    <div>
      <PageHeader title="What the agent can see" sub="You're in control. Pause it anytime." />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          {j.paused ? <Pause className="size-5 text-muted-foreground" /> : <><span className="size-2.5 rounded-full bg-success animate-pulse-dot" /><Eye className="size-5 text-success" /></>}
          <div>
            <div className="font-semibold">{j.paused ? "Paused" : "Watching: registration page only"}</div>
            <div className="text-sm text-muted-foreground">{j.paused ? "The agent won't react to anything until you resume." : "Scope: bayview.example/registration (simulated)"}</div>
          </div>
        </div>
        <Button variant={j.paused ? "default" : "outline"} onClick={() => j.setPaused(!j.paused)}>
          {j.paused ? <><Play className="size-4" /> Resume</> : <><Pause className="size-4" /> Pause agent</>}
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-xl font-semibold">Can</h2>
          <ul className="mt-3 space-y-2 text-sm">{can.map((c) => <li key={c} className="flex gap-2"><Check className="size-4 text-success" />{c}</li>)}</ul>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-xl font-semibold">Cannot</h2>
          <ul className="mt-3 space-y-2 text-sm">{cannot.map((c) => <li key={c} className="flex gap-2"><X className="size-4 text-muted-foreground" />{c}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
