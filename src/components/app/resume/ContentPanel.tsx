import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ChevronDown, Plus, RotateCcw, Sparkles, Undo2, X } from "lucide-react";
import { student } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import type { PortfolioSkill } from "@/lib/portfolio";
import { entryBullets, hasName, moveItem, pendingSkills, startsWithAction, type ResumeContact, type ResumeDoc, type ResumeProject } from "@/lib/resume";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel, Section } from "./bits";
import { RESUME_TOOLS, fieldId, transcriptCourses, type EntrySection, type ResumeEntry } from "./data";

export type SkillsBundle = { split: { asked: string[]; other: string[] }; byName: Map<string, PortfolioSkill>; all: PortfolioSkill[]; roleTitle: string | null };

type Props = {
  doc: ResumeDoc;
  save: (p: Partial<ResumeDoc>) => void;
  /** Rings the matching block on the page. */
  ping: (block: string) => void;
  /** The field a click on the page landed on, ringed for a moment. */
  fieldFlash: string | null;
  jump: { block: string; n: number } | null;
  headline: string;
  summary: string;
  letter: string;
  entries: ResumeEntry[];
  courses: string[];
  skills: SkillsBundle;
};

const SECTION_TITLE: Record<EntrySection, string> = { experience: "Experience", projects: "Projects", training: "Training & events" };

/** Content tab: every part of the page as a form, in page order. */
export function ContentPanel(p: Props) {
  const { doc, save, ping, fieldFlash, jump } = p;
  const [open, setOpen] = useState<string | null>(null);

  // A click on the page opens that part of the form and puts the cursor in it.
  useEffect(() => {
    if (!jump) return;
    if (jump.block.startsWith("entry:")) setOpen(jump.block.slice(6));
    const t = window.setTimeout(() => {
      const el = document.getElementById(fieldId(jump.block));
      if (!el) return;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView?.({ block: "start", behavior: reduce ? "auto" : "smooth" });
      el.querySelector<HTMLElement>("input:not([type=checkbox]):not([readonly]), textarea")?.focus({ preventScroll: true });
    }, 30);
    return () => window.clearTimeout(t);
  }, [jump]);

  if (doc.kind === "cover") {
    return (
      <>
        <HeaderFields headline={p.headline} save={save} ping={ping} flash={fieldFlash === "header"} />
        <Section block="letter" title="Letter" flash={fieldFlash === "letter"} hint="A starting point from your real skills. Fill in the [brackets] and make it sound like you.">
          <Textarea value={p.letter} onFocus={() => ping("letter")} onChange={(e) => { save({ letter: e.target.value }); ping("letter"); }} rows={18} className="leading-relaxed" aria-label="Cover letter" />
          {doc.letter !== null && <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => save({ letter: null })}><RotateCcw className="size-3.5" aria-hidden="true" />Back to the template</Button>}
        </Section>
      </>
    );
  }

  const bySection = (s: EntrySection) => p.entries.filter((e) => e.section === s);
  return (
    <>
      <HeaderFields headline={p.headline} save={save} ping={ping} flash={fieldFlash === "header"} />

      <Section block="summary" title="Summary" flash={fieldFlash === "summary"} hint={doc.summary === null ? "Suggested from your skills. Edit it and it's yours. Leave it empty to drop it." : "Two lines is plenty. Leave it empty to drop it."}>
        <Textarea value={p.summary} onFocus={() => ping("summary")} onChange={(e) => { save({ summary: e.target.value }); ping("summary"); }} rows={3} aria-label="Summary" />
        {doc.summary !== null && <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => save({ summary: null })}><RotateCcw className="size-3.5" aria-hidden="true" />Use the suggestion</Button>}
      </Section>

      <Section block="education" title="Education" flash={fieldFlash === "education"} hint="From your school records. Pick the courses for the coursework line.">
        <div className="flex flex-wrap gap-1.5">
          {transcriptCourses.map((c) => {
            const on = p.courses.includes(c.code);
            return (
              <button key={c.code} type="button" aria-pressed={on} onClick={() => { save({ courses: on ? p.courses.filter((x) => x !== c.code) : [...p.courses, c.code] }); ping("education"); }}
                className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 motion-reduce:transition-none", on ? "glass-active" : "bg-muted text-muted-foreground hover:text-foreground")}>
                {c.title}{c.inProgress && <span className="text-muted-foreground"> · now</span>}
              </button>
            );
          })}
        </div>
        {doc.courses != null && <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => save({ courses: null })}><RotateCcw className="size-3.5" aria-hidden="true" />Use the suggested courses</Button>}
      </Section>

      {p.entries.length === 0 ? (
        <Section title="Experience">
          <p className="text-sm text-muted-foreground">Nothing yet. <Link to="/career" search={{ tab: "skills" }} className="underline underline-offset-4">Add things you did</Link>, like a job, caring for family or a club. They all count.</p>
        </Section>
      ) : (
        (["experience", "projects", "training"] as const).map((s) => bySection(s).length > 0 && (
          <Section key={s} title={SECTION_TITLE[s]} aside={s === "experience" ? "Click a line on the page to jump here" : undefined}>
            <ul className="grid gap-2">
              {bySection(s).map((e) => <EntryEditor key={e.id} entry={e} doc={doc} save={save} ping={ping} open={open === e.id} onOpen={(on) => setOpen(on ? e.id : null)} flash={fieldFlash === `entry:${e.id}`} />)}
            </ul>
          </Section>
        ))
      )}

      <ProjectsEditor doc={doc} save={save} ping={ping} fieldFlash={fieldFlash} />
      <SkillsEditor doc={doc} save={save} ping={ping} flash={fieldFlash === "skills"} {...p.skills} />
    </>
  );
}

