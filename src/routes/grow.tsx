import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Check, EyeOff, Link2, Lock, Plus, Undo2 } from "lucide-react";
import { experiences, eventPlatforms, ledgerSkills, student, type EventPlatform } from "@/data/scenario";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { attendance, clashes, eventSkillKey, fromAccounts, sharedProfile, skillsFromEvents, timeline, wentTo, type Attendance, type Found } from "@/lib/experiences";
import { exportableSkills } from "@/lib/skills";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/bits";
import { PostingLink } from "@/components/app/PostingLink";
import { photoUrl } from "@/lib/photos";
import lumaLogo from "@/assets/luma-logo.png";
import eventbriteLogo from "@/assets/eventbrite-logo.png";
import handshakeLogo from "@/assets/handshake-logo.png";
import { AgentAvatar } from "@/components/app/Brand";
import { Ink } from "@/components/app/Ink";
import { Spot } from "@/components/app/Illustrations";
import { CourseLink, EvidenceIndicator } from "@/components/app/SkillsBits";
import { cn } from "@/lib/utils";
import mayaPhoto from "@/assets/maya.jpg";

const TABS = ["timeline", "skills", "profile"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/grow")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } => (TABS.includes(s["tab"] as Tab) ? { tab: s["tab"] as Tab } : {}),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Experiences — Path Agent" },
      { name: "description", content: "Events you've been to and what you got from them, from your own event accounts. Private by default." },
      { property: "og:title", content: "Experiences — Path Agent" },
      { property: "og:description", content: "A private record of your events and the skills they show." },
    ],
  }),
  component: Grow,
});

/** A profile pick that isn't an event: the skills confirmed on the Skills page. */
const CLASSES = "classes";
const PERSONAL: EventPlatform[] = ["luma", "eventbrite"];
const PROOF_LINE = { "checked-in": "Checked in", ticket: "Ticket", rsvp: "RSVP" } as const;

function useFound() {
  const j = useJourney();
  return useMemo(() => fromAccounts(experiences, [...j.eventAccounts, ...(j.access.handshake ? (["handshake"] as const) : [])]), [j.eventAccounts, j.access.handshake]);
}

function Grow() {
  const j = useJourney();
  const navigate = useNavigate();
  const { tab = "timeline" } = Route.useSearch();
  const found = useFound();
  const [connecting, setConnecting] = useState<EventPlatform | null>(null);
  const waiting = found.filter((e) => attendance(e, SCRIPT_TODAY, j.eventChecks) === "ask").length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Experiences" sub="The events you go to, and what they show you can do. Only you can see this." right={<Spot name="seedling" className="hidden w-28 sm:block" />} />
      <Accounts onConnect={setConnecting} />
      {found.length === 0 ? (
        <div className="surface mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <Spot name="flowers" className="w-32" />
          <h2 className="font-medium">Nothing here yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Connect an event account and I'll gather what you've been to and what's coming up.</p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={(t) => navigate({ to: "/grow", search: t === "timeline" ? {} : { tab: t as Tab }, replace: true })} className="mt-8">
          <TabsList className="rounded-full">
            <TabsTrigger value="timeline" className="rounded-full">Timeline{waiting > 0 && <span className="ml-1.5 grid size-5 place-items-center rounded-full count-badge text-[10px]" aria-label={`${waiting} waiting for you`}>{waiting}</span>}</TabsTrigger>
            <TabsTrigger value="skills" className="rounded-full">Skills</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-full">Profile</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-6"><Timeline found={found} /></TabsContent>
          <TabsContent value="skills" className="mt-6"><EventSkills found={found} /></TabsContent>
          <TabsContent value="profile" className="mt-6"><Profile found={found} /></TabsContent>
        </Tabs>
      )}
      <ConnectDialog platform={connecting} onClose={() => setConnecting(null)} />
    </div>
  );
}

const LOGOS: Record<EventPlatform, string> = { luma: lumaLogo, eventbrite: eventbriteLogo, handshake: handshakeLogo };

