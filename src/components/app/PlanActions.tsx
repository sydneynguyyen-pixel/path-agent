import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { terms, type Opportunity } from "@/data/scenario";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { doneToast, planTermId } from "@/lib/opportunities";
import { flyTo } from "@/lib/motion";

/** Saves a listing, or takes it back off the plan if it's already there. */
export function useSaveToPlan() {
  const j = useJourney();
  const navigate = useNavigate();
  return (o: Opportunity, from?: HTMLElement) => {
    const adding = o.courseCode ? !j.draftCourses.includes(o.courseCode) : !j.savedOpportunities.includes(o.id);
    if (o.courseCode) j.addDraftCourse(o.courseCode);
    else j.toggleSavedOpportunity(o.id);
    if (!adding) return;
    flyTo(from ?? null, "/semester");
    const termId = planTermId(o, terms, SCRIPT_TODAY);
    toast(`On your plan for ${terms.find((t) => t.id === termId)?.name}`, { action: { label: "See plan", onClick: () => navigate({ to: "/semester", search: { term: termId } }) } });
  };
}

/** The student saying they did it. This is the only way a skill moves. */
export function useConfirmWent() {
  const j = useJourney();
  const navigate = useNavigate();
  return (o: Opportunity) => {
    j.confirmWent(o.id);
    toast(doneToast(o), { action: { label: "See Skills", onClick: () => navigate({ to: "/skills" }) }, cancel: { label: "Undo", onClick: () => j.undoWent(o.id) } });
  };
}
