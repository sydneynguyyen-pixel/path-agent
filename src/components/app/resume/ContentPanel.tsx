import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlignLeft, ArrowDown, ArrowRight, ArrowUp, BadgeCheck, Briefcase, CalendarCheck, ChevronDown, Eye, EyeOff, FileText, GraduationCap, IdCard, Lightbulb, Plus, RotateCcw, Sparkles, Undo2, X,
} from "lucide-react";
import { schools, student } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import type { PortfolioSkill } from "@/lib/portfolio";
import {
  entryBullets, entrySection, hasName, moveItem, pendingSkills, sectionHidden, startsWithAction, toggleSection,
  type HideableSection, type ResumeContact, type ResumeDoc, type ResumePage, type ResumeProject,
} from "@/lib/resume";
import { groupIdeas, IDEA_SECTION_LABEL, type Idea, type IdeaSection } from "@/lib/resumeSuggest";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AgentFace } from "@/components/app/Brand";
import { FieldLabel } from "./bits";
import { RESUME_TOOLS, fieldId, transcriptCourses, type EntrySection, type ResumeEntry } from "./data";

export type SkillsBundle = { split: { asked: string[]; other: string[] }; byName: Map<string, PortfolioSkill>; all: PortfolioSkill[]; roleTitle: string | null };

type Save = (p: Partial<ResumeDoc>) => void;
type Ping = (block: string) => void;

type Props = {
  doc: ResumeDoc;
  save: Save;
  /** Rings the matching block on the page. */
  ping: Ping;
  /** The field a click on the page landed on, ringed for a moment. */
  fieldFlash: string | null;
  jump: { block: string; n: number } | null;
  /** Called once a page click has opened its card, so it isn't replayed. */
  onJumpDone: () => void;
  headline: string;
  summary: string;
  letter: string;
  entries: ResumeEntry[];
  courses: string[];
  skills: SkillsBundle;
  /** The page as it shows now, for the one-line previews. */
  page: ResumePage;
  ideas: Idea[];
  onUseIdea: (idea: Idea) => void;
  onSkipIdea: (idea: Idea) => void;
};

type CardId = "header" | "summary" | "education" | "experience" | "training" | "projects" | "skills" | "letter";

const plural = (n: number, w: string) => `${n} ${n === 1 ? w : w.endsWith("y") ? `${w.slice(0, -1)}ies` : `${w}s`}`;
const ENTRY_CARDS: { id: EntrySection; title: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "experience", title: "Experience", icon: Briefcase },
  { id: "training", title: "Training & events", icon: CalendarCheck },
  { id: "projects", title: "Projects", icon: Lightbulb },
];

/**
 * Content tab: one collapsible card per part of the page, in page order. A closed card is one line with what's
 * on the page; opening one closes the others. Sprout's ideas sit at the top and inside the card they belong to.
 */
