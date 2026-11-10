import { useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { RotateCcw, Eye, Pause, Home, Bot, Database, ChevronRight, UserCheck, UserRound, Settings, Sprout, ChevronDown } from "lucide-react";
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

const links = [
  { to: "/", label: "Path", icon: Home },
  { to: "/grow", label: "Grow", icon: Sprout },
  { to: "/agents", label: "Agents", icon: Bot },
] as const;

type NavPath = "/" | "/grow" | "/agents";
const sectionFor = (path: string): NavPath => {
  if (["/grow", "/skills", "/course-skills", "/skills-export", "/event"].includes(path)) return "/grow";
  if (["/agents", "/activity", "/permissions", "/decisions", "/counselor"].includes(path)) return "/agents";
  return "/";
};

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

function SidebarNav({ navPath }: { navPath: NavPath }) {
  const waiting = waitingCount(useEvents());
  const { containerRef, pillRef } = useSlidingPill<HTMLElement>('[aria-current="page"]');
  return (
    <nav ref={containerRef} aria-label="Main" className="relative mt-10 space-y-1">
      <span ref={pillRef} className="sliding-pill bg-secondary" aria-hidden="true" />
      {links.map((l) => (
        <Link key={l.to} to={l.to} className="nav-link relative z-[1] flex items-center gap-3 rounded-full px-3 py-2.5 text-sm text-sidebar-foreground" aria-current={navPath === l.to ? "page" : undefined}>
          <l.icon className="size-4" />{l.label}
          {l.to === "/agents" && waiting > 0 && <span title={`${waiting} waiting for you`} aria-label={`${waiting} waiting for you`} className="ml-auto grid size-5 place-items-center rounded-full bg-warning text-[10px] text-primary-foreground">{waiting}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const j = useJourney();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onPortal = path === "/portal";
  const blankPage = blankPages[path];
  const welcomeOnScreen = useRouterState({ select: (s) => s.matches.some((m) => m.routeId === "/welcome") });

  useEffect(() => {
    if (j.onboarded === false && path !== "/welcome") navigate({ to: "/welcome" });
  }, [j.onboarded, path, navigate]);

  if (welcomeOnScreen) return <>{children}</>;

  const navPath = sectionFor(path);
  const current = links.find((l) => l.to === navPath)!;
  const ev = j.evidenceId ? (sources as Record<string, (typeof sources)[keyof typeof sources] | undefined>)[j.evidenceId] : null;
  const anyOff = Object.values(j.agentOn).some((v) => !v);

  return (
    <div className="brand-app min-h-screen p-3 md:h-dvh md:min-h-0 md:overflow-hidden md:p-5">
      <div className="relative flex min-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[2rem] border bg-card shadow-frame md:h-full md:min-h-0">
        <aside className="relative z-10 hidden w-56 shrink-0 flex-col px-4 py-6 md:flex">
          <div className="flex items-center gap-2.5 px-2"><BrandLogo /><span className="font-semibold tracking-tight">Path Agent</span></div>
          <SidebarNav navPath={navPath} />
          <div className="mt-auto space-y-4">
            <Link to="/agents" search={{ tab: "controls" }} className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2.5 text-xs">
              {j.paused ? <><Pause className="size-3.5" /> All agents paused</> : <><span className="size-2 rounded-full bg-success animate-pulse-dot" /><Eye className="size-3.5" /> {j.pathBuilt === false ? "Ready when you are" : anyOff ? "Some agents off" : "Watching registration only"}</>}
            </Link>
            <AccountMenu />
          </div>
        </aside>

        <div className="m-2 flex min-w-0 flex-1 flex-col rounded-[2rem] border bg-card md:ml-0 md:min-h-0 md:overflow-hidden">
          <header className="flex items-center gap-2 border-b px-4 py-3 text-sm md:px-6 md:py-4">
            <span className="hidden text-muted-foreground sm:inline">Maya</span><ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" />
            <span className="hidden items-center gap-1.5 font-medium sm:inline-flex"><current.icon className="size-4" /> {current.label}</span>
            <nav aria-label="Main mobile" className="flex min-w-0 gap-1 overflow-x-auto md:hidden">
              {links.map((l) => <Link key={l.to} to={l.to} className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground" activeProps={{ className: "bg-primary text-primary-foreground" }} activeOptions={{ exact: true, includeSearch: false }}><l.icon className="size-3.5" />{l.label}</Link>)}
            </nav>
            <Button variant="ghost" size="sm" onClick={j.reset} className={`ml-auto gap-1 text-xs text-muted-foreground opacity-60 hover:opacity-100${j.pathBuilt === false ? " invisible" : ""}`} title="Reset demo"><RotateCcw className="size-3" /><span className="hidden lg:inline">Reset demo</span></Button>
            <div className="md:hidden"><AccountMenu compact /></div>
          </header>
          <div key={path} className="flex min-h-0 flex-1 flex-col md:overflow-y-auto">
            <main className={`app-page relative z-10 flex-1 px-6 py-8 md:px-10${onPortal ? "" : " page-stagger"}`}>
              {j.pathBuilt === null && (blankPage || path === "/") ? null : j.pathBuilt === false && blankPage ? <BlankPage {...blankPage} /> : children}
            </main>
            <footer className="px-6 pb-6 text-xs text-muted-foreground md:px-10">Prototype with fully synthetic data. Fictional schools and student. The agent proposes and drafts; it never registers, enrolls, or sends. It does not give legal, financial-aid, or immigration advice.</footer>
          </div>
        </div>
      </div>

      {!onPortal && <AgentPanel />}
      <Sheet open={!!ev} onOpenChange={(o) => !o && j.openEvidence(null)}>
        <SheetContent side="right" className="z-[60] sm:max-w-md">
          {ev && <><SheetHeader><SheetDescription>{ev.school}</SheetDescription><SheetTitle>{ev.doc}</SheetTitle></SheetHeader><div className="px-4"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{ev.section}</div><blockquote className="mt-3 rounded-2xl bg-secondary p-4 text-base leading-relaxed">“{ev.passage}”</blockquote><p className="mt-4 text-xs text-muted-foreground">Synthetic document · shown exactly as the Reader extracted it.</p></div></>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
