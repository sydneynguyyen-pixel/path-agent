import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { options, student, DROP_DEADLINE, REQUIREMENT_LABEL, waitlist } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import type { SkillReview } from "@/lib/skills";

export type Stage = "idle" | "failed" | "chosen";

export type Decision = { id: string; who: string; what: string; when: Date; evidence: string[]; suggested?: string | undefined; next?: string | undefined };

/** Scripted demo clock: the story starts at Nov 7, 2026 · 7:30:50 PM (Pacific). Every timestamp is
 *  SCRIPT_START + time since the demo (re)started, so all pages agree and Reset demo restores them. */
export const SCRIPT_START = Date.UTC(2026, 10, 8, 3, 30, 50);
const TZ = "America/Los_Angeles";
export const fmtStamp = (d: Date) =>
  `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ })}`;
export const fmtStampSec = (d: Date) =>
  `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: TZ })}`;
export const fmtClock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: TZ }).replace(/ [AP]M$/, "");
export function fmtAgo(d: Date, now: number) {
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} hr ago`;
}

export type AgentId = "reader" | "planner" | "backup" | "drafter";
export type AccessKey = "registration" | "canvas" | "sis" | "audit" | "articulation" | "email";

type State = {
  skillReviews: Record<string, SkillReview>;
  draftCourses: string[];
  interestedRoles: string[];
  dismissedRoles: string[];
  careerInterests: string[];
  agentOn: Record<AgentId, boolean>;
  access: Record<AccessKey, boolean>;
  notify: { email: boolean; push: boolean; digest: boolean };
  stage: Stage;
  chosenId: string | null;
  seatHeld: boolean;
  emailSent: boolean;
  waitlisted: boolean;
  counselor: null | "confirmed" | "declined";
  draft: string;
  decisions: Decision[];
  panelOpen: boolean;
  paused: boolean;
  agentTimes: Record<string, Date>;
  evidenceId: string | null;
  guide: boolean;
  startedAt: number;
};

const initial: State = {
  skillReviews: { observation: { confirmed: true } },
  draftCourses: [],
  interestedRoles: [],
  dismissedRoles: [],
  careerInterests: [],
  agentOn: { reader: true, planner: true, backup: true, drafter: true },
  access: { registration: true, canvas: true, sis: true, audit: true, articulation: true, email: true },
  notify: { email: true, push: false, digest: true },
  stage: "idle",
  chosenId: null,
  seatHeld: false,
  emailSent: false,
  waitlisted: false,
  counselor: null,
  draft: "",
  decisions: [],
  panelOpen: false,
  paused: false,
  agentTimes: {},
  evidenceId: null,
  guide: false,
  startedAt: 0,
};

type Ctx = State & {
  reviewSkill: (id: string, review: SkillReview) => void;
  addDraftCourse: (code: string) => void;
  toggleCareerInterest: (interest: string) => void;
  setRoleInterest: (id: string, interested: boolean) => void;
  dismissRole: (id: string, dismissed: boolean) => void;
  failAdd: (openSheet?: boolean) => void;
  choose: (id: string) => void;
  backToOptions: () => void;
  markAdded: () => void;
  joinWaitlist: () => void;
  setDraft: (s: string) => void;
  approve: () => void;
  counselorDecide: (d: "confirmed" | "declined") => void;
  setPanelOpen: (b: boolean) => void;
  setPaused: (b: boolean) => void;
  openEvidence: (id: string | null) => void;
  reset: () => void;
  setGuide: (b: boolean) => void;
  /** Current scripted time in ms. */
  scriptNow: () => number;
  atRisk: boolean;
  onboarded: boolean | null;
  finishOnboarding: () => void;
  replayOnboarding: () => void;
  setAgentOn: (id: AgentId, on: boolean) => void;
  setAccess: (k: AccessKey, on: boolean) => void;
  setNotify: (k: keyof State["notify"], on: boolean) => void;
};

const JourneyCtx = createContext<Ctx | null>(null);

export function buildDraft(id: string) {
  const o = options.find((x) => x.id === id)!;
  const why = o.conflict
    ? "The Northgate catalog (p. 88) lists it for QR-1, but the articulation file (row 077) says elective only."
    : o.verdict === "conditional"
      ? "The articulation file (row 203) says it counts only with a grade of C or better."
      : o.rule;
  return `Hi ${student.counselor},

