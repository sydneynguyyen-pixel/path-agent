import { Link } from "@tanstack/react-router";
import { RotateCcw, Eye, Pause } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { sources } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { AgentPanel } from "./AgentPanel";

const links = [
  { to: "/", label: "Degree" },
  { to: "/semester", label: "Semester" },
  { to: "/portal", label: "Registration" },
  { to: "/activity", label: "Agent activity" },
  { to: "/decisions", label: "Decision log" },
  { to: "/sources", label: "Sources" },
  { to: "/permissions", label: "Permissions" },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const j = useJourney();
  const ev = j.evidenceId ? (sources as Record<string, (typeof sources)[keyof typeof sources] | undefined>)[j.evidenceId] : null;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Link to="/" className="font-serif text-lg font-semibold text-primary">
            Academic Path Agent
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
                activeOptions={{ exact: true }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <Link to="/permissions" className="inline-flex items-center gap-1.5">
              {j.paused ? (
                <><Pause className="size-3.5" /> Paused</>
              ) : (
                <><span className="size-2 rounded-full bg-success animate-pulse-dot" /><Eye className="size-3.5" /> Watching</>
              )}
            </Link>
            <button onClick={j.reset} className="inline-flex items-center gap-1 opacity-60 hover:opacity-100" title="Reset demo">
              <RotateCcw className="size-3" /> Reset demo
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-muted-foreground">
        Prototype with fully synthetic data. Fictional schools and student. The agent proposes and drafts; it never registers, enrolls, or sends.
        It does not give legal, financial-aid, or immigration advice.
      </footer>

      <AgentPanel />

      <Sheet open={!!ev} onOpenChange={(o) => !o && j.openEvidence(null)}>
        <SheetContent side="right" className="z-[60] sm:max-w-md">
          {ev && (
            <>
              <SheetHeader>
                <SheetDescription>{ev.school}</SheetDescription>
                <SheetTitle className="font-serif">{ev.doc}</SheetTitle>
              </SheetHeader>
              <div className="px-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{ev.section}</div>
                <blockquote className="mt-3 border-l-4 border-primary bg-secondary p-4 font-serif text-base leading-relaxed">
                  “{ev.passage}”
                </blockquote>
                <p className="mt-4 text-xs text-muted-foreground">Synthetic document · shown exactly as the Reader extracted it.</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
