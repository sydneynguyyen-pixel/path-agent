import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, CalendarDays, Home, MousePointerClick, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { freeTime, goTogetherEvent, opportunities, options, progress, rankOptions, REQUIREMENT_LABEL, terms } from "@/data/scenario";
import { recoveryPath } from "@/lib/confidence";
import { reasonFor } from "@/lib/opportunities";
import { nextBeat, tourSlides, type TourSlide } from "@/lib/tour";
import { cn } from "@/lib/utils";
import valleyHome from "@/assets/valley-home.jpg";
import { AgentAvatar, BrandLogo } from "./Brand";

/** Scenes are drawn at this size and scaled to fit, so pointer positions hold at every width. */
const CANVAS = { width: 520, height: 330 };
const REST = { x: 440, y: 292 };

/** Center of an element within the canvas. Uses layout offsets, which ignore the canvas scale. */
function centerIn(el: HTMLElement, root: HTMLElement) {
  let x = el.offsetWidth / 2;
  let y = el.offsetHeight / 2;
  for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
}

function Stage({ slide }: { slide: TourSlide }) {
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const last = slide.beats.length - 1;
  const [beat, setBeat] = useState(reduced ? last : 0);
  const [loop, setLoop] = useState(0);
  const [scale, setScale] = useState(1);
  const [pointer, setPointer] = useState(REST);
  const [clicks, setClicks] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const current = slide.beats[beat]!;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => setScale(stage.clientWidth / CANVAS.width);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => {
      const next = nextBeat(beat, slide.beats.length);
      if (next === 0) setLoop((l) => l + 1);
      setBeat(next);
    }, current.ms);
    return () => clearTimeout(t);
  }, [beat, loop, current.ms, reduced, slide.beats.length]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const el = current.cursor ? canvas.querySelector<HTMLElement>(`[data-cursor="${current.cursor}"]`) : null;
    setPointer(el ? centerIn(el, canvas) : REST);
    if (!current.click || !el) return;
    setClicks((c) => c + 1);
    el.setAttribute("data-pressed", "");
    const t = setTimeout(() => el.removeAttribute("data-pressed"), 180);
    return () => clearTimeout(t);
  }, [beat, loop, current]);

  const Scene = scenes[slide.id];

  return (
    <div ref={stageRef} className="tour-stage" style={{ aspectRatio: `${CANVAS.width} / ${CANVAS.height}` }} aria-hidden="true">
      <div ref={canvasRef} className="tour-canvas" style={{ width: CANVAS.width, height: CANVAS.height, transform: `scale(${scale})` }}>
        <div key={loop} className="tour-scene"><Scene b={beat} /></div>
        {!reduced && (
          <div className="tour-pointer" style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)` }}>
            {clicks > 0 && current.click && <span key={clicks} className="tour-ripple" />}
            <svg width="20" height="22" viewBox="0 0 20 22"><path d="M2 1.5v16.2l4.4-3.7 2.9 6.5 3.2-1.4-2.9-6.4 5.9-.4z" fill="var(--foreground)" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          </div>
        )}
      </div>
    </div>
  );
}

const NAV = [["Home", Home], ["Terms", CalendarDays], ["Registration", MousePointerClick], ["Explore", Compass]] as const;

function MiniApp({ active, children }: { active: (typeof NAV)[number][0]; children: ReactNode }) {
  return (
    <div className="flex h-full text-[11px]">
      <div className="w-[112px] shrink-0 border-r p-3">
        <div className="flex items-center gap-1.5 font-semibold"><BrandLogo className="size-5" /> Path Agent</div>
        <div className="mt-4 space-y-1">
          {NAV.map(([label, Icon]) => (
            <div key={label} className={cn("flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors duration-300", label === active ? "bg-secondary font-medium" : "text-muted-foreground")}><Icon className="size-3" /> {label}</div>
          ))}
        </div>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden p-4">{children}</div>
    </div>
  );
}

const MiniButton = ({ name, outline, className, children }: { name?: string | undefined; outline?: boolean; className?: string; children: ReactNode }) => (
  <span data-cursor={name} className={cn("tour-button", outline ? "glass-control" : "glass-cta", className)}>{children}</span>
);

function HomeScene({ b }: { b: number }) {
  const pct = Math.round((progress.earned / progress.needed) * 100);
  return (
    <MiniApp active={b >= 3 ? "Registration" : "Home"}>
      <img src={valleyHome} alt="" className="h-20 w-full rounded-xl object-cover" />
      <div className="mt-3 text-[16px] font-semibold">Hi Maya, you're on track.</div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{progress.earned} of {progress.needed} units</span><span>Graduate {progress.gradTerm}</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="aqua-chip h-full rounded-full transition-[width] duration-700" style={{ width: b >= 1 ? `${pct}%` : 0 }} /></div>
      <div className={cn("mt-4 flex items-center gap-3 rounded-xl border bg-card p-3 transition-shadow duration-300", b >= 1 && "shadow-frame")}>
        <AgentAvatar agent="backup" bare className="size-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-muted-foreground">Needs your attention</div>
          <div className="font-semibold">Summer 2027 registration is open</div>
        </div>
        <MiniButton name="go" className="shrink-0">Register</MiniButton>
      </div>
    </MiniApp>
  );
}

function TermsScene({ b }: { b: number }) {
  const shown = ["sp27", "su27", "fa27"].map((id) => terms.find((t) => t.id === id)!);
  const term = b >= 2 ? shown[1]! : shown[0]!;
  return (
    <MiniApp active="Terms">
      <div className="text-[16px] font-semibold">Your terms</div>
      <div className="mt-2 flex gap-1.5">
        {shown.map((t) => (
          <span key={t.id} data-cursor={t.id === "su27" ? "summer" : undefined} className={cn("rounded-full border px-2.5 py-1 transition-colors duration-300", t === term ? "aqua-chip border-transparent font-semibold" : "bg-card")}>{t.name}</span>
        ))}
      </div>
      <div key={term.id} className="tour-swap mt-3 divide-y rounded-xl border">
        {term.courses.map((c) => (
          <div key={c.code} data-cursor={c.code === "STAT 2" ? "stat" : undefined} className="px-3 py-1.5">
            <div className="flex justify-between"><span><span className="font-medium">{c.code}</span> <span className="text-muted-foreground">{c.title}</span></span><span className="text-muted-foreground">{c.units}</span></div>
            {c.code === "STAT 2" && b >= 4 && <div className="tour-swap mt-1 flex items-center gap-1 text-[10px] text-mark-yes"><Check className="size-3" /> Counts toward {REQUIREMENT_LABEL}, per your degree audit</div>}
          </div>
        ))}
      </div>
    </MiniApp>
  );
}

function RegisterScene({ b }: { b: number }) {
  return (
    <div className="school-portal relative flex h-full flex-col bg-portal-bg font-[Arial,Helvetica,sans-serif] text-[11px] text-foreground">
      <div className="flex items-center gap-1 bg-card px-3 py-1.5 text-[9px] text-muted-foreground"><span className="size-1.5 rounded-full bg-border" /><span className="size-1.5 rounded-full bg-border" /><span className="ml-2">ssb.bayview.example.edu/register</span></div>
      <div className="bg-portal-navy px-3 py-2 font-bold text-portal-navy-foreground">Bayview Community College</div>
      <div className="h-0.5 bg-portal-gold" />
      <div className="p-3">
        <div className="text-[13px] font-bold">Register for Classes</div>
        {b >= 2 && <div className="tour-swap mt-2 border border-portal-error/40 bg-portal-error/10 px-2 py-1 font-bold text-portal-error">Registration error: STAT 2 section 01 is closed.</div>}
        <table className="mt-2 w-full border-collapse bg-card">
          <thead><tr className="border-b text-left text-muted-foreground"><th className="p-1.5 font-normal">Course</th><th className="p-1.5 font-normal">CRN</th><th className="p-1.5 font-normal">Status</th><th /></tr></thead>
          <tbody>
            {[["01", "40112", "FULL · WL 6/10"], ["02", "40113", "FULL · WL 10/10"]].map(([sec, crn, status], i) => (
              <tr key={crn} className="border-b">
                <td className="p-1.5"><span className="text-portal-link underline">STAT 2 · Section {sec}</span></td>
                <td className="p-1.5">{crn}</td>
                <td className="p-1.5 font-bold text-portal-error">{status}</td>
                <td className="p-1.5"><span data-cursor={i === 0 ? "add" : undefined} className="tour-portal-button">Add</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={cn("tour-overlay", b >= 3 && "tour-overlay-in")}>
        <AgentAvatar agent="backup" className="size-9 shrink-0" />
        <div className="min-w-0 flex-1 font-sans">
          <div className="text-[10px] text-muted-foreground">Path Agent</div>
          <div className="font-semibold">STAT 2 is full. I found backups that still count.</div>
        </div>
        <MiniButton name="see" className="shrink-0 font-sans">See options</MiniButton>
      </div>
    </div>
  );
}

function ChooseScene({ b }: { b: number }) {
  const list = rankOptions(options).filter((o) => o.seatsOpen > 0).slice(0, 3);
  const pick = list.find((o) => recoveryPath(o) === "now") ?? list[0]!;
  const course = pick.course.replace("BCC ", "");
  return (
    <div className="flex h-full flex-col bg-card p-4 text-[11px]">
      <div className="text-[15px] font-semibold">Backups for STAT 2</div>
      <div className="mt-2 space-y-1.5">
        {list.map((o) => (
          <div key={o.id} data-cursor={o === pick ? "pick" : undefined} className={cn("flex items-center justify-between rounded-xl border px-3 py-1.5 transition-colors duration-300", o === pick && b >= 2 && "glass-active border-transparent")}>
            <span><span className="font-medium">{o.course.replace("BCC ", "")}</span> <span className="text-muted-foreground">{o.sectionTime.split(" · ")[0]}</span></span>
            <span className="text-muted-foreground">{o.seatsOpen} open</span>
          </div>
        ))}
      </div>
      <div className={cn("tour-reveal mt-3 rounded-xl border p-3", b >= 2 && "tour-reveal-in")}>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><AgentAvatar agent="backup" className="size-6" /> {course} counts toward {REQUIREMENT_LABEL}</div>
        <p className="mt-1.5">No counselor note needed. Add it yourself in your school's portal.</p>
        <div className="mt-2 flex items-center justify-end gap-2">
          {b >= 4 ? <span className="tour-swap flex items-center gap-1 py-1 font-medium text-mark-yes"><Check className="size-3.5" /> You added {course}</span> : <MiniButton name="add">Add in my portal</MiniButton>}
        </div>
      </div>
    </div>
  );
}

function ExploreScene({ b }: { b: number }) {
  const rows = ["design-club", "library-usability"].map((id) => opportunities.find((o) => o.id === id)!);
  const event = opportunities.find((o) => o.id === goTogetherEvent.id)!;
  const shown = b >= 2;
  const drafted = b >= 4;
  return (
    <MiniApp active="Explore">
      <div className="text-[10px] text-muted-foreground">Working toward</div>
      <div className="text-[13px] font-semibold">UX researcher</div>
      <div className="mt-2 font-medium">Usability testing</div>
      <div className="mt-1.5 divide-y rounded-xl border">
        {rows.map((o) => (
          <div key={o.id} className="px-3 py-1.5">
            <div className="truncate font-medium">{o.title}</div>
            <div className="truncate text-[10px] text-muted-foreground">{reasonFor(o, "Usability testing", freeTime)}</div>
          </div>
        ))}
        <div className="px-3 py-1.5">
          <div className="truncate font-medium">{event.title}</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">{goTogetherEvent.going} Bayview students going</span>
            {shown ? <span className="tour-swap flex items-center gap-1 py-1 font-medium text-mark-yes"><Check className="size-3.5" /> Showing</span> : <MiniButton name="show" outline>Show me as going</MiniButton>}
          </div>
          <div className={cn("mt-1 flex items-center justify-between gap-2 transition-opacity duration-300", shown ? "opacity-100" : "opacity-0")}>
            <span className="text-[10px]">{drafted ? "Draft ready. You send it." : `${goTogetherEvent.visiblePeers[0]!.name} chose to be seen`}</span>
            <MiniButton name="hi">Say hi</MiniButton>
          </div>
        </div>
      </div>
    </MiniApp>
  );
}

const scenes = { home: HomeScene, terms: TermsScene, register: RegisterScene, choose: ChooseScene, explore: ExploreScene };

export function SetupTour({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = tourSlides[index]!;
  const isLast = index === tourSlides.length - 1;

  return (
    <div>
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-8">
        <Stage key={slide.id} slide={slide} />
        <div key={`${slide.id}-text`} className="tour-swap" aria-live="polite">
          <AgentAvatar agent={slide.agent} bare className="size-14" />
          <h1 className="mt-3 text-2xl font-medium">{slide.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{slide.body}</p>
          <p className="mt-3 text-xs text-muted-foreground">Shown with sample data.</p>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => (index === 0 ? onBack() : setIndex(index - 1))}><ArrowLeft className="size-4" /> Back</Button>
        <div className="flex items-center gap-1.5" role="img" aria-label={`Slide ${index + 1} of ${tourSlides.length}`}>
          {tourSlides.map((s, i) => <span key={s.id} className={cn("tour-dot", i === index && "tour-dot-on")} />)}
        </div>
        <div className="flex items-center gap-1">
          {!isLast && <Button variant="ghost" className="text-muted-foreground" onClick={onDone}>Skip</Button>}
          <Button onClick={() => (isLast ? onDone() : setIndex(index + 1))}>{isLast ? "Create my account" : "Next"} <ArrowRight className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}
