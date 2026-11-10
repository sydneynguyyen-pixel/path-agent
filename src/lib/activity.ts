import { goTogetherEvent, options, opportunities, rankOptions, student, DROP_DEADLINE, syllabi, PILEUP_THRESHOLD } from "@/data/scenario";
import type { AgentRun } from "@/lib/agent/loop";
import { recoveryPath } from "@/lib/confidence";
import { doneLine, planName } from "@/lib/opportunities";
import { SCRIPT_START, type AgentId, type GoTogether } from "@/lib/journey";

export type Permission = "read" | "suggested" | "needs_ok" | "handed";
export type EventStatus = "needs_ok" | "done" | "waiting" | "nothing" | "handed";
export type Step = { at: Date; text: string; helper: AgentId; perm: Permission; skipped?: boolean };
export type ActivityEvent = {
  id: string;
  at: Date;
  headline: string;
  because: string;
  goal: "credits" | "on_time" | "explore";
  status: EventStatus;
  steps: Step[];
  found?: string[] | undefined;
  suggest?: string[] | undefined;
  didNot: string[];
  handoff?: boolean | undefined;
  action?: { label: string; kind: "options" | "portal" | "email" | "counselor" | "explore" } | undefined;
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
  decisions: { what: string; when: Date }[];
  goTogether?: GoTogether | undefined;
  savedAt?: Record<string, Date> | undefined;
  wentTo?: Record<string, Date> | undefined;
  agentRun?: AgentRun | null | undefined;
};

