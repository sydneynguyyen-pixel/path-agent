import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { EventPlatform, UploadKey } from "@/data/scenario";
import type { Checks } from "@/lib/experiences";
import { recover } from "@/lib/agent/client";
import { applyAgentEvent, newRun, type AgentEvent, type AgentRun } from "@/lib/agent/loop";
import { goTogetherEvent, options, student, DROP_DEADLINE, REQUIREMENT_LABEL, waitlist } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { helloDraft } from "@/lib/opportunities";
import type { SkillReview } from "@/lib/skills";
import { NO_CHANGE, type WhatIf } from "@/lib/whatif";
import { symposiumEvent } from "@/data/event";
import { people } from "@/data/people";
import { callName, followUp, inviteDraft, type Deck, type DeckChoice, type PersonNote, type Promise_ } from "@/lib/event";

export type Stage = "idle" | "failed" | "chosen";

export type Decision = { id: string; who: string; what: string; when: Date; evidence: string[]; suggested?: string | undefined; next?: string | undefined };

/** Scripted demo clock: the story starts at Nov 7, 2026 · 7:30:50 PM (Pacific). Every timestamp is
 *  SCRIPT_START + time since the demo (re)started, so all pages agree and Reset demo restores them. */
export const SCRIPT_START = Date.UTC(2026, 10, 8, 3, 30, 50);
/** The scripted "today", for anything that depends on what's coming up. */
export const SCRIPT_TODAY = new Date(SCRIPT_START).toISOString().slice(0, 10);
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
export type AccessKey = "registration" | "canvas" | "sis" | "audit" | "articulation" | "handshake" | "email";

/** Going together to the one Explore event. The agent can draft; only the student can send. */
export type GoTogether = { showMe: boolean; shownAt: Date | null; draftTo: string | null; draft: string; draftedAt: Date | null; sentTo: string[]; sentAt: Date | null };
const noGoTogether: GoTogether = { showMe: false, shownAt: null, draftTo: null, draft: "", draftedAt: null, sentTo: [], sentAt: null };

/** Maya's plan for the symposium: before, during and after. Drafts are hers to send. */
export type EventPlan = {
  goal: string;
  deck: Deck;
  invite: { to: string | null; draft: string; sent: string[] };
  talked: string[];
  /** Notes belong to the person, so they show again at the next event. */
  notes: PersonNote[];
  promises: Promise_[];
  /** Promises she asked to be reminded about. Off unless she turns one on. */
  reminders: string[];
  followUp: { to: string | null; draft: string; copied: string[] };
};
const noEventPlan: EventPlan = { goal: symposiumEvent.goals[0]!, deck: {}, invite: { to: null, draft: "", sent: [] }, talked: [], notes: [], promises: [], reminders: [], followUp: { to: null, draft: "", copied: [] } };

type State = {
  savedOpportunities: string[];
  savedAt: Record<string, Date>;
  /** Only the student can add to this. The agent never assumes they went. */
  wentTo: Record<string, Date>;
  skippedSuggestions: string[];
  goTogether: GoTogether;
  skillReviews: Record<string, SkillReview>;
  draftCourses: string[];
  /** The sandbox on the What if page. Nothing reads it as the real plan. */
  whatIf: WhatIf;
  /** Personal event accounts the student signed in to. Handshake comes through the school instead. */
  eventAccounts: EventPlatform[];
  /** The student's own answers to "Did you go?". */
  eventChecks: Checks;
  /** Experiences the student picked for a shared profile. Nothing is shared until they pick it. */
  profilePicks: string[];
  profileLink: boolean;
  interestedRoles: string[];
  dismissedRoles: string[];
  careerInterests: string[];
  event: EventPlan;
  agentOn: Record<AgentId, boolean>;
  access: Record<AccessKey, boolean>;
  uploads: UploadKey[];
  /** A student is either connected through their school or adds records by hand, so no page shows both. */
  setupMethod: "school" | "manual";
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
  /** True only while the student has the registration flow open and connected. */
  watchingRegistration: boolean;
  agentTimes: Record<string, Date>;
  agentRun: AgentRun | null;
  evidenceId: string | null;
  guide: boolean;
  startedAt: number;
};

