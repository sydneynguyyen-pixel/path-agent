import type { ActivityEvent, EventStatus } from "@/lib/activity";
import type { AgentId } from "@/lib/journey";

export type ActivityFilters = {
  query: string;
  helper?: AgentId | undefined;
  status: EventStatus | "all" | "attention";
  order: "newest" | "oldest";
};

export function filterActivity(events: ActivityEvent[], filters: ActivityFilters) {
  const query = filters.query.trim().toLowerCase();
  return events.filter((event) => {
    if (filters.helper && !event.steps.some((step) => step.helper === filters.helper)) return false;
    if (filters.status === "attention" && !["needs_ok", "handed"].includes(event.status)) return false;
    if (filters.status !== "all" && filters.status !== "attention" && event.status !== filters.status) return false;
    const searchable = [event.headline, event.because, ...event.steps.map((step) => step.text),
      ...(event.found ?? []), ...(event.suggest ?? []), ...event.didNot,
      ...event.details.inputs, ...event.details.outputs, ...event.details.sourceIds].join(" ").toLowerCase();
    return !query || searchable.includes(query);
  }).sort((a, b) => filters.order === "newest" ? b.at.getTime() - a.at.getTime() : a.at.getTime() - b.at.getTime());
}