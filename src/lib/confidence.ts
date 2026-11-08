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
