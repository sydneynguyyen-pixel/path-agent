import { requirements, options, student, DROP_DEADLINE, type ReqStatus } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { useJourney } from "@/lib/journey";
import { SourceChip, StatusBadge } from "@/components/app/bits";

export function Requirements() {
  const j = useJourney();
  const chosen = options.find((o) => o.id === j.chosenId);
  return (
    <div className="divide-y rounded-2xl border bg-card shadow-soft">
      {requirements.map((r) => {
        let status: ReqStatus = r.status;
        let detail = r.detail;
        let src = r.sourceId;
        if (r.id === "qr1" && j.atRisk) { status = "at_risk"; detail = "STAT 2 is full — replacement options found"; src = "portal-full"; }
        if (r.id === "qr1" && j.seatHeld && chosen) {
          const hold = recoveryPath(chosen) === "hold";
          status = hold ? "pending" : "in_progress";
          detail = hold ? `Seat held: ${chosen.course} §${chosen.section} · awaiting ${student.counselor} · drop by ${DROP_DEADLINE} if not confirmed` : `Enrolled (by you): ${chosen.course} §${chosen.section} · Summer 2027`;
          src = chosen.sourceIds[0]!;
        }
        if (r.id === "qr1" && chosen && j.counselor === "confirmed") { status = "done"; detail = `${chosen.course} §${chosen.section} · confirmed by ${student.counselor}`; src = "counselor-confirm"; }
        if (r.id === "qr1" && chosen && j.counselor === "declined") { status = "at_risk"; detail = `Counselor declined ${chosen.course}. Drop it by ${DROP_DEADLINE}; MATH 13 still has seats.`; }
        return (
          <div key={r.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-center">
            <div><div className="text-xs text-muted-foreground">{r.code} · {r.units}</div><div className="mt-1 font-medium">{r.name}</div><div className="mt-1 text-sm text-muted-foreground">{detail}</div><div className="mt-2"><SourceChip id={src} /></div></div>
            <div className="flex items-center gap-3"><StatusBadge status={status} />{status === "at_risk" && <button onClick={() => j.setPanelOpen(true)} className="text-sm text-primary underline">See options</button>}</div>
          </div>
        );
      })}
    </div>
  );
}