const initial: State = {
  savedOpportunities: [],
  savedAt: {},
  wentTo: {},
  skippedSuggestions: [],
  goTogether: noGoTogether,
  skillReviews: { observation: { confirmed: true } },
  draftCourses: [],
  interestedRoles: [],
  dismissedRoles: [],
  careerInterests: [],
  event: noEventPlan,
  agentOn: { reader: true, planner: true, backup: true, drafter: true },
  access: { registration: true, canvas: true, sis: true, audit: true, articulation: true, handshake: true, email: true },
  uploads: [],
  setupMethod: "school",
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
  watchingRegistration: false,
  agentTimes: {},
  agentRun: null,
  evidenceId: null,
  guide: false,
  whatIf: NO_CHANGE,
  eventAccounts: [],
  eventChecks: {},
  profilePicks: [],
  profileLink: false,
  startedAt: 0,
};

type Ctx = State & {
  toggleSavedOpportunity: (id: string) => void;
  confirmWent: (id: string) => void;
  undoWent: (id: string) => void;
  skipSuggestion: (id: string) => void;
  setShowMeGoing: (on: boolean) => void;
  startHello: (peerId: string) => void;
  setHelloDraft: (text: string) => void;
  cancelHello: () => void;
  sendHello: () => void;
  reviewSkill: (id: string, review: SkillReview) => void;
  addDraftCourse: (code: string) => void;
  toggleCareerInterest: (interest: string) => void;
  setRoleInterest: (id: string, interested: boolean) => void;
  dismissRole: (id: string, dismissed: boolean) => void;
  setEventGoal: (goal: string) => void;
  answerCard: (personId: string, choice: DeckChoice | null) => void;
  startInvite: (classmateId: string) => void;
  setInviteDraft: (text: string) => void;
  cancelInvite: () => void;
  sendInvite: () => void;
  markTalked: (personId: string, talked: boolean) => void;
  setPersonNote: (personId: string, text: string, promise: string) => void;
  toggleReminder: (promiseId: string) => void;
  finishPromise: (promiseId: string, text: string, personId: string) => void;
  startFollowUp: (personId: string) => void;
  setFollowUpDraft: (text: string) => void;
  copyFollowUp: () => void;
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
  setWhatIf: (w: WhatIf) => void;
  linkEventAccount: (platform: EventPlatform, name: string, found: number) => void;
  unlinkEventAccount: (platform: EventPlatform, name: string) => void;
  checkEvent: (id: string, answer: "went" | "missed" | null) => void;
  toggleProfilePick: (id: string) => void;
  setProfileLink: (on: boolean) => void;
  reset: () => void;
  setWatchingRegistration: (b: boolean) => void;
  setGuide: (b: boolean) => void;
  /** Current scripted time in ms. */
  scriptNow: () => number;
  atRisk: boolean;
  onboarded: boolean | null;
  finishOnboarding: () => void;
  replayOnboarding: () => void;
  skipToDemo: () => void;
  /** Whether the student has built their path yet. Null until hydrated. False is the blank first-run app. */
  pathBuilt: boolean | null;
  finishBuild: () => void;
  setAgentOn: (id: AgentId, on: boolean) => void;
  setAccess: (k: AccessKey, on: boolean) => void;
  addUpload: (k: UploadKey) => void;
  setSetupMethod: (m: "school" | "manual") => void;
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
  const [pathBuilt, setPathBuilt] = useState<boolean | null>(null);
  useEffect(() => {
    setOnboarded(window.localStorage.getItem("pa-onboarded") === "1");
    setPathBuilt(window.localStorage.getItem("pa-path-built") === "1");
  }, []);

  const latest = useRef(s);
  latest.current = s;
  const runControl = useRef<AbortController | null>(null);

  const failAdd = useCallback((openSheet = true) => {
    const t0 = scriptNow();
    const { paused, access, agentOn } = latest.current;
    const allowed = !paused && access.registration;
    if (allowed) {
      runControl.current?.abort();
      const control = new AbortController();
      runControl.current = control;
      const apply = (e: AgentEvent) => {
        if (!control.signal.aborted) set((p) => ({ ...p, agentRun: applyAgentEvent(p.agentRun, e, new Date(scriptNow())) }));
      };
      void recover(agentOn, apply, control.signal);
    }
    set((p) => ({
      ...p,
      stage: "failed",
      panelOpen: openSheet,
      agentTimes: { reader: new Date(t0), planner: new Date(t0 + 1400), backup: new Date(t0 + 2800) },
      agentRun: allowed ? newRun() : null,
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
        `${options.filter((x) => x.seatsOpen > 0 && x.verdict !== "does_not_count").length} options with open seats. ${o.conflict ? "You chose the option with conflicting sources." : o.verdict === "conditional" ? "You chose the option with a grade condition." : "You chose the option whose sources agree."}`, 
        hold ? "I drafted a counselor email for you to review. Nothing sent." : "No email needed. You register yourself on the school's site.",
      )],
    }));
  }, []);

  const value = useMemo<Ctx>(() => {
    const chosen = options.find((o) => o.id === s.chosenId);
    return {
      ...s,
      toggleSavedOpportunity: (id) => set((p) => {
        if (!p.savedOpportunities.includes(id)) return { ...p, savedOpportunities: [...p.savedOpportunities, id], savedAt: { ...p.savedAt, [id]: new Date(scriptNow()) } };
        const { [id]: _saved, ...savedAt } = p.savedAt;
        const { [id]: _went, ...wentTo } = p.wentTo;
        return { ...p, savedOpportunities: p.savedOpportunities.filter((x) => x !== id), savedAt, wentTo };
      }),
      confirmWent: (id) => set((p) => ({ ...p, wentTo: { ...p.wentTo, [id]: new Date(scriptNow()) } })),
      undoWent: (id) => set((p) => {
        const { [id]: _went, ...wentTo } = p.wentTo;
        return { ...p, wentTo };
      }),
      skipSuggestion: (id) => set((p) => ({ ...p, skippedSuggestions: [...p.skippedSuggestions, id] })),
      setShowMeGoing: (on) => set((p) => ({
        ...p,
        goTogether: on
          ? { ...p.goTogether, showMe: true, shownAt: new Date(scriptNow()) }
          : { ...p.goTogether, showMe: false, draftTo: null, draft: "", draftedAt: null },
      })),
      startHello: (peerId) => set((p) => {
        const peer = goTogetherEvent.visiblePeers.find((x) => x.id === peerId)!;
        const drafted = p.agentOn.drafter;
        return { ...p, goTogether: { ...p.goTogether, draftTo: peerId, draft: drafted ? helloDraft(peer.name, goTogetherEvent.shortName, student.name) : "", draftedAt: drafted ? new Date(scriptNow()) : null } };
      }),
      setHelloDraft: (text) => set((p) => ({ ...p, goTogether: { ...p.goTogether, draft: text } })),
      cancelHello: () => set((p) => ({ ...p, goTogether: { ...p.goTogether, draftTo: null, draft: "", draftedAt: null } })),
      sendHello: () => set((p) => {
        const peer = goTogetherEvent.visiblePeers.find((x) => x.id === p.goTogether.draftTo);
        if (!peer) return p;
        const drafted = p.goTogether.draftedAt !== null;
        return {
          ...p,
          goTogether: { ...p.goTogether, draftTo: null, draft: "", draftedAt: null, sentTo: [...p.goTogether.sentTo, peer.id], sentAt: new Date(scriptNow()) },
          decisions: [...p.decisions, log(`Sent ${peer.name} a note about going to the ${goTogetherEvent.shortName} together`, [], drafted ? "I drafted it. You could edit anything first." : "You wrote this one yourself.", "You sent it yourself. Demo only: no message went out.")],
        };
      }),
      reviewSkill: (id, review) => set(p => ({ ...p, skillReviews: { ...p.skillReviews, [id]: { ...p.skillReviews[id], ...review } } })),
      addDraftCourse: (code) => set(p => ({ ...p, draftCourses: p.draftCourses.includes(code) ? p.draftCourses : [...p.draftCourses, code] })),
      toggleCareerInterest: (interest) => set(p => ({ ...p, careerInterests: p.careerInterests.includes(interest) ? p.careerInterests.filter(i => i !== interest) : [...p.careerInterests, interest] })),
      setRoleInterest: (id, interested) => set(p => ({ ...p, interestedRoles: interested ? [...new Set([...p.interestedRoles, id])] : p.interestedRoles.filter(i => i !== id), dismissedRoles: p.dismissedRoles.filter(i => i !== id) })),
      dismissRole: (id, dismissed) => set(p => ({ ...p, dismissedRoles: dismissed ? [...new Set([...p.dismissedRoles, id])] : p.dismissedRoles.filter(i => i !== id) })),
      setEventGoal: (goal) => set((p) => ({ ...p, event: { ...p.event, goal } })),
      answerCard: (personId, choice) => set((p) => {
        const { [personId]: _old, ...deck } = p.event.deck;
        return { ...p, event: { ...p.event, deck: choice ? { ...deck, [personId]: choice } : deck } };
      }),
      startInvite: (id) => set((p) => {
        const c = symposiumEvent.classmates.find((x) => x.id === id && x.optedIn);
        if (!c) return p;
        return { ...p, event: { ...p.event, invite: { ...p.event.invite, to: id, draft: p.agentOn.drafter ? inviteDraft(c.name, symposiumEvent.shortName, symposiumEvent.day, student.name) : "" } } };
      }),
      setInviteDraft: (draft) => set((p) => ({ ...p, event: { ...p.event, invite: { ...p.event.invite, draft } } })),
      cancelInvite: () => set((p) => ({ ...p, event: { ...p.event, invite: { ...p.event.invite, to: null, draft: "" } } })),
      sendInvite: () => set((p) => {
        const c = symposiumEvent.classmates.find((x) => x.id === p.event.invite.to);
        if (!c || !p.event.invite.draft.trim()) return p;
        return {
          ...p,
          event: { ...p.event, invite: { to: null, draft: "", sent: [...p.event.invite.sent, c.id] } },
          decisions: [...p.decisions, log(`Asked ${c.name} to go to the ${symposiumEvent.shortName} together`, [], p.agentOn.drafter ? "Drafter wrote it. You could edit anything first." : "You wrote this one yourself.", "You sent it yourself. Demo only: no message went out.")],
        };
      }),
      markTalked: (id, on) => set((p) => ({ ...p, event: { ...p.event, talked: on ? [...new Set([...p.event.talked, id])] : p.event.talked.filter((x) => x !== id) } })),
      setPersonNote: (personId, text, promise) => set((p) => {
        const pid = `${personId}-${symposiumEvent.date}`;
        const notes = [...p.event.notes.filter((n) => n.personId !== personId), ...(text.trim() || promise.trim() ? [{ personId, event: symposiumEvent.title, date: symposiumEvent.date, text: text.trim(), promise: promise.trim() || undefined }] : [])];
        const promises = [...p.event.promises.filter((x) => x.id !== pid), ...(promise.trim() ? [{ id: pid, personId, text: promise.trim(), done: false }] : [])];
        return { ...p, event: { ...p.event, notes, promises } };
      }),
      toggleReminder: (id) => set((p) => ({ ...p, event: { ...p.event, reminders: p.event.reminders.includes(id) ? p.event.reminders.filter((x) => x !== id) : [...p.event.reminders, id] } })),
      finishPromise: (id, text, personId) => set((p) => ({
        ...p,
        event: { ...p.event, promises: [...p.event.promises.filter((x) => x.id !== id), { id, personId, text, done: true }], reminders: p.event.reminders.filter((x) => x !== id) },
      })),
      startFollowUp: (personId) => set((p) => {
        const person = people.find((x) => x.id === personId)!;
        const note = p.event.notes.find((n) => n.personId === personId)?.text;
        const r = followUp(person, note, symposiumEvent.shortName, student.name);
        return { ...p, event: { ...p.event, followUp: { ...p.event.followUp, to: personId, draft: r.kind === "draft" && p.agentOn.drafter ? r.text : "" } } };
      }),
      setFollowUpDraft: (draft) => set((p) => ({ ...p, event: { ...p.event, followUp: { ...p.event.followUp, draft } } })),
      copyFollowUp: () => set((p) => {
        const person = people.find((x) => x.id === p.event.followUp.to);
        if (!person || !p.event.followUp.draft.trim()) return p;
        const sk = symposiumEvent.skillId;
        return {
          ...p,
          event: { ...p.event, followUp: { to: null, draft: "", copied: [...new Set([...p.event.followUp.copied, person.id])] } },
          skillReviews: { ...p.skillReviews, [sk]: { ...p.skillReviews[sk], practiced: true } },
          decisions: [...p.decisions, log(`Copied a follow-up to ${callName(person.name)} to send yourself`, [], "Drafted only from your own note.", "Interviewing basics now shows Practiced on Skills. Demo only: nothing was sent.")],
        };
      }),
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
      setWatchingRegistration: (b) => set((p) => (p.watchingRegistration === b ? p : { ...p, watchingRegistration: b })),
      setPaused: (b) => set((p) => ({ ...p, paused: b, panelOpen: b ? false : p.panelOpen })),
      openEvidence: (id) => set((p) => ({ ...p, evidenceId: id })),
      setWhatIf: (w) => set((p) => ({ ...p, whatIf: w })),
      linkEventAccount: (platform, name, found) => set((p) => p.eventAccounts.includes(platform) ? p : ({ ...p, eventAccounts: [...p.eventAccounts, platform], decisions: [...p.decisions, log(`Connected ${name}, read only`, [], `Path Agent found ${found} events. It can't register you or message hosts.`)] })),
      unlinkEventAccount: (platform, name) => set((p) => ({ ...p, eventAccounts: p.eventAccounts.filter((x) => x !== platform), decisions: [...p.decisions, log(`Disconnected ${name}`, [], "Its events no longer show in Experiences.")] })),
      checkEvent: (id, answer) => set((p) => {
        const { [id]: _old, ...rest } = p.eventChecks;
        return { ...p, eventChecks: answer ? { ...rest, [id]: answer } : rest };
      }),
      toggleProfilePick: (id) => set((p) => ({ ...p, profilePicks: p.profilePicks.includes(id) ? p.profilePicks.filter((x) => x !== id) : [...p.profilePicks, id] })),
      setProfileLink: (on) => set((p) => ({ ...p, profileLink: on, decisions: [...p.decisions, log(on ? "Turned on a private link to your experience profile" : "Turned off your profile link", [], on ? "Only people you give the link to can see what you picked." : "The link stopped working.")] })),
      reset: () => {
        clockRef.startedAt = Date.now();
        runControl.current?.abort();
        set((p) => ({ ...initial, startedAt: clockRef.startedAt, agentOn: p.agentOn, access: p.access, notify: p.notify, watchingRegistration: p.watchingRegistration }));
      },
      scriptNow,
      onboarded,
      finishOnboarding: () => {
        window.localStorage.setItem("pa-onboarded", "1");
        setOnboarded(true);
      },
      skipToDemo: () => {
        window.localStorage.setItem("pa-onboarded", "1");
        window.localStorage.setItem("pa-path-built", "1");
        setOnboarded(true);
        setPathBuilt(true);
      },
      replayOnboarding: () => {
        window.localStorage.removeItem("pa-onboarded");
        window.localStorage.removeItem("pa-path-built");
        setOnboarded(false);
        setPathBuilt(false);
      },
      pathBuilt,
      finishBuild: () => {
        window.localStorage.setItem("pa-path-built", "1");
        setPathBuilt(true);
      },
      setAgentOn: (id, on) => set((p) => ({ ...p, agentOn: { ...p.agentOn, [id]: on } })),
      setAccess: (k, on) => set((p) => ({ ...p, access: { ...p.access, [k]: on } })),
      setSetupMethod: (m) => set((p) => ({ ...p, setupMethod: m })),
      addUpload: (k) => set((p) => (p.uploads.includes(k) ? p : { ...p, uploads: [...p.uploads, k] })),
      setNotify: (k, on) => set((p) => ({ ...p, notify: { ...p.notify, [k]: on } })),
    };
  }, [s, failAdd, choose, onboarded, pathBuilt]);

  return <JourneyCtx.Provider value={value}>{children}</JourneyCtx.Provider>;
}

export function useJourney() {
  const c = useContext(JourneyCtx);
  if (!c) throw new Error("useJourney outside provider");
  return c;
}