function PlatformMark({ platform, className }: { platform: EventPlatform; className?: string }) {
  return <img src={LOGOS[platform]} alt="" aria-hidden="true" className={cn("size-10 shrink-0 rounded-xl border object-cover", className)} />;
}

function Accounts({ onConnect }: { onConnect: (p: EventPlatform) => void }) {
  const j = useJourney();
  const count = (p: EventPlatform) => experiences.filter((e) => e.foundOn.some((f) => f.platform === p)).length;
  return (
    <section aria-label="Event accounts" className="grid gap-3 sm:grid-cols-3">
      {PERSONAL.map((p) => {
        const on = j.eventAccounts.includes(p);
        return (
          <div key={p} className="surface flex flex-col items-start gap-3 p-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <PlatformMark platform={p} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium">{eventPlatforms[p].name}{on && <Check className="size-3.5 text-mark-yes" aria-label="Connected" />}</div>
                <div className="text-xs text-muted-foreground">{on ? `${count(p)} events · read only` : eventPlatforms[p].what}</div>
              </div>
            </div>
            {on ? (
              <Button variant="ghost" size="sm" className="-ml-2 h-7 text-xs text-muted-foreground" onClick={() => j.unlinkEventAccount(p, eventPlatforms[p].name)}>Disconnect</Button>
            ) : (
              <Button variant="outline" size="sm" className="h-7" onClick={() => onConnect(p)}><Plus className="size-3.5" />Connect</Button>
            )}
          </div>
        );
      })}
      <div className="surface flex flex-col items-start gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <PlatformMark platform="handshake" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium">Handshake{j.access.handshake && <Check className="size-3.5 text-mark-yes" aria-label="Connected" />}</div>
            <div className="text-xs text-muted-foreground">{j.access.handshake ? `Through Bayview · ${count("handshake")} events` : "Off in your sources"}</div>
          </div>
        </div>
        {!j.access.handshake && <Button variant="outline" size="sm" className="h-7" asChild><Link to="/sources">Turn on in sources</Link></Button>}
      </div>
    </section>
  );
}

type Step = "ask" | "signing" | "reading";

