import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/app/bits";
import { Spot } from "@/components/app/Illustrations";
import { useJourney } from "@/lib/journey";
import { CONFIDENCE_THRESHOLD } from "@/lib/confidence";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Settings — Academic Path Agent" },
      { name: "description", content: "Notifications, school rules, your data, and onboarding." },
      { property: "og:title", content: "Settings — Academic Path Agent" },
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

      <Section title="Notifications">
        <Toggle title="Email me when a plan needs attention" on={j.notify.email} onChange={(v) => j.setNotify("email", v)} />
        <Toggle title="Phone notifications" on={j.notify.push} onChange={(v) => j.setNotify("push", v)} />
        <Toggle title="Weekly summary of deadlines" on={j.notify.digest} onChange={(v) => j.setNotify("digest", v)} />
      </Section>

      <Section title="Set by your school">
        <Info title="Counselor review threshold" value={`Below ${Math.round(CONFIDENCE_THRESHOLD * 100)}% confidence, or when sources disagree`} />
        <Info title="What the agent can never do" value="Register, drop, waitlist, or send without your approval" />
        <Info title="Advice it won't give" value="Legal, financial-aid, or immigration" />
      </Section>

      <Section title="Agent & data">
        <Row title="Agent controls" desc="Turn agents on or off and choose what they read."><Button variant="outline" size="sm" asChild><Link to="/permissions">Open</Link></Button></Row>
        <Row title="Connected sources" desc="Canvas, student system, degree audit, articulation, career center, email."><Button variant="outline" size="sm" asChild><Link to="/sources">Open</Link></Button></Row>
        <Row title="Download my data" desc="Everything the agent read and produced."><Button variant="outline" size="sm" onClick={() => toast("Demo only: nothing was downloaded.")}>Download</Button></Row>
      </Section>

      <Section title="Demo">
        <Row title="Replay onboarding" desc="See the first-time setup again."><Button variant="outline" size="sm" onClick={() => { j.replayOnboarding(); navigate({ to: "/welcome" }); }}>Replay</Button></Row>
        <Row title="Reset demo" desc="Put the registration story back to the start."><Button variant="outline" size="sm" onClick={() => { j.reset(); toast("Demo reset."); }}>Reset</Button></Row>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-medium">{title}</h2>
      <div className="divide-y rounded-2xl border">{children}</div>
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
