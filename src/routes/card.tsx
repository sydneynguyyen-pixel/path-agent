import { createFileRoute, redirect } from "@tanstack/react-router";

/** Your card lives on Career now. Old links land on its tab. */
export const Route = createFileRoute("/card")({
  beforeLoad: () => { throw redirect({ to: "/career", search: { tab: "card" }, replace: true }); },
});