function ConnectDialog({ platform, onClose }: { platform: EventPlatform | null; onClose: () => void }) {
  const j = useJourney();
  const [step, setStep] = useState<Step>("ask");
  const info = platform ? eventPlatforms[platform] : null;
  const found = platform ? experiences.filter((e) => e.foundOn.some((f) => f.platform === platform)).length : 0;

  useEffect(() => {
    if (!platform || step === "ask") return;
    const t = setTimeout(() => {
      if (step === "signing") return setStep("reading");
      j.linkEventAccount(platform, eventPlatforms[platform].name, found);
      toast(`Found ${found} events on ${eventPlatforms[platform].name}`);
      onClose();
    }, step === "signing" ? 1100 : 1400);
    return () => clearTimeout(t);
  }, [platform, step, found, j, onClose]);

  useEffect(() => { if (platform) setStep("ask"); }, [platform]);

  return (
    <Dialog open={!!platform} onOpenChange={(v) => { if (!v && step === "ask") onClose(); }}>
      <DialogContent className="brand-app sm:max-w-md">
        {platform && info && (
          <>
            <div className="flex items-center gap-3"><PlatformMark platform={platform} /><DialogTitle>Connect {info.name}</DialogTitle></div>
            <DialogDescription>You sign in on {info.signIn}, so Path Agent never sees your password.</DialogDescription>
            {step === "ask" ? (
              <>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-secondary p-3"><div className="mb-1.5 text-xs font-medium text-muted-foreground">Path Agent can read</div><ul className="space-y-1"><li>Events you registered for</li><li>Check-ins, if the host scans you</li><li>Event descriptions</li></ul></div>
                  <div className="rounded-xl bg-secondary p-3"><div className="mb-1.5 text-xs font-medium text-muted-foreground">It can't</div><ul className="space-y-1"><li>Register or RSVP for you</li><li>Message hosts or guests</li><li>See payments</li></ul></div>
                </div>
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Not now</Button><Button onClick={() => setStep("signing")}>Continue to {info.signIn}</Button></div>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-secondary p-4 text-sm" role="status">
                <Ink className="size-5" />
                <span key={step} className="swap-enter">{step === "signing" ? `Waiting for you to sign in on ${info.signIn}…` : `Reading your ${info.name} events…`}</span>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DateBlock({ date, className }: { date: string; className?: string }) {
  const d = new Date(`${date}T12:00:00Z`);
  return (
    <div className={cn("grid w-12 shrink-0 place-items-center rounded-xl border bg-card py-1.5 text-center leading-none", className)}>
      <span className="text-[10px] font-medium uppercase text-muted-foreground">{d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}</span>
      <span className="mt-1 text-lg font-semibold">{d.getUTCDate()}</span>
    </div>
  );
}

function Via({ e }: { e: Found }) {
  return <span>{e.via.map((p) => eventPlatforms[p].name).join(" and ")}</span>;
}

function Timeline({ found }: { found: Found[] }) {
  const j = useJourney();
  const { upcoming, seasons } = timeline(found, SCRIPT_TODAY);
  const clash = clashes(upcoming);
  return (
    <div className="space-y-10">
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium">Coming up</h2>
          <div className="stagger grid gap-3 sm:grid-cols-2">
            {upcoming.map((e) => (
              <article key={e.id} className="surface flex flex-col overflow-hidden">
                <div className="relative h-36 shrink-0">
                  <img src={photoUrl(e.photo, 640)} alt="" loading="lazy" className="size-full object-cover" />
                  <DateBlock date={e.date} className="absolute left-4 top-4 shadow-soft" />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="min-w-0">
                    <h3 className="font-medium leading-snug">{e.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{e.host} · {e.time} · {e.place}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{PROOF_LINE[e.proof]} on <Via e={e} /></p>
                  </div>
                {e.prep && <p className="flex items-start gap-2 text-sm"><AgentAvatar agent="planner" className="size-6 shrink-0" />{e.prep}</p>}
                {clash[e.id] && <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />Overlaps with {clash[e.id]!.title} at {clash[e.id]!.time}. You might pick one.</p>}
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1">
                    <PostingLink item={e} />
                    {e.opportunityId && <Link to="/explore" search={{ open: e.opportunityId }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">In Opportunities <ArrowRight className="size-3" /></Link>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {seasons.map((s) => (
        <section key={s.season}>
          <h2 className="mb-3 text-sm font-medium">{s.season}</h2>
          <ol className="surface divide-y">
            {s.events.map((e) => <PastEvent key={e.id} e={e} a={attendance(e, SCRIPT_TODAY, j.eventChecks)} />)}
          </ol>
        </section>
      ))}
    </div>
  );
}

function PastEvent({ e, a }: { e: Found; a: Attendance }) {
  const j = useJourney();
  const went = wentTo(a);
  return (
    <li className={cn("flex gap-4 p-5", a === "missed" && "opacity-60")}>
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-32">
        <img src={photoUrl(e.photo, 280)} alt="" loading="lazy" className="size-full object-cover" />
        <DateBlock date={e.date} className="absolute bottom-1.5 left-1.5 w-10 py-1 [&>span:last-child]:text-sm" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-medium">{e.title}</h3>
          <span className="text-xs text-muted-foreground">{e.kind} · {e.role}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{e.host} · {e.place}</p>
        {e.outcome && went && <p className="mt-2 text-sm">{e.outcome}</p>}
        {went && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {e.skills.map((s) => <span key={s.id} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{s.name}</span>)}
          </div>
        )}
        <details className="mt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">See the listing line</summary><blockquote className="mt-2 rounded-xl bg-secondary p-3 leading-relaxed">“{e.listing}”<cite className="mt-1 block not-italic text-muted-foreground">{eventPlatforms[e.via[0]!].name} listing · synthetic</cite></blockquote></details>
        <PostingLink item={e} className="mt-2" />
        <div className="mt-3 text-xs text-muted-foreground">
          {a === "checked-in" && <span className="inline-flex items-center gap-1"><Check className="size-3.5 text-mark-yes" />Checked in on <Via e={e} /></span>}
          {a === "ask" && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-foreground">
              <span className="min-w-[12rem] flex-1">Your {PROOF_LINE[e.proof].toLowerCase()} on <Via e={e} /> doesn't show if you went. Did you?</span>
              <span className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" className="h-7" onClick={() => j.checkEvent(e.id, "went")}>I went</Button>
                <Button size="sm" variant="ghost" className="h-7" onClick={() => j.checkEvent(e.id, "missed")}>I didn't go</Button>
              </span>
            </div>
          )}
          {(a === "confirmed" || a === "missed") && (
            <span className="inline-flex items-center gap-2">{a === "confirmed" ? <><Check className="size-3.5 text-mark-yes" />You said you went</> : "You said you didn't go"}<button type="button" onClick={() => j.checkEvent(e.id, null)} className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"><Undo2 className="size-3" />Undo</button></span>
          )}
        </div>
      </div>
    </li>
  );
}

function EventSkills({ found }: { found: Found[] }) {
  const j = useJourney();
  const skills = skillsFromEvents(found, SCRIPT_TODAY, j.eventChecks).filter((s) => !j.skillReviews[eventSkillKey(s.id)]?.hidden);
  const waiting = found.filter((e) => attendance(e, SCRIPT_TODAY, j.eventChecks) === "ask").length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Only from events you went to, using what each listing says happens there. Nothing counts until you confirm it.</p>
      {waiting > 0 && <Link to="/grow" className="flex items-center justify-between gap-3 rounded-xl bg-warning-soft px-4 py-3 text-sm">{waiting} past {waiting === 1 ? "event needs" : "events need"} your answer first <ArrowRight className="size-4" /></Link>}
      <ul className="surface divide-y">
        {skills.map((s) => {
          const key = eventSkillKey(s.id);
          const confirmed = j.skillReviews[key]?.confirmed;
          return (
            <li key={s.id} className="flex flex-wrap items-start gap-4 p-5">
              <div className="min-w-0 flex-1 basis-64">
                <div className="flex items-center gap-2"><h3 className="font-medium">{s.name}</h3>{confirmed && <Check className="size-3.5 text-mark-yes" aria-label="Confirmed" />}</div>
                <div className="mt-2"><EvidenceIndicator level={s.level} /></div>
                <p className="mt-2 text-xs text-muted-foreground">From {s.events.map((e) => e.title).join(", ")}</p>
                {s.courses.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Also in {s.courses.map((c, i) => <span key={c}>{i > 0 && ", "}<CourseLink course={c} /></span>)}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={confirmed} onClick={() => { j.reviewSkill(key, { confirmed: true }); toast("Saved to your skills"); }}><Check className="size-3" />{confirmed ? "Confirmed" : "Confirm"}</Button>
                <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={`Hide ${s.name}`} title="Hide" onClick={() => j.reviewSkill(key, { hidden: true })}><EyeOff className="size-3.5" /></Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Profile({ found }: { found: Found[] }) {
  const j = useJourney();
  const attendedList = found.filter((e) => wentTo(attendance(e, SCRIPT_TODAY, j.eventChecks))).sort((a, b) => b.date.localeCompare(a.date));
  const shared = sharedProfile(found, SCRIPT_TODAY, j.eventChecks, j.skillReviews, j.profilePicks);
  const courseSkills = exportableSkills(ledgerSkills, j.skillReviews);
  const showClasses = j.profilePicks.includes(CLASSES) && courseSkills.length > 0;
  const unconfirmed = skillsFromEvents(shared.experiences, SCRIPT_TODAY, j.eventChecks).length - shared.skills.length;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section>
        <h2 className="text-sm font-medium">Pick what to share</h2>
        <p className="mt-1 text-xs text-muted-foreground">Nothing is shared until you pick it. Events you didn't go to can't be picked.</p>
        <ul className="surface mt-3 divide-y">
          {attendedList.map((e) => (
            <li key={e.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                <Checkbox checked={j.profilePicks.includes(e.id)} onCheckedChange={() => j.toggleProfilePick(e.id)} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{e.title}</span><span className="text-xs text-muted-foreground">{e.role} · {new Date(`${e.date}T12:00:00Z`).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}</span></span>
              </label>
            </li>
          ))}
          {courseSkills.length > 0 && (
            <li>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                <Checkbox checked={showClasses} onCheckedChange={() => j.toggleProfilePick(CLASSES)} />
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Skills from your classes</span><span className="text-xs text-muted-foreground">{courseSkills.length} you've confirmed</span></span>
              </label>
            </li>
          )}
        </ul>
        <div className="surface mt-4 flex items-start gap-3 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary">{j.profileLink ? <Link2 className="size-4" /> : <Lock className="size-4" />}</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{j.profileLink ? "Private link on" : "Only you"}</div>
            <p className="text-xs text-muted-foreground">{j.profileLink ? "Anyone you give the link to sees what you picked. It's never listed or searchable." : "Turn on a link when you want a counselor or employer to see it."}</p>
            {j.profileLink && <p className="mt-2 truncate rounded-lg bg-secondary px-2.5 py-1.5 font-mono text-xs">path-agent.example/p/maya-4f7k · demo only</p>}
          </div>
          <Switch checked={j.profileLink} onCheckedChange={j.setProfileLink} aria-label="Private link to your profile" className="shrink-0" />
        </div>
      </section>

      <section aria-label="What someone with the link sees">
        <h2 className="text-sm font-medium">What they'd see</h2>
        <article className="surface mt-3 p-6">
          <div className="flex items-center gap-3">
            <img src={mayaPhoto} alt="" className="size-12 rounded-full object-cover" />
            <div><div className="font-medium">{student.name}</div><div className="text-xs text-muted-foreground">Psychology · Bayview CC, transferring to Northgate State</div></div>
          </div>
          {shared.experiences.length === 0 && !showClasses ? (
            <p className="mt-6 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">Nothing picked yet. This is all anyone would see.</p>
          ) : (
            <>
              {shared.experiences.length > 0 && <h3 className="mt-6 text-xs font-medium text-muted-foreground">Experience</h3>}
              <ul className="mt-2 space-y-3">
                {shared.experiences.map((e) => (
                  <li key={e.id} className="swap-enter text-sm"><div className="font-medium">{e.role === "Attended" ? e.title : `${e.role}, ${e.title}`}</div><div className="text-xs text-muted-foreground">{e.host} · {new Date(`${e.date}T12:00:00Z`).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}</div>{e.outcome && <div className="mt-0.5 text-xs">{e.outcome}</div>}</li>
                ))}
              </ul>
              {shared.skills.length > 0 && (
                <>
                  <h3 className="mt-6 text-xs font-medium text-muted-foreground">Skills shown at these events</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">{shared.skills.map((s) => <span key={s.id} className="aqua-chip rounded-full px-2.5 py-0.5 text-xs">{s.name}</span>)}</div>
                </>
              )}
              {unconfirmed > 0 && <p className="mt-3 text-xs text-muted-foreground">{unconfirmed} more {unconfirmed === 1 ? "skill" : "skills"} will show once you confirm {unconfirmed === 1 ? "it" : "them"} in <Link to="/grow" search={{ tab: "skills" }} className="underline">Skills</Link>.</p>}
            </>
          )}
          {showClasses && (
            <>
              <h3 className="mt-6 text-xs font-medium text-muted-foreground">From classes</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">{courseSkills.map((s) => <span key={s.id} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{s.name}</span>)}</div>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
