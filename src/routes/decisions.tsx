import { createFileRoute } from "@tanstack/react-router";
import { useJourney } from "@/lib/journey";
import { PageHeader, SourceChip } from "@/components/app/bits";

export const Route = createFileRoute("/decisions")({
  head: () => ({
    meta: [
      { title: "Decision log — Academic Path Agent" },
      { name: "description", content: "Every approval: who, what, when, and the evidence behind it." },
      { property: "og:title", content: "Decision log — Academic Path Agent" },
      { property: "og:description", content: "A transparent record of every human approval." },
    ],
  }),
  component: Decisions,
});

function Decisions() {
  const { decisions } = useJourney();
  return (
    <div>
      <PageHeader title="Decision log" sub="Every choice and approval made by a named person. The agent never approves anything itself." />
      {decisions.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No decisions yet.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs text-muted-foreground">
              <tr><th className="p-3">When</th><th>Who</th><th>What</th><th className="pr-3">Evidence</th></tr>
            </thead>
            <tbody>
              {decisions.map((d) => (
                <tr key={d.id} className="border-t align-top">
                  <td className="p-3 whitespace-nowrap">{d.when.toLocaleString()}</td>
                  <td className="py-3">{d.who}</td>
                  <td className="py-3">{d.what}</td>
                  <td className="py-3 pr-3"><div className="flex flex-wrap gap-1">{d.evidence.map((e) => <SourceChip key={e} id={e} />)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
