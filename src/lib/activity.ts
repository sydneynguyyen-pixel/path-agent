import { options, rankOptions, student, DROP_DEADLINE, syllabi, PILEUP_THRESHOLD } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { SCRIPT_START, type AgentId } from "@/lib/journey";

export type Permission = "read" | "suggested" | "needs_ok" | "handed";
export type EventStatus = "needs_ok" | "done" | "waiting" | "nothing" | "handed";
export type Step = { at: Date; text: string; helper: AgentId; perm: Permission; skipped?: boolean };
export type ActivityEvent = {
  id: string;
  at: Date;
  headline: string;
  because: string;
  goal: "credits" | "on_time";
  status: EventStatus;
  steps: Step[];
  found?: string[] | undefined;
  suggest?: string[] | undefined;
  didNot: string[];
  handoff?: boolean | undefined;
  action?: { label: string; kind: "options" | "portal" | "email" | "counselor" } | undefined;
  change?: string[] | undefined;
  details: { inputs: string[]; outputs: string[]; sourceIds: string[]; confidence?: string };
};

export type JourneyView = {
  stage: "idle" | "failed" | "chosen";
  chosenId: string | null;
  seatHeld: boolean;
  emailSent: boolean;
  counselor: null | "confirmed" | "declined";
  agentOn: Record<AgentId, boolean>;
  agentTimes: Record<string, Date>;
  decisions: { when: Date }[];
};

const at = (secFromStart: number) => new Date(SCRIPT_START + secFromStart * 1000);
const plus = (d: Date, s: number) => new Date(d.getTime() + s * 1000);
const word = (o: (typeof options)[number]) => (o.conflict ? "Sources disagree" : o.verdict === "conditional" ? "Counts with a C" : "Counts");
const short = (c: string) => c.replace("BCC ", "");

