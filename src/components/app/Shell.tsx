import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Eye, Pause, Home, CalendarDays, MousePointerClick, Bot, Database, ChevronRight, ChevronDown, UserCheck, UserRound, Settings, BookOpenCheck, Compass, Sprout, Waypoints, GraduationCap, CalendarHeart, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sources, student } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { BrandLogo } from "./Brand";
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
import { ClassDetails } from "./ClassDetails";
import { OpportunityDetails } from "./OpportunityDetails";

declare module "@tanstack/history" {
  interface HistoryState {
    /** Set when a page was opened from the Map, so it can offer the way back. */
    backTo?: "map";
  }
}

const groups = [
  {
    label: "Path",
    links: [
      { to: "/", label: "Home", icon: Home },
      { to: "/map", label: "Map", icon: Waypoints },
      { to: "/degree", label: "Degree", icon: GraduationCap },
      { to: "/semester", label: "Terms", icon: CalendarDays },
      { to: "/portal", label: "Registration", icon: MousePointerClick },
    ],
  },
  {
    label: "Grow",
    links: [
      { to: "/explore", label: "Explore", icon: Compass },
      { to: "/events", label: "Events", icon: CalendarHeart },
      { to: "/portfolio", label: "Portfolio", icon: BookOpenCheck },
    ],
  },
  {
    label: "Path Agent",
    links: [{ to: "/agents", label: "Agents", icon: Bot }],
  },
] as const;

type NavLink = (typeof groups)[number]["links"][number];
const allLinks: NavLink[] = groups.flatMap((g) => [...g.links] as NavLink[]);
/** Pages without their own nav item light up the one they belong to. */
const sectionFor = (path: string): string => {
  if (path === "/event") return "/events";
  if (["/activity", "/permissions", "/decisions", "/counselor"].includes(path)) return "/agents";
  return path;
};
const groupOf = (navPath: string) => groups.find((g) => g.links.some((l) => l.to === navPath)) ?? groups[0];
const tabs = [
  { label: "Path", to: "/", icon: Home, group: "Path" },
  { label: "Grow", to: "/portfolio", icon: Sprout, group: "Grow" },
  { label: "Agents", to: "/agents", icon: Bot, group: "Path Agent" },
] as const;

/** Phone only: the three areas as a bottom tab bar, within thumb reach. */
function BottomTabs({ navPath }: { navPath: string }) {
  const waiting = waitingCount(useEvents());
  const active = groupOf(navPath).label;
  return (
    <nav aria-label="Main" className="bottom-tabs fixed inset-x-3 bottom-3 z-40 md:hidden">
      <GlassBar className="grid w-full grid-cols-3 gap-1 p-1.5">
        {tabs.map((t) => (
          <Link key={t.to} to={t.to} aria-current={active === t.group ? "page" : undefined} className={cn("relative flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] text-muted-foreground", active === t.group && "glass-active font-medium text-foreground")}>
            <t.icon className="size-5" aria-hidden="true" />
            {t.label}
            {t.to === "/agents" && waiting > 0 && <span aria-label={`${waiting} waiting for you`} className="absolute right-[28%] top-0.5 grid size-4 place-items-center rounded-full count-badge text-[9px]">{waiting}</span>}
          </Link>
        ))}
      </GlassBar>
    </nav>
  );
}
const badge = "ml-auto grid size-5 place-items-center rounded-full count-badge text-[10px]";

