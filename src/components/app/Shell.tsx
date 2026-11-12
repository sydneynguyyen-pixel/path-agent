import { Wallpaper } from "@/components/app/Desktop";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Shuffle, Eye, Pause, Home, CalendarDays, MousePointerClick, Bot, Database, ChevronRight, ChevronDown, UserCheck, UserRound, IdCard, Settings, Compass, Sprout, Target, Waypoints, GraduationCap, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sources, student } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { BrandLogo, Wordmark } from "./Brand";
import mayaPhoto from "@/assets/maya.jpg";
import { Button } from "@/components/ui/button";
import { AgentChat } from "./AgentChat";
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

/** Overview sees everything, School only classes and the degree, Growth only what's beyond class. Agents stands alone. */
const groups = [
  {
    label: "Overview",
    links: [
      { to: "/", label: "Home", icon: Home },
      { to: "/map", label: "Map", icon: Waypoints },
    ],
  },
  {
    label: "School",
    links: [
      { to: "/degree", label: "Degree", icon: GraduationCap },
      { to: "/semester", label: "Terms", icon: CalendarDays },
      { to: "/portal", label: "Registration", icon: MousePointerClick },
    ],
  },
  {
    label: "Growth",
    links: [
      { to: "/career", label: "Career", icon: Target },
      { to: "/explore", label: "Explore", icon: Compass },
    ],
  },
  {
    label: "",
    links: [{ to: "/agents", label: "Agents", icon: Bot }],
  },
] as const;

type NavLink = (typeof groups)[number]["links"][number];
const allLinks: NavLink[] = groups.flatMap((g) => [...g.links] as NavLink[]);
/** Pages without their own nav item light up the one they belong to. */
const sectionFor = (path: string): string => {
  if (path === "/event") return "/semester";
  if (["/activity", "/permissions", "/decisions", "/counselor"].includes(path)) return "/agents";
  return path;
};
const groupOf = (navPath: string) => groups.find((g) => g.links.some((l) => l.to === navPath)) ?? groups[0];
const tabs = [
  { label: "Overview", to: "/", icon: Home, group: "Overview" },
  { label: "School", to: "/degree", icon: GraduationCap, group: "School" },
  { label: "Growth", to: "/career", icon: Sprout, group: "Growth" },
  { label: "Agents", to: "/agents", icon: Bot, group: "" },
] as const;