const at = (secFromStart: number) => new Date(SCRIPT_START + secFromStart * 1000);
const plus = (d: Date, s: number) => new Date(d.getTime() + s * 1000);
const word = (o: (typeof options)[number]) => (o.conflict ? "Check with your counselor" : o.confidence >= 0.9 ? "Sure" : "Fairly sure");
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
      confidence: "Sure — every match points to a rule in your documents.",
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
    found: [`${busy.length === 1 ? "Week" : "Weeks"} ${busy.join(" and ")} ${busy.length === 1 ? "is" : "are"} your busiest.`],
    suggest: ["Avoid adding a class with big deadlines in those weeks."],
    didNot: ["I didn't move or change any deadlines."],
    details: { inputs: ["ENGL 1B, BIO 12 and HIST 18 syllabi"], outputs: ["One merged deadline calendar"], sourceIds: ["syl-engl", "syl-bio", "syl-hist"] },
  });

  // Going together: appears only after the student opts in, and never asks for attention.
  const g = j.goTogether;
  if (g?.shownAt && (g.showMe || g.sentTo.length > 0)) {
    const firstName = (id: string | null) => goTogetherEvent.visiblePeers.find((p) => p.id === id)?.name.split(" ")[0] ?? "";
    const sent = g.sentTo.map(firstName).join(" and ");
    const drafting = g.draftTo ? firstName(g.draftTo) : null;
    const steps: Step[] = [{ at: g.shownAt, helper: "planner", perm: "read", text: `Showed you the students going to the ${goTogetherEvent.shortName} who also chose to be seen` }];
    if (g.draftedAt && drafting) steps.push({ at: g.draftedAt, helper: "drafter", perm: "suggested", text: `Drafted a note to ${drafting} and left it for you to send` });
    if (g.sentAt) steps.push({ at: g.sentAt, helper: "drafter", perm: "handed", text: `You sent the note to ${sent} yourself` });
    ev.push({
      id: "go-together",
      at: g.sentAt ?? g.draftedAt ?? g.shownAt,
      headline: sent ? `You asked ${sent} to go to the ${goTogetherEvent.shortName} together` : drafting && g.draftedAt ? `I drafted a note to ${drafting} for the ${goTogetherEvent.shortName}` : `You chose to show yourself as going to the ${goTogetherEvent.shortName}`,
      because: "you turned on Show me as going.",
      goal: "explore",
      status: sent ? "done" : "nothing",
      steps,
      didNot: [g.sentAt ? "Demo only: no message actually went out." : "I didn't send anything. Only you can.", "I didn't show you to anyone who hasn't opted in."],
      action: drafting ? { label: "Open the draft", kind: "explore" } : undefined,
      details: { inputs: ["Your Show me as going setting", "Students who also opted in (synthetic)"], outputs: [drafting ? "Draft note (editable)" : "List of students who opted in"], sourceIds: [] },
    });
  }

  // Saved opportunities: what the student added, and only what they say they did.
  for (const [id, savedAt] of Object.entries(j.savedAt ?? {})) {
    const o = opportunities.find((x) => x.id === id);
    if (!o) continue;
    const wentAt = j.wentTo?.[id];
    const steps: Step[] = [{ at: savedAt, helper: "planner", perm: "suggested", text: `Put ${planName(o)} on your plan` }];
    if (wentAt) steps.push({ at: wentAt, helper: "planner", perm: "read", text: `Updated ${o.fills.join(" and ")} on Skills` });
    ev.push({
      id: `plan-${id}`,
      at: wentAt ?? savedAt,
      headline: wentAt ? doneLine(o) : `You added ${planName(o)} to your plan`,
      because: wentAt ? "you told me you did." : `it ${o.kind === "event" ? "covers" : "builds"} ${o.fills.join(" and ")}.`,
      goal: "explore",
      status: "done",
      steps,
      didNot: wentAt ? ["I can't see whether you went. I only have your word for it."] : ["I didn't sign you up for anything."],
      details: { inputs: ["The item you saved", "Your free time"], outputs: wentAt ? [`Marked on Skills: ${o.fills.join(", ")}`] : ["Added to your plan"], sourceIds: [] },
    });
  }

  if (j.stage === "idle") return ev.sort((x, y) => y.at.getTime() - x.at.getTime());

  // c) STAT 2 full
  const c0 = j.agentTimes["reader"] ?? at(0);
  const ranked = rankOptions(options).filter((o) => o.seatsOpen > 0 && o.verdict !== "does_not_count");
  const counselorOnes = ranked.filter((o) => recoveryPath(o) === "hold");
  const plannerOff = !j.agentOn.reader || !j.agentOn.planner;
  const scriptedSteps: Step[] = [
    { at: c0, helper: "reader", perm: "read", text: "Read the error on the registration page", skipped: !j.agentOn.reader },
    { at: plus(c0, 1), helper: "planner", perm: "read", text: "Checked which other classes count for the statistics requirement", skipped: !j.agentOn.planner },
    { at: plus(c0, 2), helper: "backup", perm: "read", text: "Looked for open seats and section times that fit your week", skipped: !j.agentOn.backup },
    { at: plus(c0, 3), helper: "planner", perm: "suggested", text: `Ranked ${ranked.length} options: open seats first, then best fit`, skipped: plannerOff },
  ];
  // A real run replaces the script with what actually happened. Helpers that were off still show as skipped.
  const run = j.agentRun?.steps.length ? j.agentRun : null;
  const runSteps: Step[] | null = run && [...run.steps.map((s) => ({ at: s.at, helper: s.helper, perm: s.perm, text: s.text })), ...scriptedSteps.filter((s) => s.skipped)];
  const runPick = options.find((o) => o.id === run?.result?.optionId);
  const howRan = run && (run.mode === "live" ? `Run by live AI${run.result?.model ? ` (${run.result.model})` : ""}` : `Scripted run with no AI. ${run.reason ?? ""}`.trim());
  ev.push({
    id: "stat2-full",
    at: c0,
    headline: "STAT 2 was full when you tried to register",
    because: "you clicked Submit and the portal said Closed Section.",
    goal: "on_time",
    status: j.chosenId ? "done" : "needs_ok",
    steps: runSteps ?? scriptedSteps,
    found: plannerOff ? ["Some tasks were off, so I stopped early."] : [...(runPick && run?.result?.why ? [`I recommended ${short(runPick.course)}, Section ${runPick.section}: ${run.result.why}`] : []), `${ranked.length} classes still count and have open seats.`, `${counselorOnes.map((o) => short(o.course)).join(" and ")} need a counselor to confirm.`],
    suggest: plannerOff ? undefined : ranked.slice(0, 3).map((o) => `${short(o.course)}, Section ${o.section} — ${word(o)}`),
    didNot: ["I didn't register you for anything.", "I didn't drop STAT 2 or put you on the waitlist."],
    action: j.chosenId ? undefined : { label: `Review the ${ranked.length} options`, kind: "options" },
    change: j.chosenId ? undefined : ["Skip summer options", "Ask me before looking up classes"],
    details: {
      inputs: ["Registration page: “Closed Section”", "Statistics requirement (QR-1)", "Transfer rules", "Open seats and section times"],
      outputs: [...(howRan ? [howRan] : []), ...ranked.map((o) => `${o.course} §${o.section} · ${o.seatsOpen} seats · ${word(o)} (${Math.round(o.confidence * 100)}%)`)],
      sourceIds: ["portal-full", "artic-math13", "artic-psyc5", "catalog-bus21"],
      confidence: "Options below 75% sure, or where two documents disagree, go to your counselor.",
    },
  });

  const chosen = options.find((o) => o.id === j.chosenId);
  if (!chosen) return ev.sort((x, y) => y.at.getTime() - x.at.getTime());
  const chooseAt = j.decisions.find((d) => d.what.startsWith("Switched STAT 2"))?.when ?? plus(c0, 10);
  const hold = recoveryPath(chosen) === "hold";

  // Hand-off: the registration click is the student's
  ev.push({
    id: "handoff",
    at: plus(chooseAt, 1),
    headline: j.seatHeld ? `You added ${short(chosen.course)} yourself` : "Your turn: add the class",
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