/** A floating pill of real glass. Page content scrolls underneath and bends at its edges. */
function GlassBar({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLiquidGlass(ref, { bezel: 9, scale: 18, blur: 3.5, saturate: 1.7 });
  return <div ref={ref} className={cn("glass-bar glass", className)}>{children}</div>;
}

function AccountMenu({ compact = false }: { compact?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button aria-label="Open Maya's account menu" className={compact ? "flex shrink-0 items-center gap-1 rounded-full p-0.5 hover:bg-foreground/5" : "flex w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left hover:bg-foreground/5"}>
          <img src={mayaPhoto} alt="" className="size-9 rounded-full object-cover" />
          {!compact && <><div className="min-w-0 flex-1 text-sm leading-tight"><div className="font-medium">{student.name}</div><div className="text-xs text-muted-foreground">Transfer student</div></div><ChevronDown className="size-4 text-muted-foreground" /></>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel>{student.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/profile"><UserRound />Profile</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/sources"><Database />Connected sources</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings"><Settings />Settings</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/counselor"><UserCheck />Counselor's side preview</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarNav({ navPath, collapsed }: { navPath: string; collapsed: boolean }) {
  const waiting = waitingCount(useEvents());
  const { containerRef, pillRef } = useSlidingPill<HTMLElement>('[aria-current="page"]');
  return (
    <nav ref={containerRef} aria-label="Main" className="relative mt-8 min-h-0 flex-1 space-y-7 overflow-y-auto pb-4 [scrollbar-width:none]">
      <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
      {groups.map((g) => (
        <div key={g.label}>
          {collapsed ? <div className="mx-auto h-px w-6 bg-border" aria-hidden="true" /> : <div className="px-3 text-xs text-muted-foreground">{g.label}</div>}
          <div className="mt-2 space-y-0.5">
            {g.links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn("nav-link relative z-[1] flex items-center gap-3 rounded-full py-2 text-sm text-sidebar-foreground", collapsed ? "justify-center px-0 py-2.5" : "px-3")}
                aria-current={navPath === l.to ? "page" : undefined}
                aria-label={collapsed ? l.label : undefined}
                title={collapsed ? l.label : undefined}
              >
                <l.icon className="size-4" />
                {!collapsed && l.label}
                {l.to === "/agents" && waiting > 0 && (
                  <span title={`${waiting} thing${waiting > 1 ? "s" : ""} waiting for you`} aria-label={`${waiting} waiting for you`} className={collapsed ? "absolute right-1.5 top-0.5 grid size-4 place-items-center rounded-full count-badge text-[9px]" : badge}><Roll value={waiting} /></span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

const NAV_KEY = "pa-nav-collapsed";

/** Wide screens: the sidebar can shrink to icons. Remembered in this browser; read after hydration. */
function useNavCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(NAV_KEY) === "1"); } catch { /* storage blocked: stay open */ }
  }, []);
  useEffect(() => {
    document.documentElement.dataset["nav"] = collapsed ? "collapsed" : "open";
  }, [collapsed]);
  // Saved only when she toggles, so a remount can't overwrite her choice before it's read.
  const set = (next: boolean) => {
    setCollapsed(next);
    try { localStorage.setItem(NAV_KEY, next ? "1" : "0"); } catch { /* ignore */ }
  };
  return [collapsed, set] as const;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const j = useJourney();
  const navigate = useNavigate();
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const backTo = useRouterState({ select: (s) => s.location.state.backTo });
  const onPortal = path === "/portal";
  const blankPage = blankPages[path];
  const onCanvas = (path === "/map" || path === "/degree") && j.pathBuilt === true;
  const welcomeOnScreen = useRouterState({ select: (s) => s.matches.some((m) => m.routeId === "/welcome") });
  const [collapsed, setCollapsed] = useNavCollapsed();

  useEffect(() => {
    if (j.onboarded === false && path !== "/welcome") navigate({ to: "/welcome" });
  }, [j.onboarded, path, navigate]);

  if (welcomeOnScreen) return <>{children}</>;

  const navPath = sectionFor(path);
  const current = allLinks.find((l) => l.to === navPath);
  const ev = j.evidenceId ? (sources as Record<string, (typeof sources)[keyof typeof sources] | undefined>)[j.evidenceId] : null;

  return (
    <div className="brand-app app-shell min-h-screen md:h-dvh md:min-h-0 md:overflow-hidden">
      <div className="relative flex min-h-screen md:h-full md:min-h-0">
        <aside className={cn("app-sidebar fixed bottom-3 left-3 top-3 z-30 hidden flex-col py-5 md:flex", collapsed ? "w-[72px] px-2" : "w-60 px-3")}>
          <div className={cn("flex items-center gap-2.5", collapsed ? "flex-col px-0" : "px-2")}>
            <BrandLogo />
            {!collapsed && <span className="font-semibold tracking-tight">Path Agent</span>}
            <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={cn("grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground", !collapsed && "ml-auto")}>
              {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
            </button>
          </div>

          {/* Remounts on toggle so the sliding pill re-measures the new link sizes. */}
          <SidebarNav key={collapsed ? "c" : "e"} navPath={navPath} collapsed={collapsed} />

          <div className="mt-3 space-y-4">
            {!collapsed && (j.paused || j.watchingRegistration) && (
              <Link to="/agents" search={{ tab: "controls" }} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2.5 text-xs">
                {j.paused ? (
                  <><Pause className="size-3.5" aria-hidden="true" /> Path Agent paused</>
                ) : (
                  <><span className="size-2 rounded-full bg-success animate-pulse-dot" /><Eye className="size-3.5" aria-hidden="true" /> Watching registration only</>
                )}
              </Link>
            )}
            {collapsed ? <div className="flex justify-center"><AccountMenu compact /></div> : <AccountMenu />}
          </div>
        </aside>

        <div className={cn("app-panel relative z-[1] flex min-w-0 flex-1 flex-col md:min-h-0 md:overflow-hidden", onCanvas && "app-panel-full")}>
          <header className="app-header flex items-center gap-2 border-b px-4 py-3 text-sm md:gap-3 md:px-6 md:py-4">
            <div className="hidden md:block">
              <GlassBar>
                <span className="text-muted-foreground">Maya</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
                <span key={current?.to} className="swap-enter inline-flex items-center gap-1.5 font-medium">
                  {current && <><current.icon className="size-4" /> {current.label}</>}
                </span>
              </GlassBar>
            </div>
            {backTo === "map" && path !== "/map" && (
              <GlassBar className="back-chip">
                <button type="button" onClick={() => router.history.back()} className="inline-flex items-center gap-1.5 text-xs font-medium"><ArrowLeft className="size-3.5" aria-hidden="true" />Back to Map</button>
              </GlassBar>
            )}
            <nav aria-label="Section" className="-ml-2 flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] md:hidden">
              {groupOf(navPath).links.length > 1 && groupOf(navPath).links.map((l) => (
                <Link key={l.to} to={l.to} className="rounded-full px-2 py-1 text-xs text-muted-foreground" activeProps={{ className: "glass-active" }} activeOptions={{ exact: true, includeSearch: false }}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <GlassBar className={cn("ml-auto", j.pathBuilt === false && "invisible")}>
              <Button variant="ghost" size="sm" onClick={j.reset} className="reset-spin ml-auto gap-1 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground" title="Reset demo">
                <RotateCcw className="size-3" /> Reset demo
              </Button>
            </GlassBar>
            <div className="md:hidden"><AccountMenu compact /></div>
          </header>
          {/* Keyed by route so each page opens at the top of this scroll area. */}
          <div key={path} className={`app-scroll flex min-h-0 flex-1 flex-col md:overflow-y-auto ${onPortal ? "" : "app-canvas"}`}>
            <main className={`app-page relative z-10 flex-1 px-6 py-8 md:px-10 ${onPortal ? "" : "page-stagger"}`}>
              {/* Until hydration we can't tell a new student from a returning one, so show neither. */}
              {j.pathBuilt === null && (blankPage || path === "/") ? null : j.pathBuilt === false && blankPage ? <BlankPage {...blankPage} /> : children}
            </main>
            {!onCanvas && (
              <footer className="px-6 pb-28 text-xs md:pb-6 text-muted-foreground md:px-10">
                Prototype with fully synthetic data. Fictional schools and student. Path Agent proposes and drafts; it never registers, enrolls, or sends.
                It does not give legal, financial-aid, or immigration advice.
              </footer>
            )}
          </div>
        </div>
      </div>

      <BottomTabs navPath={navPath} />
      {!onPortal && <AgentPanel />}
      <ClassDetails />
      <OpportunityDetails />
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
