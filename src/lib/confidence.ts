/** Claims below this confidence are never shown as settled; they go to the counselor. */
export const CONFIDENCE_THRESHOLD = 0.75;

export type ConfidenceLevel = "high" | "medium" | "low";

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.85) return "high";
  if (score >= CONFIDENCE_THRESHOLD) return "medium";
  return "low";
}

export function needsCounselor(score: number, hasConflict = false): boolean {
  return hasConflict || score < CONFIDENCE_THRESHOLD;
}

/**
 * "now": clearly counts — student adds it themselves, no email.
 * "hold": conflict, grade condition, or low confidence — hold the seat now, confirm with counselor in parallel.
 */
export type RecoveryPath = "now" | "hold";

export function recoveryPath(o: { verdict: string; confidence: number; conflict?: unknown }): RecoveryPath {
  if (o.verdict === "conditional" || needsCounselor(o.confidence, !!o.conflict)) return "hold";
  return "now";
}
