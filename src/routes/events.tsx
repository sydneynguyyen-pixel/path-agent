import { createFileRoute, redirect } from "@tanstack/react-router";

/** Events became Explore's Calendar view. Old links land there. */
export const Route = createFileRoute("/events")({
  beforeLoad: () => {
    throw redirect({ to: "/explore", search: { calendar: true }, replace: true });
  },
});
