import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/bits";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Design rationale — Academic Path Agent" },
      { name: "description", content: "Target user, problem, and the key interaction choices behind the Academic Path Agent." },
      { property: "og:title", content: "Design rationale — Academic Path Agent" },
      { property: "og:description", content: "Why transfer students lose credits, and how a counselor-in-the-loop agent keeps them on track." },
    ],
  }),
  component: About,
});

const choices = [
  ["Seat first, confirm in parallel", "Seats are gone in minutes but counselors answer in days. Clear options go straight to “Do this now”; uncertain ones hold the seat with a cited drop deadline as the way out."],
  ["No claim without a source", "Every “this counts” shows the passage and a confidence label (word + icon, not color alone). Click any chip to read it."],
  ["Disagreement is shown, not resolved", "When the catalog and articulation file conflict, both readings appear side by side and the case goes to the counselor, marked unconfirmed."],
  ["Named approvals, nothing irreversible", "The agent never registers or sends. Every email needs “Approve and send as Maya Torres”, and every choice lands in the decision log."],
  ["Visible, pausable scope", "The agent watches only the registration page, says so in the sidebar, and can be paused from Permissions."],
  ["Inspectable agent team", "Reader → Planner → Backup finder → Drafter, each with timestamps, inputs, outputs and a “Why did it do that?” line."],
];

function About() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Design rationale" sub="Why this exists and the decisions behind it." />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-lilac p-5">
          <div className="text-xs text-muted-foreground">Target user</div>
          <p className="mt-1">Community-college transfer students, often working and first-generation, plus the counselors who serve hundreds of them each.</p>
        </div>
        <div className="rounded-2xl bg-sky p-5">
          <div className="text-xs text-muted-foreground">Deployed by</div>
          <p className="mt-1">The school, connected to its own LMS, student system, degree audit and articulation data, with counselors in the loop.</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-medium">The problem</h2>
        <p className="mt-2 text-muted-foreground">
          The rules for what transfers live in four places that rarely agree: transcript, degree audit, catalog and articulation file, plus the
          quarter-to-semester math. When a planned section fills, students guess under time pressure, pick something that doesn’t count, and lose
          a term or pay for extra units. Counselors get the question days later, after the seat is gone.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-medium">The value</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Student: a safe next step within minutes of the “Section full” error, with a way out if it turns out wrong.</li>
          <li>Counselor: one-read decisions with evidence pre-gathered, only for genuinely uncertain cases.</li>
          <li>School: fewer excess units and lost terms, and an audit trail of every decision.</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-medium">Key interaction choices</h2>
        <div className="mt-3 space-y-3">
          {choices.map(([h, d]) => (
            <div key={h} className="rounded-2xl border p-4">
              <div className="font-medium">{h}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl bg-secondary p-5 text-sm">
        <b>Demo path (≈3 min):</b> Registration → Add STAT 2 → pick BUS 21 (conflict) → add it yourself → approve the email → Counselor view →
        Confirm → back to <Link to="/" className="underline">Degree</Link>. Use “Reset demo” to run it again, or pick MATH 13 for the fast path.
        <p className="mt-2 text-xs text-muted-foreground">All data is synthetic. Agent output is scripted in this prototype.</p>
      </section>
    </div>
  );
}
