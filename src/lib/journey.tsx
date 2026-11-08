import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { options, student, DROP_DEADLINE, REQUIREMENT_LABEL, waitlist } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";

export type Stage = "idle" | "failed" | "chosen";

export type Decision = { id: string; who: string; what: string; when: Date; evidence: string[] };

type State = {
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
};

const initial: State = {
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
};

type Ctx = State & {
  failAdd: () => void;
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
  atRisk: boolean;
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

const log = (what: string, evidence: string[]): Decision => ({ id: crypto.randomUUID(), who: student.name, what, when: new Date(), evidence });

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>(initial);

  const failAdd = useCallback(() => {
    const t0 = Date.now();
    set((p) => ({
      ...p,
      stage: "failed",
      panelOpen: true,
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
      draft: hold ? buildDraft(id) : "",
      agentTimes: hold ? { ...p.agentTimes, drafter: new Date() } : p.agentTimes,
      decisions: [...p.decisions, log(`Chose ${o.course} §${o.section} as replacement for STAT 2`, o.sourceIds)],
    }));
  }, []);

  const value = useMemo<Ctx>(() => {
    const chosen = options.find((o) => o.id === s.chosenId);
    return {
      ...s,
      atRisk: (s.stage !== "idle" && !s.seatHeld) || s.counselor === "declined",
      failAdd,
      choose,
      backToOptions: () => set((p) => ({ ...p, stage: "failed", chosenId: null, draft: "" })),
      markAdded: () =>
        set((p) => ({
          ...p,
          seatHeld: true,
          decisions: [...p.decisions, log(`Added ${chosen!.course} §${chosen!.section} herself in the portal (agent did not register)`, chosen!.sourceIds)],
        })),
      joinWaitlist: () =>
        set((p) => ({
          ...p,
          waitlisted: true,
          decisions: [...p.decisions, log(`Joined waitlist for ${waitlist.course} herself (simulated)`, [waitlist.sourceId])],
        })),
      approve: () =>
        set((p) => ({
          ...p,
          emailSent: true,
          decisions: [...p.decisions, log(`Approved and sent (simulated) email to ${student.counselor} about ${chosen!.course}`, [...chosen!.sourceIds, "bcc-drop"])],
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
              when: new Date(),
              evidence: chosen!.sourceIds,
            },
          ],
        })),
      setDraft: (d) => set((p) => ({ ...p, draft: d })),
      setPanelOpen: (b) => set((p) => ({ ...p, panelOpen: b })),
      setPaused: (b) => set((p) => ({ ...p, paused: b, panelOpen: b ? false : p.panelOpen })),
      openEvidence: (id) => set((p) => ({ ...p, evidenceId: id })),
      reset: () => set(initial),
    };
  }, [s, failAdd, choose]);

  return <JourneyCtx.Provider value={value}>{children}</JourneyCtx.Provider>;
}

export function useJourney() {
  const c = useContext(JourneyCtx);
  if (!c) throw new Error("useJourney outside provider");
  return c;
}

export const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
