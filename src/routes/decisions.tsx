import { createFileRoute, redirect } from "@tanstack/react-router";

// Old Decision log URL: decisions now show on each run in Activity.
export const Route = createFileRoute("/decisions")({
  beforeLoad: () => {
    throw redirect({ to: "/agents" });
  },
});