export function ContentPanel(p: Props) {
  const { doc, save, ping, fieldFlash, jump, onJumpDone } = p;
  const j = useJourney();
  const [open, setOpen] = useState<CardId | null>(doc.kind === "cover" ? "letter" : null);
  const [openEntry, setOpenEntry] = useState<string | null>(null);
  const focusTimer = useRef<number | undefined>(undefined);
  const toggle = (id: CardId) => setOpen((o) => (o === id ? null : id));
  const sectionOf = (e: ResumeEntry) => entrySection(doc, e);

  // A click on the page opens that card (and entry) and puts the cursor in its first field.
  useEffect(() => {
    if (!jump) return;
    const b = jump.block;
    if (b.startsWith("entry:")) {
      const id = b.slice(6);
      const e = p.entries.find((x) => x.id === id);
      setOpen(id.startsWith("proj-") ? "projects" : e ? sectionOf(e) : "experience");
      setOpenEntry(id);
    } else if (["header", "summary", "education", "skills", "letter"].includes(b)) setOpen(b as CardId);
    onJumpDone();
    window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => {
      const el = document.getElementById(fieldId(b));
      if (!el) return;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView?.({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
      el.querySelector<HTMLElement>("input:not([type=checkbox]):not([readonly]), textarea")?.focus({ preventScroll: true });
    }, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump]);
  useEffect(() => () => window.clearTimeout(focusTimer.current), []);

  const ideasIn = (s: IdeaSection) => p.ideas.filter((x) => x.section === s);
  const card = (id: CardId) => ({ open: open === id, onToggle: () => toggle(id), flash: fieldFlash === id });
  const eye = (s: HideableSection, label: string) => ({
    hidden: sectionHidden(doc, s),
    label,
    onToggle: () => { save({ hiddenSections: toggleSection(doc, s) }); if (sectionHidden(doc, s)) ping(s); },
  });
  const ideaProps = { onUse: p.onUseIdea, onSkip: p.onSkipIdea };

  const header = (
    <Card id="header" block="header" icon={IdCard} title="Header" preview={`${p.headline.trim() || student.name} · ${plural(p.page.contact.length, "contact detail")}`} {...card("header")}>
      <HeaderFields headline={p.headline} save={save} ping={ping} />
    </Card>
  );

  if (doc.kind === "cover") {
    return (
      <div className="rs-cards">
        {header}
        <Card id="letter" block="letter" icon={FileText} title="Letter" preview={doc.letter === null ? "From the template · fill in the [brackets]" : "Your words"} {...card("letter")}>
          <p className="text-xs text-muted-foreground">Fill in the [brackets].</p>
          <div>
            <Textarea value={p.letter} onFocus={() => ping("letter")} onChange={(e) => { save({ letter: e.target.value }); ping("letter"); }} rows={18} className="leading-relaxed" aria-label="Cover letter" />
            {doc.letter !== null && <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => save({ letter: null })}><RotateCcw className="size-3.5" aria-hidden="true" />Back to the template</Button>}
          </div>
        </Card>
      </div>
    );
  }

  const bySection = (s: EntrySection) => p.entries.filter((e) => sectionOf(e) === s);
  const shownIn = (s: EntrySection) => bySection(s).filter((e) => !doc.hiddenExperience.includes(e.id));
  const pageList = (s: EntrySection) => (s === "experience" ? p.page.experience : s === "training" ? p.page.training : p.page.projects);
  const entryPreview = (s: EntrySection) => {
    if (s !== "experience" && sectionHidden(doc, s)) return "Hidden on the page";
    const list = pageList(s);
    if (!list.length) return bySection(s).length ? "All unticked for this version" : s === "projects" ? "Nothing yet · add one" : "Nothing yet";
    return `${plural(list.length, "entry")} · ${plural(list.reduce((n, e) => n + e.bullets.filter((b) => b.trim()).length, 0), "bullet")}`;
  };
  const skillNames = p.page.skills.filter((l) => l.label !== "Tools").flatMap((l) => l.names);
  const toolCount = p.page.skills.find((l) => l.label === "Tools")?.names.length ?? 0;
  const skillsPreview = skillNames.length || toolCount
    ? [skillNames[0], skillNames.length > 1 ? `+${skillNames.length - 1} more` : "", toolCount ? `${skillNames.length ? "· " : ""}${plural(toolCount, "tool")}` : ""].filter(Boolean).join(" ")
    : "No confirmed skills yet";
  const freshSkills = j.resumeNew.filter((n) => hasName(skillNames, n));

  return (
    <div className="rs-cards">
      {p.ideas.length > 0 && <IdeasOverview ideas={p.ideas} kind={doc.kind} onOpen={(s) => setOpen(s)} {...ideaProps} />}
      {header}

      <Card id="summary" block="summary" icon={AlignLeft} title="Summary" ideas={ideasIn("summary").length} eye={eye("summary", "Summary")}
        preview={sectionHidden(doc, "summary") ? "Hidden on the page" : p.summary.trim() || "Empty · leave it out or write two lines"} {...card("summary")}>
        <IdeaList ideas={ideasIn("summary")} {...ideaProps} />
        <div>
          <Textarea value={p.summary} onFocus={() => ping("summary")} onChange={(e) => { save({ summary: e.target.value }); ping("summary"); }} rows={3} aria-label="Summary" />
          {doc.summary !== null && <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => save({ summary: null })}><RotateCcw className="size-3.5" aria-hidden="true" />Use the suggestion</Button>}
        </div>
      </Card>

      <Card id="education" block="education" icon={GraduationCap} title="Education" ideas={ideasIn("education").length}
        preview={`${schools.northgate.short} · ${schools.bayview.short} · ${plural(p.courses.length, "course")}`} {...card("education")}>
        <IdeaList ideas={ideasIn("education")} {...ideaProps} />
        <EducationEditor doc={doc} courses={p.courses} save={save} ping={ping} page={p.page} />
      </Card>

      {ENTRY_CARDS.map(({ id, title, icon }) => (
        <Card key={id} id={id} icon={icon} title={title} ideas={ideasIn(id).length} preview={entryPreview(id)} {...card(id)}
          eye={id === "experience" ? undefined : eye(id, title)}>
          <IdeaList ideas={ideasIn(id)} {...ideaProps} />
          {bySection(id).length === 0 && id !== "projects" && (
            id === "experience"
              ? <p className="text-sm text-muted-foreground">Nothing yet. <Link to="/career" search={{ tab: "skills" }} className="underline underline-offset-4">Add things you did</Link>, like a job, caring for family or a club. They all count.</p>
              : <p className="text-sm text-muted-foreground">Events you went to show here once you've said you went.</p>
          )}
          {bySection(id).length > 0 && (
            <ul className="grid gap-1.5" aria-label={`${title} entries`}>
              {bySection(id).map((e) => (
                <EntryEditor key={e.id} entry={e} doc={doc} save={save} ping={ping} open={openEntry === e.id} onOpen={(on) => setOpenEntry(on ? e.id : null)} flash={fieldFlash === `entry:${e.id}`}
                  moved={doc.entrySections?.[e.id] !== undefined && doc.entrySections[e.id] !== e.section} />
              ))}
            </ul>
          )}
          {id === "projects" && <OwnProjects doc={doc} save={save} ping={ping} fieldFlash={fieldFlash} openEntry={openEntry} setOpenEntry={setOpenEntry} />}
        </Card>
      ))}

      <Card id="skills" block="skills" icon={BadgeCheck} title="Skills" ideas={ideasIn("skills").length} preview={skillsPreview} {...card("skills")}
        badge={freshSkills.length > 0 ? <span className="aqua-chip shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold">New</span> : undefined}>
        <IdeaList ideas={ideasIn("skills")} {...ideaProps} />
        <SkillsEditor doc={doc} save={save} ping={ping} {...p.skills} />
      </Card>
    </div>
  );
}