/** Builds the scripted timeline, newest first, from the shared journey state. */
export function buildEvents(j: JourneyView): ActivityEvent[] {
  const ev: ActivityEvent[] = [];
  const busy = [4, 7].filter((w) => syllabi.reduce((n, s) => n + s.items.filter((i) => i.week === w).length, 0) >= PILEUP_THRESHOLD);

  // a) read documents (scripted, before the demo starts)
  const a0 = at(-180);
  ev.push({
    id: "read-docs",
    at: a0,
    headline: "I read your documents",
    because: "you connected your school accounts during setup.",
    goal: "credits",
    status: "done",
    steps: [
      { at: a0, helper: "reader", perm: "read", text: "Read your transcript, your degree audit, and Northgate's course catalog" },
      { at: plus(a0, 1), helper: "reader", perm: "read", text: "Read the 3 syllabi for your summer classes" },
      { at: plus(a0, 2), helper: "planner", perm: "read", text: "Matched each finished Bayview class to the Northgate requirement it fills" },
      { at: plus(a0, 3), helper: "planner", perm: "suggested", text: "Found that the statistics requirement is the one still open" },
    ],
    found: ["4 of your 6 requirements are done or transferring.", "Statistics (QR-1, the quantitative reasoning requirement) is still open. You planned STAT 2 for summer."],
    didNot: ["I didn't change your degree record.", "I didn't share anything with anyone."],
    details: {
      inputs: ["Transcript (Bayview, synthetic)", "Degree audit (Northgate)", "Northgate course catalog", "Transfer rules between the two schools (articulation file — the official list of which classes transfer)"],
      outputs: ["14 source passages saved so every answer can point to where it came from", "Converted 5 quarter units to 3.3 semester units, using both schools' rules"],
      sourceIds: ["audit-stats", "nsu-units", "bcc-units"],
      confidence: "Every match points to a rule in your documents.",
    },
  });

  // b) checked the term
  const b0 = at(-120);
  ev.push({
    id: "term",
    at: b0,
    headline: "I checked how heavy your summer term is",
    because: "a busy week can make a good class a bad choice.",
    goal: "on_time",
    status: "nothing",
    steps: [
      { at: b0, helper: "planner", perm: "read", text: "Put every due date from your 3 syllabi on one calendar" },
      { at: plus(b0, 1), helper: "planner", perm: "suggested", text: `Flagged week ${busy.join(" and week ")} — 3 or more things due` },
    ],
    found: [`Weeks ${busy.join(" and ")} are your busiest.`],
    suggest: ["Avoid adding a class with big deadlines in those weeks."],
    didNot: ["I didn't move or change any deadlines."],
    details: { inputs: ["ENGL 1B, BIO 12 and HIST 18 syllabi"], outputs: ["One merged deadline calendar"], sourceIds: ["syl-engl", "syl-bio", "syl-hist"] },
  });

  if (j.stage === "idle") return ev.reverse();

  // c) STAT 2 full
  const c0 = j.agentTimes["reader"] ?? at(0);
  const ranked = rankOptions(options).filter((o) => o.seatsOpen > 0 && o.verdict !== "does_not_count");
  const counselorOnes = ranked.filter((o) => recoveryPath(o) === "hold");
  const plannerOff = !j.agentOn.reader || !j.agentOn.planner;
  ev.push({
    id: "stat2-full",
    at: c0,
    headline: "STAT 2 was full when you tried to register",
    because: "you clicked Submit and the portal said Closed Section.",
    goal: "on_time",
    status: j.chosenId ? "done" : "needs_ok",
    steps: [
      { at: c0, helper: "reader", perm: "read", text: "Read the error on the registration page", skipped: !j.agentOn.reader },
      { at: plus(c0, 1), helper: "planner", perm: "read", text: "Checked which other classes count for the statistics requirement", skipped: !j.agentOn.planner },
      { at: plus(c0, 2), helper: "backup", perm: "read", text: "Looked for open seats and section times that fit your week", skipped: !j.agentOn.backup },
      { at: plus(c0, 3), helper: "planner", perm: "suggested", text: `Ranked ${ranked.length} options: open seats first, then best fit`, skipped: plannerOff },
    ],
    found: plannerOff ? ["Some helpers were off, so I stopped early."] : [`${ranked.length} classes still count and have open seats.`, `${counselorOnes.map((o) => short(o.course)).join(" and ")} need a counselor to confirm.`],
    suggest: plannerOff ? undefined : ranked.slice(0, 3).map((o) => `${short(o.course)}, Section ${o.section} — ${word(o)}`),
    didNot: ["I didn't register you for anything.", "I didn't drop STAT 2 or put you on the waitlist."],
    action: j.chosenId ? undefined : { label: `Review the ${ranked.length} options`, kind: "options" },
    change: j.chosenId ? undefined : ["Skip summer options", "Ask me before looking up classes"],
    details: {
      inputs: ["Registration page: “Closed Section”", "Statistics requirement (QR-1)", "Transfer rules", "Open seats and section times"],
      outputs: ranked.map((o) => `${o.course} §${o.section} · ${o.seatsOpen} seats · ${word(o)}`),
      sourceIds: ["portal-full", "artic-math13", "artic-psyc5", "catalog-bus21"],
      confidence: "When two documents disagree or a grade condition applies, a counselor confirms the choice.",
    },
  });

  const chosen = options.find((o) => o.id === j.chosenId);
  if (!chosen) return ev.sort((x, y) => y.at.getTime() - x.at.getTime());
  const chooseAt = j.decisions[0]?.when ?? plus(c0, 10);
  const hold = recoveryPath(chosen) === "hold";

  // Hand-off: the registration click is the student's
  ev.push({
    id: "handoff",
    at: plus(chooseAt, 1),
    headline: j.seatHeld ? `You added ${short(chosen.course)} yourself` : "I stopped here. This part is yours.",
    because: `you chose ${short(chosen.course)}, Section ${chosen.section}.`,
    goal: "on_time",
    status: j.seatHeld ? "done" : "handed",
    handoff: !j.seatHeld,
    steps: [
      { at: plus(chooseAt, 1), helper: "backup", perm: "suggested", text: `Found Section ${chosen.section} in the class search and checked it fits your week` },
      { at: plus(chooseAt, 2), helper: "backup", perm: "handed", text: "Handed the Add and Submit clicks to you" },
    ],
    didNot: ["I can't click Add or Submit. Only you can register."],
    action: j.seatHeld ? undefined : { label: "Take over in the portal", kind: "portal" },
    details: { inputs: [`${chosen.course} sections`, "Your current schedule"], outputs: [`Section ${chosen.section}: ${chosen.sectionTime}, no conflicts`], sourceIds: chosen.sourceIds },
  });

  // d) counselor email
  if (hold && j.agentOn.drafter) {
    const d0 = j.agentTimes["drafter"] ?? plus(chooseAt, 2);
    ev.push({
      id: "email",
      at: d0,
      headline: "I drafted an email to your counselor",
      because: `${short(chosen.course)} might count, but I'm not sure enough to say so alone.`,
      goal: "credits",
      status: j.counselor ? "done" : j.emailSent ? "waiting" : "needs_ok",
      steps: [
        { at: d0, helper: "drafter", perm: "suggested", text: `Wrote a short note to ${student.counselor} with the source passages attached` },
        { at: plus(d0, 1), helper: "drafter", perm: "needs_ok", text: "Waiting for you to read, edit and approve it" },
      ],
      found: [`If it doesn't count, you can drop it by ${DROP_DEADLINE} with no W.`],
      didNot: [j.emailSent ? "Demo only: no email was actually sent." : "Nothing was sent. It waits for your OK."],
      action: j.counselor ? undefined : j.emailSent ? { label: "See the counselor's side", kind: "counselor" } : { label: "Approve email", kind: "email" },
      change: j.emailSent ? undefined : ["Let me write it myself"],
      details: { inputs: ["The class you chose", "Source passages", "Bayview drop rules"], outputs: ["Draft email (editable)"], sourceIds: [...chosen.sourceIds, "bcc-drop"] },
    });
  }

  return ev.sort((x, y) => y.at.getTime() - x.at.getTime());
}

/** Things waiting on the student — the only count shown in the sidebar. */
export const waitingCount = (events: ActivityEvent[]) => events.filter((e) => e.status === "needs_ok" || e.status === "handed").length;

export function lastActive(events: ActivityEvent[], helper: AgentId): Date | undefined {
  const ts = events.flatMap((e) => e.steps.filter((s) => s.helper === helper && !s.skipped).map((s) => s.at));
  return ts.sort((a, b) => b.getTime() - a.getTime())[0];
}
