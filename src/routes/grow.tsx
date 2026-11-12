import { createFileRoute, redirect } from "@tanstack/react-router";

/** Experiences became Portfolio, then Career and Explore. Old links land on the matching place. */
export const Route = createFileRoute("/grow")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } => (typeof s["tab"] === "string" ? { tab: s["tab"] } : {}),
  beforeLoad: ({ search }) => {
    if (search.tab === "people") throw redirect({ to: "/explore", search: { view: "people" }, replace: true });
    if (search.tab === "profile") throw redirect({ to: "/career", search: { tab: "card" }, replace: true });
    throw redirect({ to: "/career", replace: true });
  },
});
