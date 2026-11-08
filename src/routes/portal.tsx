import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useJourney } from "@/lib/journey";
import { PageHeader, SimLabel } from "@/components/app/bits";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Simulated registration portal — Academic Path Agent" },
      { name: "description", content: "A simulated Bayview registration page where the agent watches for blocked adds." },
      { property: "og:title", content: "Simulated registration portal — Academic Path Agent" },
      { property: "og:description", content: "Try adding a full section and watch the agent recover the plan." },
    ],
  }),
  component: Portal,
});

const sections = [
  { id: "stat2", code: "STAT 2", title: "Introduction to Statistics", sec: "01", seats: "40/40", full: true },
  { id: "engl1b", code: "ENGL 1B", title: "Critical Thinking & Writing", sec: "03", seats: "Registered", reg: true },
  { id: "bio12", code: "BIO 12", title: "Human Biology", sec: "02", seats: "Registered", reg: true },
  { id: "hist18", code: "HIST 18", title: "Modern World History", sec: "01", seats: "Registered", reg: true },
];

function Portal() {
  const j = useJourney();
  const [error, setError] = useState(false);
  return (
    <div>
      <PageHeader title="Registration" sub="This is a simulated school portal. The agent can only watch this page; it cannot click or register for you." right={<SimLabel>Simulated portal</SimLabel>} />
      <div className="rounded-2xl border-2 border-dashed border-warning/40 bg-muted p-1">
        <div className="rounded-xl bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3 text-sm">
            <span className="font-semibold">Bayview CC · Summer 2027 (simulated)</span>
            <span className="text-muted-foreground">Student: Maya Torres · ID 000-SYN-4471</span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="px-5 py-2">Course</th><th>Section</th><th>Seats</th><th></th></tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-5 py-3"><b>{s.code}</b> <span className="text-muted-foreground">{s.title}</span></td>
                  <td>{s.sec}</td>
                  <td>{s.seats}</td>
                  <td className="pr-5 text-right">
                    {s.reg ? (
                      <span className="text-xs text-muted-foreground">Enrolled</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setError(true);
                          if (!j.paused) j.failAdd();
                        }}
                      >
                        Add
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {error && (
            <div className="m-5 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
              Error: Section full. STAT 2-01 has no seats (waitlist 6/10).
              {j.paused && <span className="block text-muted-foreground">Agent is paused, so it didn't respond.</span>}
              {!j.paused && !j.panelOpen && (
                <button className="ml-2 underline" onClick={() => j.setPanelOpen(true)}>Open agent panel</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