const CONTACT_FIELDS: { id: keyof ResumeContact; label: string; placeholder: string; type: string }[] = [
  { id: "phone", label: "Phone", placeholder: "Your number", type: "tel" },
  { id: "location", label: "City, state", placeholder: "Leave empty to show your school", type: "text" },
  { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/…", type: "text" },
  { id: "site", label: "Portfolio or website", placeholder: "Optional", type: "text" },
];

function HeaderFields({ headline, save, ping, flash }: { headline: string; save: (p: Partial<ResumeDoc>) => void; ping: (b: string) => void; flash: boolean }) {
  const j = useJourney();
  return (
    <Section block="header" title="Header" flash={flash} hint={`${student.name} · ${student.email}, from your school account.`}>
      <FieldLabel htmlFor="rs-headline">Line under your name</FieldLabel>
      <Input id="rs-headline" value={headline} onFocus={() => ping("header")} onChange={(e) => { save({ headline: e.target.value }); ping("header"); }} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {CONTACT_FIELDS.map((f) => (
          <div key={f.id} className="min-w-0">
            <FieldLabel htmlFor={`rs-c-${f.id}`} note="Optional">{f.label}</FieldLabel>
            <Input id={`rs-c-${f.id}`} type={f.type} value={j.resumeContact[f.id]} placeholder={f.placeholder} onFocus={() => ping("header")} onChange={(e) => { j.setResumeContact({ [f.id]: e.target.value }); ping("header"); }} />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Only what you type here shows. These are the same on all your documents.</p>
    </Section>
  );
}

/** One thing she did: show it on this version or not, and its bullets (add, reorder, delete). */
function EntryEditor({ entry: e, doc, save, ping, open, onOpen, flash }: { entry: ResumeEntry; doc: ResumeDoc; save: (p: Partial<ResumeDoc>) => void; ping: (b: string) => void; open: boolean; onOpen: (on: boolean) => void; flash: boolean }) {
  const shown = !doc.hiddenExperience.includes(e.id);
  const edited = doc.bullets?.[e.id] !== undefined;
  const bullets = entryBullets(doc, e.id, e.suggested);
  const block = `entry:${e.id}`;
  const set = (next: string[]) => { save({ bullets: { ...doc.bullets, [e.id]: next } }); ping(block); };
  const reset = () => { const rest = { ...doc.bullets }; delete rest[e.id]; save({ bullets: rest }); };
  const weak = bullets.some((b) => b.trim() && !startsWithAction(b));
  return (
    <li id={fieldId(block)} data-flash={flash ? "" : undefined} className={cn("rs-field rounded-2xl", open ? "bg-card shadow-soft" : "bg-muted/60")}>
      <div className="flex items-start gap-3 px-3 py-2.5">
        <Checkbox className="mt-0.5" checked={shown} aria-label={`Show ${e.role} on this version`} onCheckedChange={(v) => { save({ hiddenExperience: v ? doc.hiddenExperience.filter((x) => x !== e.id) : [...doc.hiddenExperience, e.id] }); ping(block); }} />
        <button type="button" aria-expanded={open} onClick={() => onOpen(!open)} className="flex min-w-0 flex-1 items-start gap-2 text-left text-sm">
          <span className="min-w-0 flex-1">
            <span className={cn("block font-medium", !shown && "text-muted-foreground line-through decoration-1")}>{e.role}</span>
            <span className="block truncate text-xs text-muted-foreground">{[e.org, e.when].filter(Boolean).join(" · ")}</span>
            {e.selfReported && <span className="mt-1 inline-block rounded-full bg-card px-2 py-0.5 text-[11px] font-medium shadow-soft">Added by you</span>}
          </span>
          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="space-y-2 border-t px-3 pt-2.5 pb-3">
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
          </div>
          {weak && <p className="text-xs text-muted-foreground">Tip: start each bullet with an action verb, like Led, Built, Interviewed or Organized. Only claim results you can point to.</p>}
        </div>
      )}
    </li>
  );
}

function ProjectsEditor({ doc, save, ping, fieldFlash }: { doc: ResumeDoc; save: (p: Partial<ResumeDoc>) => void; ping: (b: string) => void; fieldFlash: string | null }) {
  const set = (projects: ResumeProject[], id?: string) => { save({ projects }); if (id) ping(`entry:proj-${id}`); };
  const add = () => [...doc.projects, { id: `p-${Date.now().toString(36)}`, title: "", text: "" }];
  return (
    <Section title="Your projects" hint="Optional. Something you made or studied on your own, like a class project you're proud of.">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Show your projects</span>
        <Switch checked={doc.showProjects} onCheckedChange={(on) => save({ showProjects: on, projects: on && doc.projects.length === 0 ? add() : doc.projects })} />
      </label>
      {doc.showProjects && (
        <div className="mt-3 space-y-2">
          {doc.projects.map((x) => (
            <div key={x.id} id={fieldId(`entry:proj-${x.id}`)} data-flash={fieldFlash === `entry:proj-${x.id}` ? "" : undefined} className="rs-field space-y-2 rounded-2xl bg-muted p-3">
              <div className="flex items-center gap-2">
                <Input value={x.title} placeholder="Project name" aria-label="Project name" onChange={(e) => set(doc.projects.map((y) => (y.id === x.id ? { ...y, title: e.target.value } : y)), x.id)} />
                <Button size="icon" variant="ghost" className="size-8 shrink-0 rounded-full" aria-label="Remove project" onClick={() => set(doc.projects.filter((y) => y.id !== x.id))}><X className="size-4" /></Button>
              </div>
              <Textarea value={x.text} placeholder={"What you did, one bullet per line.\nStart each with a verb: Designed, Interviewed, Wrote…"} aria-label="What you did" rows={3} onChange={(e) => set(doc.projects.map((y) => (y.id === x.id ? { ...y, text: e.target.value } : y)), x.id)} />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set(add())}><Plus className="size-3.5" aria-hidden="true" />Add a project</Button>
        </div>
      )}
    </Section>
  );
}

const sourceOf = (s: PortfolioSkill | undefined) =>
  !s ? "" : s.selfReported ? "Added by you" : s.proofs.map((p) => (p.type === "class" ? p.code : p.title)).slice(0, 2).join(" · ");

/** Skills on her resume, with new ones marked and undoable, a switch for adding them by hand instead, and her tools. */
function SkillsEditor({ doc, save, ping, flash, split, byName, all, roleTitle }: { doc: ResumeDoc; save: (p: Partial<ResumeDoc>) => void; ping: (b: string) => void; flash: boolean } & SkillsBundle) {
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
    <Section block="skills" title="Skills" flash={flash} hint={roleTitle ? `Skills ${roleTitle} roles ask for come first. Untick one to leave it off this version.` : "Only skills you confirmed. Untick one to leave it off this version."}>
      <label className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-2.5 text-sm">
        <span><span className="font-medium">Add new skills automatically</span><span className="block text-xs text-muted-foreground">When you confirm a skill, it joins your resume. You can undo it.</span></span>
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
        <p className="mt-0.5 text-xs text-muted-foreground">From Software and tools. Ones you're still learning aren't listed yet.</p>
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
    </Section>
  );
}
