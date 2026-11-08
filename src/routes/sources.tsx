import { createFileRoute } from "@tanstack/react-router";
import { Database } from "lucide-react";
import { PageHeader, SimLabel } from "@/components/app/bits";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { title: "Connected sources (simulated) — Academic Path Agent" },
      { name: "description", content: "Where data would come from in a school deployment: Canvas, student system, degree audit, articulation." },
      { property: "og:title", content: "Connected sources — Academic Path Agent" },
      { property: "og:description", content: "Simulated view of the systems a school would connect." },
    ],
  }),
  component: Sources,
});

const list = [
  ["Canvas (LMS)", "Syllabi and assignment deadlines", "3 syllabi"],
  ["Student information system", "Transcript, enrollment, section seats", "1 transcript"],
  ["Degree audit", "Northgate requirements and progress", "6 requirements"],
  ["Articulation data", "Course-to-course transfer rules", "2026-27 file"],
  ["Course catalogs", "Bayview and Northgate catalogs, policy manuals", "2 catalogs"],
];

function Sources() {
  return (
    <div>
      <PageHeader title="Connected sources" sub="In a real deployment, the school connects these. Here, every source is a synthetic file." right={<SimLabel>Simulated — no real connections</SimLabel>} />
      <div className="grid gap-4 md:grid-cols-2">
        {list.map(([n, d, c]) => (
          <div key={n} className="flex gap-4 rounded-xl border border-dashed bg-card p-5">
            <Database className="size-6 text-primary" />
            <div>
              <div className="font-semibold">{n}</div>
              <div className="text-sm text-muted-foreground">{d}</div>
              <div className="mt-2 text-xs text-muted-foreground">Simulated · {c}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