STAT 2 is full, so I'm adding ${o.course} (section ${o.section}) to hold a seat. Please confirm it counts toward ${REQUIREMENT_LABEL}. If not, I'll drop it by ${DROP_DEADLINE}.

Why I'm asking: ${why}

Source passages are attached.

Thank you,
${student.name}`;
}

let clockRef = { startedAt: 0 };
const scriptNow = () => SCRIPT_START + (clockRef.startedAt ? Date.now() - clockRef.startedAt : 0);
const log = (what: string, evidence: string[], suggested?: string, next?: string): Decision => ({ id: crypto.randomUUID(), who: student.name, what, when: new Date(scriptNow()), evidence, suggested, next });

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>(initial);
  useEffect(() => {
    clockRef.startedAt = Date.now();
    set((p) => ({ ...p, startedAt: clockRef.startedAt }));
  }, []);
  // null until hydrated, so SSR and first client render match.
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  useEffect(() => {
    setOnboarded(window.localStorage.getItem("pa-onboarded") === "1");
  }, []);

  const failAdd = useCallback((openSheet = true) => {
    const t0 = scriptNow();
    set((p) => ({
      ...p,
      stage: "failed",
      panelOpen: openSheet,
      agentTimes: { reader: new Date(t0), planner: new Date(t0 + 1400), backup: new Date(t0 + 2800) },
    }));
  }, []);

  const choose = useCallback((id: string) => {
    const o = options.find((x) => x.id === id)!;
    const hold = recoveryPath(o) === "hold";
    set((p) => ({
      ...p,
      stage: "chosen",
      chosenId: id,
      guide: false,
      draft: hold ? buildDraft(id) : "",
      agentTimes: hold ? { ...p.agentTimes, drafter: new Date(scriptNow()) } : p.agentTimes,
      decisions: [...p.decisions, log(
        `Switched STAT 2 to ${o.course.replace("BCC ", "")} (Section ${o.section})`,
        o.sourceIds,
        `${options.filter((x) => x.seatsOpen > 0 && x.verdict !== "does_not_count").length} options with open seats. You picked one marked “${o.conflict ? "Check with your counselor" : o.confidence >= 0.9 ? "Sure" : "Fairly sure"}”.`,
        hold ? "I drafted a counselor email for you to review. Nothing sent." : "No email needed. You register yourself on the school's site.",
      )],
    }));
  }, []);

  const value = useMemo<Ctx>(() => {
    const chosen = options.find((o) => o.id === s.chosenId);
    return {
      ...s,
      reviewSkill: (id, review) => set(p => ({ ...p, skillReviews: { ...p.skillReviews, [id]: { ...p.skillReviews[id], ...review } } })),
      addDraftCourse: (code) => set(p => ({ ...p, draftCourses: p.draftCourses.includes(code) ? p.draftCourses : [...p.draftCourses, code] })),
      toggleCareerInterest: (interest) => set(p => ({ ...p, careerInterests: p.careerInterests.includes(interest) ? p.careerInterests.filter(i => i !== interest) : [...p.careerInterests, interest] })),
      setRoleInterest: (id, interested) => set(p => ({ ...p, interestedRoles: interested ? [...new Set([...p.interestedRoles, id])] : p.interestedRoles.filter(i => i !== id), dismissedRoles: p.dismissedRoles.filter(i => i !== id) })),
      dismissRole: (id, dismissed) => set(p => ({ ...p, dismissedRoles: dismissed ? [...new Set([...p.dismissedRoles, id])] : p.dismissedRoles.filter(i => i !== id) })),
      atRisk: (s.stage !== "idle" && !s.seatHeld) || s.counselor === "declined",
      failAdd,
      choose,
      backToOptions: () => set((p) => ({ ...p, stage: "failed", chosenId: null, draft: "", guide: false })),
      markAdded: () =>
        set((p) => ({
          ...p,
          seatHeld: true,
          decisions: [...p.decisions, log(`Added ${chosen!.course.replace("BCC ", "")} (Section ${chosen!.section}) on the school's site`, chosen!.sourceIds, `Section ${chosen!.section}: open seats and no time conflicts.`, "You added it yourself on the school's site. I didn't register you.")],
        })),
      joinWaitlist: () =>
        set((p) => ({
          ...p,
          waitlisted: true,
          decisions: [...p.decisions, log(`Joined the waitlist for ${waitlist.course}`, [waitlist.sourceId], "Optional: Bayview allows one waitlist spot while you're in a backup class.", "You joined it yourself (simulated). I didn't waitlist you.")],
        })),
      approve: () =>
        set((p) => ({
          ...p,
          emailSent: true,
          decisions: [...p.decisions, log(`Approved the email to ${student.counselor} about ${chosen!.course.replace("BCC ", "")}`, [...chosen!.sourceIds, "bcc-drop"], "I drafted it. You could edit anything first.", "Demo only: no email was sent. Waiting on your counselor.")],
        })),
      counselorDecide: (d) =>
        set((p) => ({
          ...p,
          counselor: d,
          decisions: [
            ...p.decisions,
            {
              id: crypto.randomUUID(),
              who: student.counselor,
              what: d === "confirmed" ? `Confirmed ${chosen!.course} counts toward ${REQUIREMENT_LABEL}` : `Declined ${chosen!.course} for ${REQUIREMENT_LABEL}; advised drop by ${DROP_DEADLINE}`,
              when: new Date(scriptNow()),
              suggested: "I sent your counselor the source passages with your email.",
              next: d === "confirmed" ? "Your requirement is now marked done." : `Drop it by ${DROP_DEADLINE} to avoid a W.`,
              evidence: chosen!.sourceIds,
            },
          ],
        })),
      setDraft: (d) => set((p) => ({ ...p, draft: d })),
      setGuide: (b) => set((p) => ({ ...p, guide: b })),
      setPanelOpen: (b) => set((p) => ({ ...p, panelOpen: b })),
      setPaused: (b) => set((p) => ({ ...p, paused: b, panelOpen: b ? false : p.panelOpen })),
      openEvidence: (id) => set((p) => ({ ...p, evidenceId: id })),
      reset: () => {
        clockRef.startedAt = Date.now();
        set((p) => ({ ...initial, startedAt: clockRef.startedAt, agentOn: p.agentOn, access: p.access, notify: p.notify }));
      },
      scriptNow,
      onboarded,
      finishOnboarding: () => {
        window.localStorage.setItem("pa-onboarded", "1");
        setOnboarded(true);
      },
      replayOnboarding: () => {
        window.localStorage.removeItem("pa-onboarded");
        setOnboarded(false);
      },
      setAgentOn: (id, on) => set((p) => ({ ...p, agentOn: { ...p.agentOn, [id]: on } })),
      setAccess: (k, on) => set((p) => ({ ...p, access: { ...p.access, [k]: on } })),
      setNotify: (k, on) => set((p) => ({ ...p, notify: { ...p.notify, [k]: on } })),
    };
  }, [s, failAdd, choose, onboarded]);

  return <JourneyCtx.Provider value={value}>{children}</JourneyCtx.Provider>;
}

export function useJourney() {
  const c = useContext(JourneyCtx);
  if (!c) throw new Error("useJourney outside provider");
  return c;
}

