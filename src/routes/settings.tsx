import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/app/bits";
import { Spot } from "@/components/app/Illustrations";
import { useJourney } from "@/lib/journey";
import { THEMES, useTheme } from "@/lib/theme";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Settings — Trellis" },
      { name: "description", content: "Notifications, school rules, your data, and onboarding." },
      { property: "og:title", content: "Settings — Trellis" },
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
        <p className="border-b p-4 text-xs text-muted-foreground">Only Path items can alert you. Grow and events never notify.</p>
        <Toggle title="Email me when my degree path needs attention" on={j.notify.email} onChange={(v) => j.setNotify("email", v)} />
        <Toggle title="Phone notifications for Path" on={j.notify.push} onChange={(v) => j.setNotify("push", v)} />
        <Toggle title="Weekly summary of degree deadlines" on={j.notify.digest} onChange={(v) => j.setNotify("digest", v)} />
      </Section>

      <Section title="Set by your school">
        <Info title="Counselor review" value="When sources disagree or a course rule needs a person to confirm" />
        <Info title="What Sprout can never do" value="Register, drop, waitlist, or send without your approval" />
        <Info title="Advice it won't give" value="Legal, financial-aid, or immigration" />
      </Section>

      <Section title="Profile">
        <Row title="Your card" desc="What other students see at events where you turn on Show me as going."><Button variant="outline" size="sm" asChild><Link to="/career" search={{ tab: "card" }}>Edit</Link></Button></Row>
      </Section>

      <Section title="Agent & data">
        <Row title="Controls" desc="Choose what Sprout does and reads."><Button variant="outline" size="sm" asChild><Link to="/agents" search={{ tab: "controls" }}>Open</Link></Button></Row>
        <Row title="Your sources" desc="Canvas, student system, degree audit, articulation, career center, email."><Button variant="outline" size="sm" asChild><Link to="/sources">Open</Link></Button></Row>
        <Row title="Download my data" desc="Everything Sprout read and produced."><Button variant="outline" size="sm" onClick={() => toast("Demo only: nothing was downloaded.")}>Download</Button></Row>
      </Section>

      <Section title="Demo">
        <Row title="Demo data" desc="Filled opens Maya's built path, events and notes. Fresh starts a new student with nothing built. Switching restarts the demo."><DemoFillPicker /></Row>
        <Row title="Replay onboarding" desc="See the first-time setup again."><Button variant="outline" size="sm" onClick={() => { j.replayOnboarding(); navigate({ to: "/welcome" }); }}>Replay</Button></Row>
        <Row title="Reset demo" desc="Put the registration story back to the start."><Button variant="outline" size="sm" onClick={() => { j.reset(); toast("Demo reset."); }}>Reset</Button></Row>
      </Section>
    </div>
  );
}

function DemoFillPicker() {
  const j = useJourney();
  return (
    <div role="group" aria-label="Demo data" className="flex shrink-0 gap-1 rounded-full bg-secondary p-1">
      {(["filled", "fresh"] as const).map((fill) => (
        <button key={fill} type="button" aria-pressed={j.demoFill === fill} onClick={() => { if (j.demoFill !== fill) { j.setDemoFill(fill); toast(fill === "filled" ? "Showing Maya's filled demo." : "Showing a fresh start."); } }} className={cn("rounded-full px-3 py-1 text-xs capitalize text-muted-foreground", j.demoFill === fill && "glass-active font-medium text-foreground")}>
          {fill}
        </button>
      ))}
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