/** Phone only: the four areas as a bottom tab bar, within thumb reach. */
function BottomTabs({ navPath }: { navPath: string }) {
  const waiting = waitingCount(useEvents());
  const active = groupOf(navPath).label;
  return (
    <nav aria-label="Main" className="bottom-tabs fixed inset-x-3 bottom-3 z-40 md:hidden">
      <GlassBar className="grid w-full grid-cols-4 gap-1 p-1.5">
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
        <DropdownMenuItem asChild><Link to="/career" search={{ tab: "card" }}><IdCard />Your card</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/sources"><Database />Connected sources</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings"><Settings />Settings</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/counselor"><UserCheck />Counselor's side preview</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type Sub = { label: string; to: "/career" | "/explore" | "/agents"; search: Record<string, string>; on: (path: string, q: Record<string, unknown>) => boolean };

/** Pages inside a page get their own indented item under it, so nothing hides behind one button. Views of the same thing (Map's switch) stay toggles. */
function useSubPages(navPath: string): Sub[] {
  const j = useJourney();
  if (navPath === "/career") {
    const main = j.interestedRoles[0];
    return [
      { label: "Goals", to: "/career", search: {}, on: (_, q) => !q["tab"] && !q["plan"] && !q["resume"] },
      { label: "Skills", to: "/career", search: { tab: "skills" }, on: (_, q) => q["tab"] === "skills" || !!q["resume"] },
      { label: "Card", to: "/career", search: { tab: "card" }, on: (_, q) => q["tab"] === "card" },
      ...(main ? [{ label: "Plan", to: "/career" as const, search: { plan: main }, on: (_: string, q: Record<string, unknown>) => !!q["plan"] }] : []),
    ];
  }
  if (navPath === "/explore") return [
    { label: "Events", to: "/explore", search: {}, on: (_, q) => q["view"] !== "people" },
    { label: "People", to: "/explore", search: { view: "people" }, on: (_, q) => q["view"] === "people" },
  ];
  if (navPath === "/agents") return [
    { label: "Activity", to: "/agents", search: {}, on: (p, q) => (p === "/agents" && !q["tab"]) || q["tab"] === "timeline" || (p === "/activity" && q["tab"] !== "decisions") },
    { label: "Your decisions", to: "/agents", search: { tab: "decisions" }, on: (p, q) => q["tab"] === "decisions" || p === "/decisions" },
    { label: "Agent controls", to: "/agents", search: { tab: "controls" }, on: (p, q) => q["tab"] === "controls" || p === "/permissions" },
  ];
  return [];
}

function SubNav({ navPath }: { navPath: string }) {
  const subs = useSubPages(navPath);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const q = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const router = useRouter();
  const navigate = useNavigate();
  if (subs.length === 0) return null;
  return (
    <ul className="sub-nav" aria-label="In this section">
      {subs.map((sub) => {
        const on = sub.on(path, q);
        return (
          <li key={sub.label}>
            {/* A plain anchor: Link marks every loosely matching sub-item as the current page. */}
            <a
              href={router.buildLocation({ to: sub.to, search: sub.search }).href}
              aria-current={on ? "true" : undefined}
              className="sub-nav-link"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                void navigate({ to: sub.to, search: sub.search });
              }}
            >{sub.label}</a>
          </li>
        );
      })}
    </ul>
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
          {collapsed || !g.label ? <div className={cn("h-px bg-border", collapsed ? "mx-auto w-6" : "mx-3")} aria-hidden="true" /> : <div className="px-3 text-xs text-muted-foreground">{g.label}</div>}
          <div className="mt-2 space-y-0.5">
            {g.links.map((l) => (
              <Fragment key={l.to}>
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
              {!collapsed && navPath === l.to && <SubNav navPath={navPath} />}
              </Fragment>
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
  // Home is a desktop: its wallpaper sits behind the whole window.
  const onDesk = path === "/" && j.pathBuilt === true;
  const current = allLinks.find((l) => l.to === navPath);
  const ev = j.evidenceId ? (sources as Record<string, (typeof sources)[keyof typeof sources] | undefined>)[j.evidenceId] : null;

  return (
    <div className={cn("brand-app app-shell min-h-screen md:h-dvh md:min-h-0 md:overflow-hidden", onDesk && "desk-home")}>
      {onDesk && <Wallpaper />}
      <div className="relative flex min-h-screen md:h-full md:min-h-0">
        <aside className={cn("app-sidebar fixed bottom-3 left-3 top-3 z-30 hidden flex-col py-5 md:flex", collapsed ? "w-[72px] px-2" : "w-60 px-3")}>
          <div className={cn("flex items-center gap-2.5", collapsed ? "flex-col px-0" : "px-2")}>
            <BrandLogo className="!size-10" />
            {!collapsed && <Wordmark className="text-[24px]" />}
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
                  <><Pause className="size-3.5" aria-hidden="true" /> Sprout paused</>
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
                <span className="inline-flex items-center gap-1.5 font-medium">
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
            <GlassBar className={cn("ml-auto flex items-center", j.pathBuilt === false && "invisible")}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground">
                    <Shuffle className="size-3" aria-hidden="true" /> Try another path
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Play out what could happen next</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => j.trySeatFills()} className="flex-col items-start gap-0.5">
                    <span className="font-medium">A seat fills while you decide</span>
                    <span className="text-xs text-muted-foreground">MATH 13 fills, and the helpers re-check only what depended on it.</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => j.trySeatFills(true)} className="flex-col items-start gap-0.5">
                    <span className="font-medium">A seat fills while you're away</span>
                    <span className="text-xs text-muted-foreground">Stay on this page. Home tells you what changed.</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => j.tryNeedsNote()} className="flex-col items-start gap-0.5">
                    <span className="font-medium">The helpers need a note from you</span>
                    <span className="text-xs text-muted-foreground">Two options both work, so the Planner asks which matters more.</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="flex-col items-start gap-0.5">
                    <Link to="/agents" search={{ tab: "controls" }}>
                      <span className="font-medium">Turn a helper off</span>
                      <span className="text-xs text-muted-foreground">See what you can still get without it.</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={j.reset} className="reset-spin ml-auto gap-1 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground" title="Reset demo">
                <RotateCcw className="size-3" /> Reset demo
              </Button>
            </GlassBar>
            <div className="md:hidden"><AccountMenu compact /></div>
          </header>
          {/* Keyed by route so each page opens at the top of this scroll area. */}
          <div key={path} className={`app-scroll flex min-h-0 flex-1 flex-col md:overflow-y-auto ${onPortal || onDesk ? "" : "app-canvas"}`}>
            <main className={`app-page relative z-10 flex-1 px-6 py-8 md:px-10 ${onPortal ? "" : "page-stagger"}`}>
              {/* Until hydration we can't tell a new student from a returning one, so show neither. */}
              {j.pathBuilt === null && (blankPage || path === "/") ? null : j.pathBuilt === false && blankPage ? <BlankPage {...blankPage} /> : children}
            </main>
            {/* Room so the phone tab bar never covers the end of a page. */}
            {!onCanvas && <div aria-hidden="true" className="agent-clear" />}
          </div>
        </div>
      </div>

      <BottomTabs navPath={navPath} />
      {!onPortal && <AgentChat />}
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
