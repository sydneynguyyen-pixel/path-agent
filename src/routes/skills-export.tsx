import { createFileRoute, redirect } from "@tanstack/react-router";

/** Resume text now lives on Portfolio's Share tab. */
export const Route = createFileRoute("/skills-export")({
  beforeLoad: () => { throw redirect({ to: "/portfolio", search: { tab: "share" }, replace: true }); },
});
