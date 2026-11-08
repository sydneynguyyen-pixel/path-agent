import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Eye, Search } from "lucide-react";
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

function Portal() {
  const j = useJourney();
  const [error, setError] = useState(false);
  const watching = !j.paused && j.access.registration;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">This is a <b className="text-foreground">simulated</b> school portal. You register here yourself; the agent only watches.</p>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs", watching ? "bg-success-soft text-success" : "bg-secondary text-muted-foreground")}>
          <Eye className="size-3.5" /> {watching ? "Path Agent is watching this page" : "Path Agent is not watching"}
        </span>
      </div>

      {/* Mock legacy student portal: intentionally styled unlike the app */}
      <div className="overflow-hidden rounded-md border-2 border-portal-navy/30 bg-portal-bg font-[Arial,Helvetica,sans-serif] text-[13px] text-foreground shadow-soft">
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
                        onClick={() => {
                          setError(true);
                          if (watching) j.failAdd();
                        }}
                      >
                        Add
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {error && (
            <div className="mt-3 border border-warning/50 bg-warning-soft px-3 py-2 text-[12px]">
              <b>Registration Add Errors:</b> STAT 2 01 (CRN 40112) — Closed Section. Waitlist available (6/10).
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <span className="rounded border bg-card px-3 py-1">Conditional Add and Drop</span>
            <span className="rounded border border-portal-navy bg-portal-navy px-3 py-1 text-portal-navy-foreground">Submit</span>
          </div>
        </div>
      </div>

      {/* Our agent, overlaid on the school's page */}
      {error && watching && !j.panelOpen && (
        <button onClick={() => j.setPanelOpen(true)} className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full border bg-card py-2 pl-2 pr-4 text-sm shadow-frame">
          <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><GraduationCap className="size-4" /></span>
          <span className="text-left leading-tight"><b>Path Agent</b><br /><span className="text-xs text-muted-foreground">I found options for STAT 2</span></span>
        </button>
      )}
      {error && !watching && <p className="mt-3 text-sm text-muted-foreground">The agent is paused or not allowed to watch this page, so it didn't respond.</p>}
    </div>
  );
}
