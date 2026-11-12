import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { EventPlatform, UploadKey } from "@/data/scenario";
import type { Checks } from "@/lib/experiences";
import { recover } from "@/lib/agent/client";
import type { AgentEvent } from "@/lib/agent/loop";
import { applyRunEvent, newTraceRun, type RunEvent, type TraceRun } from "@/lib/run";
import { FILLED_BY, NEEDS_NOTE, SEAT_FILLS } from "@/data/edge-runs";
import { constraintFrom, forget, noteFrom, remember, steerEvents, type Constraint } from "@/lib/steer";
import { addAsk, addReply, type Thread } from "@/lib/chat";
import { goTogetherEvent, options, student, DROP_DEADLINE, REQUIREMENT_LABEL, waitlist } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { cleanDesk, DEFAULT_DESK, type Desk } from "@/lib/desktop";
import { askToGo as askPeer, passAsk } from "@/lib/opportunities";
import type { SkillReview } from "@/lib/skills";
import { NO_CHANGE, type WhatIf } from "@/lib/whatif";
import { electiveClasses } from "@/data/degree";
import { symposiumEvent } from "@/data/event";
import { people } from "@/data/people";
import { addGoal, goalsFor, makeMain, MAX_GOALS, removeGoal } from "@/lib/goals";
import { callName, eventAccountsFor, eventPlanFor, filledEventPlan, followUp, pathBuiltFor, inviteDraft, type DeckChoice, type DemoFill, type EventPlan } from "@/lib/event";

export type Stage = "idle" | "failed" | "chosen";

export type Decision = { id: string; who: string; what: string; when: Date; evidence: string[]; suggested?: string | undefined; next?: string | undefined; };

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

/** Going together to the one Explore event. Students ask each other; it's a match only when both say yes. */
export type GoTogether = { showMe: boolean; shownAt: Date | null; sentTo: string[]; sentAt: Date | null; matched: string[]; matchedAt: Date | null; passed: string[]; sentNotes?: Record<string, string> };
const noGoTogether: GoTogether = { showMe: false, shownAt: null, sentTo: [], sentAt: null, matched: [], matchedAt: null, passed: [] };

export type DetailsFocus = { tab: "people"; peer?: string };

export type OwnSkill = { id: string; name: string; where: "class" | "event" | "work" | "own"; detail: string; link?: string };

type State = {
  savedOpportunities: string[];
  savedAt: Record<string, Date>;
  /** Only the student can add to this. The agent never assumes they went. */
  wentTo: Record<string, Date>;
  skippedSuggestions: string[];
  /** Home alerts the student snoozed (decisions) or dismissed (updates). Deadlines can't be cleared. */
  homeCleared: Record<string, "snoozed" | "dismissed">;
  goTogether: GoTogether;
  skillReviews: Record<string, SkillReview>;
  /** Skills the student added herself. They are marked "Added by you" and never count as verified. */
  ownSkills: OwnSkill[];
  draftCourses: string[];
  /** The sandbox behind Try a change on the Degree tree. Nothing reads it as the real plan. */
  whatIf: WhatIf;
  /** Personal event accounts the student signed in to. Handshake comes through the school instead. */
  eventAccounts: EventPlatform[];
  /** The student's own answers to "Did you go?". */
  eventChecks: Checks;
  /** Experiences the student picked for a shared profile. Nothing is shared until they pick it. */
  profilePicks: string[];
  profileLink: boolean;
  /** The careers she chose on Goals (up to three), main goal first. Empty means none chosen yet. */
  interestedRoles: string[];
  dismissedRoles: string[];
  /** Skills she chose to build for each goal. A goal with no entry uses what the role asks for that she doesn't have yet. */
  buildSkills: Record<string, string[]>;
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
  agentRun: TraceRun | null;
  /** Sections a re-check found filled while she was deciding. */
  justFilled: string[];
  /** Notes she gave the helpers ("No classes before 10 am"). They keep using them until she removes one. */
  notes: Constraint[];
  /** A run finished while the options panel was closed, so Home says what changed. */
  awayRun: boolean;
  /** Her chats with the agent, newest first when listed. Reset demo clears them. */
  chats: Thread[];
  /** The full chat is open (the bar expanded). The options run opens it too, through panelOpen. */
  chatOpen: boolean;
  /** Which chat is showing; null is a new, empty one. */
  activeChat: string | null;
  /** The agent is answering in this chat right now. */
  typingIn: string | null;
  evidenceId: string | null;
  /** The class whose details panel is open, on any page. */
  classDetails: string | null;
  /** The listing whose details panel is open, on any page. */
  opportunityDetails: string | null;
  /** Which side of the details window to open on, and whose card to show. */
  detailsFocus: DetailsFocus | null;
  /** Classmates who are her friends (both said yes). Only she sees this list. */
  friends: string[];
  /** Friend requests she sent that are waiting on the other student. */
  friendSent: string[];
  /** Friend requests other students sent her. */
  friendIncoming: string[];
  /** Asks she sent at events other than the scripted UX night, with her note. */
  eventAsks: Record<string, { sentTo: string[]; notes: Record<string, string> }>;
  guide: boolean;
  /** Sprout has found the full section so she can join its waitlist herself. */
  waitlistGuide: boolean;
  /** The map shows an imagined master's program after graduation. */
  mapMasters: boolean;
  /** Path map items added to the simulated calendar. */
  mapCalendar: string[];
  startedAt: number;
};

