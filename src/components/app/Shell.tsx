import { useEffect, useRef, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { RotateCcw, Eye, Pause, Home, CalendarDays, MousePointerClick, Bot, Database, SlidersHorizontal, ChevronRight, UserCheck, UserRound, Settings, GraduationCap, BookOpenCheck, Compass, Split } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { sources, student } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { BrandLogo, AgentAvatar } from "./Brand";
import mayaPhoto from "@/assets/maya.jpg";
import { Button } from "@/components/ui/button";
import { AgentPanel } from "./AgentPanel";
import { BlankPage, blankPages } from "./BlankState";
import { useEvents } from "./activityBits";
import { waitingCount } from "@/lib/activity";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
import { useLiquidGlass } from "@/hooks/use-liquid-glass";
import { cn } from "@/lib/utils";
import { Roll } from "./Roll";

const groups = [
  {
    label: "Stay on track",
    links: [
      { to: "/", label: "Home", icon: Home },
      { to: "/semester", label: "Terms", icon: CalendarDays },
      { to: "/what-if", label: "What if", icon: Split },
      { to: "/portal", label: "Registration", icon: MousePointerClick },
    ],
  },
  {
    label: "Explore",
    links: [
      { to: "/explore", label: "Opportunities", icon: Compass },
      { to: "/skills", label: "Skills", icon: BookOpenCheck },
    ],
  },
  {
    label: "Path Agent",
    links: [
      { to: "/activity", label: "Activity", icon: Bot },
      { to: "/permissions", label: "Controls", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Account",
    links: [
      { to: "/profile", label: "Profile", icon: UserRound },
      { to: "/sources", label: "Your sources", icon: Database },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

type NavLink = (typeof groups)[number]["links"][number];
const allLinks: NavLink[] = groups.flatMap((g) => [...g.links] as NavLink[]);
const extra = [{ to: "/counselor", label: "Counselor's side", icon: UserCheck }] as const;

/** A floating pill of real glass. Page content scrolls underneath and bends at its edges. */
function GlassBar({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLiquidGlass(ref, { bezel: 9, scale: 18, blur: 3.5, saturate: 1.7 });
  return <div ref={ref} className={cn("glass-bar glass", className)}>{children}</div>;
}

function SidebarNav({ navPath }: { navPath: string }) {
  const j = useJourney();
  const waiting = waitingCount(useEvents());
  const { containerRef, pillRef } = useSlidingPill<HTMLElement>('[aria-current="page"]');
  const badge = "ml-auto grid size-5 place-items-center rounded-full bg-warning text-[10px] text-primary-foreground";

  return (
    <nav ref={containerRef} className="relative mt-8 min-h-0 flex-1 space-y-7 overflow-y-auto pb-4 [scrollbar-width:none]">
      <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
      {groups.map((g) => (
        <div key={g.label}>
          <div className="px-3 text-xs text-muted-foreground">{g.label}</div>
          <div className="mt-2 space-y-0.5">
            {g.links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="nav-link relative z-[1] flex items-center gap-3 rounded-full px-3 py-2 text-sm text-sidebar-foreground"
                aria-current={navPath === l.to ? "page" : undefined}
              >
                <l.icon className="size-4" />
                {l.label}
                {l.to === "/activity" && waiting > 0 && (
                  <span title={`${waiting} thing${waiting > 1 ? "s" : ""} waiting for you`} aria-label={`${waiting} waiting for you`} className={badge}><Roll value={waiting} /></span>
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
          className="nav-link relative z-[1] mt-2 flex items-center gap-3 rounded-full px-3 py-2 text-sm text-muted-foreground"
          aria-current={navPath === "/counselor" ? "page" : undefined}
        >
          <UserCheck className="size-4" /> Counselor's side
          {j.emailSent && !j.counselor && <span className={badge}>1</span>}
        </Link>
      </div>
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const j = useJourney();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onPortal = path === "/portal";
  const blankPage = blankPages[path];
  // The location changes before the next page has loaded. Follow the rendered route so leaving /welcome doesn't remount it.
  const welcomeOnScreen = useRouterState({ select: (s) => s.matches.some((m) => m.routeId === "/welcome") });

  useEffect(() => {
    if (j.onboarded === false && path !== "/welcome") navigate({ to: "/welcome" });
  }, [j.onboarded, path, navigate]);

  if (welcomeOnScreen) return <>{children}</>;

  const navPath = path === "/course-skills" || path === "/skills-export" ? "/skills" : path;
  const current = [...allLinks, ...extra].find((l) => l.to === navPath) ?? allLinks[0];
  const ev = j.evidenceId ? (sources as Record<string, (typeof sources)[keyof typeof sources] | undefined>)[j.evidenceId] : null;

  return (
    <div className="brand-app app-shell min-h-screen p-3 md:h-dvh md:min-h-0 md:overflow-hidden md:p-5">
      <div className="relative flex min-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[2rem] border bg-card shadow-frame md:h-full md:min-h-0">
        <div className="shell-aura" aria-hidden="true" />
        <aside className="relative z-10 hidden w-64 shrink-0 flex-col px-4 py-6 md:flex">
          <div className="flex items-center gap-2.5 px-2">
            <BrandLogo />
            <span className="font-semibold tracking-tight">Path Agent</span>
          </div>

          <SidebarNav navPath={navPath} />

          <div className="mt-3 space-y-4">
            {(j.paused || j.watchingRegistration) && (
              <Link to="/permissions" className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2.5 text-xs">
                {j.paused ? (
                  <><Pause className="size-3.5" aria-hidden="true" /> Path Agent paused</>
                ) : (
                  <><span className="size-2 rounded-full bg-success animate-pulse-dot" /><Eye className="size-3.5" aria-hidden="true" /> Watching registration only</>
                )}
              </Link>
            )}
            <Link to="/profile" className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-foreground/5">
              <img src={mayaPhoto} alt="" className="size-9 rounded-full object-cover" />
              <div className="text-sm leading-tight">
                <div className="font-medium">{student.name}</div>
                <div className="text-xs text-muted-foreground">Transfer student</div>
              </div>
            </Link>
          </div>
        </aside>

        <div className="app-panel relative z-[1] m-2 flex min-w-0 flex-1 flex-col rounded-[2rem] border bg-card md:ml-0 md:min-h-0 md:overflow-hidden">
          <header className="app-header flex items-center gap-3 border-b px-6 py-4 text-sm">
            <GlassBar>
              <span className="text-muted-foreground">Maya</span>
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <span key={current?.to} className="swap-enter inline-flex items-center gap-1.5 font-medium">
                {current && <><current.icon className="size-4" /> {current.label}</>}
              </span>
            </GlassBar>
            <nav className="ml-4 flex gap-1 overflow-x-auto md:hidden">
              {allLinks.map((l) => (
                <Link key={l.to} to={l.to} className="rounded-full px-2 py-1 text-xs text-muted-foreground" activeProps={{ className: "bg-primary text-primary-foreground" }} activeOptions={{ exact: true, includeSearch: false }}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <GlassBar className={cn("ml-auto", j.pathBuilt === false && "invisible")}>
              <Button variant="ghost" size="sm" onClick={j.reset} className="reset-spin ml-auto gap-1 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground" title="Reset demo">
                <RotateCcw className="size-3" /> Reset demo
              </Button>
            </GlassBar>
          </header>
          {/* Keyed by route so each page opens at the top of this scroll area. */}
          <div key={path} className={`app-scroll flex min-h-0 flex-1 flex-col md:overflow-y-auto ${onPortal ? "" : "app-canvas"}`}>
            <main className={`app-page relative z-10 flex-1 px-6 py-8 md:px-10 ${onPortal ? "" : "page-stagger"}`}>
              {/* Until hydration we can't tell a new student from a returning one, so show neither. */}
              {j.pathBuilt === null && (blankPage || path === "/") ? null : j.pathBuilt === false && blankPage ? <BlankPage {...blankPage} /> : children}
            </main>
            <footer className="px-6 pb-6 text-xs text-muted-foreground md:px-10">
              Prototype with fully synthetic data. Fictional schools and student. Path Agent proposes and drafts; it never registers, enrolls, or sends.
              It does not give legal, financial-aid, or immigration advice.
            </footer>
          </div>
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
                <p className="mt-4 text-xs text-muted-foreground">Synthetic document</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
