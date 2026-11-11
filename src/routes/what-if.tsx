import { createFileRoute, redirect } from "@tanstack/react-router";

/** What if became Try a change on the Degree tree. */
export const Route = createFileRoute("/what-if")({
  beforeLoad: () => { throw redirect({ to: "/degree", search: { view: "tree", try: true }, replace: true }); },
});
