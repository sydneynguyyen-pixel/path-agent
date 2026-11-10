import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, GraduationCap, Eye, Lock, ArrowLeft, ArrowRight, RotateCw, Loader2, X, Play, CalendarDays, ListChecks, Sparkles, Timer, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentPanel } from "@/components/app/AgentPanel";
import { useJourney } from "@/lib/journey";
import { options } from "@/data/scenario";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { BrandLogo, AgentAvatar } from "@/components/app/Brand";
import { cn } from "@/lib/utils";
import { PathLoader } from "@/components/app/Illustrations";
import { Ink } from "@/components/app/Ink";
import sceneRegistration from "@/assets/scene-registration.jpg";

export const Route = createFileRoute("/portal")({
  validateSearch: (s: Record<string, unknown>): { start?: true } => (s["start"] ? { start: true } : {}),
  head: () => ({
    meta: [
      { title: "Registration — Path Agent" },
      { name: "description", content: "A simulated Bayview class search and schedule with the path agent guiding alongside." },
      { property: "og:title", content: "Registration — Path Agent" },
      { property: "og:description", content: "Search, pick a section, check your week and register — with Path Agent pointing the way." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Portal,
});

/* ---------- Synthetic Bayview section catalog ---------- */
type Day = "M" | "T" | "W" | "R" | "F";
type Section = {
  crn: string; subj: string; num: string; title: string; sec: string; units: number;
  days: Day[]; start: number; end: number; // minutes from midnight; online => days []
  cap: number; act: number; wl: string; instructor: string; mode: string;
};
const h = (hh: number, mm = 0) => hh * 60 + mm;
const S = (crn: string, subj: string, num: string, title: string, sec: string, days: Day[], start: number, end: number, cap: number, act: number, instructor: string, mode = "In Person", wl = "0/5"): Section =>
  ({ crn, subj, num, title, sec, units: 4, days, start, end, cap, act, wl, instructor, mode });

const catalog: Section[] = [
  S("40112", "STAT", "2", "Introduction to Statistics", "01", ["M", "T", "W", "R"], h(9), h(10, 50), 40, 40, "Okafor, D.", "In Person", "6/10"),
  S("40113", "STAT", "2", "Introduction to Statistics", "02", ["M", "W"], h(18), h(19, 50), 40, 40, "Lindqvist, P.", "In Person", "10/10"),
  S("41301", "MATH", "13", "Elementary Statistics", "01", ["M", "W"], h(8), h(9, 50), 35, 35, "Huang, R.", "Online live"),
  S("41302", "MATH", "13", "Elementary Statistics", "02", ["M", "W"], h(10), h(11, 50), 35, 32, "Huang, R.", "Online live"),
  S("41303", "MATH", "13", "Elementary Statistics", "03", ["T", "R"], h(12), h(13, 50), 35, 30, "Patel, S.", "In Person"),
  S("42051", "PSYC", "5", "Statistics for Behavioral Sciences", "01", ["T", "R"], h(9), h(10, 50), 30, 26, "Moreno, A."),
  S("42052", "PSYC", "5", "Statistics for Behavioral Sciences", "02", ["M", "W"], h(8), h(9, 50), 30, 22, "Moreno, A."),
  S("43211", "BUS", "21", "Business Statistics", "01", ["T", "R"], h(12), h(13, 50), 40, 34, "Ferris, K."),
  S("43213", "BUS", "21", "Business Statistics", "03", ["M", "W"], h(13), h(14, 50), 40, 20, "Ferris, K."),
  S("41101", "MATH", "10", "Statistics Literacy", "01", [], 0, 0, 45, 15, "Adeyemi, T.", "Online async"),
];
const registered: Section[] = [
  S("40388", "ENGL", "1B", "Critical Thinking & Writing", "03", ["M", "W"], h(8), h(9, 50), 30, 28, "Reyes, L."),
  S("40541", "BIO", "12", "Human Biology", "02", ["T", "R"], h(12), h(13, 50), 35, 31, "Nakamura, J."),
  S("40607", "HIST", "18", "Modern World History", "01", [], 0, 0, 45, 39, "Brandt, E.", "Online async"),
];
const seats = (s: Section) => s.cap - s.act;
const fmt = (m: number) => { const hh = Math.floor(m / 60), mm = m % 60; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`; };
const when = (s: Section) => (s.days.length ? `${fmt(s.start)} – ${fmt(s.end)}` : "Online · no meeting time");
const clash = (a: Section, b: Section) => a.days.some((d) => b.days.includes(d)) && a.start < b.end && b.start < a.end;
const conflictWith = (s: Section, list: Section[]) => list.find((r) => r !== s && clash(s, r));

/* ---------- Page ---------- */
type Phase = "idle" | "connecting" | "watching";
type CartItem = { crn: string; status: "pending" | "error" | "registered" };

// The full section the demo walks through, before anything has gone wrong.
const FULL_CRN = "40112";

/** Below this width the agent dock sits under the portal, so moving between them needs a scroll. */
function reveal(el: HTMLElement | null) {
  if (!el || window.matchMedia("(min-width: 96rem)").matches) return;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
}

/** Reset demo changes startedAt, which clears the local cart and timers along with the journey. */
function Portal() {
  const { startedAt } = useJourney();
  return <PortalPage key={startedAt} />;
}

function PortalPage() {
  const j = useJourney();
  const { start } = Route.useSearch();
  const canWatch = !j.paused && j.access.registration;
  const portalRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const chosen = options.find((o) => o.id === j.chosenId);
  const [phase, setPhase] = useState<Phase>(j.stage !== "idle" ? "watching" : start && canWatch ? "connecting" : "idle");
  const [subj, setSubj] = useState("STAT");
  const [num, setNum] = useState("2");
  const [query, setQuery] = useState({ subj: "STAT", num: "2" });
  const [cart, setCart] = useState<CartItem[]>(j.stage !== "idle" ? [{ crn: "40112", status: "error" }] : []);
  const [submitting, setSubmitting] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [dockOpen, setDockOpen] = useState(j.stage !== "idle");
  const [typing, setTyping] = useState(false);
  const [errorAt, setErrorAt] = useState<number | null>(null);
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const watching = phase === "watching" && canWatch;
  const guiding = watching && j.guide && !!chosen && !j.seatHeld;

  // The sidebar says "Watching" only for as long as this is true.
  const { setWatchingRegistration } = j;
  useEffect(() => {
    setWatchingRegistration(watching);
    return () => setWatchingRegistration(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the setter only wraps a stable state update
  }, [watching]);

  const target = useMemo(() => {
    if (!chosen) return undefined;
    const [sj, n] = chosen.course.replace("BCC ", "").split(" ");
    return catalog.find((c) => c.subj === sj && c.num === n && c.sec === chosen.section);
  }, [chosen]);

  useEffect(() => { if (phase !== "connecting") return; const t = setTimeout(() => setPhase("watching"), 1600); return () => clearTimeout(t); }, [phase]);
  useEffect(() => { if (!errorAt || doneAt) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [errorAt, doneAt]);

  // Agent fills the search fields letter by letter when guiding starts.
  const typedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!guiding || !target || typedFor.current === target.crn) return;
    typedFor.current = target.crn;
    setTyping(true); setSubj(""); setNum("");
    const steps: [string, string][] = [];
    for (let i = 1; i <= target.subj.length; i++) steps.push([target.subj.slice(0, i), ""]);
    for (let i = 1; i <= target.num.length; i++) steps.push([target.subj, target.num.slice(0, i)]);
    const ts = steps.map(([a, b], i) => setTimeout(() => { setSubj(a); setNum(b); }, 150 * (i + 1)));
    ts.push(setTimeout(() => { setQuery({ subj: target.subj, num: target.num }); setTyping(false); }, 150 * (steps.length + 3)));
    return () => ts.forEach(clearTimeout);
  }, [guiding, target]);
  useEffect(() => { if (!j.guide) typedFor.current = null; }, [j.guide]);
  useEffect(() => { if (guiding) reveal(portalRef.current); }, [guiding]);

  const results = catalog.filter((c) => c.subj === query.subj.toUpperCase() && c.num === query.num);
  const regSections = registered.concat(cart.filter((c) => c.status === "registered").map((c) => catalog.find((x) => x.crn === c.crn)!));
  const cartSections = cart.filter((c) => c.status !== "registered").map((c) => ({ ...c, s: catalog.find((x) => x.crn === c.crn)! }));
  const preview = guiding && target && !cart.some((c) => c.crn === target.crn) ? target : undefined;
  const pendingTarget = guiding && target && cart.some((c) => c.crn === target.crn && c.status === "pending");

  const cue = watching && j.stage === "idle" && !errorAt && !submitting;
  const addCue = cue && !cart.some((c) => c.crn === FULL_CRN);
  const submitCue = cue && cart.some((c) => c.crn === FULL_CRN && c.status === "pending");

  const add = (crn: string) => setCart((c) => (c.some((x) => x.crn === crn) ? c : [...c, { crn, status: "pending" }]));

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      let failed = false;
      let gotTarget = false;
      // Conditional add/drop: errored rows are removed once the student resubmits.
      const next = cart.filter((x) => x.status !== "error").map((x) => {
        if (x.status !== "pending") return x;
        const s = catalog.find((y) => y.crn === x.crn)!;
        if (seats(s) <= 0 || conflictWith(s, regSections)) { failed = true; return { ...x, status: "error" as const }; }
        if (target && s.crn === target.crn) gotTarget = true;
        return { ...x, status: "registered" as const };
      });
      setCart(next);
      setTimeout(() => {
        if (gotTarget) { j.markAdded(); j.setGuide(false); setDoneAt(Date.now()); }
        if (failed && j.stage === "idle") {
          setErrorAt(Date.now());
          if (watching) {
            setDetecting(true);
            setTimeout(() => { setDetecting(false); setDockOpen(true); j.failAdd(false); reveal(dockRef.current); }, 1800);
          }
        }
      }, 0);
    }, 1100);
  };

  if (phase === "idle") {
    return (
      <div className="register-scene">
      <img src={sceneRegistration} alt="" className="register-art" width={1376} height={768} />
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-frame">
        <h1 className="font-serif text-2xl">Register with Path Agent</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search classes and check out as usual. If something goes wrong, I'll help.
        </p>
        <ul className="mx-auto mt-4 w-fit space-y-1.5 text-left text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5"><Check className="size-3.5 shrink-0 text-mark-yes" /> Reads the page, your schedule and any errors</li>
          <li className="flex items-center gap-1.5"><Check className="size-3.5 shrink-0 text-mark-yes" /> Finds backups and points to the right section</li>
          <li className="flex items-center gap-1.5"><X className="size-3.5 shrink-0 text-mark-no" /> You click Add and Submit yourself</li>
        </ul>
        <Button className="mt-6" onClick={() => setPhase("connecting")} disabled={j.paused || !j.access.registration}>
          <Play className="size-4" /> Open class search
        </Button>
        {(j.paused || !j.access.registration) && <p className="mt-2 text-xs text-muted-foreground">Turn on registration access in Controls.</p>}
      </div>
      </div>
    );
  }
  if (phase === "connecting") {
    return (
      <div className="register-scene">
      <img src={sceneRegistration} alt="" className="register-art" width={1376} height={768} />
      <div className="flex w-full max-w-lg flex-col items-center rounded-2xl border bg-card p-10 text-center shadow-frame">
        <PathLoader />
        <p className="mt-4 font-medium">Opening Bayview Student Self-Service…</p>
        <p className="mt-1 text-sm text-muted-foreground">Connecting Path Agent…</p>
      </div>
      </div>
    );
  }

  const showDock = watching && (detecting || dockOpen);
  const elapsed = errorAt ? Math.max(0, Math.round(((doneAt ?? now) - errorAt) / 1000)) : null;

  return (
    <div className={cn("grid gap-4", showDock && "2xl:grid-cols-[minmax(0,1fr)_400px]")}>
      <div ref={portalRef} className="min-w-0 scroll-mt-4">
        {elapsed !== null && (
          <div key={doneAt ? "done" : "live"} className={cn("swap-enter mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs tabular-nums", doneAt ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground")}>
            <Timer className="size-3.5" /> {doneAt ? `Seat secured ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} after the error` : `Since the error: ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")} — seats go fast`}
          </div>
        )}
        <div className="overflow-hidden rounded-xl border bg-card shadow-frame">
          <div className="flex items-center gap-2 border-b bg-secondary px-3 py-2">
            <span className="flex gap-1.5">{[0, 1, 2].map((i) => <i key={i} className="size-2.5 rounded-full bg-muted-foreground/30" />)}</span>
            <ArrowLeft className="size-3.5 text-muted-foreground" /><ArrowRight className="size-3.5 text-muted-foreground" /><RotateCw className="size-3.5 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 items-center gap-1.5 truncate rounded-md bg-card px-2 py-1 text-xs text-muted-foreground">
              <Lock className="size-3 shrink-0" /> ssb.bayview.example.edu/StudentRegistrationSsb/ssb/classRegistration
            </div>
            <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]", watching ? "aqua-chip" : "bg-card text-muted-foreground")}>
              <Eye className="size-3" /> {watching ? "Path Agent watching" : "Path Agent not watching"}
            </span>
          </div>

          <div className="school-portal bg-portal-bg font-[Arial,Helvetica,sans-serif] text-[12px] text-foreground">
            <div className="flex items-center gap-3 bg-portal-navy px-4 py-2.5 text-portal-navy-foreground">
              <SchoolLogo school="bayview" className="size-7 rounded bg-card p-0.5" />
              <div className="leading-tight">
                <div className="font-bold">Bayview Community College</div>
                <div className="text-[11px] opacity-80">Student Self-Service · Banner 9 (simulated)</div>
              </div>
              <div className="ml-auto text-[11px] opacity-90">Maya Torres · ID 000-SYN-4471</div>
            </div>
            <div className="h-1 bg-portal-gold" />
            <div className="px-4 pt-2 text-[13px] text-portal-link"><u>Student</u> • <u>Registration</u> • <u>Select a Term</u> • <span className="text-foreground">Register for Classes</span></div>
            <h2 className="px-4 pt-1 text-base font-bold" style={{ letterSpacing: 0 }}>Register for Classes</h2>

            {/* Find classes */}
            <div className="m-3 border bg-card">
              <div className="flex gap-0 border-b text-[12px]">
                <span className="bg-portal-navy px-3 py-1.5 text-portal-navy-foreground">Find Classes</span>
                <span className="px-3 py-1.5 text-muted-foreground">Enter CRNs</span>
                <span className="px-3 py-1.5 text-muted-foreground">Plans</span>
              </div>
              <form className="flex flex-wrap items-end gap-3 border-b bg-portal-bg/50 px-3 py-2" onSubmit={(e) => { e.preventDefault(); setQuery({ subj, num }); }}>
                <label className="flex flex-col gap-0.5">Term<span className="rounded border bg-card px-2 py-1">Summer Quarter 2027</span></label>
                <label className="flex flex-col gap-0.5">Subject
                  <input value={subj} onChange={(e) => setSubj(e.target.value.toUpperCase())} className={cn("w-24 rounded border bg-card px-2 py-1", typing && "ring-2 ring-primary")} />
                </label>
                <label className="flex flex-col gap-0.5">Course Number
                  <input value={num} onChange={(e) => setNum(e.target.value)} className={cn("w-20 rounded border bg-card px-2 py-1", typing && "ring-2 ring-primary")} />
                </label>
                <button className="rounded bg-success px-3 py-1 text-success-foreground">Search</button>
                {typing && <span className="flex items-center gap-1 text-primary"><Sparkles className="size-3" /> Path Agent is filling in the search…</span>}
              </form>
              <div className="px-3 py-1.5"><b>Search Results</b> — {results.length} Classes · Subject: {query.subj} · Course Number: {query.num}</div>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary text-left text-[11px] text-muted-foreground">
                  <tr>{["Title", "Subj", "Crs", "Sec", "CRN", "Meeting Times", "Instructor", "Method", "Status", ""].map((x) => <th key={x} className="border-b px-2 py-1.5 font-semibold">{x}</th>)}</tr>
                </thead>
                <tbody>
                  {results.length === 0 && <tr><td colSpan={10} className="px-2 py-3 text-muted-foreground">No classes found.</td></tr>}
                  {results.map((r) => {
                    const full = seats(r) <= 0;
                    const conf = conflictWith(r, regSections);
                    const inCart = cart.some((c) => c.crn === r.crn);
                    const isTarget = guiding && target?.crn === r.crn;
                    const cued = addCue && r.crn === FULL_CRN;
                    return (
                      <Fragment key={r.crn}>
                        <tr className={cn("border-b", isTarget && "bg-primary/5 outline outline-2 -outline-offset-2 outline-primary")}>
                          <td className="px-2 py-1.5"><span className="text-portal-link underline">{r.title}</span></td>
                          <td className="px-2 py-1.5">{r.subj}</td>
                          <td className="px-2 py-1.5">{r.num}</td>
                          <td className="px-2 py-1.5">{r.sec}</td>
                          <td className="px-2 py-1.5">{r.crn}</td>
                          <td className="px-2 py-1.5"><DayBoxes s={r} /> <span className="ml-1">{when(r)}</span></td>
                          <td className="px-2 py-1.5">{r.instructor}</td>
                          <td className="px-2 py-1.5">{r.mode}</td>
                          <td className="px-2 py-1.5">{full ? <b className="text-warning">FULL · WL {r.wl}</b> : <span><b>{seats(r)}</b> of {r.cap} seats remain</span>}</td>
                          <td className="sticky right-0 bg-card px-2 py-1.5 text-right">
                            <button disabled={inCart} onClick={() => add(r.crn)} className={cn("rounded border px-3 py-0.5", isTarget || cued ? "border-primary bg-primary text-primary-foreground" : "bg-card", inCart && "opacity-50")}>{inCart ? "Added" : "Add"}</button>
                          </td>
                        </tr>
                        {cued && (
                          <tr className="border-b">
                            <td colSpan={10} className="px-2 pb-1.5 pt-0 text-[11px] sm:text-right">
                              <span className="sticky left-2 inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 font-[system-ui] font-medium text-primary-foreground">
                                <ArrowUp className="size-3" /> Try it: this section is full. Click Add.
                              </span>
                            </td>
                          </tr>
                        )}
                        {guiding && (
                          <tr className="border-b">
                            <td colSpan={10} className="px-2 pb-1.5 pt-0 text-[11px]">
                              <span className="inline-flex items-center gap-1 rounded bg-card px-1.5 py-0.5 font-[system-ui] shadow-soft">
                                <GraduationCap className="size-3 text-primary" />
                                {isTarget ? <b className="text-primary">Path Agent: pick this one — open seats, fits your week, counts toward QR-1.</b>
                                  : full ? "Full — skip." : conf ? `Clashes with your ${conf.subj} ${conf.num} (${conf.days.join("")} ${fmt(conf.start)}).` : "Open, but not the section I recommended."}
                              </span>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            {/* Schedule + Summary */}
            <div className="m-3 mt-0 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="border bg-card">
                <div className="flex items-center gap-1.5 border-b bg-secondary px-3 py-1.5 font-semibold"><CalendarDays className="size-3.5" /> Class Schedule for Summer Quarter 2027</div>
                <WeekGrid registered={regSections} pending={cartSections.map((c) => ({ s: c.s, error: c.status === "error" }))} preview={preview} />
              </div>
              <div className="flex flex-col border bg-card">
                <div className="flex items-center gap-1.5 border-b bg-secondary px-3 py-1.5 font-semibold"><ListChecks className="size-3.5" /> Summary</div>
                <table className="w-full">
                  <thead className="text-left text-[11px] text-muted-foreground"><tr>{["CRN", "Title", "Details", "Status", ""].map((x) => <th key={x} className="border-b px-2 py-1">{x}</th>)}</tr></thead>
                  <tbody>
                    {cartSections.map(({ crn, status, s }) => (
                      <tr key={crn} className={cn("border-b", status === "error" && "bg-warning-soft")}>
                        <td className="px-2 py-1">{crn}</td><td className="px-2 py-1">{s.title}</td><td className="px-2 py-1">{s.subj} {s.num}, {s.sec}</td>
                        <td className={cn("px-2 py-1", status === "error" ? "font-semibold text-warning" : "italic text-muted-foreground")}>{status === "error" ? "Errors Preventing Registration" : "Pending"}</td>
                        <td className="px-2 py-1">{status === "pending" && <button aria-label="Remove" onClick={() => setCart((c) => c.filter((x) => x.crn !== crn))}><X className="size-3" /></button>}</td>
                      </tr>
                    ))}
                    {regSections.map((s) => (
                      <tr key={s.crn} className="border-b">
                        <td className="px-2 py-1">{s.crn}</td><td className="px-2 py-1">{s.title}</td><td className="px-2 py-1">{s.subj} {s.num}, {s.sec}</td>
                        <td className="px-2 py-1"><span className="rounded bg-success-soft px-1.5 text-success">Registered</span></td><td />
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cartSections.some((c) => c.status === "error") && (
                  <div className="m-2 border border-warning/50 bg-warning-soft px-2 py-1.5">
                    <b>Registration Add Errors:</b> STAT 2 01 (CRN 40112) — Closed Section. Waitlist available (6/10).
                  </div>
                )}
                {detecting && <div className="mx-2 mb-2 flex items-center gap-1 font-[system-ui] text-[11px] text-primary"><Ink className="size-3" /> Path Agent: checking what else counts…</div>}
                {pendingTarget && <div className="mx-2 mb-2 flex items-center gap-1 font-[system-ui] text-[11px] text-primary"><GraduationCap className="size-3" /> Path Agent: looks good — no time conflicts. Click Submit when you're ready.</div>}
                <div className="relative mt-auto flex items-center justify-end gap-3 border-t px-2 py-2">
                  {submitCue && <span className="absolute bottom-full right-2 mb-1 inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 font-[system-ui] text-[11px] font-medium text-primary-foreground"><ArrowDown className="size-3" /> Now click Submit.</span>}
                  <span className="text-muted-foreground">Total hours: {regSections.length * 4}</span>
                  <label className="flex items-center gap-1"><input type="checkbox" defaultChecked readOnly /> Conditional Add and Drop</label>
                  <button
                    disabled={!cart.some((c) => c.status === "pending") || submitting}
                    onClick={submit}
                    className={cn("inline-flex items-center gap-1 rounded border border-portal-navy bg-portal-navy px-3 py-1 text-portal-navy-foreground disabled:opacity-50", (pendingTarget || submitCue) && "ring-2 ring-primary ring-offset-1")}
                  >
                    {submitting && <Loader2 className="size-3 animate-spin" />} Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {errorAt && !watching && <p className="mt-3 text-sm text-muted-foreground">Path Agent is paused, so it can't help here.</p>}
        {j.stage !== "idle" && watching && !showDock && (
          <button onClick={() => setDockOpen(true)} className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline"><GraduationCap className="size-4" /> Show Path Agent</button>
        )}
        {doneAt && <p className="mt-3 flex items-center gap-1.5 text-sm text-success"><CheckCircle2 className="size-4 text-mark-yes" /> You're registered. <Link to="/activity" className="text-primary underline">See what Path Agent did</Link></p>}
      </div>

      {showDock && (
        <aside ref={dockRef} className="dock-enter h-fit scroll-mt-4 overflow-hidden rounded-xl border bg-card shadow-soft 2xl:sticky 2xl:top-[68px] 2xl:max-h-[calc(100vh-96px)] 2xl:overflow-y-auto">
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm">
            <BrandLogo className="size-7" />
            <b>Path Agent</b>
            {!detecting && <button aria-label="Hide Path Agent" className="ml-auto text-muted-foreground" onClick={() => setDockOpen(false)}><X className="size-4" /></button>}
          </div>
          {detecting ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="scan-orb"><Ink className="size-full" /><AgentAvatar agent="reader" /></span>
              <p className="mt-5 font-medium">I noticed a registration error</p>
              <p className="mt-1 text-sm text-muted-foreground">Reading "Closed Section" for STAT 2 and checking what else counts…</p>
            </div>
          ) : (
            <AgentPanel docked />
          )}
        </aside>
      )}
    </div>
  );
}

function DayBoxes({ s }: { s: Section }) {
  return (
    <span className="inline-flex align-middle">
      {(["S", "M", "T", "W", "R", "F", "S"] as const).map((d, i) => (
        <span key={i} className={cn("grid size-4 place-items-center border text-[9px]", s.days.includes(d as Day) && i > 0 && i < 6 ? "bg-portal-navy text-portal-navy-foreground" : "bg-card text-muted-foreground")}>{d === "R" ? "T" : d}</span>
      ))}
    </span>
  );
}

const DAYS: Day[] = ["M", "T", "W", "R", "F"];
const DAY_LABEL = { M: "Monday", T: "Tuesday", W: "Wednesday", R: "Thursday", F: "Friday" };
const START = h(7), END = h(20), PX = 0.6; // px per minute

function WeekGrid({ registered, pending, preview }: { registered: Section[]; pending: { s: Section; error: boolean }[]; preview?: Section | undefined }) {
  const blocks = [
    ...registered.map((s) => ({ s, kind: "reg" as const })),
    ...pending.map((p) => ({ s: p.s, kind: p.error ? ("err" as const) : ("pend" as const) })),
    ...(preview ? [{ s: preview, kind: "preview" as const }] : []),
  ];
  const online = blocks.filter((b) => !b.s.days.length);
  return (
    <div>
      <div className="grid grid-cols-[44px_repeat(5,1fr)] border-b text-center text-[11px] font-semibold">
        <span />{DAYS.map((d) => <span key={d} className="border-l py-1">{DAY_LABEL[d]}</span>)}
      </div>
      <div className="relative grid grid-cols-[44px_repeat(5,1fr)]" style={{ height: (END - START) * PX }}>
        <div className="relative">
          {Array.from({ length: (END - START) / 60 }, (_, i) => (
            <span key={i} className="absolute right-1 text-[10px] text-muted-foreground" style={{ top: i * 60 * PX }}>{fmt(START + i * 60).replace(":00", "").toLowerCase()}</span>
          ))}
        </div>
        {DAYS.map((d) => (
          <div key={d} className="relative border-l" style={{ backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px ${60 * PX}px)` }}>
            {blocks.filter((b) => b.s.days.includes(d)).map((b) => (
              <div
                key={b.s.crn + b.kind}
                className={cn(
                  "absolute inset-x-0.5 overflow-hidden rounded-sm px-1 text-[10px] leading-tight",
                  b.kind === "reg" && "bg-portal-navy/80 text-portal-navy-foreground",
                  b.kind === "pend" && "border border-portal-navy bg-portal-gold/40",
                  b.kind === "err" && "border border-warning bg-warning-soft text-warning",
                  b.kind === "preview" && "animate-pulse border-2 border-dashed border-primary bg-primary/10 text-primary",
                )}
                style={{ top: (b.s.start - START) * PX, height: (b.s.end - b.s.start) * PX }}
              >
                <b>{b.s.subj} {b.s.num}</b> §{b.s.sec}{b.kind === "preview" && " · fits"}
              </div>
            ))}
          </div>
        ))}
      </div>
      {online.length > 0 && (
        <div className="border-t px-2 py-1 text-[11px] text-muted-foreground">Online / no meeting time: {online.map((b) => `${b.s.subj} ${b.s.num} §${b.s.sec}${b.kind === "preview" ? " (suggested)" : ""}`).join(", ")}</div>
      )}
    </div>
  );
}
