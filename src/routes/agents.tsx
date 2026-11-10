import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity } from "@/routes/activity";
import { Controls } from "@/routes/permissions";
import type { AgentId } from "@/lib/journey";
import { cn } from "@/lib/utils";

const HELPERS: AgentId[] = ["reader", "planner", "backup", "drafter"];
type Search = { tab?: "timeline" | "decisions" | "controls"; helper?: AgentId };

export const Route = createFileRoute("/agents")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s["tab"] === "decisions" || s["tab"] === "controls" ? s["tab"] : "timeline",
    helper: HELPERS.includes(s["helper"] as AgentId) ? s["helper"] as AgentId : undefined,
  }),
  head: () => ({ meta: [
    { title: "Agents — Academic Path Agent" },
    { name: "description", content: "See what your helpers did and control what each may read or prepare." },
    { property: "og:title", content: "Agents — Academic Path Agent" },
    { property: "og:description", content: "One place for agent activity, your decisions and helper controls." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Agents,
});

function Agents() {
  const { tab = "timeline", helper } = Route.useSearch();
  return (
    <div className="w-full min-w-0">
      <div role="tablist" aria-label="Agent views" className="mb-7 inline-flex max-w-full overflow-x-auto rounded-full border bg-card p-1 text-sm">
        {([["timeline", "Activity"], ["decisions", "Your decisions"], ["controls", "Agent controls"]] as const).map(([value, label]) => (
          <Link key={value} role="tab" aria-selected={tab === value} to="/agents" search={{ tab: value }} className={cn("shrink-0 rounded-full px-4 py-1.5", tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{label}</Link>
        ))}
      </div>
      {tab === "controls" ? <Controls embedded /> : <Activity embedded tab={tab} helper={helper} />}
    </div>
  );
}