/** Height and fade in and out, cubic-bezier(.22,.8,.2,1). Closed content leaves the page once it has faded. */
function Collapse({ open, id, children }: { open: boolean; id: string; children: ReactNode }) {
  const [closing, setClosing] = useState(false);
  const was = useRef(open);
  useEffect(() => {
    if (was.current && !open) {
      was.current = open;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return undefined;
      setClosing(true);
      const t = window.setTimeout(() => setClosing(false), 280);
      return () => window.clearTimeout(t);
    }
    was.current = open;
    setClosing(false);
    return undefined;
  }, [open]);
  if (!open && !closing) return null;
  return (
    <div id={id} className="rs-collapse" data-closing={open ? undefined : ""} aria-hidden={open ? undefined : true} inert={!open}>
      <div className="rs-collapse-inner">{children}</div>
    </div>
  );
}

type EyeProps = { hidden: boolean; label: string; onToggle: () => void };

/** One part of the page: a single line when closed (icon, name, what's on the page, ideas), the editor when open. */
function Card({ id, block, icon: Icon, title, preview, ideas = 0, badge, eye, open, onToggle, flash, children }: {
  id: CardId; block?: string; icon: ComponentType<{ className?: string }>; title: string; preview: string; ideas?: number; badge?: ReactNode; eye?: EyeProps | undefined;
  open: boolean; onToggle: () => void; flash: boolean; children: ReactNode;
}) {
  const bodyId = `rs-card-${id}`;
  return (
    <section id={block ? fieldId(block) : `rs-card-wrap-${id}`} data-flash={flash ? "" : undefined} data-open={open ? "" : undefined} data-dim={eye?.hidden ? "" : undefined} className="rs-field rs-card" aria-label={title}>
      <div className="rs-card-head">
        <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={onToggle} className="rs-card-btn !rounded-[14px]">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="shrink-0 text-sm font-semibold">{title}</span>
            <span className="min-w-0 truncate text-xs text-muted-foreground">{preview}</span>
          </span>
          {badge}
          {ideas > 0 && <span className="rs-idea-badge">{plural(ideas, "idea")}</span>}
          <ChevronDown className="rs-chev size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
        {eye && (
          <button type="button" onClick={eye.onToggle} aria-pressed={!eye.hidden} aria-label={`${eye.hidden ? "Show" : "Hide"} ${eye.label} on the page`} title={eye.hidden ? "Hidden on the page. Click to show it" : "Showing on the page. Click to hide it"} className="rs-eye">
            {eye.hidden ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          </button>
        )}
      </div>
      <Collapse open={open} id={bodyId}><div className="rs-card-body">{children}</div></Collapse>
    </section>
  );
}

// ---------- Sprout's ideas ----------

const SPROUT_NOTE = "Suggested from your records; no AI is connected here.";

function IdeaRow({ idea, onUse, onSkip }: { idea: Idea; onUse: (i: Idea) => void; onSkip: (i: Idea) => void }) {
  return (
    <li role="group" aria-label={idea.title} className="rs-idea">
      <p className="text-[13px] font-medium">{idea.title}</p>
      {idea.detail && <p className="mt-1 text-[13px] text-foreground/90">"{idea.detail}"</p>}
      <p className="mt-1 text-xs text-muted-foreground">{idea.why}.</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {idea.apply && <Button size="sm" className="h-7" onClick={() => onUse(idea)}>Use it</Button>}
        {idea.link?.to === "skills" && <Button asChild size="sm" variant="outline" className="h-7 bg-card"><Link to="/career" search={{ tab: "skills" }}>{idea.link.label}<ArrowRight className="size-3.5" aria-hidden="true" /></Link></Button>}
        {idea.link?.to === "plan" && <Button asChild size="sm" variant="outline" className="h-7 bg-card"><Link to="/career" search={{ plan: idea.link.roleId }}>{idea.link.label}<ArrowRight className="size-3.5" aria-hidden="true" /></Link></Button>}
        <Button size="sm" variant="ghost" className="h-7" onClick={() => onSkip(idea)}>Not now</Button>
      </div>
    </li>
  );
}

/** A card's own ideas, as compact rows above its editor. */
function IdeaList({ ideas, onUse, onSkip }: { ideas: Idea[]; onUse: (i: Idea) => void; onSkip: (i: Idea) => void }) {
  if (!ideas.length) return null;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium"><Sparkles className="size-3.5" aria-hidden="true" />Sprout's ideas</p>
      <ul className="grid gap-1.5">{ideas.map((x) => <IdeaRow key={x.id} idea={x} onUse={onUse} onSkip={onSkip} />)}</ul>
    </div>
  );
}

