import { createFileRoute, redirect } from "@tanstack/react-router";

// Old Decision log URL: now the "Your decisions" tab inside Activity.
export const Route = createFileRoute("/decisions")({
  beforeLoad: () => {
    throw redirect({ to: "/agents", search: { tab: "decisions" } });
  },
});
