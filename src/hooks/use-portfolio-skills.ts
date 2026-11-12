import { useMemo } from "react";
import { ledgerSkills, opportunities } from "@/data/scenario";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { skillsFromEvents, type Found } from "@/lib/experiences";
import { skillsFromDoing } from "@/lib/opportunities";
import { ownProofs } from "@/lib/activities";
import { portfolioSkills } from "@/lib/portfolio";

/** Every skill with proof, from classes, events, things she did and things she added herself. Portfolio and Goals read the same list. */
export function usePortfolioSkills(found: Found[]) {
  const j = useJourney();
  return useMemo(
    () => portfolioSkills(ledgerSkills, skillsFromEvents(found, SCRIPT_TODAY, j.eventChecks), skillsFromDoing(opportunities.filter((o) => j.savedOpportunities.includes(o.id)), Object.keys(j.wentTo)), j.skillReviews, ownProofs(j.activities, j.ownSkills)),
    [found, j.eventChecks, j.savedOpportunities, j.wentTo, j.skillReviews, j.activities, j.ownSkills],
  );
}
