import { options } from "@/data/scenario";
import { USER_PROMPT, type Trigger } from "./loop";
import { buildTools, SUBMIT_TOOL, type World } from "./tools";

/**
 * When something changes after a run (a seat fills, a counselor says no, the student adds a note),
 * only the work that depended on it runs again. Facts are named "seats.<id>", "counselor.<id>"
 * or "note.<id>", the same names the trace uses for "Re-checking because…".
 */
const DEPENDS: Record<string, string[]> = {
  seats: ["search_open_sections", "check_week_fit", SUBMIT_TOOL],
  counselor: [SUBMIT_TOOL],
  note: ["search_open_sections", "check_week_fit", SUBMIT_TOOL],
};
const ALL = ["read_portal_error", "find_courses_that_count", "search_open_sections", "check_week_fit", SUBMIT_TOOL];

/** Tools that must run again because of these changes, in run order. */
export function staleFor(changes: string[]): string[] {
  const need = new Set(changes.flatMap((c) => DEPENDS[c.split(".")[0] ?? ""] ?? []));
  return ALL.filter((t) => need.has(t));
}

/** Tools whose earlier results still hold. Submitting is never "known": every re-check picks again. */
export function knownFor(changes: string[]): string[] {
  const stale = new Set(staleFor(changes));
  return stale.size ? ALL.filter((t) => !stale.has(t) && t !== SUBMIT_TOOL) : [];
}

const short = (id: string) => options.find((o) => o.id === id)?.course.replace("BCC ", "") ?? id;

/** One plain line per change, for the model. */
export function describeChanges(changes: string[], world: World): string[] {
  return changes.map((c) => {
    const [kind, id = ""] = c.split(".");
    if (kind === "seats") return `${short(id)} now has ${world.seats?.[id] ?? 0} open seats.`;
    if (kind === "counselor") return `The counselor said ${short(id)} doesn't count for this student.`;
    if (kind === "note") return `The student added a note: "${world.notes?.find((n) => n.id === id)?.text ?? id}".`;
    return `Something changed: ${c}.`;
  });
}

/** A few words on what a re-run is responding to, for the run header: "MATH 13 filled", or her note. */
export function causeFor(changes: string[], world: World): string | undefined {
  const words = changes.map((c) => {
    const [kind, id = ""] = c.split(".");
    if (kind === "seats") return `${short(id)} filled`;
    if (kind === "counselor") return `your counselor declined ${short(id)}`;
    if (kind === "note") return world.notes?.find((n) => n.id === id)?.text ?? null;
    return null;
  }).filter((w): w is string => !!w);
  return words.length ? words.join(" and ") : undefined;
}

/**
 * What the agent is asked, by why the run started. A re-check carries the still-valid results
 * forward as data, so the model can pick again without re-reading what didn't change.
 */
export function promptFor(trigger: Trigger, changes: string[], world: World): string {
  if (trigger === "error" || !changes.length) return USER_PROMPT;
  const known = knownFor(changes);
  const tools = buildTools(world);
  const carried = known.map((name) => ({ tool: name, result: tools.find((t) => t.name === name)!.run({}).data }));
  return [
    "Something changed since your last recommendation.",
    ...describeChanges(changes, world),
    `Still valid from the last run, so don't call these again: ${JSON.stringify(carried)}`,
    `Re-check with ${staleFor(changes).filter((t) => t !== SUBMIT_TOOL).join(" and ")}, then call ${SUBMIT_TOOL} again.`,
  ].join("\n");
}
