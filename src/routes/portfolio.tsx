import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, CheckCheck, Copy, Download, EyeOff, Link2, Lock, MoreHorizontal, Paperclip, Pencil, Search, Undo2 } from "lucide-react";
import { eventPlatforms, ledgerSkills, opportunities, student, type EventPlatform } from "@/data/scenario";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { attendance, sharedProfile, skillsFromEvents, timeline, wentTo, type Attendance, type Found } from "@/lib/experiences";
import { canExport, exportableSkills, resumeBullet } from "@/lib/skills";
import { skillsFromDoing } from "@/lib/opportunities";
import { portfolioSkills, type PortfolioSkill, type SkillSource } from "@/lib/portfolio";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/bits";
import { Accounts, ConnectDialog, DateBlock, PROOF_LINE, useFound, Via } from "@/components/app/EventBits";
import { PostingLink } from "@/components/app/PostingLink";
import { photoUrl } from "@/lib/photos";
import { Spot } from "@/components/app/Illustrations";
import { CourseLink, EvidenceIndicator } from "@/components/app/SkillsBits";
import { cn } from "@/lib/utils";
import mayaPhoto from "@/assets/maya.jpg";
import { people } from "@/data/people";
import { lowerFirst, notesFor } from "@/lib/event";

const TABS = ["skills", "timeline", "people", "share"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/portfolio")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab; event?: string } => ({
    ...(TABS.includes(s["tab"] as Tab) ? { tab: s["tab"] as Tab } : {}),
    ...(typeof s["event"] === "string" ? { event: s["event"] } : {}),
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Portfolio — Path Agent" },
      { name: "description", content: "What you've done, and what it proves. Private by default." },
      { property: "og:title", content: "Portfolio — Path Agent" },
      { property: "og:description", content: "Your skills, the classes and events behind them, and what you choose to share." },
    ],
  }),
  component: Portfolio,
});

/** A profile pick that isn't an event: the skills confirmed from classes. */
const CLASSES = "classes";

function Portfolio() {
  const j = useJourney();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { tab = "skills" } = search;
  const found = useFound();
  const [connecting, setConnecting] = useState<EventPlatform | null>(null);
  const waiting = found.filter((e) => attendance(e, SCRIPT_TODAY, j.eventChecks) === "ask").length;

  return (
    <div className={cn("mx-auto", tab === "skills" ? "max-w-7xl" : "max-w-4xl")}>
      <PageHeader title="Portfolio" sub="What you've done, and what it proves. Only you can see this." right={<Spot name="seedling" className="hidden w-28 sm:block" />} />
      <Tabs value={tab} onValueChange={(t) => navigate({ to: "/portfolio", search: t === "skills" ? {} : { tab: t as Tab }, replace: true, state: true })} className="mt-6">
        <TabsList className="rounded-full">
          <TabsTrigger value="skills" className="rounded-full">Skills</TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-full">Timeline{waiting > 0 && <span className="ml-1.5 grid size-5 place-items-center rounded-full count-badge text-[10px]" aria-label={`${waiting} waiting for you`}>{waiting}</span>}</TabsTrigger>
          <TabsTrigger value="people" className="rounded-full">People</TabsTrigger>
          <TabsTrigger value="share" className="rounded-full">Share</TabsTrigger>
        </TabsList>
        <TabsContent value="skills" className="mt-6"><SkillsTab found={found} waiting={waiting} /></TabsContent>
        <TabsContent value="timeline" className="mt-6">
          {found.length === 0 ? (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">Connect an event account and I'll gather what you've been to.</p>
              <Accounts onConnect={setConnecting} />
            </div>
          ) : <Timeline found={found} focus={search.event} />}
        </TabsContent>
        <TabsContent value="people" className="mt-6"><People /></TabsContent>
        <TabsContent value="share" className="mt-6 space-y-10"><Profile found={found} /><ResumeText /></TabsContent>
      </Tabs>
      <ConnectDialog platform={connecting} onClose={() => setConnecting(null)} />
    </div>
  );
}

