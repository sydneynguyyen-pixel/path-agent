import { Link, useRouterState } from "@tanstack/react-router";
import { RotateCcw, Eye, Pause, GraduationCap, CalendarDays, MousePointerClick, Bot, ScrollText, Database, ShieldCheck, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { sources, student } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { AgentPanel } from "./AgentPanel";

const groups = [
  {
    label: "Main menu",
    links: [
      { to: "/", label: "Degree", icon: GraduationCap },
      { to: "/semester", label: "Semester", icon: CalendarDays },
      { to: "/portal", label: "Registration", icon: MousePointerClick },
    ],
  },
  {
    label: "Agent",
    links: [
      { to: "/activity", label: "Agent activity", icon: Bot },
      { to: "/decisions", label: "Decision log", icon: ScrollText },
    ],
  },
  {
    label: "Settings",
    links: [
      { to: "/sources", label: "Connected sources", icon: Database },
      { to: "/permissions", label: "Permissions", icon: ShieldCheck },
    ],
  },
] as const;

type NavLink = (typeof groups)[number]["links"][number];
const allLinks: NavLink[] = groups.flatMap((g) => [...g.links] as NavLink[]);

export function Shell({ children }: { children: React.ReactNode }) {
  const j = useJourney();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = allLinks.find((l) => l.to === path) ?? allLinks[0]!;
  const ev = j.evidenceId ? (sources as Record<string, (typeof sources)[keyof typeof sources] | undefined>)[j.evidenceId] : null;

  return (
    <div className="min-h-screen p-3 md:p-5">
      <div className="flex min-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[1.75rem] border bg-sidebar-gradient shadow-frame">
        <aside className="hidden w-64 shrink-0 flex-col px-4 py-6 md:flex">
          <div className="flex items-center gap-2.5 px-2">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </div>
            <span className="font-semibold tracking-tight">Path Agent</span>
          </div>

          <nav className="mt-8 flex-1 space-y-7">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="px-3 text-xs text-muted-foreground">{g.label}</div>
                <div className="mt-2 space-y-0.5">
                  {g.links.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className="flex items-center gap-3 rounded-full px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
                      activeProps={{ className: "bg-sidebar-accent font-medium shadow-soft" }}
                      activeOptions={{ exact: true }}
                    >
                      <l.icon className="size-4" />
                      {l.label}
                      {l.to === "/decisions" && j.decisions.length > 0 && (
                        <span className="ml-auto grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">{j.decisions.length}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="space-y-4">
            <Link to="/permissions" className="flex items-center gap-2 rounded-2xl border bg-card/70 px-3 py-2.5 text-xs">
              {j.paused ? (
                <><Pause className="size-3.5" /> Agent paused</>
              ) : (
                <><span className="size-2 rounded-full bg-success animate-pulse-dot" /><Eye className="size-3.5" /> Watching registration only</>
              )}
            </Link>
            <div>
              <div className="px-3 text-xs text-muted-foreground">Account</div>
              <div className="mt-2 flex items-center gap-3 px-2">
                <div className="grid size-9 place-items-center rounded-full bg-lilac text-sm font-semibold text-accent-foreground">MT</div>
                <div className="text-sm leading-tight">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-xs text-muted-foreground">Transfer student · synthetic</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="m-2 flex min-w-0 flex-1 flex-col rounded-[1.4rem] border bg-card md:ml-0">
          <header className="flex items-center gap-3 border-b px-6 py-4 text-sm">
            <span className="text-muted-foreground">Maya</span>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="inline-flex items-center gap-1.5 font-medium">
              <current.icon className="size-4" /> {current.label}
            </span>
            <nav className="ml-4 flex gap-1 overflow-x-auto md:hidden">
              {allLinks.map((l) => (
                <Link key={l.to} to={l.to} className="rounded-full px-2 py-1 text-xs text-muted-foreground" activeProps={{ className: "bg-primary text-primary-foreground" }} activeOptions={{ exact: true }}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <button onClick={j.reset} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground opacity-60 hover:opacity-100" title="Reset demo">
              <RotateCcw className="size-3" /> Reset demo
            </button>
          </header>
          <main className="flex-1 px-6 py-8 md:px-10">{children}</main>
          <footer className="px-6 pb-6 text-xs text-muted-foreground md:px-10">
            Prototype with fully synthetic data. Fictional schools and student. The agent proposes and drafts; it never registers, enrolls, or sends.
            It does not give legal, financial-aid, or immigration advice.
          </footer>
        </div>
      </div>

      <AgentPanel />

      <Sheet open={!!ev} onOpenChange={(o) => !o && j.openEvidence(null)}>
        <SheetContent side="right" className="z-[60] sm:max-w-md">
          {ev && (
            <>
              <SheetHeader>
                <SheetDescription>{ev.school}</SheetDescription>
                <SheetTitle>{ev.doc}</SheetTitle>
              </SheetHeader>
              <div className="px-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{ev.section}</div>
                <blockquote className="mt-3 rounded-2xl bg-secondary p-4 text-base leading-relaxed">“{ev.passage}”</blockquote>
                <p className="mt-4 text-xs text-muted-foreground">Synthetic document · shown exactly as the Reader extracted it.</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
