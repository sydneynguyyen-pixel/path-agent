import { createFileRoute, redirect } from "@tanstack/react-router";

/** Portfolio was split up: skills and resume text live on Career, people you met on Explore, your card on its own page. */
export const Route = createFileRoute("/portfolio")({
  validateSearch: (s: Record<string, unknown>): { tab?: string } => (typeof s["tab"] === "string" ? { tab: s["tab"] } : {}),
  beforeLoad: ({ search }) => {
    if (search.tab === "people") throw redirect({ to: "/explore", search: { view: "people" }, replace: true });
    if (search.tab === "share") throw redirect({ to: "/career", search: { tab: "card" }, replace: true });
    throw redirect({ to: "/career", search: search.tab === "resume" ? { tab: "skills", resume: true } : {}, replace: true });
  },
});
