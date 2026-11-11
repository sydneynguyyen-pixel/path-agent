import { createFileRoute, redirect } from "@tanstack/react-router";

const TAB = { timeline: "timeline", skills: "skills", people: "people", profile: "share" } as const;

/** Experiences became Portfolio. Old links land on the matching tab. */
export const Route = createFileRoute("/grow")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } => (typeof s["tab"] === "string" ? { tab: s["tab"] } : {}),
  beforeLoad: ({ search }) => {
    const tab = TAB[search.tab as keyof typeof TAB] ?? "timeline";
    throw redirect({ to: "/portfolio", search: tab === "skills" ? {} : { tab }, replace: true });
  },
});
