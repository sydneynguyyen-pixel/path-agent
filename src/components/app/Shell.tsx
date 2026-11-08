import { useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { RotateCcw, Eye, Pause, Home, CalendarDays, MousePointerClick, Bot, Database, SlidersHorizontal, ChevronRight, UserCheck, UserRound, Settings, GraduationCap } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { sources, student } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { AgentPanel } from "./AgentPanel";
import { useEvents } from "./activityBits";
import { waitingCount } from "@/lib/activity";

const groups = [
  {
    label: "My plan",
    links: [
      { to: "/", label: "Home", icon: Home },
      { to: "/semester", label: "Terms", icon: CalendarDays },
      { to: "/portal", label: "Registration", icon: MousePointerClick },
    ],
  },
  {
    label: "Agent",
    links: [
      { to: "/activity", label: "Activity", icon: Bot },
      { to: "/permissions", label: "Agent controls", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Account",
    links: [
      { to: "/profile", label: "Profile", icon: UserRound },
      { to: "/sources", label: "Connected sources", icon: Database },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

type NavLink = (typeof groups)[number]["links"][number];
const allLinks: NavLink[] = groups.flatMap((g) => [...g.links] as NavLink[]);
const extra = [{ to: "/counselor", label: "Counselor's side", icon: UserCheck }] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const j = useJourney();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onPortal = path === "/portal";
  const waiting = waitingCount(useEvents());

  useEffect(() => {
    if (j.onboarded === false && path !== "/welcome") navigate({ to: "/welcome" });
  }, [j.onboarded, path, navigate]);

  if (path === "/welcome") return <>{children}</>;

  const current = [...allLinks, ...extra].find((l) => l.to === path) ?? allLinks[0]!;
  const ev = j.evidenceId ? (sources as Record<string, (typeof sources)[keyof typeof sources] | undefined>)[j.evidenceId] : null;
  const anyOff = Object.values(j.agentOn).some((v) => !v);

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
                      {l.to === "/activity" && waiting > 0 && (
                        <span title={`${waiting} thing${waiting > 1 ? "s" : ""} waiting for you`} aria-label={`${waiting} waiting for you`} className="ml-auto grid size-5 place-items-center rounded-full bg-warning text-[10px] text-primary-foreground">{waiting}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="border-t pt-5">
              <div className="px-3 text-xs text-muted-foreground">Preview</div>
              <Link
                to="/counselor"
                className="mt-2 flex items-center gap-3 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/60"
                activeProps={{ className: "bg-sidebar-accent font-medium text-foreground shadow-soft" }}
              >
                <UserCheck className="size-4" /> Counselor's side
                {j.emailSent && !j.counselor && <span className="ml-auto grid size-5 place-items-center rounded-full bg-warning text-[10px] text-primary-foreground">1</span>}
              </Link>
            </div>
          </nav>

          <div className="space-y-4">
            <Link to="/permissions" className="flex items-center gap-2 rounded-2xl border bg-card/70 px-3 py-2.5 text-xs">
              {j.paused ? (
                <><Pause className="size-3.5" /> All agents paused</>
              ) : (
                <><span className="size-2 rounded-full bg-success animate-pulse-dot" /><Eye className="size-3.5" /> {anyOff ? "Some agents off" : "Watching registration only"}</>
              )}
            </Link>
            <Link to="/profile" className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-sidebar-accent/60">
              <div className="grid size-9 place-items-center rounded-full bg-lilac text-sm font-semibold text-accent-foreground">MT</div>
              <div className="text-sm leading-tight">
                <div className="font-medium">{student.name}</div>
                <div className="text-xs text-muted-foreground">Transfer student</div>
              </div>
            </Link>
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

      {!onPortal && <AgentPanel />}

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
