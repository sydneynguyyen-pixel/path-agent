import { createFileRoute, redirect } from "@tanstack/react-router";

/** Goals became Career. Old links, including role plans, still land in the right place. */
export const Route = createFileRoute("/goals")({
  validateSearch: (s: Record<string, unknown>): { plan?: string } => (typeof s["plan"] === "string" ? { plan: s["plan"] } : {}),
  beforeLoad: ({ search }) => { throw redirect({ to: "/career", search: search.plan ? { plan: search.plan } : {}, replace: true }); },
});
