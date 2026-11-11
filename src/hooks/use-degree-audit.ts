import { useMemo } from "react";
import { psychologyDegree } from "@/data/degree";
import { auditFor, type AuditInput } from "@/lib/degree";
import { useJourney } from "@/lib/journey";

/** The student's degree audit, kept in step with the journey. */
export function useDegreeAudit() {
  const { stage, seatHeld, chosenId, counselor, atRisk, savedOpportunities } = useJourney();
  const input = useMemo<AuditInput>(() => ({ stage, seatHeld, chosenId, counselor, atRisk, savedOpportunities }), [stage, seatHeld, chosenId, counselor, atRisk, savedOpportunities]);
  const audit = useMemo(() => auditFor(psychologyDegree, input), [input]);
  return { input, audit };
}
