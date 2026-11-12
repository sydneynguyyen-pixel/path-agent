import { createFileRoute, redirect } from "@tanstack/react-router";

/** Resume text is a sheet on Career now. */
export const Route = createFileRoute("/skills-export")({
  beforeLoad: () => { throw redirect({ to: "/career", search: { tab: "skills", resume: true }, replace: true }); },
});
