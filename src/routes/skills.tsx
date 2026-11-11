import { createFileRoute, redirect } from "@tanstack/react-router";

/** Skills moved to Portfolio; careers and role plans moved to Explore. */
export const Route = createFileRoute("/skills")({
  validateSearch: (s: Record<string, unknown>): { tab?: string; role?: string } => ({ ...(typeof s["tab"] === "string" ? { tab: s["tab"] } : {}), ...(typeof s["role"] === "string" ? { role: s["role"] } : {}) }),
  beforeLoad: ({ search }) => {
    if (search.tab === "careers" || search.tab === "plan") throw redirect({ to: "/explore", search: { view: search.tab, ...(search.role ? { role: search.role } : {}) }, replace: true });
    throw redirect({ to: "/portfolio", replace: true });
  },
});
