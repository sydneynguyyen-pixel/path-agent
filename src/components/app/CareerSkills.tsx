import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowRight, Briefcase, CalendarCheck, CheckCheck, Copy, Download, EyeOff, FileText, Hammer, HeartHandshake, Home, MoreHorizontal, Paperclip, Pencil, Plus, Trophy, Users, Wrench, X, type LucideIcon } from "lucide-react";
import { careerRoles, opportunities, skillCourses, type EventPlatform } from "@/data/scenario";
import { buildSkillsFor, chosenGoals } from "@/lib/goals";
import { termDates } from "@/data/map";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { attendance, type Found } from "@/lib/experiences";
import { linkedinSections } from "@/lib/skills";
import { kindLabel, WHERE, type Activity, type ActivityKind } from "@/lib/activities";
import { byClassProgress, classProgress, type ClassProgress } from "@/lib/classProgress";
import { groupBySource, type PortfolioSkill, type SourceGroup } from "@/lib/portfolio";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accounts, PROOF_LINE, Via } from "@/components/app/EventBits";
import { EventMark } from "@/components/app/ItemMark";
import { SubjectIcon } from "@/components/app/Brand";
import { EvidenceIndicator, SkillSources } from "@/components/app/SkillsBits";
import { AddActivityDialog } from "@/components/app/AddActivity";
import { usePortfolioSkills } from "@/hooks/use-portfolio-skills";
import { GrowCheck } from "@/components/app/GrowCheck";
import { useConfirmCascade } from "@/components/app/GrowSkills";
import { TOOLS } from "@/components/app/PathCard";
import { Link } from "@tanstack/react-router";

const useSkills = usePortfolioSkills;

const proofNames = (s: PortfolioSkill) => [...new Set(s.proofs.map((p) => (p.type === "class" ? p.code : p.title)))].slice(0, 3).join(", ");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const SETTLE = "cubic-bezier(.22,.8,.2,1)";
/** A light card: thin border, no shadow. Every source on this tab uses it. */
const CARD = "rounded-2xl border bg-card p-4 sm:p-5";

/** Past events with no check-in. Stays until each one is answered, or until "Ask me later". */
function DidYouGo({ found, onConnect, onAdd }: { found: Found[]; onConnect: (p: EventPlatform) => void; onAdd: () => void }) {
  const j = useJourney();
  if (found.length === 0) return <section className="surface p-6"><h2 className="font-semibold">Add events you've been to</h2><p className="mt-1 text-sm text-muted-foreground">Connect an event account and I'll gather what you've been to. <button type="button" onClick={onAdd} className="underline underline-offset-4 hover:text-foreground">Or add something you did yourself.</button></p><div className="mt-4"><Accounts onConnect={onConnect} /></div></section>;
  const asks = found.filter((e) => attendance(e, SCRIPT_TODAY, j.eventChecks) === "ask").sort((a, b) => b.date.localeCompare(a.date));
  if (asks.length === 0) return null;
  // Snoozed, it shrinks to one quiet link instead of a box.
  if (j.homeCleared["did-you-go"] === "snoozed") return (
    <button type="button" onClick={() => j.restoreHomeItem("did-you-go")} className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
      <CalendarCheck className="size-4" aria-hidden="true" />{asks.length} past {asks.length === 1 ? "event" : "events"} to answer
    </button>
  );
  return <DidYouGoNotice asks={asks} onAdd={onAdd} />;
}