/** "Sprout has N ideas for this resume": opens into every idea, grouped by section. */
function IdeasOverview({ ideas, kind, onUse, onSkip, onOpen }: { ideas: Idea[]; kind: ResumeDoc["kind"]; onUse: (i: Idea) => void; onSkip: (i: Idea) => void; onOpen: (s: CardId) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rs-card rs-ideas" data-open={open ? "" : undefined} aria-label="Sprout's ideas">
      <div className="rs-card-head">
        <button type="button" aria-expanded={open} aria-controls="rs-ideas-body" onClick={() => setOpen((o) => !o)} className="rs-card-btn !rounded-[14px]">
          <AgentFace className="!size-6 shrink-0" />
          <span className="min-w-0 flex-1 text-sm font-semibold">Sprout has {plural(ideas.length, "idea")} for this {kind === "cv" ? "CV" : "resume"}</span>
          <ChevronDown className="rs-chev size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
      <Collapse open={open} id="rs-ideas-body">
        <div className="rs-card-body">
          <div>
            <p className="text-xs">Sprout's ideas, from your classes, events and projects.</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{SPROUT_NOTE}</p>
          </div>
          {groupIdeas(ideas).map((g) => (
            <div key={g.section}>
              <button type="button" onClick={() => onOpen(g.section)} className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 hover:underline">
                {IDEA_SECTION_LABEL[g.section]}<span className="sr-only"> (open this section)</span>
              </button>
              <ul className="grid gap-1.5">{g.ideas.map((x) => <IdeaRow key={x.id} idea={x} onUse={onUse} onSkip={onSkip} />)}</ul>
            </div>
          ))}
        </div>
      </Collapse>
    </section>
  );
}

