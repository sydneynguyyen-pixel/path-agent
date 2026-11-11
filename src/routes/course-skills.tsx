import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useJourney } from "@/lib/journey";
import { courseCode } from "@/lib/skills";

/** Class details are a panel now. Old links open it over the Degree page. */
export const Route = createFileRoute("/course-skills")({
  validateSearch: (s: Record<string, unknown>): { course?: string } => (typeof s["course"] === "string" ? { course: s["course"] } : {}),
  component: OpenClass,
});

function OpenClass() {
  const { course } = Route.useSearch();
  const j = useJourney();
  const navigate = useNavigate();
  useEffect(() => {
    if (course) j.openClass(courseCode(course));
    void navigate({ to: "/degree", replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
