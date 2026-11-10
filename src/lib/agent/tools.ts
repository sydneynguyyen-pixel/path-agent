import { options, PILEUP_THRESHOLD, rankOptions, REQUIREMENT_LABEL, syllabi, type Option } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import type { AgentId } from "@/lib/journey";

/**
 * What the agent can do when a class is full. Tools read data and code decides the facts:
 * the model chooses what to look at and explains the result. There is deliberately no tool
 * that registers, drops, waitlists or sends, so those actions cannot happen.
 */
export type ToolResult = { data: unknown; summary: string };
export type AgentTool = {
  name: string;
  helper: AgentId;
  perm: "read" | "suggested";
  description: string;
  parameters: Record<string, unknown>;
  run: (args: Record<string, unknown>) => ToolResult;
};

const short = (course: string) => course.replace("BCC ", "");
const noArgs = { type: "object", properties: {}, additionalProperties: false };
const weekLoad = (week: number) => syllabi.reduce((n, s) => n + s.items.filter((i) => i.week === week).length, 0);
export const SUBMIT_TOOL = "submit_recommendation";

/** Options a student could actually act on, best first. Ranking is code, never the model. */
export const actionable = () => rankOptions(options).filter((o) => o.seatsOpen > 0 && o.verdict !== "does_not_count");

export const allTools: AgentTool[] = [
  {
    name: "read_portal_error",
    helper: "reader",
    perm: "read",
    description: "Read the error the school's registration page just showed the student.",
    parameters: noArgs,
    run: () => ({ data: { course: "STAT 2", message: "Closed Section", requirement: REQUIREMENT_LABEL, sourceId: "portal-full" }, summary: "Read the registration page: STAT 2 is a Closed Section" }),
  },
  {
    name: "find_courses_that_count",
    helper: "planner",
    perm: "read",
    description: "List the courses that may satisfy the open requirement, with the verdict from the transfer rules, confidence, and whether a counselor must confirm.",
    parameters: noArgs,
    run: () => {
      const data = options.map((o) => ({ id: o.id, course: o.course, title: o.title, verdict: o.verdict, reason: o.reason, rule: o.rule, confidence: o.confidence, needsCounselor: recoveryPath(o) === "hold", sourceIds: o.sourceIds }));
      const can = new Set(options.filter((o) => o.verdict !== "does_not_count").map((o) => o.course)).size;
      return { data, summary: `Checked the transfer rules: ${can} courses can count toward the statistics requirement` };
    },
  },
  {
    name: "search_open_sections",
    helper: "backup",
    perm: "read",
    description: "List sections that still have open seats, with their meeting times.",
    parameters: noArgs,
    run: () => {
      const open = options.filter((o) => o.seatsOpen > 0);
      return { data: open.map((o) => ({ id: o.id, course: o.course, section: o.section, sectionTime: o.sectionTime, seatsOpen: o.seatsOpen })), summary: `Searched the class list: ${open.length} sections have open seats` };
    },
  },
  {
    name: "check_week_fit",
    helper: "backup",
    perm: "read",
    description: "Check whether an option's deadlines land in the student's already busy weeks.",
    parameters: { type: "object", properties: { option_id: { type: "string", description: "The id of an option." } }, required: ["option_id"], additionalProperties: false },
    run: (args) => {
      const o = options.find((x) => x.id === args["option_id"]);
      if (!o) return { data: { error: `Unknown option_id: ${String(args["option_id"])}` }, summary: "Asked about an option that doesn't exist" };
      const heavyWeeks = [...new Set(o.deadlines.map((d) => d.week).filter((w) => weekLoad(w) >= PILEUP_THRESHOLD))];
      return { data: { id: o.id, deadlines: o.deadlines, heavyWeeks, note: o.deadlineNote }, summary: `Checked ${short(o.course)} against your busy weeks: ${heavyWeeks.length ? `deadlines land in week ${heavyWeeks.join(" and ")}` : "no pile-ups"}` };
    },
  },
  {
    name: SUBMIT_TOOL,
    helper: "planner",
    perm: "suggested",
    description: "Finish by recommending one option to the student. Code checks it before the student sees it.",
    parameters: { type: "object", properties: { option_id: { type: "string" }, why: { type: "string", description: "One or two plain sentences to the student, under 35 words." } }, required: ["option_id", "why"], additionalProperties: false },
    run: () => ({ data: { accepted: true }, summary: "Recommended an option" }),
  },
];

/** Turning a helper off removes its tools, so Agent controls are enforced rather than requested. */
export function toolsFor(agentOn: Record<AgentId, boolean>) {
  const on = allTools.filter((t) => agentOn[t.helper]);
  return agentOn.reader && agentOn.planner && agentOn.backup ? on : on.filter((t) => t.name !== SUBMIT_TOOL);
}

/** The check every recommendation must pass. Returns why it was rejected, or null. */
export function rejectPick(optionId: unknown, called: string[]): string | null {
  for (const needed of ["find_courses_that_count", "search_open_sections"]) {
    if (!called.includes(needed)) return `Call ${needed} before recommending.`;
  }
  const o: Option | undefined = options.find((x) => x.id === optionId);
  if (!o) return `There is no option with id ${String(optionId)}.`;
  if (o.seatsOpen <= 0) return `${short(o.course)} section ${o.section} has no open seats.`;
  if (o.verdict === "does_not_count") return `${short(o.course)} does not count toward the requirement.`;
  return null;
}