// ---------- Header ----------

const CONTACT_FIELDS: { id: keyof ResumeContact; label: string; placeholder: string; type: string }[] = [
  { id: "phone", label: "Phone", placeholder: "Your number", type: "tel" },
  { id: "location", label: "City, state", placeholder: "Leave empty to show your school", type: "text" },
  { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/…", type: "text" },
  { id: "site", label: "Portfolio or website", placeholder: "Optional", type: "text" },
];

function HeaderFields({ headline, save, ping }: { headline: string; save: Save; ping: Ping }) {
  const j = useJourney();
  const filled = CONTACT_FIELDS.some((f) => j.resumeContact[f.id].trim());
  const [more, setMore] = useState(filled);
  return (
    <>
      <p className="text-xs text-muted-foreground">{student.name} · {student.email}, from your school account.</p>
      <div>
        <FieldLabel htmlFor="rs-headline">Line under your name</FieldLabel>
        <Input id="rs-headline" value={headline} onFocus={() => ping("header")} onChange={(e) => { save({ headline: e.target.value }); ping("header"); }} />
      </div>
      {more || filled ? (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CONTACT_FIELDS.map((f) => (
              <div key={f.id} className="min-w-0">
                <FieldLabel htmlFor={`rs-c-${f.id}`} note="Optional">{f.label}</FieldLabel>
                <Input id={`rs-c-${f.id}`} type={f.type} value={j.resumeContact[f.id]} placeholder={f.placeholder} onFocus={() => ping("header")} onChange={(e) => { j.setResumeContact({ [f.id]: e.target.value }); ping("header"); }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-8 justify-self-start" onClick={() => setMore(true)}><Plus className="size-3.5" aria-hidden="true" />Add contact details</Button>
      )}
    </>
  );
}

// ---------- Education ----------

function EducationEditor({ doc, courses, save, ping, page }: { doc: ResumeDoc; courses: string[]; save: Save; ping: Ping; page: ResumePage }) {
  const [editing, setEditing] = useState(false);
  const chosen = transcriptCourses.filter((c) => courses.includes(c.code));
  return (
    <>
      <ul className="grid gap-1.5 text-sm">
        {page.education.map((e) => <li key={e.id}><span className="font-medium">{e.school}</span><span className="block text-xs text-muted-foreground">{e.degree} · {e.when}</span></li>)}
      </ul>
      <div>
        <p className="mb-1.5 text-xs font-medium">Relevant coursework <span className="font-normal text-muted-foreground">· from your transcript</span></p>
        {!editing ? (
          <>
            {chosen.length ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Courses on the page">
                {chosen.map((c) => <li key={c.code} className="glass-active rounded-full px-3 py-1 text-xs font-medium">{c.title}{c.inProgress && <span className="text-muted-foreground"> · now</span>}</li>)}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No courses on the coursework line.</p>}
            <Button size="sm" variant="outline" className="mt-2 h-7" onClick={() => setEditing(true)}>Edit courses</Button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pick courses">
              {transcriptCourses.map((c) => {
                const on = courses.includes(c.code);
                return (
                  <button key={c.code} type="button" aria-pressed={on} onClick={() => { save({ courses: on ? courses.filter((x) => x !== c.code) : [...courses, c.code] }); ping("education"); }}
                    className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 motion-reduce:transition-none", on ? "glass-active" : "bg-muted text-muted-foreground hover:text-foreground")}>
                    {c.title}{c.inProgress && <span className="text-muted-foreground"> · now</span>}
                  </button>
                );
              })}
            </div>
            <Button size="sm" variant="outline" className="mt-2 h-7" onClick={() => setEditing(false)}>Done</Button>
          </>
        )}
        {doc.courses != null && <Button variant="ghost" size="sm" className="mt-2 ml-1 h-7" onClick={() => save({ courses: null })}><RotateCcw className="size-3.5" aria-hidden="true" />Use the suggested courses</Button>}
      </div>
    </>
  );
}

// ---------- Entries ----------

/** One thing she did: a single line (title · org · date) that opens to its bullets (add, reorder, delete). */
function EntryEditor({ entry: e, doc, save, ping, open, onOpen, flash, moved }: { entry: ResumeEntry; doc: ResumeDoc; save: Save; ping: Ping; open: boolean; onOpen: (on: boolean) => void; flash: boolean; moved: boolean }) {
  const shown = !doc.hiddenExperience.includes(e.id);
  const edited = doc.bullets?.[e.id] !== undefined;
  const bullets = entryBullets(doc, e.id, e.suggested);
  const block = `entry:${e.id}`;
  const set = (next: string[]) => { save({ bullets: { ...doc.bullets, [e.id]: next } }); ping(block); };
  const reset = () => { const rest = { ...doc.bullets }; delete rest[e.id]; save({ bullets: rest }); };
  const moveBack = () => { const rest = { ...doc.entrySections }; delete rest[e.id]; save({ entrySections: rest }); ping(block); };
  const weak = bullets.some((b) => b.trim() && !startsWithAction(b));
  return (
    <li id={fieldId(block)} data-flash={flash ? "" : undefined} data-open={open ? "" : undefined} className="rs-field rs-sub">
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <Checkbox checked={shown} aria-label={`Show ${e.role} on this version`} onCheckedChange={(v) => { save({ hiddenExperience: v ? doc.hiddenExperience.filter((x) => x !== e.id) : [...doc.hiddenExperience, e.id] }); ping(block); }} />
        <button type="button" aria-expanded={open} onClick={() => onOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm !rounded-[10px]">
          <span className="min-w-0 flex-1 truncate">
            <span className={cn("font-medium", !shown && "text-muted-foreground line-through decoration-1")}>{e.role}</span>
            <span className="text-xs text-muted-foreground">{[e.org, e.when].filter(Boolean).map((x) => ` · ${x}`).join("")}</span>
          </span>
          {e.selfReported && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">Added by you</span>}
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>
      <Collapse open={open} id={`rs-entry-${e.id}`}>
        <div className="space-y-2 border-t px-2.5 pt-2.5 pb-3">
          <p className="text-xs text-muted-foreground">
            {edited ? "Your words." : e.suggested.length ? <><span className="aqua-chip mr-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold">Suggestion</span>{e.source === "Added by you" ? "From what you wrote. Edit it and it's yours." : "From the event's record. Say what you did, in your words."}</> : "No bullets yet. Add what you did."}
          </p>
          <ol className="grid gap-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-center gap-1">
                <span aria-hidden="true" className="w-3 text-center text-muted-foreground">•</span>
                <Input value={b} aria-label={`Bullet ${i + 1} for ${e.role}`} onFocus={() => ping(block)} onChange={(ev) => set(bullets.map((x, k) => (k === i ? ev.target.value : x)))} className="h-8 min-w-0 flex-1 text-[13px]" />
                <Button size="icon" variant="ghost" className="size-7 shrink-0 rounded-full" disabled={i === 0} aria-label={`Move bullet ${i + 1} up`} onClick={() => set(moveItem(bullets, i, i - 1))}><ArrowUp className="size-3.5" /></Button>
                <Button size="icon" variant="ghost" className="size-7 shrink-0 rounded-full" disabled={i === bullets.length - 1} aria-label={`Move bullet ${i + 1} down`} onClick={() => set(moveItem(bullets, i, i + 1))}><ArrowDown className="size-3.5" /></Button>
                <Button size="icon" variant="ghost" className="size-7 shrink-0 rounded-full" aria-label={`Delete bullet ${i + 1}`} onClick={() => set(bullets.filter((_, k) => k !== i))}><X className="size-3.5" /></Button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-1">
            <Button size="sm" variant="outline" className="h-7" disabled={bullets.length >= 5} onClick={() => set([...bullets, ""])}><Plus className="size-3.5" aria-hidden="true" />Add a bullet</Button>
            {edited && e.suggested.length > 0 && <Button size="sm" variant="ghost" className="h-7" onClick={reset}><RotateCcw className="size-3.5" aria-hidden="true" />Use the suggestion</Button>}
            {moved && <Button size="sm" variant="ghost" className="h-7" onClick={moveBack}><Undo2 className="size-3.5" aria-hidden="true" />Move back to {e.section === "training" ? "Training & events" : e.section === "projects" ? "Projects" : "Experience"}</Button>}
          </div>
          {weak && <p className="text-xs text-muted-foreground">Tip: start each bullet with an action verb, like Led, Built, Interviewed or Organized. Only claim results you can point to.</p>}
        </div>
      </Collapse>
    </li>
  );
}

/** Projects she writes herself (a class project she's proud of), each its own line that opens to edit. */
function OwnProjects({ doc, save, ping, fieldFlash, openEntry, setOpenEntry }: { doc: ResumeDoc; save: Save; ping: Ping; fieldFlash: string | null; openEntry: string | null; setOpenEntry: (id: string | null) => void }) {
  const set = (projects: ResumeProject[], id?: string) => { save({ projects, showProjects: true }); if (id) ping(`entry:proj-${id}`); };
  const add = () => {
    const id = `p-${Date.now().toString(36)}`;
    set([...doc.projects, { id, title: "", text: "" }]);
    setOpenEntry(`proj-${id}`);
  };
  const list = doc.showProjects ? doc.projects : [];
  return (
    <div className="grid gap-1.5">
      {list.length > 0 && <p className="text-xs font-medium">Your own projects</p>}
      {list.map((x) => {
        const key = `proj-${x.id}`;
        const open = openEntry === key;
        return (
          <div key={x.id} id={fieldId(`entry:${key}`)} data-flash={fieldFlash === `entry:${key}` ? "" : undefined} data-open={open ? "" : undefined} className="rs-field rs-sub">
            <div className="flex items-center gap-2 px-2.5 py-2">
              <button type="button" aria-expanded={open} onClick={() => setOpenEntry(open ? null : key)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm !rounded-[10px]">
                <span className="min-w-0 flex-1 truncate font-medium">{x.title.trim() || "Untitled project"}<span className="text-xs font-normal text-muted-foreground"> · {plural(x.text.split("\n").filter((l) => l.trim()).length, "bullet")}</span></span>
                <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
              </button>
              <Button size="icon" variant="ghost" className="size-7 shrink-0 rounded-full" aria-label="Remove project" onClick={() => set(doc.projects.filter((y) => y.id !== x.id))}><X className="size-3.5" /></Button>
            </div>
            <Collapse open={open} id={`rs-entry-${key}`}>
              <div className="space-y-2 border-t px-2.5 pt-2.5 pb-3">
                <Input value={x.title} placeholder="Project name" aria-label="Project name" onChange={(e) => set(doc.projects.map((y) => (y.id === x.id ? { ...y, title: e.target.value } : y)), x.id)} />
                <Textarea value={x.text} placeholder={"What you did, one bullet per line.\nStart each with a verb: Designed, Interviewed, Wrote…"} aria-label="What you did" rows={3} onChange={(e) => set(doc.projects.map((y) => (y.id === x.id ? { ...y, text: e.target.value } : y)), x.id)} />
              </div>
            </Collapse>
          </div>
        );
      })}
      <Button size="sm" variant="outline" className="h-8 justify-self-start" onClick={add}><Plus className="size-3.5" aria-hidden="true" />Add a project</Button>
    </div>
  );
}

// ---------- Skills ----------

const sourceOf = (s: PortfolioSkill | undefined) =>
  !s ? "" : s.selfReported ? "Added by you" : s.proofs.map((p) => (p.type === "class" ? p.code : p.title)).slice(0, 2).join(" · ");

/** Skills on her resume, with new ones marked and undoable, a switch for adding them by hand instead, and her tools. */
function SkillsEditor({ doc, save, ping, split, byName, all, roleTitle }: { doc: ResumeDoc; save: Save; ping: Ping } & SkillsBundle) {
  const j = useJourney();
  const onResume = j.resumeSkills.flatMap((n) => byName.get(n.toLowerCase()) ?? []).map((s) => s.name);
  const ordered = [...split.asked, ...split.other, ...onResume.filter((n) => hasName(doc.hiddenSkills, n))];
  const ready = pendingSkills(all, j.resumeSkills, j.resumeDismissed);
  const takenOff = j.resumeDismissed.filter((n) => byName.get(n.toLowerCase())?.confirmed);
  const fresh = j.resumeNew.filter((n) => hasName(onResume, n));
  const toggle = (n: string, v: boolean) => { save({ hiddenSkills: v ? doc.hiddenSkills.filter((x) => x.toLowerCase() !== n.toLowerCase()) : [...doc.hiddenSkills, n] }); ping("skills"); };
  const takeOff = (name: string) => {
    j.removeResumeSkill(name);
    toast(`Took ${name} off your resume`, { action: { label: "Undo", onClick: () => j.addResumeSkill(name) } });
  };
  return (
    <div>
      <label className="flex items-center justify-between gap-3 rounded-[12px] bg-muted px-3.5 py-2.5 text-sm">
        <span><span className="font-medium">Add new skills automatically</span></span>
        <Switch checked={j.autoAddSkills} onCheckedChange={j.setAutoAddSkills} />
      </label>
      {fresh.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <Sparkles className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">Added {fresh.length === 1 ? `${fresh[0]}, a skill` : `${fresh.length} skills`} you confirmed.</span>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => j.seenResumeSkills(fresh)}>Keep</Button>
        </p>
      )}
      {ordered.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No confirmed skills yet. <Link to="/career" search={{ tab: "skills" }} className="underline underline-offset-4">Confirm skills</Link> and they'll show here.</p>
      ) : (
        <ul className="mt-2 divide-y">
          {ordered.map((n, i) => {
            const s = byName.get(n.toLowerCase());
            const isNew = hasName(fresh, n);
            const firstOther = roleTitle && split.asked.length > 0 && i === split.asked.length;
            return (
              <li key={n} className={cn("flex items-center gap-3 py-2 text-sm", firstOther && "border-t-2")}>
                <Checkbox checked={!hasName(doc.hiddenSkills, n)} aria-label={`Show ${n} on this version`} onCheckedChange={(v) => toggle(n, !!v)} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-medium">{n}{isNew && <span className="aqua-chip rounded-full px-2 py-0.5 text-[11px] font-semibold animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none">New</span>}</span>
                  <span className="block truncate text-xs text-muted-foreground">{sourceOf(s)}</span>
                </span>
                {isNew
                  ? <Button size="sm" variant="ghost" className="h-7" onClick={() => j.removeResumeSkill(n)}><Undo2 className="size-3.5" aria-hidden="true" />Undo</Button>
                  : <Button size="icon" variant="ghost" className="size-7 rounded-full text-muted-foreground" aria-label={`Take ${n} off your resume`} onClick={() => takeOff(n)}><X className="size-3.5" /></Button>}
              </li>
            );
          })}
        </ul>
      )}
      {!j.autoAddSkills && ready.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">Ready to add</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ready.map((n) => (
              <button key={n} type="button" onClick={() => j.addResumeSkill(n)} className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft transition-colors duration-200 hover:bg-muted motion-reduce:transition-none">
                <Plus className="size-3" aria-hidden="true" />{n}{byName.get(n.toLowerCase())?.selfReported && <span className="text-muted-foreground"> · Added by you</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      {takenOff.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Taken off:</span>
          {takenOff.map((n) => <button key={n} type="button" onClick={() => j.addResumeSkill(n)} className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline">{n}<Plus className="size-3" aria-hidden="true" /><span className="sr-only">Add back</span></button>)}
        </p>
      )}
      <div className="mt-4">
        <p className="text-xs font-medium">Tools</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RESUME_TOOLS.map((t) => {
            const on = !hasName(doc.hiddenSkills, t.name);
            return (
              <button key={t.id} type="button" aria-pressed={on} onClick={() => toggle(t.name, !on)} className={cn("inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-xs font-medium transition-colors duration-200 motion-reduce:transition-none", on ? "glass-active" : "bg-muted text-muted-foreground")}>
                <span className="pc-tl" style={{ background: t.bg }}>{t.logo}</span>{t.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
