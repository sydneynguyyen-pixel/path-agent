import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2, Send, Scale, Info } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { options, student, syllabi, PILEUP_THRESHOLD } from "@/data/scenario";
import { needsCounselor } from "@/lib/confidence";
import { useJourney, fmtTime } from "@/lib/journey";
import { ConfidenceBadge, SourceChip } from "./bits";
import { cn } from "@/lib/utils";

const verdictLabel = {
  counts: "Counts toward QR-1",
  conditional: "Counts with grade C or better",
  conflict: "Needs counselor confirmation",
  does_not_count: "Does not count",
};

function weekLoad(week: number) {
  return syllabi.reduce((n, s) => n + s.items.filter((i) => i.week === week).length, 0);
}

export function AgentPanel() {
  const j = useJourney();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (j.stage !== "failed") return;
    setStep(0);
    const t = [setTimeout(() => setStep(1), 1400), setTimeout(() => setStep(2), 2800), setTimeout(() => setStep(3), 4000)];
    return () => t.forEach(clearTimeout);
  }, [j.stage]);

  const showOptions = j.stage !== "failed" || step >= 3;
  const chosen = options.find((o) => o.id === j.chosenId);

  return (
    <Sheet open={j.panelOpen} onOpenChange={j.setPanelOpen}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetDescription>Agent · proposes and drafts only</SheetDescription>
          <SheetTitle className="font-serif text-2xl">Let's keep your plan on track</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-10">
          <div className="rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-warning">
              <AlertTriangle className="size-4" /> STAT 2 is full
            </div>
            <p className="mt-1 text-foreground">
              I updated your record: QR-1 Statistics is now <b>at risk</b>, not lost. You have good options. <SourceChip id="portal-full" />
            </p>
          </div>

          <ol className="space-y-2 text-sm">
            {[
              ["Reader", "Read the portal response, audit and articulation file"],
              ["Planner", "Checked which courses still count"],
              ["Backup finder", "Found open sections and checked your deadlines"],
            ].map(([n, d], i) => (
              <li key={n} className="flex items-center gap-2">
                {step > i || j.stage !== "failed" ? (
                  <CheckCircle2 className="size-4 text-success" />
                ) : step === i ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <span className="size-4 rounded-full border" />
                )}
                <b>{n}</b> <span className="text-muted-foreground">{d}</span>
              </li>
            ))}
          </ol>

          {showOptions && j.stage !== "approved" && j.stage !== "drafting" && (
            <section className="space-y-3">
              <h3 className="text-lg font-semibold">Replacement options, ranked</h3>
              {options.map((o) => {
                const counselor = needsCounselor(o.confidence, !!o.conflict);
                const heavy = o.deadlines.some((d) => weekLoad(d.week) >= PILEUP_THRESHOLD);
                return (
                  <article key={o.id} className={cn("rounded-xl border bg-card p-4 shadow-soft", o.verdict === "does_not_count" && "opacity-75")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">#{o.rank} · {verdictLabel[o.verdict]}</div>
                        <div className="font-semibold">{o.course}</div>
                        <div className="text-sm text-muted-foreground">{o.title}</div>
                      </div>
                      <ConfidenceBadge score={o.confidence} conflict={!!o.conflict} />
                    </div>
                    <p className="mt-2 text-sm">{o.reason}</p>

                    {o.conflict && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {[["Catalog says", o.conflict.catalog], ["Articulation file says", o.conflict.articulation]].map(([lbl, r]) => {
                          const rr = r as { reading: string; sourceId: string };
                          return (
                            <div key={lbl as string} className="rounded-lg border border-dashed bg-secondary p-3 text-sm">
                              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Scale className="size-3" /> {lbl as string}</div>
                              <div className="mt-1">{rr.reading}</div>
                              <div className="mt-2"><SourceChip id={rr.sourceId} /></div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      Rule: {o.rule} {!o.conflict && o.sourceIds.map((s) => <SourceChip key={s} id={s} />)}
                    </div>
                    <div className={cn("mt-2 flex items-start gap-1.5 text-xs", heavy ? "text-warning" : "text-muted-foreground")}>
                      <Info className="mt-0.5 size-3.5 shrink-0" /> Deadline check: {o.deadlineNote}
                    </div>
                    {counselor && <div className="mt-2 text-xs font-medium text-warning">Unconfirmed — will go to your counselor before anything else happens.</div>}
                    {o.verdict !== "does_not_count" && (
                      <Button size="sm" variant={o.rank === 1 ? "default" : "outline"} className="mt-3" onClick={() => j.choose(o.id)}>
                        Choose {o.course}
                      </Button>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {chosen && j.stage === "drafting" && (
            <section className="space-y-3 rounded-xl border bg-card p-4 shadow-soft">
              <h3 className="text-lg font-semibold">Approval needed</h3>
              <p className="text-sm text-muted-foreground">
                Draft to {student.counselor} ({student.counselorEmail}). Edit anything you like. Nothing is sent until you approve.
              </p>
              <Textarea value={j.draft} onChange={(e) => j.setDraft(e.target.value)} rows={14} className="font-mono text-xs" />
              <div>
                <div className="text-xs font-medium text-muted-foreground">Evidence attached</div>
                <div className="mt-1 flex flex-wrap gap-1.5">{chosen.sourceIds.map((s) => <SourceChip key={s} id={s} />)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    j.approve();
                    toast("Demo only: no email was sent.", { description: "Your approval was recorded in the decision log." });
                  }}
                >
                  <Send className="size-4" /> Approve and send as {student.name}
                </Button>
                <Button variant="ghost" onClick={() => j.failAdd()}>Back to options</Button>
              </div>
              <p className="text-xs text-muted-foreground">Simulated send. Demo only: no email will actually be sent.</p>
            </section>
          )}

          {j.stage === "approved" && chosen && (
            <section className="space-y-3 rounded-xl border border-success/30 bg-success-soft p-5">
              <div className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="size-5" /> Approved by {student.name}</div>
              <p className="text-sm">Demo only: no email was sent. <b>Nothing was registered.</b> Your counselor confirms next.</p>
              <p className="text-xs text-muted-foreground">Logged at {fmtTime(j.decisions.at(-1)!.when)}.</p>
              <div className="flex gap-2 text-sm">
                <Link to="/" className="text-primary underline" onClick={() => j.setPanelOpen(false)}>See degree view</Link>
                <Link to="/decisions" className="text-primary underline" onClick={() => j.setPanelOpen(false)}>Decision log</Link>
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
