import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/app/bits";
import { Spot } from "@/components/app/Illustrations";
import { useJourney } from "@/lib/journey";
import { CONFIDENCE_THRESHOLD } from "@/lib/confidence";
import { THEMES, useTheme } from "@/lib/theme";
import { useSlidingPill } from "@/hooks/use-sliding-pill";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Settings — Path Agent" },
      { name: "description", content: "Notifications, school rules, your data, and onboarding." },
      { property: "og:title", content: "Settings — Path Agent" },
      { property: "og:description", content: "Notifications, privacy and app preferences." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const j = useJourney();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Settings" right={<Spot name="wateringcan" className="hidden w-32 sm:block" />} />

      <Section title="Appearance"><ThemePicker /></Section>

      <Section title="Notifications">
        <Toggle title="Email me when a plan needs attention" on={j.notify.email} onChange={(v) => j.setNotify("email", v)} />
        <Toggle title="Phone notifications" on={j.notify.push} onChange={(v) => j.setNotify("push", v)} />
        <Toggle title="Weekly summary of deadlines" on={j.notify.digest} onChange={(v) => j.setNotify("digest", v)} />
      </Section>

      <Section title="Set by your school">
        <Info title="Counselor review threshold" value={`Below ${Math.round(CONFIDENCE_THRESHOLD * 100)}% confidence, or when sources disagree`} />
        <Info title="What Path Agent can never do" value="Register, drop, waitlist, or send without your approval" />
        <Info title="Advice it won't give" value="Legal, financial-aid, or immigration" />
      </Section>

      <Section title="Agent & data">
        <Row title="Controls" desc="Choose what Path Agent does and reads."><Button variant="outline" size="sm" asChild><Link to="/permissions">Open</Link></Button></Row>
        <Row title="Your sources" desc="Canvas, student system, degree audit, articulation, career center, email."><Button variant="outline" size="sm" asChild><Link to="/sources">Open</Link></Button></Row>
        <Row title="Download my data" desc="Everything Path Agent read and produced."><Button variant="outline" size="sm" onClick={() => toast("Demo only: nothing was downloaded.")}>Download</Button></Row>
      </Section>

      <Section title="Demo">
        <Row title="Replay onboarding" desc="See the first-time setup again."><Button variant="outline" size="sm" onClick={() => { j.replayOnboarding(); navigate({ to: "/welcome" }); }}>Replay</Button></Row>
        <Row title="Reset demo" desc="Put the registration story back to the start."><Button variant="outline" size="sm" onClick={() => { j.reset(); toast("Demo reset."); }}>Reset</Button></Row>
      </Section>
    </div>
  );
}

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  return (
    <div ref={containerRef} role="group" aria-label="Theme" className="relative grid grid-cols-3 gap-1 p-3 sm:grid-cols-5">
      <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
      {THEMES.map((t) => (
        <button key={t.id} type="button" aria-pressed={theme === t.id} onClick={(e) => setTheme(t.id, e.currentTarget)} className="theme-swatch relative z-[1] flex flex-col items-center gap-2 rounded-3xl p-3 text-xs font-medium">
          <span className="theme-orb" style={{ background: `radial-gradient(circle at 30% 28%, ${t.colors[2]}, transparent 62%), radial-gradient(circle at 74% 72%, ${t.colors[1]}, transparent 66%), ${t.colors[0]}` }} />
          {t.name}
        </button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">{title}</h2>
      <div className="surface divide-y">{children}</div>
    </section>
  );
}
function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="flex-1"><div className="text-sm font-medium">{title}</div>{desc && <div className="text-xs text-muted-foreground">{desc}</div>}</div>
      {children}
    </div>
  );
}
function Toggle({ title, on, onChange }: { title: string; on: boolean; onChange: (v: boolean) => void }) {
  return <Row title={title}><Switch checked={on} onCheckedChange={onChange} aria-label={title} /></Row>;
}
function Info({ title, value }: { title: string; value: string }) {
  return <Row title={title} desc={value}><span className="text-xs text-muted-foreground">Read-only</span></Row>;
}
