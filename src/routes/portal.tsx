import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Eye, Search, Lock, ArrowLeft, ArrowRight, RotateCw, ShoppingCart, Loader2, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentPanel } from "@/components/app/AgentPanel";
import { useJourney } from "@/lib/journey";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Registration (simulated Bayview portal) — Academic Path Agent" },
      { name: "description", content: "A simulated Bayview Student Self-Service page with the path agent watching alongside." },
      { property: "og:title", content: "Registration — Academic Path Agent" },
      { property: "og:description", content: "Try adding a full section and watch the agent recover the plan." },
    ],
  }),
  component: Portal,
});

const rows = [
  { crn: "40112", code: "STAT 2", title: "Introduction to Statistics", sec: "01", days: "MTWR", time: "9:00–10:50", cap: "40", act: "40", wl: "6/10", status: "Full", add: true },
  { crn: "40388", code: "ENGL 1B", title: "Critical Thinking & Writing", sec: "03", days: "MW", time: "8:00–9:50", cap: "30", act: "28", wl: "0/5", status: "Registered" },
  { crn: "40541", code: "BIO 12", title: "Human Biology", sec: "02", days: "TR", time: "12:00–1:50", cap: "35", act: "31", wl: "0/5", status: "Registered" },
  { crn: "40607", code: "HIST 18", title: "Modern World History", sec: "01", days: "Online", time: "Async", cap: "45", act: "39", wl: "0/5", status: "Registered" },
];

type Phase = "idle" | "connecting" | "watching";