/** A notification, not a panel: one line with a close button. "Answer" opens the events in the same notice. */
function DidYouGoNotice({ asks, onAdd }: { asks: Found[]; onAdd: () => void }) {
  const j = useJourney();
  const [open, setOpen] = useState(false);
  const went = (e: Found) => { j.checkEvent(e.id, "went"); toast(`Skills from ${e.title} added`, { action: { label: "Undo", onClick: () => j.checkEvent(e.id, null) } }); };
  return (
    <section aria-labelledby="did-you-go" className="notice max-w-3xl">
      <div className="flex items-center gap-3 py-2.5 pr-2.5 pl-3">
        <span className="flex shrink-0 -space-x-2" aria-hidden="true">{asks.slice(0, 3).map((e) => <EventMark key={e.id} photo={e.photo} className="size-8 rounded-lg ring-2 ring-card" />)}</span>
        <p id="did-you-go" className="min-w-0 flex-1 text-sm"><span className="font-medium">Did you go to {asks.length === 1 ? "this event" : `${asks.length} past events`}?</span> <span className="text-muted-foreground">No check-in, so their skills don't count yet. <button type="button" onClick={onAdd} className="underline underline-offset-4 hover:text-foreground">Or add something else.</button></span></p>
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

type EditMode = { key: string; mode: "wording" | "work" };
type RowActions = { onOpen: (s: PortfolioSkill) => void; onEdit: (s: PortfolioSkill, mode: EditMode["mode"]) => void };

type ClassCard = SourceGroup & { code: string; name: string; line: string; start?: string | undefined; progress: ClassProgress };

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const domId = (g: SourceGroup) => `src-${g.type}-${g.id.replace(/\W+/g, "-")}`;
/** A skill's other sources, named, so a row in one card says where else it shows up. */
const elsewhere = (s: PortfolioSkill, g: SourceGroup) => [...new Set(s.proofs.filter((p) => (p.type === "class" ? p.code : p.id) !== g.id).map((p) => (p.type === "class" ? p.code : p.title)))];

/** One card per class from its real term (in progress, done, then upcoming), using the term's real dates against the scripted clock. */
function classCards(groups: SourceGroup[]): ClassCard[] {
  return groups
    .filter((g) => g.type === "class")
    .map((g) => {
      const c = skillCourses.find((x) => x.code === g.id);
      const dates = c ? termDates[c.termId] : undefined;
      const progress: ClassProgress = c ? classProgress(dates, c.term, SCRIPT_TODAY) : { state: "unknown", label: "" };
      return { ...g, name: c ? `${c.code} · ${c.title}` : g.id, line: c ? `${c.school} · ${c.term}` : "", start: dates?.start, progress, code: g.id };
    })
    .sort(byClassProgress);
}

/** Everything she has proof for, one card per place it came from: each class, each event, each thing she added. */
export function CareerSkills({ found, onConnect, resumeOpen, onResume }: { found: Found[]; onConnect: (p: EventPlatform) => void; resumeOpen: boolean; onResume: (open: boolean) => void }) {
  const j = useJourney();
  const [adding, setAdding] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditMode | null>(null);
  const skills = useSkills(found);
  const groups = groupBySource(skills);
  const classes = classCards(groups);
  const events = groups.filter((g) => g.type === "event" || g.type === "doing").sort((a, b) => (dateOf(b, found) ?? "").localeCompare(dateOf(a, found) ?? ""));
  const own = groups.filter((g) => g.type === "own");
  const hidden = skills.filter((s) => s.hidden);
  const openSkill = skills.find((s) => s.key === openKey);
  const editSkill = skills.find((s) => s.key === editing?.key);
  const goalFor = useGoalFor();
  const actions: RowActions = { onOpen: (s) => setOpenKey(s.key), onEdit: (s, mode) => setEditing({ key: s.key, mode }) };

  return (
    <div className="space-y-8">
      <section aria-labelledby="all-skills" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1 basis-72">
            <h2 id="all-skills" className="sr-only">Your skills</h2>
            <p className="text-sm text-muted-foreground">Sprout finds them in your syllabi and the events you went to, and you can add what it can't see. Nothing counts until you check it.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden="true" />Add something you did</Button>
            <Button size="sm" onClick={() => onResume(true)}><FileText className="size-4" aria-hidden="true" />Use on resume</Button>
          </div>
        </div>
        <DidYouGo found={found} onConnect={onConnect} onAdd={() => setAdding(true)} />
      </section>

      {classes.length > 0 && (
        <section aria-labelledby="from-classes" className="space-y-3">
          <h2 id="from-classes" className="text-sm font-medium text-muted-foreground">From your classes</h2>
          <div className="stagger grid items-start gap-4 lg:grid-cols-2">{classes.map((c) => <ClassSkillsCard key={c.id} card={c} actions={actions} />)}</div>
        </section>
      )}

      {events.length > 0 && (
        <section aria-labelledby="from-events" className="space-y-3">
          <h2 id="from-events" className="text-sm font-medium text-muted-foreground">From events you went to</h2>
          <div className="stagger grid items-start gap-4 lg:grid-cols-2">{events.map((g) => <EventSkillsCard key={`${g.type}-${g.id}`} group={g} found={found} actions={actions} />)}</div>
        </section>
      )}

      <ThingsYouAdded groups={own} onAdd={() => setAdding(true)} actions={actions} />

      <ToolsCard />

      {hidden.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Skills you hid</summary>
          {hidden.map((s) => <div key={s.key} className="mt-2 flex items-center gap-3">{s.name}<Button size="sm" variant="ghost" onClick={() => s.reviewKeys.forEach((k) => j.reviewSkill(k, { hidden: false }))}>Restore<ArrowRight className="size-3" /></Button></div>)}
        </details>
      )}

      <SkillDetail skill={openSkill} forGoal={openSkill ? goalFor(openSkill.name) : undefined} onClose={() => setOpenKey(null)} onEdit={actions.onEdit} />
      {editSkill && editing && <EditSkillDialog key={`${editing.key}-${editing.mode}`} skill={editSkill} mode={editing.mode} onClose={() => setEditing(null)} />}
      <AddActivityDialog open={adding} onOpenChange={setAdding} />
      <Dialog open={resumeOpen} onOpenChange={onResume}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto bg-card sm:max-w-5xl">
          <DialogHeader><DialogTitle>Use on resume or LinkedIn</DialogTitle><DialogDescription>Text made from skills you checked. Copy it and edit it to sound like you.</DialogDescription></DialogHeader>
          <ResumeText found={found} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const dateOf = (g: SourceGroup, found: Found[]) => (g.type === "event" ? found.find((e) => e.id === g.id)?.date : undefined);

/** A thin bar for how far through the class she is. No numbers: the label beside it says the week. */
function ClassMeter({ progress }: { progress: ClassProgress }) {
  if (progress.state === "unknown") return null;
  return (
    <div aria-hidden="true" className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
      <div className="glass-on h-full rounded-full motion-reduce:transition-none" style={{ width: `${progress.fraction * 100}%`, transition: `width 340ms ${SETTLE}` }} />
    </div>
  );
}

/** "Check all" for one card: checks one after another, Undo unchecks in reverse. Unsure skills are left for her to check one by one. */
function useCheckAll(rows: PortfolioSkill[], from: string) {
  const j = useJourney();
  const cascade = useConfirmCascade(j.reviewSkill);
  return () => {
    cascade(rows, true);
    toast(`${plural(rows.length, "skill")} from ${from} checked`, { description: "They can go on your card and resume now.", action: { label: "Undo", onClick: () => cascade(rows, false) } });
  };
}
const toCheck = (skills: PortfolioSkill[]) => skills.filter((s) => !s.confirmed && !s.unsure && s.reviewKeys.length > 0);

function CardShell({ id, mark, title, line, side, children }: { id: string; mark: ReactNode; title: string; line?: string; side?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={CARD}>
      <div className="flex items-start gap-3">
        {mark}
        <div className="min-w-0 flex-1">
          <h3 id={id} className="font-semibold leading-snug">{title}</h3>
          {line && <p className="text-sm text-muted-foreground">{line}</p>}
        </div>
        {side}
      </div>
      {children}
    </section>
  );
}

function ClassSkillsCard({ card, actions }: { card: ClassCard; actions: RowActions }) {
  const pending = toCheck(card.skills);
  const unchecked = card.skills.some((s) => !s.confirmed);
  const checkAll = useCheckAll(pending, card.id);
  const p = card.progress;
  const nudge = !unchecked ? null
    : p.state === "done" ? "You finished this class. Did you use these skills?"
    : p.state === "now" ? "Check them as you get there."
    : p.state === "upcoming" ? "You'll learn these here. Check them once you have."
    : null;
  return (
    <CardShell
      id={domId(card)}
      mark={<SubjectIcon course={card.id} className="size-10 shrink-0" />}
      title={card.name}
      line={card.line || p.label}
      side={card.line && p.state !== "unknown" ? <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">{p.label}</span> : undefined}
    >
      <ClassMeter progress={p} />
      {nudge && <p className={`mt-3 text-sm ${p.state === "done" ? "font-medium" : "text-muted-foreground"}`}>{nudge}</p>}
      <SkillList group={card} actions={actions} />
      {pending.length > 1 && <Button size="sm" variant="ghost" className="-ml-2 mt-1" onClick={checkAll}><CheckCheck className="size-4" aria-hidden="true" />Check all from this class</Button>}
    </CardShell>
  );
}

function EventSkillsCard({ group: g, found, actions }: { group: SourceGroup; found: Found[]; actions: RowActions }) {
  const e = g.type === "event" ? found.find((x) => x.id === g.id) : undefined;
  const o = g.type === "doing" ? opportunities.find((x) => x.id === g.id) : undefined;
  const photo = e?.photo ?? o?.photo;
  const line = e ? `${fmtDate(e.date)} · ${e.host}` : o ? `${o.host} · you went` : undefined;
  const pending = toCheck(g.skills);
  const checkAll = useCheckAll(pending, e?.title ?? g.title);
  return (
    <CardShell id={domId(g)} mark={photo ? <EventMark photo={photo} className="size-10 shrink-0 rounded-xl" /> : undefined} title={e?.title ?? o?.title ?? g.title} {...(line ? { line } : {})}>
      {pending.length > 0 && <p className="mt-3 text-sm text-muted-foreground">Did you use these there?</p>}
      <SkillList group={g} actions={actions} />
      {pending.length > 1 && <Button size="sm" variant="ghost" className="-ml-2 mt-1" onClick={checkAll}><CheckCheck className="size-4" aria-hidden="true" />Check all from this event</Button>}
    </CardShell>
  );
}

function SkillList({ group, actions, extra }: { group: SourceGroup; actions: RowActions; extra?: (s: PortfolioSkill) => ReactNode }) {
  return <ul className="mt-2 divide-y">{group.skills.map((s) => <SkillCheckRow key={s.key} skill={s} also={elsewhere(s, group)} actions={actions} extra={extra?.(s)} />)}</ul>;
}

function useReview(s: PortfolioSkill) {
  const j = useJourney();
  return (patch: Parameters<typeof j.reviewSkill>[1]) => s.reviewKeys.forEach((k) => j.reviewSkill(k, patch));
}

/** Which of her goals asks for a skill, so a row can say "UX researcher skill". */
function useGoalFor() {
  const j = useJourney();
  const goals = chosenGoals(careerRoles, j.interestedRoles);
  return (name: string) => goals.find((r) => [...r.why, ...buildSkillsFor(r, j.buildSkills)].some((n) => n.toLowerCase() === name.toLowerCase()))?.title;
}

/** One skill: its name (opens the detail panel), a "Yes, I did this" check, Add to resume once checked, and the ··· menu. */
function SkillCheckRow({ skill: s, also, actions, extra }: { skill: PortfolioSkill; also: string[]; actions: RowActions; extra?: ReactNode }) {
  const review = useReview(s);
  const goal = useGoalFor()(s.name);
  // Proof from going to something has nothing to answer: going was the yes.
  const fixed = s.reviewKeys.length === 0;
  const note = s.unsure && !s.confirmed ? "Sprout isn't sure. The syllabus only mentions it in passing." : also.length ? `Also from ${also.slice(0, 2).join(", ")}${also.length > 2 ? ` +${also.length - 2}` : ""}` : s.selfReported ? "Added by you" : null;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
      <div className="min-w-0 flex-1 basis-40">
        <button type="button" onClick={() => actions.onOpen(s)} aria-haspopup="dialog" className="rounded-sm text-left font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{s.name}</button>
        {goal && <span className="ml-2 rounded-full aqua-chip px-2 py-0.5 align-middle text-[11px] font-medium">{goal} skill</span>}
        {(note || s.confirmed) && (
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {note && <span>{note}</span>}
            {s.confirmed && <ResumeToggle name={s.name} />}
          </p>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <DidThis on={s.confirmed} disabled={fixed} name={s.name} onChange={(on) => review({ confirmed: on })} />
        {extra}
        <SkillMenu skill={s} onEdit={actions.onEdit} />
      </div>
    </li>
  );
}

/** The check itself: a box and "Yes, I did this". The check strokes in with GrowCheck. */
function DidThis({ on, disabled, name, onChange }: { on: boolean; disabled?: boolean; name: string; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={`Yes, I did this: ${name}`}
      disabled={disabled}
      title={disabled ? "Counts because you went" : undefined}
      onClick={() => onChange(!on)}
      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${on ? "border-transparent bg-success-soft" : "hover:bg-foreground/5"}`}
      style={{ transition: `background-color 180ms ${SETTLE}, border-color 180ms ${SETTLE}` }}
    >
      <span aria-hidden="true" className={`grid size-4 place-items-center rounded-[5px] border ${on ? "border-mark-yes bg-card" : "border-muted-foreground/50"}`}>
        <GrowCheck on={on} className="size-3 text-mark-yes" />
      </span>
      Yes, I did this
    </button>
  );
}

/** "Add to resume" for a checked skill; shows "On your resume" once it's there. Uses the Resume tab's list. */
function ResumeToggle({ name }: { name: string }) {
  const j = useJourney();
  const on = j.resumeSkills.some((n) => n.toLowerCase() === name.toLowerCase());
  const toggle = () => {
    if (on) { j.removeResumeSkill(name); toast(`${name} taken off your resume`, { action: { label: "Undo", onClick: () => j.addResumeSkill(name) } }); }
    else { j.addResumeSkill(name); toast(`${name} added to your resume`, { action: { label: "Undo", onClick: () => j.removeResumeSkill(name) } }); }
  };
  return (
    <button type="button" aria-label={on ? `${name}: on your resume. Take it off` : `Add ${name} to resume`} onClick={toggle} className="inline-flex items-center gap-1 rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {on ? <><FileText className="size-3" aria-hidden="true" />On your resume</> : <><Plus className="size-3" aria-hidden="true" />Add to resume</>}
    </button>
  );
}

/** The ··· menu every skill has: wording, work, and "Not really" to hide it. */
function SkillMenu({ skill: s, onEdit, align = "end" }: { skill: PortfolioSkill; onEdit: (s: PortfolioSkill, mode: EditMode["mode"]) => void; align?: "start" | "end" }) {
  const review = useReview(s);
  const hide = () => { review({ hidden: true }); toast(`${s.name} hidden`, { description: "It won't count. Find it under Skills you hid.", action: { label: "Undo", onClick: () => review({ hidden: false }) } }); };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={`More actions for ${s.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuItem onSelect={() => onEdit(s, "wording")}><Pencil />Edit wording</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(s, "work")}><Paperclip />Attach work</DropdownMenuItem>
        {s.reviewKeys.length > 0 && <DropdownMenuItem onSelect={hide}><EyeOff />Not really, hide it</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const KIND_ICON: Record<ActivityKind, LucideIcon> = { job: Briefcase, volunteering: HeartHandshake, club: Users, caring: Home, sports: Trophy, project: Hammer, other: Pencil };
const Mark = ({ icon: Icon }: { icon: LucideIcon }) => <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted"><Icon className="size-4" aria-hidden="true" /></span>;

/** What she added herself: always here, so jobs, caregiving, clubs and the rest have an obvious home. Removing one takes its skills with it. */
function ThingsYouAdded({ groups, onAdd, actions }: { groups: SourceGroup[]; onAdd: () => void; actions: RowActions }) {
  const j = useJourney();
  const removeActivity = (a: Activity) => { j.removeActivity(a.id); toast(`${a.title} removed`, { ...(a.skills.length ? { description: `Its ${plural(a.skills.length, "skill")} left Your skills too.` } : {}), action: { label: "Undo", onClick: () => j.addActivity(a) } }); };
  const removeSkill = (o: (typeof j.ownSkills)[number]) => { j.removeOwnSkill(o.id); toast(`${o.name} removed`, { action: { label: "Undo", onClick: () => j.addOwnSkill(o) } }); };
  const groupFor = (id: string) => groups.find((g) => g.id === id);
  const empty = j.activities.length === 0 && j.ownSkills.length === 0;
  return (
    <section aria-labelledby="things-added" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="things-added" className="text-sm font-medium text-muted-foreground">Things you added</h2>
        {!empty && <Button size="sm" variant="outline" onClick={onAdd}><Plus className="size-4" aria-hidden="true" />Add something you did</Button>}
      </div>
      {empty ? (
        <div className={`${CARD} flex flex-wrap items-center gap-4`}>
          <Mark icon={Plus} />
          <div className="min-w-0 flex-1 basis-56">
            <h3 className="font-semibold">Add what Sprout can't see</h3>
            <p className="text-sm text-muted-foreground">A job, caring for family, a club, volunteering, a sport or a project of your own. They build real skills too.</p>
          </div>
          <Button onClick={onAdd}><Plus className="size-4" aria-hidden="true" />Add something you did</Button>
        </div>
      ) : (
        <div className="stagger grid items-start gap-4 lg:grid-cols-2">
          {j.activities.map((a) => {
            const g = groupFor(a.id);
            return (
              <CardShell key={a.id} id={`added-${a.id}`} mark={<Mark icon={KIND_ICON[a.kind]} />} title={a.title} line={[kindLabel(a.kind), a.role, a.when, a.often].filter(Boolean).join(" · ")} side={<Button size="sm" variant="ghost" className="shrink-0" onClick={() => removeActivity(a)}>Remove</Button>}>
                {a.link && <a href={a.link} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm underline underline-offset-4">Proof</a>}
                {g ? <SkillList group={g} actions={actions} /> : <p className="mt-3 text-sm text-muted-foreground">No skills picked for this one.</p>}
              </CardShell>
            );
          })}
          {j.ownSkills.length > 0 && (
            <CardShell id="added-skills" mark={<Mark icon={Pencil} />} title="Skills you added" line="Added by name, on their own">
              <ul className="mt-2 divide-y">
                {j.ownSkills.flatMap((o) => {
                  const g = groupFor(o.id);
                  const s = g?.skills[0];
                  if (!g || !s) return [];
                  const where = [WHERE.find((w) => w.id === o.where)?.label, o.detail].filter(Boolean).join(" · ");
                  return [<SkillCheckRow key={o.id} skill={s} also={where ? [where] : []} actions={actions} extra={<Button size="sm" variant="ghost" onClick={() => removeSkill(o)}>Remove</Button>} />];
                })}
              </ul>
            </CardShell>
          )}
        </div>
      )}
    </section>
  );
}

/** Software she uses or is learning, the same list her card picks from. */
function ToolsCard() {
  const using = TOOLS.filter((t) => !t.later);
  const learning = TOOLS.filter((t) => t.later);
  return (
    <section aria-labelledby="tools" className={CARD}>
      <h2 id="tools" className="flex items-center gap-3 font-semibold"><Mark icon={Wrench} />Software and tools<span className="ml-auto text-sm font-normal text-muted-foreground">{TOOLS.length} tools</span></h2>
      <ul className="mt-3 grid gap-x-6 divide-y sm:grid-cols-2 sm:divide-y-0">
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

/** Everything about one skill: where it's from, its level, the syllabus line, her work and the same actions as the row menu. */
function SkillDetail({ skill: s, forGoal, onClose, onEdit }: { skill: PortfolioSkill | undefined; forGoal?: string | undefined; onClose: () => void; onEdit: (s: PortfolioSkill, mode: EditMode["mode"]) => void }) {
  return (
    <Sheet open={!!s} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="brand-app w-full overflow-y-auto sm:max-w-md">
        {s && <SkillDetailBody skill={s} forGoal={forGoal} onClose={onClose} onEdit={onEdit} />}
      </SheetContent>
    </Sheet>
  );
}

function SkillDetailBody({ skill: s, forGoal, onClose, onEdit }: { skill: PortfolioSkill; forGoal?: string | undefined; onClose: () => void; onEdit: (s: PortfolioSkill, mode: EditMode["mode"]) => void }) {
  const review = useReview(s);
  const lines = s.proofs.flatMap((p) => (p.type === "class" ? [p] : []));
  const unconfirm = () => { review({ confirmed: false }); onClose(); toast(`${s.name} is unchecked`, { action: { label: "Undo", onClick: () => review({ confirmed: true }) } }); };
  const hide = () => { review({ hidden: true }); onClose(); toast(`${s.name} hidden`, { action: { label: "Undo", onClick: () => review({ hidden: false }) } }); };
  return (
    <div className="space-y-6">
      <SheetHeader className="pr-8 text-left">
        <SheetDescription>{s.theme}</SheetDescription>
        <SheetTitle className="flex flex-wrap items-center gap-2">{s.name}{forGoal && <span className="rounded-full aqua-chip px-2 py-0.5 text-[11px] font-medium">{forGoal} skill</span>}</SheetTitle>
        <p className="inline-flex items-center gap-1.5 text-sm">{s.confirmed ? <><GrowCheck on className="size-3.5 text-mark-yes" />Confirmed by you</> : "Not confirmed yet"}</p>
      </SheetHeader>
      <section>
        <h3 className="text-sm font-medium">Level</h3>
        <div className="mt-2"><EvidenceIndicator level={s.level} /></div>
        {s.selfReported && <p className="mt-2 text-xs text-muted-foreground">Added by you. It shows as yours, not verified.</p>}
      </section>
      <section>
        <h3 className="text-sm font-medium">Where it's from</h3>
        <div className="mt-2 text-sm text-muted-foreground"><SkillSources skill={s} /></div>
      </section>
      {lines.length > 0 && (
        <section>
          <h3 className="text-sm font-medium">The syllabus line</h3>
          {lines.map((p) => <blockquote key={p.code} className="mt-2 rounded-xl bg-secondary p-3 text-xs leading-relaxed">“{p.quote}”<cite className="mt-1 block not-italic text-muted-foreground">{p.code} syllabus · {p.source} · synthetic</cite></blockquote>)}
        </section>
      )}
      <section>
        <h3 className="text-sm font-medium">Your work</h3>
        {s.work
          ? <p className="mt-2 break-words text-sm text-muted-foreground"><Paperclip className="mr-1 inline size-3.5" aria-hidden="true" />{/^https?:\/\//.test(s.work) ? <a href={s.work} target="_blank" rel="noreferrer" className="underline underline-offset-4">{s.work}</a> : s.work}</p>
          : <p className="mt-1 text-sm text-muted-foreground">Nothing attached yet.</p>}
      </section>
      <div className="flex flex-wrap gap-2 border-t pt-5">
        <Button size="sm" variant="outline" onClick={() => onEdit(s, "wording")}><Pencil />Edit wording</Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(s, "work")}><Paperclip />Attach work</Button>
        {s.confirmed && <Button size="sm" variant="ghost" onClick={unconfirm}><X />Unconfirm</Button>}
        <Button size="sm" variant="ghost" onClick={hide}><EyeOff />I didn't do this, hide it</Button>
      </div>
    </div>
  );
}

/** Edit wording or attach work, from the row menu or the panel. */
function EditSkillDialog({ skill: s, mode, onClose }: { skill: PortfolioSkill; mode: EditMode["mode"]; onClose: () => void }) {
  const review = useReview(s);
  const [wording, setWording] = useState(s.name);
  const [work, setWork] = useState("");
  const [file, setFile] = useState<File | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] bg-card sm:max-w-lg">
        <DialogHeader><DialogTitle>{mode === "wording" ? "Edit skill wording" : "Attach your work"}</DialogTitle><DialogDescription>{mode === "wording" ? "Keep it true to what you did." : "Choose a file or paste a link."}</DialogDescription></DialogHeader>
        {mode === "wording" ? <Input aria-label="Skill wording" value={wording} onChange={(e) => setWording(e.target.value)} /> : <><Input aria-label="Work link" placeholder="https://…" value={work} onChange={(e) => setWork(e.target.value)} /><Input aria-label="Work file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></>}
        <Button disabled={mode === "wording" ? !wording.trim() : !file && !/^https?:\/\//.test(work)} onClick={() => { review(mode === "wording" ? { wording: wording.trim() } : { work: file?.name || work, confirmed: true }); onClose(); toast(mode === "wording" ? "Wording saved" : "Work attached and skill confirmed"); }}>Save</Button>
      </DialogContent>
    </Dialog>
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
