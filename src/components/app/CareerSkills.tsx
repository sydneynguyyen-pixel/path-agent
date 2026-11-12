import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, CalendarCheck, CheckCheck, Copy, Download, EyeOff, FileText, FlaskConical, Lightbulb, MessageSquareText, MoreHorizontal, Paperclip, Pencil, Plus, Sparkles, Wrench, X, type LucideIcon } from "lucide-react";
import { careerRoles, skillCourses, type EventPlatform } from "@/data/scenario";
import { SCRIPT_TODAY, useJourney, type OwnSkill } from "@/lib/journey";
import { attendance, type Found } from "@/lib/experiences";
import { linkedinSections } from "@/lib/skills";
import { chosenGoals } from "@/lib/goals";
import type { PortfolioSkill, SkillSource } from "@/lib/portfolio";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Accounts, PROOF_LINE, Via } from "@/components/app/EventBits";
import { EventMark } from "@/components/app/ItemMark";
import { CourseLink, EvidenceIndicator } from "@/components/app/SkillsBits";
import { usePortfolioSkills } from "@/hooks/use-portfolio-skills";
import { GrowCheck } from "@/components/app/GrowCheck";
import { useConfirmCascade } from "@/components/app/GrowSkills";
import { TOOLS } from "@/components/app/PathCard";
import { Link } from "@tanstack/react-router";

const useSkills = usePortfolioSkills;

const SOURCES: { id: SkillSource; label: string }[] = [{ id: "all", label: "All" }, { id: "classes", label: "Classes" }, { id: "events", label: "Events" }];

const THEME_ICON: Record<string, LucideIcon> = { "Research and data": FlaskConical, "Writing and communication": MessageSquareText, "Analysis and critical thinking": Lightbulb, Tools: Wrench };
const proofNames = (s: PortfolioSkill) => [...new Set(s.proofs.map((p) => (p.type === "class" ? p.code : p.title)))].slice(0, 3).join(", ");

/** Past events with no check-in. Stays until each one is answered, or until "Ask me later". */
function DidYouGo({ found, onConnect }: { found: Found[]; onConnect: (p: EventPlatform) => void }) {
  const j = useJourney();
  if (found.length === 0) return <section className="surface p-6"><h2 className="font-semibold">Add events you've been to</h2><p className="mt-1 text-sm text-muted-foreground">Connect an event account and I'll gather what you've been to.</p><div className="mt-4"><Accounts onConnect={onConnect} /></div></section>;
  const asks = found.filter((e) => attendance(e, SCRIPT_TODAY, j.eventChecks) === "ask").sort((a, b) => b.date.localeCompare(a.date));
  if (asks.length === 0) return null;
  // Snoozed, it shrinks to one quiet link instead of a box.
  if (j.homeCleared["did-you-go"] === "snoozed") return (
    <button type="button" onClick={() => j.restoreHomeItem("did-you-go")} className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
      <CalendarCheck className="size-4" aria-hidden="true" />{asks.length} past {asks.length === 1 ? "event" : "events"} to answer
    </button>
  );
  return <DidYouGoNotice asks={asks} />;
}