const SOURCES: { id: SkillSource; label: string }[] = [{ id: "all", label: "All" }, { id: "classes", label: "Classes" }, { id: "events", label: "Events" }];

function SkillsTab({ found, waiting }: { found: Found[]; waiting: number }) {
  const j = useJourney();
  const [source, setSource] = useState<SkillSource>("all");
  const [showUnsure, setShowUnsure] = useState(false);
  const skills = useMemo(() => portfolioSkills(ledgerSkills, skillsFromEvents(found, SCRIPT_TODAY, j.eventChecks), skillsFromDoing(opportunities.filter((o) => j.savedOpportunities.includes(o.id)), Object.keys(j.wentTo)), j.skillReviews), [found, j.eventChecks, j.savedOpportunities, j.wentTo, j.skillReviews]);
  const matches = (s: PortfolioSkill) => source === "all" || s.proofs.some((p) => (source === "classes" ? p.type === "class" : p.type !== "class"));
  const visible = skills.filter((s) => !s.hidden);
  const shown = visible.filter((s) => matches(s) && !s.unsure);
  const unsure = visible.filter((s) => matches(s) && s.unsure);
  const hidden = skills.filter((s) => s.hidden);
  const themes = [...new Set(shown.map((s) => s.theme))];
  const confirmed = visible.filter((s) => s.confirmed).length;
  const confirmable = visible.filter((s) => !s.confirmed && !s.unsure);

  const confirmAll = () => {
    const keys = confirmable.flatMap((s) => s.reviewKeys);
    keys.forEach((k) => j.reviewSkill(k, { confirmed: true }));
    toast(`${confirmable.length} ${confirmable.length === 1 ? "skill" : "skills"} confirmed`, { action: { label: "Undo", onClick: () => keys.forEach((k) => j.reviewSkill(k, { confirmed: false })) } });
  };

  return (
    <div className="space-y-5">
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
      <div className="surface flex flex-wrap items-center gap-x-4 gap-y-3 p-5">
        <div className="min-w-48 flex-1">
          <h2 className="font-semibold">{confirmed} of {visible.length} skills confirmed</h2>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Skills confirmed" aria-valuemin={0} aria-valuemax={visible.length} aria-valuenow={confirmed}><div className="meter-fill aqua-chip h-full rounded-full" style={{ width: `${visible.length ? (confirmed / visible.length) * 100 : 0}%` }} /></div>
        </div>
        {confirmable.length > 0 && <Button size="sm" variant="outline" onClick={confirmAll}><CheckCheck className="size-3" />Confirm all</Button>}
      </div>
      {waiting > 0 && <Link to="/portfolio" search={{ tab: "timeline" }} className="flex items-center justify-between gap-3 rounded-xl bg-warning-soft px-5 py-3 text-sm">{waiting} past {waiting === 1 ? "event needs" : "events need"} your answer first <ArrowRight className="size-4" aria-hidden="true" /></Link>}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Where the proof comes from">
        {SOURCES.map((f) => <Button key={f.id} size="sm" variant={f.id === source ? "default" : "outline"} aria-pressed={f.id === source} onClick={() => setSource(f.id)}>{f.label}</Button>)}
      </div>
      <div key={source} className="stagger grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
        {themes.map((t) => (
          <section key={t} className="surface px-4 pt-4">
            <h2 className="border-b pb-3 font-semibold">{t} <span className="font-normal text-muted-foreground">· {shown.filter((s) => s.theme === t).length}</span></h2>
            <ul className="divide-y">{shown.filter((s) => s.theme === t).map((s) => <PortfolioSkillRow key={s.key} skill={s} />)}</ul>
          </section>
        ))}
      </div>
      {shown.length === 0 && <p className="py-10 text-center text-muted-foreground">No skills from {source} yet.</p>}
      {unsure.length > 0 && (
        <section className="surface border-dashed p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Not sure yet · {unsure.length}</h2>
            <Button variant="outline" size="sm" onClick={() => setShowUnsure((v) => !v)}><Search className="size-3" />{showUnsure ? "Collapse" : "Review these"}</Button>
          </div>
          {showUnsure && <ul className="divide-y">{unsure.map((s) => <PortfolioSkillRow key={s.key} skill={s} />)}</ul>}
        </section>
      )}
      {hidden.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Hidden skills</summary>
          {hidden.map((s) => <div key={s.key} className="mt-2 flex items-center gap-3">{s.name}<Button size="sm" variant="ghost" onClick={() => s.reviewKeys.forEach((k) => j.reviewSkill(k, { hidden: false }))}>Restore<ArrowRight className="size-3" /></Button></div>)}
        </details>
      )}
    </div>
  );
}

