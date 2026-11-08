import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, CheckCircle2 } from "lucide-react";
import { requirements, options, student, DROP_DEADLINE, type ReqStatus } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { useJourney } from "@/lib/journey";
import { ConfidenceBadge, PageHeader, SimLabel, SourceChip, StatusBadge } from "@/components/app/bits";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Degree progress — Academic Path Agent" },
      { name: "description", content: "Maya's transfer degree requirements with sources and confidence on every claim." },
      { property: "og:title", content: "Degree progress — Academic Path Agent" },
      { property: "og:description", content: "Every requirement shown with its source passage and confidence level." },
    ],
  }),
  component: DegreeView,
});

function DegreeView() {
  const j = useJourney();
  const chosen = options.find((o) => o.id === j.chosenId);

  return (
    <div>
      <PageHeader
        title={`Hi ${student.name.split(" ")[0]}, you're on track.`}
        sub={`${student.from} → ${student.to}. One summer term left to fill.`}
        right={<SimLabel>Synthetic data</SimLabel>}
      />

      {j.seatHeld && chosen && !j.counselor && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 text-success" />
          <div>
            {recoveryPath(chosen) === "hold" ? (
              <><b>You hold a seat in {chosen.course}.</b> Counselor confirmation is pending. Drop by {DROP_DEADLINE} if not confirmed.</>
            ) : (
              <><b>You added {chosen.course} yourself.</b> It clearly counts toward Statistics. The agent didn't register anything.</>
            )}
          </div>
        </div>
      )}

      <div className="divide-y rounded-2xl border bg-card shadow-soft">
        {requirements.map((r) => {
          let status: ReqStatus = r.status;
          let detail = r.detail;
          let src = r.sourceId;
          let conf = r.confidence;
          let conflict = false;
          if (r.id === "qr1" && j.atRisk) {
            status = "at_risk";
            detail = "STAT 2 is full — replacement options found";
            src = "portal-full";
          }
          if (r.id === "qr1" && j.seatHeld && chosen) {
            const hold = recoveryPath(chosen) === "hold";
            status = hold ? "pending" : "in_progress";
            detail = hold
              ? `Seat held: ${chosen.course} §${chosen.section} · awaiting ${student.counselor} · drop by ${DROP_DEADLINE} if not confirmed`
              : `Enrolled (by you): ${chosen.course} §${chosen.section} · Summer 2027`;
            src = chosen.sourceIds[0]!;
            conf = chosen.confidence;
            conflict = !!chosen.conflict;
          }
          if (r.id === "qr1" && chosen && j.counselor === "confirmed") {
            status = "done";
            detail = `${chosen.course} §${chosen.section} · confirmed by ${student.counselor}`;
            src = "counselor-confirm";
            conf = 0.99;
            conflict = false;
          }
          if (r.id === "qr1" && chosen && j.counselor === "declined") {
            status = "at_risk";
            detail = `Counselor declined ${chosen.course}. Drop it by ${DROP_DEADLINE}; MATH 13 still has seats.`;
          }
          return (
            <div key={r.id} className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">{r.code} · {r.units}</div>
                <div className="font-serif text-lg">{r.name}</div>
                <div className="text-sm text-muted-foreground">{detail}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SourceChip id={src} />
                  <ConfidenceBadge score={conf} conflict={conflict} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={status} />
                {status === "at_risk" && (
                  <button onClick={() => j.setPanelOpen(true)} className="text-sm text-primary underline">See options</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">How your units convert</h2>
        <p className="mt-1 text-sm text-muted-foreground">Bayview uses quarters; Northgate uses semesters. Both schools' rules agree:</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {([
            ["Bayview CC policy", "1 quarter unit = 0.667 semester units", "bcc-units"],
            ["Northgate State policy", "5 quarter units → 3.3 semester units (rounded)", "nsu-units"],
          ] as const).map(([h, rule, id]) => (
            <div key={id} className="rounded-xl border bg-card p-5">
              <div className="text-xs text-muted-foreground">{h}</div>
              <div className="mt-1 font-serif text-lg">{rule}</div>
              <div className="mt-3 flex gap-2"><SourceChip id={id} /><ConfidenceBadge score={0.97} /></div>
            </div>
          ))}
        </div>
      </section>

      {j.stage === "idle" && (
        <div className="mt-10 flex items-start gap-2 rounded-xl bg-secondary p-4 text-sm">
          <Info className="mt-0.5 size-4 text-primary" />
          <span>
            Demo: head to the <Link to="/portal" className="text-primary underline">simulated registration portal</Link> and try adding STAT 2.
          </span>
        </div>
      )}
    </div>
  );
}