/** A notification, not a panel: one line with a close button. "Answer" opens the events in the same notice. */
function DidYouGoNotice({ asks }: { asks: Found[] }) {
  const j = useJourney();
  const [open, setOpen] = useState(false);
  const went = (e: Found) => { j.checkEvent(e.id, "went"); toast(`Skills from ${e.title} added`, { action: { label: "Undo", onClick: () => j.checkEvent(e.id, null) } }); };
  return (
    <section aria-labelledby="did-you-go" className="notice max-w-3xl">
      <div className="flex items-center gap-3 py-2.5 pr-2.5 pl-3">
        <span className="flex shrink-0 -space-x-2" aria-hidden="true">{asks.slice(0, 3).map((e) => <EventMark key={e.id} photo={e.photo} className="size-8 rounded-lg ring-2 ring-card" />)}</span>
        <p id="did-you-go" className="min-w-0 flex-1 text-sm"><span className="font-medium">Did you go to {asks.length === 1 ? "this event" : `${asks.length} past events`}?</span> <span className="text-muted-foreground">No check-in, so their skills don't count yet.</span></p>
        <Button size="sm" variant="outline" className="shrink-0 rounded-full" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Answer"}</Button>
        <button type="button" onClick={() => j.clearHomeItem("did-you-go", "snoozed")} aria-label="Ask me later" title="Ask me later" className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground"><X className="size-4" aria-hidden="true" /></button>
      </div>
      {open && (
        <ul className="divide-y border-t">
          {asks.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <EventMark photo={e.photo} />
              <div className="min-w-0 flex-1 basis-40 text-sm"><div className="font-medium">{e.title}</div><div className="text-muted-foreground">{new Date(`${e.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} · {PROOF_LINE[e.proof]} on <Via e={e} /></div></div>
              <span className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => went(e)}>I went</Button>
                <Button size="sm" variant="ghost" onClick={() => j.checkEvent(e.id, "missed")}>I didn't</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const WHERE: { id: OwnSkill["where"]; label: string }[] = [{ id: "class", label: "A class" }, { id: "event", label: "An event" }, { id: "work", label: "A club or job" }, { id: "own", label: "On my own" }];

/** A skill Sprout didn't find. It's marked as added by you and never shown as verified. */
function AddSkill() {
  const j = useJourney();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [where, setWhere] = useState<OwnSkill["where"]>("own");
  const [detail, setDetail] = useState("");
  const [link, setLink] = useState("");
  const save = () => {
    j.addOwnSkill({ name: name.trim(), where, detail: detail.trim(), ...(link.trim() ? { link: link.trim() } : {}) });
    toast(`${name.trim()} added`);
    setOpen(false); setName(""); setDetail(""); setLink(""); setWhere("own");
  };
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden="true" />Add a skill</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] bg-card sm:max-w-lg">
          <DialogHeader><DialogTitle>Add a skill</DialogTitle><DialogDescription>For something I didn't find. It shows as added by you, not verified.</DialogDescription></DialogHeader>
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (name.trim()) save(); }}>
            <label className="block text-sm font-medium">Skill<Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Figma, Spanish, event planning…" /></label>
            <fieldset><legend className="text-sm font-medium">Where you used it</legend>
              <div className="mt-1.5 grid grid-cols-2 gap-2">{WHERE.map((w) => <button key={w.id} type="button" aria-pressed={where === w.id} onClick={() => setWhere(w.id)} className="pick-chip">{w.label}</button>)}</div>
            </fieldset>
            <label className="block text-sm font-medium">What you did <span className="font-normal text-muted-foreground">(optional)</span><Input className="mt-1.5" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Designed flyers for the Psych Club" /></label>
            <label className="block text-sm font-medium">Link to your work <span className="font-normal text-muted-foreground">(optional)</span><Input className="mt-1.5" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /></label>
            <Button type="submit" disabled={!name.trim()} className="w-full">Add skill</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Everything she has proof for, on the Career page under her goals. Resume and LinkedIn text is a sheet, not a page. */
export function CareerSkills({ found, onConnect, resumeOpen, onResume }: { found: Found[]; onConnect: (p: EventPlatform) => void; resumeOpen: boolean; onResume: (open: boolean) => void }) {
  const j = useJourney();
  const [source, setSource] = useState<SkillSource>("all");
  const [showUnsure, setShowUnsure] = useState(false);
  const skills = useSkills(found);
  const goal = chosenGoals(careerRoles, j.interestedRoles)[0];
  const goalNames = new Set(goal ? [...goal.why, ...goal.missing].map((n) => n.toLowerCase()) : []);
  const matches = (s: PortfolioSkill) => source === "all" || s.proofs.some((p) => (source === "classes" ? p.type === "class" : p.type !== "class"));
  const visible = skills.filter((s) => !s.hidden);
  const sure = visible.filter((s) => !s.unsure);
  // Order never changes when she answers, so a row doesn't jump out from under her.
  const shown = sure.filter(matches);
  const unsure = visible.filter((s) => matches(s) && s.unsure);
  const hidden = skills.filter((s) => s.hidden);
  const themes = [...new Set(shown.map((s) => s.theme))];
  const confirmable = sure.filter((s) => !s.confirmed);

  // Rows check one after another (and uncheck in reverse on Undo), so she sees each one land.
  const cascade = useConfirmCascade(j.reviewSkill);
  const confirmAll = () => {
    const rows = [...confirmable];
    cascade(rows, true);
    toast(`${rows.length} ${rows.length === 1 ? "skill" : "skills"} confirmed`, { description: "They can go on your card and resume now.", action: { label: "Undo", onClick: () => cascade(rows, false) } });
  };

  return (
    <div className="space-y-8">
      <section aria-labelledby="all-skills" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1 basis-72">
            <h2 id="all-skills" className="sr-only">Your skills</h2>
            <p className="text-sm text-muted-foreground">Sprout finds them in your syllabi and the events you went to. Nothing counts until you say you really did it. {confirmable.length > 0 ? `${confirmable.length} waiting for you.` : "You're all caught up."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {confirmable.length > 0 && <Button size="sm" variant="outline" onClick={confirmAll}><CheckCheck className="size-4" aria-hidden="true" />Confirm all {confirmable.length}</Button>}
            <AddSkill />
            <Button size="sm" onClick={() => onResume(true)}><FileText className="size-4" aria-hidden="true" />Use on resume</Button>
          </div>
        </div>
        <DidYouGo found={found} onConnect={onConnect} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Where the proof comes from">
          {SOURCES.map((f) => <Button key={f.id} size="sm" variant={f.id === source ? "default" : "outline"} aria-pressed={f.id === source} onClick={() => setSource(f.id)} className="rounded-full">{f.label}</Button>)}
        </div>
        <div key={source} className="stagger skill-columns">
          {themes.map((t) => {
            const Icon = THEME_ICON[t] ?? Sparkles;
            const list = shown.filter((s) => s.theme === t);
            return (
              <section key={t} className="surface p-6">
                <h3 className="flex items-center gap-3 font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-muted"><Icon className="size-4" aria-hidden="true" /></span>{t}<span className="ml-auto text-sm font-normal text-muted-foreground">{list.length} {list.length === 1 ? "skill" : "skills"}</span></h3>
                <ul className="mt-3 divide-y">{list.map((s) => <PortfolioSkillRow key={s.key} skill={s} forGoal={goal && goalNames.has(s.name.toLowerCase()) ? goal.title : undefined} />)}</ul>
              </section>
            );
          })}
          {j.ownSkills.length > 0 && (
            <section className="surface p-6">
              <h3 className="flex items-center gap-3 font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-muted"><Pencil className="size-4" aria-hidden="true" /></span>Added by you</h3>
              <ul className="mt-3 divide-y">{j.ownSkills.map((o) => (
                <li key={o.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1"><div className="font-medium">{o.name}</div><p className="text-sm text-muted-foreground">{[WHERE.find((w) => w.id === o.where)?.label, o.detail].filter(Boolean).join(" · ")}</p>{o.link && <a href={o.link} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4">Your work</a>}</div>
                  <Button size="sm" variant="ghost" onClick={() => j.removeOwnSkill(o.id)}>Remove</Button>
                </li>
              ))}</ul>
            </section>
          )}
          <ToolsCard />
        </div>
        {shown.length === 0 && <p className="py-10 text-center text-muted-foreground">No skills from {source} yet.</p>}
      </section>
      {unsure.length > 0 && (
        <section className="surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1 basis-72"><h2 className="font-semibold">Sprout isn't sure about {unsure.length === 1 ? "this one" : `these ${unsure.length}`}</h2><p className="mt-1 text-sm text-muted-foreground">The syllabus only mentions {unsure.length === 1 ? "it" : "them"} in passing, so {unsure.length === 1 ? "it doesn't" : "they don't"} count unless you say you did {unsure.length === 1 ? "it" : "them"}.</p></div>
            <Button variant="outline" size="sm" onClick={() => setShowUnsure((v) => !v)}>{showUnsure ? "Hide" : unsure.length === 1 ? "Take a look" : `Look at all ${unsure.length}`}</Button>
          </div>
          {showUnsure && <ul className="mt-3 divide-y">{unsure.map((s) => <PortfolioSkillRow key={s.key} skill={s} />)}</ul>}
        </section>
      )}
      {hidden.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Skills you hid</summary>
          {hidden.map((s) => <div key={s.key} className="mt-2 flex items-center gap-3">{s.name}<Button size="sm" variant="ghost" onClick={() => s.reviewKeys.forEach((k) => j.reviewSkill(k, { hidden: false }))}>Restore<ArrowRight className="size-3" /></Button></div>)}
        </details>
      )}
      <Dialog open={resumeOpen} onOpenChange={onResume}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto bg-card sm:max-w-5xl">
          <DialogHeader><DialogTitle>Use on resume or LinkedIn</DialogTitle><DialogDescription>Text made from skills you confirmed. Copy it and edit it to sound like you.</DialogDescription></DialogHeader>
          <ResumeText found={found} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Software she uses or is learning, the same list her card picks from. */
function ToolsCard() {
  const using = TOOLS.filter((t) => !t.later);
  const learning = TOOLS.filter((t) => t.later);
  return (
    <section className="surface p-6">
      <h3 className="flex items-center gap-3 font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-muted"><Wrench className="size-4" aria-hidden="true" /></span>Software and tools<span className="ml-auto text-sm font-normal text-muted-foreground">{TOOLS.length} tools</span></h3>
      <ul className="mt-3 divide-y">
        {[...using, ...learning].map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <span className="pc-tl pc-tl-lg shrink-0" style={{ background: t.bg }}>{t.logo}</span>
            <div className="min-w-0 flex-1"><div className="font-medium">{t.name}</div><p className="text-sm text-muted-foreground">{t.from}</p></div>
            {t.later && <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">Learning</span>}
          </li>
        ))}
      </ul>
      <Link to="/career" search={{ tab: "card" }} className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">Choose which go on your card<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
    </section>
  );
}

/** One row per skill, listing every class and event that proves it. */
function PortfolioSkillRow({ skill: s, forGoal }: { skill: PortfolioSkill; forGoal?: string | undefined }) {
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
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{s.name}</h3>{forGoal && <span className="rounded-full aqua-chip px-2 py-0.5 text-[11px] font-medium">{forGoal} skill</span>}</div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {s.proofs.map((p, i) => (
              <span key={p.type === "class" ? p.code : p.type === "event" ? p.id : p.title}>
                {i > 0 && " · "}
                {p.type === "class" ? <>from <CourseLink course={p.code} /></> : p.type === "event" ? <>from {p.title}</> : <>from <button type="button" onClick={() => j.openOpportunity(p.id)} className="underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground">{p.title}</button></>}
              </span>
            ))}
          </p>
          <div className="mt-2"><EvidenceIndicator level={s.level} /></div>
          {lines.length > 0 && <details className="mt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">See the syllabus line</summary>{lines.map((p) => <blockquote key={p.code} className="mt-2 rounded-xl bg-secondary p-3 leading-relaxed">“{p.quote}”<cite className="mt-1 block not-italic text-muted-foreground">{p.code} syllabus · {p.source} · synthetic</cite></blockquote>)}</details>}
          {s.work && <p className="mt-2 break-words text-xs text-muted-foreground"><Paperclip className="mr-1 inline size-3" aria-hidden="true" />{s.work}</p>}
        </div>
        <div className="flex items-center gap-1">
          {s.confirmed
            ? <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-success-soft px-3 text-xs font-medium"><GrowCheck on={s.confirmed} className="size-3.5" />Confirmed</span>
            : <Button size="sm" onClick={() => { review({ confirmed: true }); toast(`${s.name} confirmed`, { description: "It can go on your card and resume now.", action: { label: "Undo", onClick: () => review({ confirmed: false }) } }); }}>Yes, I did this</Button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`More actions for ${s.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setDialog("wording")}><Pencil />Edit wording</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog("work")}><Paperclip />Attach work</DropdownMenuItem>
              {s.confirmed && <DropdownMenuItem onSelect={() => review({ confirmed: false })}><X />Unconfirm</DropdownMenuItem>}
              <DropdownMenuItem onSelect={() => review({ hidden: true })}><EyeOff />I didn't do this, hide it</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] bg-card sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialog === "wording" ? "Edit skill wording" : "Attach your work"}</DialogTitle><DialogDescription>{dialog === "wording" ? "Keep it true to what you did." : "Choose a file or paste a link."}</DialogDescription></DialogHeader>
          {dialog === "wording" ? <Input aria-label="Skill wording" value={wording} onChange={(e) => setWording(e.target.value)} /> : <><Input aria-label="Work link" placeholder="https://…" value={work} onChange={(e) => setWork(e.target.value)} /><Input aria-label="Work file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></>}
          <Button disabled={dialog === "wording" ? !wording.trim() : !file && !/^https?:\/\//.test(work)} onClick={() => { review(dialog === "wording" ? { wording: wording.trim() } : { work: file?.name || work, confirmed: true }); setDialog(null); toast(dialog === "wording" ? "Wording saved" : "Work attached and skill confirmed"); }}>Save</Button>
        </DialogContent>
      </Dialog>
    </li>
  );
}

/** Resume text from the same skills that are on your profile. */
function resumeLine(s: PortfolioSkill) {
  const n = s.name.charAt(0).toLowerCase() + s.name.slice(1);
  const verb = s.level === "Demonstrated" ? "Applied" : s.level === "Practiced" ? "Practiced" : "Studied";
  return `${verb} ${n} (${proofNames(s)}).`;
}

function ResumeText({ found }: { found: Found[] }) {
  const skills = useSkills(found).filter((s) => s.confirmed && !s.hidden && !s.unsure);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [format, setFormat] = useState<"resume" | "linkedin">("resume");
  const selected = picked ?? skills.slice(0, 5).map((s) => s.key);
  const chosen = skills.filter((s) => selected.includes(s.key));
  const text = chosen.map((s) => `• ${resumeLine(s)}`).join("\n");
  const li = linkedinSections(chosen.map((s) => ({ name: s.name, classes: s.proofs.flatMap((p) => (p.type === "class" ? [p.code] : [])) })), skillCourses);
  const allowed = chosen.length > 0;
  const copy = async (value: string, what = "Copied") => {
    if (!allowed) return;
    try { await navigator.clipboard.writeText(value); toast(what); } catch { toast("Copy isn't available in this browser. Try Download."); }
  };
  const download = () => {
    if (!allowed) return;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "maya-skills.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section aria-labelledby="resume-title" className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div>
        <h3 id="resume-title" className="font-semibold">Pick up to five skills</h3>
        <p className="mt-1 text-sm text-muted-foreground">Only skills you confirmed show here.</p>
        <ul className="mt-4 divide-y">
          {skills.map((s) => (
            <li key={s.key}>
              <label className="flex cursor-pointer items-center gap-3 py-3 text-sm">
                <Checkbox checked={selected.includes(s.key)} disabled={!selected.includes(s.key) && selected.length >= 5} onCheckedChange={(v) => { setPicked(v ? [...selected, s.key] : selected.filter((k) => k !== s.key)); }} />
                <span className="min-w-0"><span className="block font-medium">{s.name}</span><span className="block text-muted-foreground">{proofNames(s)}</span></span>
              </label>
            </li>
          ))}
          {!skills.length && <li className="py-4 text-sm text-muted-foreground">Confirm a skill and it'll show up here.</li>}
        </ul>
      </div>
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Your text</h3>
          <div className="pc-seg" role="group" aria-label="Where it goes">
            {(["resume", "linkedin"] as const).map((f) => <button key={f} type="button" aria-pressed={format === f} onClick={() => setFormat(f)} className="pc-seg-btn">{f === "resume" ? "Resume" : "LinkedIn"}</button>)}
          </div>
        </div>
        {format === "resume" ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">Bullets for a Skills or Relevant coursework section. Edit them to sound like you.</p>
            <div className="mt-4 min-h-40 rounded-2xl bg-muted p-5">
              <ul className="space-y-3 text-[15px] leading-relaxed">{chosen.map((s) => <li key={s.key}>• {resumeLine(s)}</li>)}</ul>
              {!chosen.length && <p className="text-sm text-muted-foreground">Pick a skill to preview your text.</p>}
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">LinkedIn has a place for each of these on your profile. Add them one at a time.</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-muted p-5">
                <div className="flex items-center justify-between gap-3"><h3 className="font-medium">Skills</h3><span className="text-xs text-muted-foreground">Profile › Add section › Skills</span></div>
                <ul className="mt-3 space-y-2 text-sm">{li.skills.map((k) => <li key={k.name} className="flex items-baseline justify-between gap-3"><span className="font-medium">{k.name}</span>{k.course && <span className="text-xs text-muted-foreground">Show it on {k.course}</span>}</li>)}</ul>
              </div>
              {li.courses.length > 0 && (
                <div className="rounded-2xl bg-muted p-5">
                  <div className="flex items-center justify-between gap-3"><h3 className="font-medium">Courses</h3><span className="text-xs text-muted-foreground">Profile › Add section › Courses</span></div>
                  <ul className="mt-3 divide-y divide-foreground/10 text-sm">{li.courses.map((c) => <li key={c.number} className="grid grid-cols-[auto_1fr] gap-x-4 py-2 first:pt-0 last:pb-0"><span className="text-muted-foreground">Name</span><span className="font-medium">{c.name}</span><span className="text-muted-foreground">Number</span><span>{c.number}</span><span className="text-muted-foreground">Associated with</span><span>{c.school}</span></li>)}</ul>
                </div>
              )}
            </div>
          </>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {format === "resume" ? <>
            <Button disabled={!allowed} onClick={() => void copy(text)}><Copy className="size-4" />Copy text</Button>
            <Button disabled={!allowed} variant="outline" onClick={download}><Download className="size-4" />Download</Button>
          </> : <>
            <Button disabled={!allowed} onClick={() => void copy(li.skills.map((k) => k.name).join("\n"), "Skills copied, one per line")}><Copy className="size-4" />Copy skills</Button>
            {li.courses.length > 0 && <Button disabled={!allowed} variant="outline" onClick={() => void copy(li.courses.map((c) => `${c.name} (${c.number}), ${c.school}`).join("\n"), "Courses copied")}><Copy className="size-4" />Copy courses</Button>}
          </>}
        </div>
      </div>
    </section>
  );
}