/** One row per skill, listing every class and event that proves it. */
function PortfolioSkillRow({ skill: s }: { skill: PortfolioSkill }) {
  const j = useJourney();
  const [dialog, setDialog] = useState<"wording" | "work" | null>(null);
  const [wording, setWording] = useState(s.name);
  const [work, setWork] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const review = (patch: Parameters<typeof j.reviewSkill>[1]) => s.reviewKeys.forEach((k) => j.reviewSkill(k, patch));
  const lines = s.proofs.flatMap((p) => (p.type === "class" ? [p] : []));
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1 basis-36">
          <div className="flex items-center gap-2"><h3 className="font-medium">{s.name}</h3>{s.confirmed && <Check className="size-3.5 text-mark-yes" aria-label="Confirmed" />}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {s.proofs.map((p, i) => (
              <span key={p.type === "class" ? p.code : p.type === "event" ? p.id : p.title}>
                {i > 0 && " · "}
                {p.type === "class" ? <>from <CourseLink course={p.code} /></> : p.type === "event" ? <>from <Link to="/portfolio" search={{ tab: "timeline", event: p.id }} className="underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground">{p.title}</Link></> : <>from <button type="button" onClick={() => j.openOpportunity(p.id)} className="underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground">{p.title}</button></>}
              </span>
            ))}
          </p>
          <div className="mt-2"><EvidenceIndicator level={s.level} /></div>
          {lines.length > 0 && <details className="mt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">See the syllabus line</summary>{lines.map((p) => <blockquote key={p.code} className="mt-2 rounded-xl bg-secondary p-3 leading-relaxed">“{p.quote}”<cite className="mt-1 block not-italic text-muted-foreground">{p.code} syllabus · {p.source} · synthetic</cite></blockquote>)}</details>}
          {s.work && <p className="mt-2 break-words text-xs text-muted-foreground"><Paperclip className="mr-1 inline size-3" aria-hidden="true" />{s.work}</p>}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={s.confirmed} onClick={() => { review({ confirmed: true }); toast("Saved to your skills"); }}><Check className="size-3" />{s.confirmed ? "Confirmed" : "Confirm"}</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`More actions for ${s.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setDialog("wording")}><Pencil />Edit wording</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog("work")}><Paperclip />Attach work</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => review({ hidden: true })}><EyeOff />Hide</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] bg-card sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialog === "wording" ? "Edit skill wording" : "Attach your work"}</DialogTitle><DialogDescription>{dialog === "wording" ? "Keep it true to what you did." : "Choose a file or paste a link."}</DialogDescription></DialogHeader>
          {dialog === "wording" ? <Input aria-label="Skill wording" value={wording} onChange={(e) => setWording(e.target.value)} /> : <><Input aria-label="Work link" placeholder="https://…" value={work} onChange={(e) => setWork(e.target.value)} /><Input aria-label="Work file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></>}
          <Button disabled={dialog === "wording" ? !wording.trim() : !file && !/^https?:\/\//.test(work)} onClick={() => { review(dialog === "wording" ? { wording: wording.trim() } : { work: file?.name || work, confirmed: true }); setDialog(null); toast("Saved to your skills"); }}>Save</Button>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function Timeline({ found, focus }: { found: Found[]; focus?: string | undefined }) {
  const j = useJourney();
  const { seasons } = timeline(found, SCRIPT_TODAY);
  useEffect(() => {
    if (!focus) return;
    const t = setTimeout(() => document.querySelector(`[data-event="${CSS.escape(focus)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 200);
    return () => clearTimeout(t);
  }, [focus]);
  if (seasons.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Events you've been to will show up here.</p>;
  return (
    <div className="space-y-10">
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
    <li data-event={e.id} className={cn("flex gap-4 p-5", a === "missed" && "opacity-60")}>
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

/** Everyone she's written a note about, with every note, newest event last. Private. */
function People() {
  const j = useJourney();
  const met = people.filter((p) => notesFor(p.id, j.event.notes).length > 0);
  return (
    <section>
      <p className="mb-3 text-sm text-muted-foreground">Notes you wrote after talking to someone. They come back when you'll see that person again.</p>
      <ul className="surface divide-y">
        {met.map((p) => {
          const notes = notesFor(p.id, j.event.notes);
          return (
            <li key={p.id} className="p-4">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.role}</div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {notes.map((n) => (
                  <li key={n.date}>
                    <span className="text-xs text-muted-foreground">{n.event} · {new Date(`${n.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
                    {n.text && <p>“{n.text}”</p>}
                    {n.promise && <p className="text-muted-foreground">You said you'd {lowerFirst(n.promise)}</p>}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
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
              {unconfirmed > 0 && <p className="mt-3 text-xs text-muted-foreground">{unconfirmed} more {unconfirmed === 1 ? "skill" : "skills"} will show once you confirm {unconfirmed === 1 ? "it" : "them"} in <Link to="/portfolio" className="underline">Skills</Link>.</p>}
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

function ResumeText() {
  const j = useJourney();
  const skills = exportableSkills(ledgerSkills, j.skillReviews);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [checked, setChecked] = useState(false);
  const selected = picked ?? skills.slice(0, 5).map((s) => s.id);
  const chosen = skills.filter((s) => selected.includes(s.id));
  const text = chosen.map((s) => `• ${resumeBullet(s, j.skillReviews[s.id])}`).join("\n");
  const allowed = canExport(checked, chosen.length);
  const copy = async (value: string) => {
    if (!allowed) return;
    try { await navigator.clipboard.writeText(value); toast("Copied reviewed text"); } catch { toast("Copy isn't available in this browser. Try Download."); }
  };
  const download = () => {
    if (!allowed) return;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "maya-reviewed-skills.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section>
      <h2 className="text-sm font-medium">Resume and LinkedIn text</h2>
      <p className="mt-1 text-xs text-muted-foreground">From the skills you've confirmed. Pick up to five.</p>
      <div className="mt-3 grid gap-6 lg:grid-cols-2">
        <ul className="surface divide-y">
          {skills.map((s) => (
            <li key={s.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
                <Checkbox checked={selected.includes(s.id)} disabled={!selected.includes(s.id) && selected.length >= 5} onCheckedChange={(v) => { setPicked(v ? [...selected, s.id] : selected.filter((id) => id !== s.id)); setChecked(false); }} />
                <span>{j.skillReviews[s.id]?.wording || s.name}<span className="block text-xs text-muted-foreground">{s.course}</span></span>
              </label>
            </li>
          ))}
          {!skills.length && <li className="p-4 text-sm text-muted-foreground">Confirm a skill first, and it'll show up here.</li>}
        </ul>
        <div>
          <div className="surface min-h-40 p-5">
            <ul className="space-y-4 text-sm leading-relaxed">{chosen.map((s) => <li key={s.id}>{resumeBullet(s, j.skillReviews[s.id])}</li>)}</ul>
            {!chosen.length && <p className="text-sm text-muted-foreground">Pick a skill to preview your text.</p>}
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm"><Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} />I've checked that this is accurate.</label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={!allowed} onClick={() => void copy(text)}><Copy className="size-4" />Copy text</Button>
            <Button disabled={!allowed} variant="outline" onClick={download}><Download className="size-4" />Download</Button>
            <Button disabled={!allowed} variant="outline" onClick={() => void copy(chosen.map((s) => j.skillReviews[s.id]?.wording || s.name).join(", "))}>Copy LinkedIn list</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
