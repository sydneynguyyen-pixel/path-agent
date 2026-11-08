import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox, Check, X, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { options, student, DROP_DEADLINE, REQUIREMENT_LABEL } from "@/data/scenario";
import { useJourney, fmtTime } from "@/lib/journey";
import { ConfidenceBadge, PageHeader, SimLabel, SourceChip } from "@/components/app/bits";

export const Route = createFileRoute("/counselor")({
  head: () => ({
    meta: [
      { title: "Counselor review — Academic Path Agent" },
      { name: "description", content: "The counselor's side: review the student's evidence and confirm or decline in one read." },
      { property: "og:title", content: "Counselor review — Academic Path Agent" },
      { property: "og:description", content: "Counselor-in-the-loop: one-read decisions with both source readings side by side." },
    ],
  }),
  component: Counselor,
});

function Counselor() {
  const j = useJourney();
  const o = options.find((x) => x.id === j.chosenId);
  const sent = j.emailSent && o;

  return (
    <div>
      <PageHeader
        title="The counselor's side"
        sub={`A preview of what ${student.counselor} sees in her school's advising tool when you ask for confirmation. You don't use this screen; it's here so you can see the whole loop.`}
        right={<SimLabel>Preview · not Maya's view</SimLabel>}
      />
      {!sent ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <Inbox className="mx-auto size-6" />
          <p className="mt-2">No requests yet. When Maya holds a seat in an uncertain course and approves the email, it shows up here.</p>
          <Link to="/portal" className="mt-3 inline-block text-sm text-foreground underline">Start from registration</Link>
        </div>
      ) : (
        <article className="rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">From {student.name} · {fmtTime(j.decisions.find((d) => d.what.startsWith("Approved"))!.when)}</div>
              <h2 className="mt-1 text-xl font-medium">Does {o.course} count toward {REQUIREMENT_LABEL}?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Seat already held. Student will drop by {DROP_DEADLINE} if you decline.</p>
            </div>
            <ConfidenceBadge score={o.confidence} conflict={!!o.conflict} />
          </div>

          {o.conflict ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {([["Catalog says", o.conflict.catalog], ["Articulation file says", o.conflict.articulation]] as const).map(([l, r]) => (
                <div key={l} className="rounded-xl bg-secondary p-4 text-sm">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Scale className="size-3" /> {l}</div>
                  <div className="mt-1 font-medium">{r.reading}</div>
                  <div className="mt-2"><SourceChip id={r.sourceId} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-secondary p-4 text-sm">
              {o.rule} <span className="ml-1 inline-flex gap-1">{o.sourceIds.map((s) => <SourceChip key={s} id={s} />)}</span>
            </div>
          )}

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-muted-foreground">Student's message</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl border p-4 font-sans text-sm">{j.draft}</pre>
          </details>

          {j.counselor ? (
            <div className={`mt-5 rounded-xl p-4 text-sm ${j.counselor === "confirmed" ? "bg-success-soft" : "bg-warning-soft"}`}>
              {j.counselor === "confirmed"
                ? `Confirmed. Maya's degree view now shows ${REQUIREMENT_LABEL} as satisfied by ${o.course}.`
                : `Declined. Maya sees a prompt to drop ${o.course} by ${DROP_DEADLINE}, with MATH 13 suggested.`}{" "}
              <Link to="/" className="underline">See Maya's view</Link>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => j.counselorDecide("confirmed")}><Check className="size-4" /> Confirm it counts</Button>
              <Button variant="outline" onClick={() => j.counselorDecide("declined")}><X className="size-4" /> Decline · advise drop</Button>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">The counselor's decision is logged with their name. Updating the official degree audit stays a counselor action in the student system.</p>
        </article>
      )}
    </div>
  );
}
