import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, FileSearch, ShieldCheck, Hand, GraduationCap, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { SourceLogo } from "@/components/app/SourceLogo";
import { connectedSources } from "@/components/app/sourcesData";
import { useJourney } from "@/lib/journey";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — Academic Path Agent" },
      { name: "description", content: "Set up your path agent: confirm your schools, connect sources, and choose what it may do." },
      { property: "og:title", content: "Welcome — Academic Path Agent" },
      { property: "og:description", content: "A two-minute setup for your transfer path agent." },
    ],
  }),
  component: Welcome,
});

const STEPS = ["Welcome", "Your schools", "Connect", "Your rules", "Ready"];

function Welcome() {
  const j = useJourney();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [connected, setConnected] = useState<string[]>([]);
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const finish = () => {
    j.finishOnboarding();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-[1.75rem] border bg-card p-8 shadow-frame md:p-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-4" /></div>
            <span className="font-semibold">Path Agent</span>
          </div>
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => <span key={s} className={cn("h-1.5 w-6 rounded-full", i <= step ? "bg-primary" : "bg-secondary")} />)}
          </div>
        </div>

        {step === 0 && (
          <div>
            <h1 className="text-3xl font-medium">Hi Maya. Let's keep your transfer on track.</h1>
            <p className="mt-3 text-muted-foreground">Bayview gave you access to Path Agent. It reads your school records so you always know what counts toward your degree.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                [FileSearch, "Shows where every answer comes from", "Each claim links to the exact policy or record."],
                [Hand, "Helps when plans break", "Full class? You get options that still count, within minutes."],
                [ShieldCheck, "Never acts for you", "It never registers or sends anything without your approval."],
              ].map(([Icon, t, d]) => {
                const I = Icon as typeof FileSearch;
                return (
                  <li key={t as string} className="flex gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-lilac"><I className="size-4" /></div>
                    <div><div className="font-medium">{t as string}</div><div className="text-muted-foreground">{d as string}</div></div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-2xl font-medium">Is this right?</h1>
            <p className="mt-2 text-muted-foreground">We found these schools on your record.</p>
            <div className="mt-6 space-y-3">
              {[["bayview", "Bayview Community College", "Current · quarter system · Associate in Arts"], ["northgate", "Northgate State University", "Admitted for Fall 2027 · semester system · Psychology B.A."]].map(([k, n, d]) => (
                <div key={k} className="flex items-center gap-4 rounded-2xl border p-4">
                  <SchoolLogo school={k as "bayview" | "northgate"} className="size-11" />
                  <div className="flex-1"><div className="font-medium">{n}</div><div className="text-sm text-muted-foreground">{d}</div></div>
                  <Check className="size-5 text-success" />
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Fictional schools for this prototype. Quarter units convert to semester units using both schools' policies.</p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-medium">Connect your records</h1>
            <p className="mt-2 text-muted-foreground">Your school set these up. Tap to allow each one. You can change this anytime.</p>
            <div className="mt-6 space-y-2">
              {connectedSources.map((s) => {
                const on = connected.includes(s.id);
                return (
                  <button key={s.id} onClick={() => setConnected((c) => (on ? c.filter((x) => x !== s.id) : [...c, s.id]))} className={cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors", on && "border-primary bg-secondary")}>
                    <SourceLogo id={s.id} />
                    <div className="flex-1"><div className="text-sm font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.what}</div></div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs", on ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{on ? "Allowed" : "Allow"}</span>
                  </button>
                );
              })}
            </div>
            <button className="mt-3 text-xs text-muted-foreground underline" onClick={() => setConnected(connectedSources.map((s) => s.id))}>Allow all</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-2xl font-medium">Your rules for the agent</h1>
            <p className="mt-2 text-muted-foreground">These are on by default. The last two can't be turned off.</p>
            <div className="mt-6 divide-y rounded-2xl border">
              <Row title="Watch my registration page" desc="So it can help the moment a class is full." on={j.access.registration} onChange={(v) => j.setAccess("registration", v)} />
              <Row title="Draft emails to my counselor" desc="Drafts only. You edit and approve every one." on={j.access.email} onChange={(v) => j.setAccess("email", v)} />
              <Row title="Ask me before sending anything" desc="Always required." on locked />
              <Row title="Never register or drop classes for me" desc="Always required. You do that yourself." on locked />
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="grid size-12 place-items-center rounded-full bg-success-soft"><Eye className="size-5 text-success" /></div>
            <h1 className="mt-4 text-2xl font-medium">You're set.</h1>
            <p className="mt-2 text-muted-foreground">Your home page shows your whole path and the one thing that needs attention. Summer registration is open now — register as usual and I'll watch for problems.</p>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button> : <span />}
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={step === 2 && connected.length === 0}>
              {step === 0 ? "Get started" : "Continue"} <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={finish}>Go to my plan <ArrowRight className="size-4" /></Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ title, desc, on, onChange, locked }: { title: string; desc: string; on: boolean; onChange?: (v: boolean) => void; locked?: boolean }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="flex-1"><div className="text-sm font-medium">{title}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
      <Switch checked={on} onCheckedChange={(v) => onChange?.(v)} disabled={!!locked} aria-label={title} />
    </div>
  );
}
