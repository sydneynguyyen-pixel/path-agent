import { createFileRoute, redirect } from "@tanstack/react-router";

/** Skills, careers and role plans all live on Career now. */
export const Route = createFileRoute("/skills")({
  validateSearch: (s: Record<string, unknown>): { tab?: string; role?: string } => ({ ...(typeof s["tab"] === "string" ? { tab: s["tab"] } : {}), ...(typeof s["role"] === "string" ? { role: s["role"] } : {}) }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/career", search: search.tab === "plan" && search.role ? { plan: search.role } : { tab: "skills" }, replace: true });
  },
});
