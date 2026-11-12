import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AccountStep, ConfirmStep, ConnectStep, GoalsStep, SchoolsStep, VerifyStep, type SchoolChoices } from "@/components/app/OnboardingSteps";
import { SetupTour } from "@/components/app/SetupTour";
import { schoolSignIns, type SchoolSignIn } from "@/components/app/sourcesData";
import { useJourney } from "@/lib/journey";
import { isSignupCode } from "@/lib/onboarding";
import { BrandLogo, Wordmark, AgentAvatar } from "@/components/app/Brand";
import { cn } from "@/lib/utils";
import valleyHero from "@/assets/valley-hero.jpg";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Welcome — Trellis" },
      { name: "description", content: "See how Sprout works, create your account, connect your schools, and choose what it may do." },
      { property: "og:title", content: "Welcome — Trellis" },
      { property: "og:description", content: "A two-minute setup for Sprout, your transfer agent." },
    ],
  }),
  component: Welcome,
});

const STEPS = ["Welcome", "Tour", "Account", "Verify", "Schools", "Connect", "Confirm", "Goals", "Rules"] as const;
const CONTINUE_LABEL: Partial<Record<(typeof STEPS)[number], string>> = {
  Welcome: "See how it works",
  Account: "Email me a code",
  Verify: "Verify",
  Confirm: "Looks right",
  Rules: "Start my path",
};

function Welcome() {
  const j = useJourney();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [code, setCode] = useState("");
  const [choices, setChoices] = useState<SchoolChoices>({ college: null, transfer: null, major: null });
  const [goals, setGoals] = useState<string[]>([]);
  const [connected, setConnected] = useState<SchoolSignIn["id"][]>([]);
  const step = STEPS[index]!;
  const back = () => setIndex((i) => i - 1);
  const finish = () => {
    j.finishOnboarding();
    navigate({ to: "/" });
  };
  const skip = () => {
    j.skipToDemo();
    navigate({ to: "/" });
  };
  const next = () => {
    if (step === "Goals") j.setGoals(goals);
    if (step === "Rules") finish();
    else setIndex((i) => i + 1);
  };
  const onConnected = useCallback((id: SchoolSignIn["id"]) => setConnected((c) => (c.includes(id) ? c : [...c, id])), []);
  const ready =
    step === "Verify" ? isSignupCode(code)
    : step === "Schools" ? !!(choices.college && choices.transfer && choices.major)
    : step === "Connect" ? connected.length === schoolSignIns.length
    : true;

  return (
    <div className="brand-app welcome-scene flex min-h-screen items-center justify-center p-4 pb-[36vh] md:pb-4">
      <img src={valleyHero} alt="" className="welcome-art" width={1920} height={1088} />
      <div className={cn("welcome-card w-full rounded-[1.75rem] border bg-card p-8 shadow-frame transition-[max-width] duration-500 md:p-10", step === "Tour" ? "max-w-4xl" : "max-w-xl")}>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo className="!size-9" />
            <Wordmark className="text-[24px]" />
          </div>
          <div className="path-progress" role="img" aria-label={`Step ${index + 1} of ${STEPS.length}`} style={{ "--p": `${((index + 1) / STEPS.length) * 100}%` } as CSSProperties}><span /></div>
        </div>

        <div key={step} className="step-swap">
        {step === "Welcome" && (
          <div>
            <h1 className="text-3xl font-medium">Keep your transfer on track.</h1>
            <p className="mt-3 text-muted-foreground">Sprout reads your school records so you always know what counts toward your degree.</p>
            <ul className="stagger mt-6 space-y-3 text-sm">
              {[
                ["reader", "Shows where every answer comes from", "Each claim links to the exact policy or record."],
                ["backup", "Helps when plans break", "Full class? You get options that still count, within minutes."],
                ["planner", "Never acts for you", "It never registers or sends anything without your approval."],
              ].map(([agent, t, d]) => (
                <li key={t} className="flex gap-3">
                  <AgentAvatar agent={agent as "reader" | "backup" | "planner"} />
                  <div><div className="font-medium">{t}</div><div className="text-muted-foreground">{d}</div></div>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="mt-6 w-full" onClick={() => { j.finishOnboarding(); j.finishBuild(); navigate({ to: "/" }); }}>
              Try it as Maya
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Skip setup and explore a ready-made synthetic path.</p>
          </div>
        )}

        {step === "Account" && <AccountStep />}
        {step === "Verify" && <VerifyStep code={code} onCode={setCode} />}
        {step === "Schools" && <SchoolsStep choices={choices} onChange={setChoices} />}
        {step === "Connect" && <ConnectStep connected={connected} onConnected={onConnected} />}
        {step === "Confirm" && <ConfirmStep />}
        {step === "Goals" && <GoalsStep picked={goals} onChange={setGoals} />}

        {step === "Rules" && (
          <div>
            <h1 className="text-2xl font-medium">Your rules for Sprout</h1>
            <p className="mt-2 text-muted-foreground">These are on by default. The last two can't be turned off.</p>
            <div className="mt-6 divide-y rounded-2xl border">
              <Row title="Watch my registration page" desc="So it can help the moment a class is full." on={j.access.registration} onChange={(v) => j.setAccess("registration", v)} />
              <Row title="Draft emails to my counselor" desc="Drafts only. You edit and approve every one." on={j.access.email} onChange={(v) => j.setAccess("email", v)} />
              <Row title="Ask me before sending anything" desc="Always required." on locked />
              <Row title="Never register or drop classes for me" desc="Always required. You do that yourself." on locked />
            </div>
          </div>
        )}

        </div>

        {step === "Tour" ? (
          <SetupTour onBack={back} onDone={next} />
        ) : (
          <div className="mt-10 flex items-center justify-between">
            {index > 0 ? <Button variant="ghost" onClick={back}>Back</Button> : <Button variant="ghost" onClick={skip}>Skip to the demo</Button>}
            <Button onClick={next} disabled={!ready}>
              {step === "Goals" && goals.length === 0 ? "Not sure yet, skip" : CONTINUE_LABEL[step] ?? "Continue"} <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
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
