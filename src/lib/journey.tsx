import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { options, student } from "@/data/scenario";

export type Stage = "idle" | "failed" | "options" | "drafting" | "approved";

export type Decision = { id: string; who: string; what: string; when: Date; evidence: string[] };

type State = {
  stage: Stage;
  chosenId: string | null;
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
  setDraft: (s: string) => void;
  approve: () => void;
  setPanelOpen: (b: boolean) => void;
  setPaused: (b: boolean) => void;
  openEvidence: (id: string | null) => void;
  reset: () => void;
  atRisk: boolean;
};

const JourneyCtx = createContext<Ctx | null>(null);

function buildDraft(id: string) {
  const o = options.find((x) => x.id === id)!;
  const conflictLine = o.conflict
    ? `\nThe catalog (p. 88) lists BUS 21 for QR-1, but the articulation file (row 077) says elective only. Could you confirm which applies?\n`
    : "";
  return `Hi ${student.counselor},

STAT 2 (Summer 2027) is full, so my QR-1 Statistics requirement is at risk. I'd like to take ${o.course} instead.
${conflictLine}
Reason: ${o.rule}

Could you confirm this will count toward QR-1 at Northgate before I register? I've attached the source passages.

Thank you,
${student.name}`;
}

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [s, set] = useState<State>(initial);

  const failAdd = useCallback(() => {
    const t0 = Date.now();
    set((p) => ({
      ...p,
      stage: "failed",
      panelOpen: true,
      agentTimes: {
        reader: new Date(t0),
        planner: new Date(t0 + 1400),
        backup: new Date(t0 + 2800),
      },
    }));
  }, []);

  const choose = useCallback((id: string) => {
    const o = options.find((x) => x.id === id)!;
    set((p) => ({
      ...p,
      stage: "drafting",
      chosenId: id,
      draft: buildDraft(id),
      agentTimes: { ...p.agentTimes, drafter: new Date() },
      decisions: [
        ...p.decisions,
        { id: crypto.randomUUID(), who: student.name, what: `Chose ${o.course} as replacement for STAT 2`, when: new Date(), evidence: o.sourceIds },
      ],
    }));
  }, []);

  const approve = useCallback(() => {
    set((p) => {
      const o = options.find((x) => x.id === p.chosenId)!;
      return {
        ...p,
        stage: "approved",
        decisions: [
          ...p.decisions,
          {
            id: crypto.randomUUID(),
            who: student.name,
            what: `Approved and sent (simulated) email to ${student.counselor} about ${o.course}`,
            when: new Date(),
            evidence: o.sourceIds,
          },
        ],
      };
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...s,
      atRisk: s.stage === "failed" || s.stage === "options" || s.stage === "drafting",
      failAdd,
      choose,
      approve,
      setDraft: (d) => set((p) => ({ ...p, draft: d })),
      setPanelOpen: (b) => set((p) => ({ ...p, panelOpen: b })),
      setPaused: (b) => set((p) => ({ ...p, paused: b, panelOpen: b ? false : p.panelOpen })),
      openEvidence: (id) => set((p) => ({ ...p, evidenceId: id })),
      reset: () => set(initial),
    }),
    [s, failAdd, choose, approve],
  );

  return <JourneyCtx.Provider value={value}>{children}</JourneyCtx.Provider>;
}

export function useJourney() {
  const c = useContext(JourneyCtx);
  if (!c) throw new Error("useJourney outside provider");
  return c;
}

export const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