const initial: State = {
  savedOpportunities: [],
  savedAt: {},
  wentTo: {},
  skippedSuggestions: [],
  homeCleared: {},
  goTogether: noGoTogether,
  skillReviews: { observation: { confirmed: true } },
  ownSkills: [],
  draftCourses: [],
  interestedRoles: goalsFor("filled"),
  dismissedRoles: [],
  buildSkills: {},
  careerInterests: [],
  event: filledEventPlan,
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
  justFilled: [],
  notes: [],
  awayRun: false,
  chats: [],
  chatOpen: false,
  activeChat: null,
  typingIn: null,
  evidenceId: null,
  classDetails: null,
  opportunityDetails: null,
  detailsFocus: null,
  friends: [],
  friendSent: [],
  friendIncoming: ["mei", "devon"],
  eventAsks: {},
  guide: false,
  waitlistGuide: false,
  mapMasters: false,
  mapCalendar: [],
  whatIf: NO_CHANGE,
  eventAccounts: eventAccountsFor("filled"),
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
  unskipSuggestion: (id: string) => void;
  clearHomeItem: (id: string, how: "snoozed" | "dismissed") => void;
  restoreHomeItem: (id: string) => void;
  /** Home's wallpaper and widgets. A preference like helper choices, so Reset demo keeps it. */
  desk: Desk;
  setDesk: (f: (d: Desk) => Desk) => void;
  addOwnSkill: (skill: Omit<OwnSkill, "id">) => void;
  removeOwnSkill: (id: string) => void;
  setShowMeGoing: (on: boolean) => void;
  askToGo: (peerId: string, note?: string) => void;
  requestFriend: (peerId: string) => void;
  cancelFriendRequest: (peerId: string) => void;
  answerFriend: (peerId: string, accept: boolean) => void;
  removeFriend: (peerId: string) => void;
  askAtEvent: (eventId: string, peerId: string, note?: string) => void;
  notNow: (peerId: string) => void;
  reviewSkill: (id: string, review: SkillReview) => void;
  addDraftCourse: (code: string) => void;
  toggleCareerInterest: (interest: string) => void;
  setRoleInterest: (id: string, interested: boolean) => void;
  /** Makes a role her goal: it moves to the front of the roles she's interested in. */
  /** Make a career the main goal (adds it if needed). */
  setGoal: (id: string) => void;
  addGoal: (id: string) => void;
  removeGoal: (id: string) => void;
  setGoals: (ids: string[]) => void;
  setBuildSkills: (roleId: string, skills: string[]) => void;
  dismissRole: (id: string, dismissed: boolean) => void;
  /** Whether the demo opens with Maya's built path or as a new student. */
  demoFill: DemoFill;
  setDemoFill: (fill: DemoFill) => void;
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
  reopenPromise: (promiseId: string) => void;
  startFollowUp: (personId: string) => void;
  setFollowUpDraft: (text: string) => void;
  copyFollowUp: () => void;
  failAdd: (openSheet?: boolean) => void;
  /** "Try another path": replays one edge case from the agent design handoff through the same run view. */
  trySeatFills: (away?: boolean) => void;
  /** "Try another path": two options tie and the Planner asks her which matters more. */
  tryNeedsNote: () => void;
  /** Tell the helpers something. It's remembered, and if she's choosing a backup they re-plan with it. */
  steer: (text: string) => void;
  forgetNote: (id: string) => void;
  /** Sends a message from the bar or the open chat. Returns the chat it went into. */
  ask: (text: string) => string;
  /** Opens the full chat on one conversation (null: a new one). */
  openChat: (id: string | null) => void;
  setChatOpen: (b: boolean) => void;
  choose: (id: string) => void;
  backToOptions: () => void;
  markAdded: () => void;
  joinWaitlist: () => void;
  setWaitlistGuide: (b: boolean) => void;
  setMapMasters: (b: boolean) => void;
  toggleMapCalendar: (id: string) => void;
  setDraft: (s: string) => void;
  approve: () => void;
  counselorDecide: (d: "confirmed" | "declined") => void;
  setPanelOpen: (b: boolean) => void;
  setPaused: (b: boolean) => void;
  openEvidence: (id: string | null) => void;
  openClass: (code: string | null) => void;
  openOpportunity: (id: string | null, focus?: DetailsFocus) => void;
  removeDraftCourse: (code: string) => void;
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

/** The counselor email, one claim per line, each with the source that backs it. */
export function draftLines(id: string): { text: string; sourceIds: string[] }[] {
  const o = options.find((x) => x.id === id)!;
  const ruleIds = o.conflict ? [o.conflict.catalog.sourceId, o.conflict.articulation.sourceId] : o.sourceIds;
  const why = o.conflict
    ? "The Northgate catalog (p. 88) lists it for QR-1, but the articulation file (row 077) says elective only."
    : o.verdict === "conditional"
      ? "The articulation file (row 203) says it counts only with a grade of C or better."
      : o.rule;
  return [
    { text: `STAT 2 is full, so I'm adding ${o.course} (section ${o.section}) to hold a seat.`, sourceIds: ["portal-full"] },
    { text: `Please confirm it counts toward ${REQUIREMENT_LABEL}.`, sourceIds: ruleIds },
    { text: `If not, I'll drop it by ${DROP_DEADLINE}.`, sourceIds: ["bcc-drop"] },
    { text: `Why I'm asking: ${why}`, sourceIds: ruleIds },
  ];
}

export const draftGreeting = () => `Hi ${student.counselor},`;
export const draftSignoff = () => `Thank you,\n${student.name}`;

export function buildDraft(id: string) {
  const [a, b, c, d] = draftLines(id).map((l) => l.text);
  return `${draftGreeting()}

${a} ${b} ${c}

${d}

Source passages are attached.

${draftSignoff()}`;
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
  const [demoFill, setDemoFillState] = useState<DemoFill>("filled");
  const [desk, setDeskState] = useState<Desk>(DEFAULT_DESK);
  const setDesk = useCallback((f: (d: Desk) => Desk) => setDeskState((d) => {
    const next = f(d);
    try { window.localStorage.setItem("pa-desk", JSON.stringify(next)); } catch { /* private mode: keep it for this visit */ }
    return next;
  }), []);
  useEffect(() => {
    try { const raw = window.localStorage.getItem("pa-desk"); if (raw) setDeskState(cleanDesk(JSON.parse(raw))); } catch { /* unreadable: keep the default */ }
    setOnboarded(window.localStorage.getItem("pa-onboarded") === "1");
    const fill: DemoFill = window.localStorage.getItem("pa-demo-fill") === "fresh" ? "fresh" : "filled";
    setPathBuilt(pathBuiltFor(fill, window.localStorage.getItem("pa-path-built") === "1"));
    if (fill === "fresh") {
      setDemoFillState("fresh");
      set((p) => ({ ...p, event: eventPlanFor("fresh"), eventAccounts: eventAccountsFor("fresh"), interestedRoles: goalsFor("fresh") }));
    }
  }, []);

  const latest = useRef(s);
  latest.current = s;
  const runControl = useRef<AbortController | null>(null);

  /** Back to the start of a demo, keeping the student's helper, access and notification choices. */
  const restart = useCallback((fill: DemoFill) => {
    clockRef.startedAt = Date.now();
    runControl.current?.abort();
    set((p) => ({ ...initial, event: eventPlanFor(fill), eventAccounts: eventAccountsFor(fill), interestedRoles: goalsFor(fill), startedAt: clockRef.startedAt, agentOn: p.agentOn, access: p.access, notify: p.notify, watchingRegistration: p.watchingRegistration }));
  }, []);
  const applyFill = useCallback((fill: DemoFill) => {
    window.localStorage.setItem("pa-demo-fill", fill);
    if (fill === "filled") window.localStorage.setItem("pa-path-built", "1");
    else window.localStorage.removeItem("pa-path-built");
    setDemoFillState(fill);
    setPathBuilt(pathBuiltFor(fill, false));
    restart(fill);
  }, [restart]);

  const failAdd = useCallback((openSheet = true) => {
    const t0 = scriptNow();
    const { paused, access, agentOn } = latest.current;
    const allowed = !paused && access.registration;
    if (allowed) {
      runControl.current?.abort();
      const control = new AbortController();
      runControl.current = control;
      const apply = (e: AgentEvent) => {
        if (!control.signal.aborted) set((p) => ({ ...p, agentRun: applyRunEvent(p.agentRun, e, new Date(scriptNow())) }));
      };
      void recover(agentOn, apply, control.signal);
    }
    set((p) => ({
      ...p,
      stage: "failed",
      panelOpen: openSheet,
      agentTimes: { reader: new Date(t0), planner: new Date(t0 + 1400), backup: new Date(t0 + 2800) },
      agentRun: allowed ? newTraceRun() : null,
      justFilled: [],
    }));
  }, []);

  /** Plays an event stream with its own timing, through the same reducer as a live run. */
  const replay = useCallback((events: (RunEvent & { at: number })[], control: AbortController) => {
    for (const { at, ...e } of events) {
      window.setTimeout(() => {
        if (control.signal.aborted) return;
        const event = e as RunEvent;
        set((p) => ({
          ...p,
          agentRun: applyRunEvent(p.agentRun, event, new Date(scriptNow())),
          awayRun: event.type === "done" ? !p.panelOpen : p.awayRun,
          justFilled: event.type === "stale" ? [...new Set([...p.justFilled, ...event.facts.map((f) => FILLED_BY[f]).filter((x): x is string => !!x)])] : p.justFilled,
        }));
      }, at);
    }
  }, []);

  const trySeatFills = useCallback((away = false) => {
    // From the start of the demo, the class has to come back full first; the re-check follows once that run finishes.
    if (latest.current.stage !== "failed") failAdd(!away);
    else set((p) => ({ ...p, panelOpen: !away }));
    const started = Date.now();
    const go = () => {
      const run = latest.current.agentRun;
      if (run && run.status !== "done" && Date.now() - started < 30000) return void window.setTimeout(go, 300);
      runControl.current?.abort();
      const control = new AbortController();
      runControl.current = control;
      // A moment on the first answer, so the change reads as a change.
      window.setTimeout(() => replay(SEAT_FILLS, control), run ? 1200 : 0);
    };
    go();
  }, [failAdd, replay]);

  const tryNeedsNote = useCallback(() => {
    runControl.current?.abort();
    const control = new AbortController();
    runControl.current = control;
    const t0 = scriptNow();
    set((p) => ({ ...p, stage: "failed", chosenId: null, seatHeld: false, draft: "", guide: false, panelOpen: true, awayRun: false, justFilled: [], agentRun: null, agentTimes: { reader: new Date(t0), planner: new Date(t0 + 1400), backup: new Date(t0 + 2800) } }));
    replay(NEEDS_NOTE, control);
  }, [replay]);

  const steer = useCallback((text: string) => {
    const note = constraintFrom(text);
    if (!note) return;
    const p0 = latest.current;
    const notes = remember(p0.notes, note);
    set((p) => ({ ...p, notes, decisions: [...p.decisions, log(`Told the helpers: ${note.text}`, [])] }));
    // Only re-plan while she's choosing a backup; otherwise the note waits for the next run.
    if (p0.stage !== "failed") return;
    const open = options.filter((o) => ["math13", "psyc5", "bus21"].includes(o.id) && o.seatsOpen > 0 && o.verdict !== "does_not_count" && !p0.justFilled.includes(o.id));
    runControl.current?.abort();
    const control = new AbortController();
    runControl.current = control;
    replay(steerEvents(note, open, notes, p0.agentRun?.result?.optionId ?? null), control);
  }, [replay]);

  const ask = useCallback((text: string) => {
    const t = text.trim();
    const p0 = latest.current;
    const now = Date.now();
    const { threads, id } = addAsk(p0.chats, p0.activeChat, t, now);
    // Asking from the options run starts a chat of its own, so the run's thread stays about the run.
    set((p) => ({ ...p, chats: threads, activeChat: id, typingIn: id, chatOpen: p.chatOpen || p.panelOpen, panelOpen: false }));
    if (noteFrom(t)) steer(t);
    // A short "working" moment, then the scripted answer lands in the same chat.
    window.setTimeout(() => set((p) => ({ ...p, chats: addReply(p.chats, id, t, Date.now()), typingIn: p.typingIn === id ? null : p.typingIn })), 2600);
    return id;
  }, [steer]);

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
      addOwnSkill: (skill) => set((p) => ({ ...p, ownSkills: [...p.ownSkills, { ...skill, id: `own-${p.ownSkills.length + 1}-${skill.name.toLowerCase().replace(/\W+/g, "-")}` }] })),
      removeOwnSkill: (id) => set((p) => ({ ...p, ownSkills: p.ownSkills.filter((x) => x.id !== id) })),
      clearHomeItem: (id, how) => set((p) => ({ ...p, homeCleared: { ...p.homeCleared, [id]: how } })),
      restoreHomeItem: (id) => set((p) => {
        const { [id]: _cleared, ...homeCleared } = p.homeCleared;
        return { ...p, homeCleared };
      }),
      unskipSuggestion: (id) => set((p) => ({ ...p, skippedSuggestions: p.skippedSuggestions.filter((s) => s !== id) })),
      setShowMeGoing: (on) => set((p) => ({
        ...p,
        goTogether: on
          ? { ...p.goTogether, showMe: true, shownAt: new Date(scriptNow()) }
          : { ...p.goTogether, showMe: false },
      })),
      askAtEvent: (eventId, peerId, note) => set((p) => {
        const cur = p.eventAsks[eventId] ?? { sentTo: [], notes: {} };
        if (!p.goTogether.showMe || cur.sentTo.includes(peerId)) return p;
        const text = note?.trim();
        return { ...p, eventAsks: { ...p.eventAsks, [eventId]: { sentTo: [...cur.sentTo, peerId], notes: text ? { ...cur.notes, [peerId]: text } : cur.notes } } };
      }),
      requestFriend: (peerId) => set((p) => p.friendIncoming.includes(peerId)
        ? { ...p, friendIncoming: p.friendIncoming.filter((x) => x !== peerId), friends: [...p.friends, peerId] }
        : p.friends.includes(peerId) || p.friendSent.includes(peerId) ? p : { ...p, friendSent: [...p.friendSent, peerId] }),
      cancelFriendRequest: (peerId) => set((p) => ({ ...p, friendSent: p.friendSent.filter((x) => x !== peerId) })),
      answerFriend: (peerId, accept) => set((p) => ({ ...p, friendIncoming: p.friendIncoming.filter((x) => x !== peerId), friends: accept && !p.friends.includes(peerId) ? [...p.friends, peerId] : p.friends })),
      removeFriend: (peerId) => set((p) => ({ ...p, friends: p.friends.filter((x) => x !== peerId) })),
      askToGo: (peerId, note) => set((p) => {
        const peer = goTogetherEvent.visiblePeers.find((x) => x.id === peerId);
        if (!peer || !p.goTogether.showMe) return p;
        const asked = askPeer(p.goTogether, peerId, goTogetherEvent.asksYou);
        if (asked === p.goTogether) return p;
        const text = note?.trim();
        const next = text ? { ...asked, sentNotes: { ...asked.sentNotes, [peerId]: text } } : asked;
        const now = new Date(scriptNow());
        const matched = next.matched.length > p.goTogether.matched.length;
        return {
          ...p,
          goTogether: matched ? { ...next, matchedAt: now } : { ...next, sentAt: now },
          decisions: [...p.decisions, matched
            ? log(`Said yes to going to the ${goTogetherEvent.shortName} with ${peer.name}`, [], `${peer.name.split(" ")[0]} asked first, so you both said yes.`, "Their school email is now on their card. Demo only: no one was told.")
            : log(`Asked ${peer.name} to go to the ${goTogetherEvent.shortName} together`, [], "You picked them from the students who chose to be seen.", "It's a match only if they say yes too. Demo only: no request went out.")],
        };
      }),
      notNow: (peerId) => set((p) => ({ ...p, goTogether: passAsk(p.goTogether, peerId) })),
      reviewSkill: (id, review) => set(p => ({ ...p, skillReviews: { ...p.skillReviews, [id]: { ...p.skillReviews[id], ...review } } })),
      addDraftCourse: (code) => set(p => {
        const draftCourses = p.draftCourses.includes(code) ? p.draftCourses : [...p.draftCourses, code];
        // An elective fills its open slot in the degree as soon as it's on the plan.
        const elective = electiveClasses.find((e) => e.code === code);
        if (!elective || p.savedOpportunities.includes(elective.id)) return { ...p, draftCourses };
        return { ...p, draftCourses, savedOpportunities: [...p.savedOpportunities, elective.id], savedAt: { ...p.savedAt, [elective.id]: new Date(scriptNow()) } };
      }),
      removeDraftCourse: (code) => set(p => {
        const elective = electiveClasses.find((e) => e.code === code);
        return { ...p, draftCourses: p.draftCourses.filter((c) => c !== code), savedOpportunities: elective ? p.savedOpportunities.filter((id) => id !== elective.id) : p.savedOpportunities };
      }),
      toggleCareerInterest: (interest) => set(p => ({ ...p, careerInterests: p.careerInterests.includes(interest) ? p.careerInterests.filter(i => i !== interest) : [...p.careerInterests, interest] })),
      setRoleInterest: (id, interested) => set(p => ({ ...p, interestedRoles: interested ? [...new Set([...p.interestedRoles, id])] : p.interestedRoles.filter(i => i !== id), dismissedRoles: p.dismissedRoles.filter(i => i !== id) })),
      setGoal: (id) => set(p => ({ ...p, interestedRoles: makeMain(p.interestedRoles, id), dismissedRoles: p.dismissedRoles.filter(i => i !== id) })),
      addGoal: (id) => set(p => ({ ...p, interestedRoles: addGoal(p.interestedRoles, id), dismissedRoles: p.dismissedRoles.filter(i => i !== id) })),
      removeGoal: (id) => set(p => ({ ...p, interestedRoles: removeGoal(p.interestedRoles, id) })),
      setGoals: (ids) => set(p => ({ ...p, interestedRoles: ids.slice(0, MAX_GOALS) })),
      setBuildSkills: (roleId, skills) => set(p => ({ ...p, buildSkills: { ...p.buildSkills, [roleId]: skills } })),
      dismissRole: (id, dismissed) => set(p => ({ ...p, dismissedRoles: dismissed ? [...new Set([...p.dismissedRoles, id])] : p.dismissedRoles.filter(i => i !== id) })),
      demoFill,
      setDemoFill: applyFill,
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
      reopenPromise: (id) => set((p) => ({ ...p, event: { ...p.event, promises: p.event.promises.map((x) => (x.id === id ? { ...x, done: false } : x)) } })),
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
      trySeatFills,
      tryNeedsNote,
      steer,
      forgetNote: (id) => set((p) => ({ ...p, notes: forget(p.notes, id) })),
      ask,
      openChat: (id) => set((p) => ({ ...p, chatOpen: true, panelOpen: false, activeChat: id })),
      setChatOpen: (b) => set((p) => ({ ...p, chatOpen: b, panelOpen: b ? p.panelOpen : false })),
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
          waitlistGuide: false,
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
      setWaitlistGuide: (b) => set((p) => ({ ...p, waitlistGuide: b })),
      setMapMasters: (b) => set((p) => ({ ...p, mapMasters: b })),
      toggleMapCalendar: (id) => set((p) => ({ ...p, mapCalendar: p.mapCalendar.includes(id) ? p.mapCalendar.filter((c) => c !== id) : [...p.mapCalendar, id] })),
      setPanelOpen: (b) => set((p) => ({ ...p, panelOpen: b, awayRun: b ? false : p.awayRun })),
      setWatchingRegistration: (b) => set((p) => (p.watchingRegistration === b ? p : { ...p, watchingRegistration: b })),
      setPaused: (b) => set((p) => ({ ...p, paused: b, panelOpen: b ? false : p.panelOpen })),
      openEvidence: (id) => set((p) => ({ ...p, evidenceId: id })),
      openClass: (code) => set((p) => ({ ...p, classDetails: code })),
      openOpportunity: (id, focus) => set((p) => ({ ...p, opportunityDetails: id, detailsFocus: id ? focus ?? null : null })),
      setWhatIf: (w) => set((p) => ({ ...p, whatIf: w })),
      linkEventAccount: (platform, name, found) => set((p) => p.eventAccounts.includes(platform) ? p : ({ ...p, eventAccounts: [...p.eventAccounts, platform], decisions: [...p.decisions, log(`Connected ${name}, read only`, [], `Sprout found ${found} events. It can't register you or message hosts.`)] })),
      unlinkEventAccount: (platform, name) => set((p) => ({ ...p, eventAccounts: p.eventAccounts.filter((x) => x !== platform), decisions: [...p.decisions, log(`Disconnected ${name}`, [], "Its events no longer show in Experiences.")] })),
      checkEvent: (id, answer) => set((p) => {
        const { [id]: _old, ...rest } = p.eventChecks;
        return { ...p, eventChecks: answer ? { ...rest, [id]: answer } : rest };
      }),
      toggleProfilePick: (id) => set((p) => ({ ...p, profilePicks: p.profilePicks.includes(id) ? p.profilePicks.filter((x) => x !== id) : [...p.profilePicks, id] })),
      setProfileLink: (on) => set((p) => ({ ...p, profileLink: on, decisions: [...p.decisions, log(on ? "Turned on a private link to your experience profile" : "Turned off your profile link", [], on ? "Only people you give the link to can see what you picked." : "The link stopped working.")] })),
      reset: () => restart(demoFill),
      desk,
      setDesk,
      scriptNow,
      onboarded,
      finishOnboarding: () => {
        window.localStorage.setItem("pa-onboarded", "1");
        setOnboarded(true);
      },
      skipToDemo: () => {
        window.localStorage.setItem("pa-onboarded", "1");
        setOnboarded(true);
        applyFill("filled");
      },
      replayOnboarding: () => {
        window.localStorage.removeItem("pa-onboarded");
        window.localStorage.removeItem("pa-path-built");
        setOnboarded(false);
        setPathBuilt(pathBuiltFor(demoFill, false));
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
  }, [s, failAdd, trySeatFills, tryNeedsNote, steer, ask, choose, onboarded, pathBuilt, demoFill, applyFill, restart, desk, setDesk]);

  return <JourneyCtx.Provider value={value}>{children}</JourneyCtx.Provider>;
}

export function useJourney() {
  const c = useContext(JourneyCtx);
  if (!c) throw new Error("useJourney outside provider");
  return c;
}

