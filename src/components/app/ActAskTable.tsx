import { cn } from "@/lib/utils";

type Level = "acts" | "drafts" | "asks" | "never";
const COLS: { id: Level; label: string }[] = [
  { id: "acts", label: "Acts on its own" },
  { id: "drafts", label: "Drafts for you" },
  { id: "asks", label: "Asks you first" },
  { id: "never", label: "Never" },
];
/** What Sprout may do, by what's at stake. "Never" is enforced in code, not by the model. */
export const ACT_ASK: { action: string; level: Level }[] = [
  { action: "Read your records and the class list", level: "acts" },
  { action: "Re-check when a seat fills or a rule changes", level: "acts" },
  { action: "Recommend a class", level: "drafts" },
  { action: "Write your counselor an email", level: "drafts" },
  { action: "Choose between two options that both work", level: "asks" },
  { action: "Register, drop, join a waitlist, send anything", level: "never" },
];

export function ActAskTable() {
  return (
    <section aria-labelledby="act-ask" className="surface p-5 sm:p-6">
      <h2 id="act-ask" className="text-lg font-semibold">When Sprout acts, and when it asks</h2>
      <p className="mt-1 text-sm text-muted-foreground">Decided by what's at stake: if someone else would see it, or it can't be undone, you decide.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="py-2.5 pr-4 font-medium">Action</th>
              {COLS.map((c) => <th key={c.id} scope="col" className="px-2 py-2.5 text-center font-medium">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {ACT_ASK.map((r) => (
              <tr key={r.action} className="border-t">
                <th scope="row" className="py-3 pr-4 text-left font-normal">{r.action}</th>
                {COLS.map((c) => {
                  const on = r.level === c.id;
                  return (
                    <td key={c.id} className="px-2 py-3 text-center">
                      <span aria-hidden="true" className={cn("inline-block size-2.5 rounded-full", on ? (c.id === "never" ? "bg-alert" : "bg-foreground") : "border border-muted-foreground/40")} />
                      {on && <span className="sr-only">{c.label}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
