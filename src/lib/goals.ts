import type { CareerRole } from "@/data/scenario";
import type { DemoFill } from "@/lib/event";

/** A student can aim at up to three careers at once. The first one is the main goal. */
export const MAX_GOALS = 3;

/** Maya's filled demo already chose UX research; a fresh start has chosen nothing. */
export const goalsFor = (fill: DemoFill): string[] => (fill === "filled" ? ["ux"] : []);

/** Add a goal at the end, unless it's already there or the list is full. */
export function addGoal(goals: string[], id: string): string[] {
  if (goals.includes(id) || goals.length >= MAX_GOALS) return goals;
  return [...goals, id];
}

export const removeGoal = (goals: string[], id: string): string[] => goals.filter((g) => g !== id);

/** Make a goal the main one. Picking a new main goal when the list is full drops the last one. */
export const makeMain = (goals: string[], id: string): string[] => [id, ...goals.filter((g) => g !== id)].slice(0, MAX_GOALS);

/** The chosen goals as roles, main first. Never guesses: no choices means an empty list. */
export const chosenGoals = (roles: CareerRole[], goals: string[]): CareerRole[] =>
  goals.flatMap((id) => roles.find((r) => r.id === id) ?? []);

/** Careers to suggest: not already chosen or turned down, best fit for what she cares about first. */
export function suggestedRoles(roles: CareerRole[], goals: string[], dismissed: string[], interests: string[]): CareerRole[] {
  const rank = { "Strong match": 0, "Possible match": 1, "A stretch": 2 } as const;
  const fit = (r: CareerRole) => r.interests.filter((i) => interests.includes(i)).length;
  return roles
    .filter((r) => !goals.includes(r.id) && !dismissed.includes(r.id))
    .sort((a, b) => fit(b) - fit(a) || rank[a.match] - rank[b.match]);
}

/** How far along a goal is, in words. Counts, never a score. */
export function goalLine(have: number, total: number): string {
  if (total === 0) return "Nothing listed for this role yet";
  if (have === total) return `You have proof for all ${total} skills it asks for`;
  if (have === 0) return `${total} skills to build. Every one is a place to start`;
  return `You have proof for ${have} of ${total} skills it asks for`;
}

/** The skills she's building toward a goal: her own list once she edits it, otherwise what the role asks for that she has no proof of. */
export function buildSkillsFor(role: CareerRole, chosen: Record<string, string[]>, have: string[] = []): string[] {
  const own = chosen[role.id];
  if (own) return own;
  const got = new Set(have.map((n) => n.toLowerCase()));
  return role.missing.filter((n) => !got.has(n.toLowerCase()));
}

/** Skills to suggest adding: the role's own list first, then skills listings can build. Never one already picked or one she already has proof for. */
export function skillSuggestions(role: CareerRole, picked: string[], buildable: string[]): string[] {
  const on = new Set([...picked, ...role.why].map((n) => n.toLowerCase()));
  const seen = new Set<string>();
  return [...role.missing, ...buildable].filter((n) => {
    const k = n.toLowerCase();
    if (on.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