function Portal() {
  const j = useJourney();
  const [phase, setPhase] = useState<Phase>(j.stage === "failed" ? "watching" : "idle");
  const [cart, setCart] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(j.stage === "failed");
  const [detecting, setDetecting] = useState(false);
  const [dockOpen, setDockOpen] = useState(j.stage === "failed");
  const watching = phase === "watching" && !j.paused && j.access.registration;

  useEffect(() => {
    if (phase !== "connecting") return;
    const t = setTimeout(() => setPhase("watching"), 1600);
    return () => clearTimeout(t);
  }, [phase]);

  const checkout = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setError(true);
      if (watching) {
        setDetecting(true);
        setTimeout(() => {
          setDetecting(false);
          setDockOpen(true);
          j.failAdd(false);
        }, 1800);
      }
    }, 1100);
  };

  if (phase === "idle") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center shadow-soft">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><GraduationCap className="size-6" /></span>
        <h1 className="mt-4 font-serif text-2xl">Register with Path Agent alongside</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open Bayview's registration page. Path Agent will watch quietly while you shop and check out.
          You register yourself — it only steps in if something goes wrong.
        </p>
        <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left text-xs text-muted-foreground">
          <li>✓ Reads the page and any error messages</li>
          <li>✓ Suggests backups if a class fails</li>
          <li>✕ Never clicks Add, Submit or registers for you</li>
        </ul>
        <Button className="mt-6" onClick={() => setPhase("connecting")} disabled={j.paused || !j.access.registration}>
          <Play className="size-4" /> Start Path Agent and open scheduler
        </Button>
        {(j.paused || !j.access.registration) && <p className="mt-2 text-xs text-muted-foreground">The agent is paused or not allowed to read registration. Change this in Agent controls.</p>}
      </div>
    );
  }

  if (phase === "connecting") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border bg-card p-10 text-center shadow-soft">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 font-medium">Opening Bayview Student Self-Service…</p>
        <p className="mt-1 text-sm text-muted-foreground">Path Agent is attaching to the page (read-only).</p>
      </div>
    );
  }

  const showDock = watching && (detecting || dockOpen);

  return (
    <div className={cn("grid gap-4", showDock && "xl:grid-cols-[minmax(0,1fr)_420px]")}>
      <div className="min-w-0">
      {/* Fake browser window: a different website the agent is watching */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-frame">
        <div className="flex items-center gap-2 border-b bg-secondary px-3 py-2">
          <span className="flex gap-1.5"><i className="size-2.5 rounded-full bg-muted-foreground/30" /><i className="size-2.5 rounded-full bg-muted-foreground/30" /><i className="size-2.5 rounded-full bg-muted-foreground/30" /></span>
          <ArrowLeft className="size-3.5 text-muted-foreground" /><ArrowRight className="size-3.5 text-muted-foreground" /><RotateCw className="size-3.5 text-muted-foreground" />
          <div className="flex flex-1 items-center gap-1.5 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground">
            <Lock className="size-3" /> ssb.bayview.example.edu/StudentRegistrationSsb/ssb/classRegistration
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]", watching ? "bg-success-soft text-success" : "bg-card text-muted-foreground")}>
            <Eye className="size-3" /> {watching ? "Path Agent watching" : "Agent not watching"}
          </span>
        </div>

      <div className="bg-portal-bg font-[Arial,Helvetica,sans-serif] text-[13px] text-foreground">
        <div className="flex items-center gap-3 bg-portal-navy px-4 py-2.5 text-portal-navy-foreground">
          <SchoolLogo school="bayview" className="size-7 rounded bg-card p-0.5" />
          <div className="leading-tight">
            <div className="font-bold">Bayview Community College</div>
            <div className="text-[11px] opacity-80">Student Self-Service · Banner 9 (simulated)</div>
          </div>
          <div className="ml-auto text-[11px] opacity-90">Maya Torres · ID 000-SYN-4471 · <span className="underline">Sign out</span></div>
        </div>
        <div className="h-1 bg-portal-gold" />
        <div className="flex gap-4 border-b bg-card px-4 py-2 text-portal-link">
          {["Home", "Registration", "Plan Ahead", "Class Schedule", "Financial Account", "Grades"].map((t) => (
            <span key={t} className={cn("cursor-default", t === "Registration" && "font-bold text-foreground underline underline-offset-4")}>{t}</span>
          ))}
        </div>
        <div className="px-4 pt-3 text-[11px] text-muted-foreground">Student › Registration › Register for Classes</div>

        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ letterSpacing: 0 }}>Register for Classes — Summer Quarter 2027</h2>
            <div className="flex items-center gap-1 rounded border bg-card px-2 py-1 text-muted-foreground"><Search className="size-3" /> Find Classes</div>
          </div>
          <table className="mt-3 w-full border bg-card">
            <thead className="bg-secondary text-left text-[11px] uppercase text-muted-foreground">
              <tr>{["CRN", "Course", "Title", "Sec", "Days", "Time", "Cap", "Act", "WL", "Status", ""].map((h) => <th key={h} className="border-b px-2 py-1.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.crn} className={cn(i % 2 && "bg-portal-bg/60")}>
                  <td className="border-b px-2 py-1.5">{r.crn}</td>
                  <td className="border-b px-2 py-1.5 font-semibold">{r.code}</td>
                  <td className="border-b px-2 py-1.5 text-portal-link">{r.title}</td>
                  <td className="border-b px-2 py-1.5">{r.sec}</td>
                  <td className="border-b px-2 py-1.5">{r.days}</td>
                  <td className="border-b px-2 py-1.5">{r.time}</td>
                  <td className="border-b px-2 py-1.5">{r.cap}</td>
                  <td className="border-b px-2 py-1.5">{r.act}</td>
                  <td className="border-b px-2 py-1.5">{r.wl}</td>
                  <td className="border-b px-2 py-1.5">{r.status}</td>
                  <td className="border-b px-2 py-1.5 text-right">
                    {r.add && (
                      <button
                        className="rounded border border-portal-navy bg-portal-navy px-3 py-0.5 text-[12px] text-portal-navy-foreground"
                        disabled={cart.includes(r.crn)}
                        onClick={() => setCart((c) => [...c, r.crn])}
                      >
                        {cart.includes(r.crn) ? "In cart" : "Add"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 border bg-card">
            <div className="flex items-center gap-2 border-b bg-secondary px-2 py-1.5 text-[11px] font-semibold uppercase text-muted-foreground"><ShoppingCart className="size-3" /> Summary — course cart</div>
            {cart.length === 0 ? (
              <p className="px-2 py-2 text-muted-foreground">No pending courses. Click Add on a class, then Submit.</p>
            ) : (
              cart.map((crn) => {
                const r = rows.find((x) => x.crn === crn)!;
                return (
                  <div key={crn} className="flex items-center gap-3 border-b px-2 py-1.5 last:border-0">
                    <b>{r.code}</b> <span>{r.title}</span> <span className="text-muted-foreground">CRN {crn} · Sec {r.sec}</span>
                    <span className={cn("ml-auto", error ? "font-semibold text-warning" : "text-muted-foreground")}>{error ? "Errors Preventing Registration" : "Pending"}</span>
                    {!error && <button aria-label="Remove" onClick={() => setCart((c) => c.filter((x) => x !== crn))}><X className="size-3" /></button>}
                  </div>
                );
              })
            )}
          </div>

          {error && (
            <div className="mt-3 border border-warning/50 bg-warning-soft px-3 py-2 text-[12px]">
              <b>Registration Add Errors:</b> STAT 2 01 (CRN 40112) — Closed Section. Waitlist available (6/10).
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <span className="rounded border bg-card px-3 py-1">Conditional Add and Drop</span>
            <button
              disabled={cart.length === 0 || submitting || error}
              onClick={checkout}
              className="inline-flex items-center gap-1 rounded border border-portal-navy bg-portal-navy px-3 py-1 text-portal-navy-foreground disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-3 animate-spin" />} Submit
            </button>
          </div>
        </div>
      </div>
      </div>
      {error && !watching && <p className="mt-3 text-sm text-muted-foreground">The agent is paused or not allowed to watch this page, so it didn't respond.</p>}
      {error && watching && !showDock && (
        <button onClick={() => setDockOpen(true)} className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline"><GraduationCap className="size-4" /> Show Path Agent suggestions</button>
      )}
      </div>

      {showDock && (
        <aside className="h-fit overflow-hidden rounded-xl border bg-card shadow-soft xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground"><GraduationCap className="size-3.5" /></span>
            <b>Path Agent</b>
            {!detecting && <button aria-label="Hide suggestions" className="ml-auto text-muted-foreground" onClick={() => setDockOpen(false)}><X className="size-4" /></button>}
          </div>
          {detecting ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="mt-3 font-medium">I noticed a registration error</p>
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
