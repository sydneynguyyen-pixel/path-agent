import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, CopyPlus, Download, FileText, Mail, MoreHorizontal, Plus, RotateCcw, ScrollText, Sparkles, Target, Trash2, Undo2, X } from "lucide-react";
import { careerRoles, opportunities, setupDirectory, skillCourses, student } from "@/data/scenario";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { buildSkillsFor, chosenGoals } from "@/lib/goals";
import { kindLabel } from "@/lib/activities";
import { attendance, wentTo } from "@/lib/experiences";
import type { PortfolioSkill } from "@/lib/portfolio";
import {
  coverTemplate, docFileName, experiencePhrase, groupDocs, hasName, KIND_LABEL, libraryDocs, newVersion, pendingSkills,
  roleAsks, skillsForDoc, suggestedHeadline, suggestedSummary, syncResumeSkills, type DocKind, type ResumeDoc, type ResumeProject,
} from "@/lib/resume";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CareerMark, careerStyle } from "@/components/app/CareerMark";
import { useFound } from "@/components/app/EventBits";
import { usePortfolioSkills } from "@/hooks/use-portfolio-skills";

const EASE: CSSProperties = { animationTimingFunction: "cubic-bezier(.22,.8,.2,1)", transitionTimingFunction: "cubic-bezier(.22,.8,.2,1)" };
const KIND_ICON: Record<DocKind, typeof FileText> = { resume: FileText, cv: ScrollText, cover: Mail };
const MAJOR = setupDirectory.major[0]!.name.replace(/ B\.[AS]\.$/, "");
const DEGREE = setupDirectory.major[0]!.name;
const school = (s: string) => s.replace(/\s*\(.*\)$/, "");

type Entry = { id: string; title: string; meta: string; text: string; phrase: string };

/** Resumes, CVs and cover letters for the careers she's going for. Everything is a draft; nothing is sent. */
export function ResumeTab() {
  const j = useJourney();
  const found = useFound();
  const all = usePortfolioSkills(found);
  const goals = chosenGoals(careerRoles, j.interestedRoles);

  // Confirmed skills flow onto her resume: quietly the first time, then marked New while auto-add is on.
  useEffect(() => {
    const next = syncResumeSkills(j, all);
    if (next.resumeSkills !== j.resumeSkills || next.resumeNew !== j.resumeNew || next.seeded !== j.resumeSeeded) j.syncResumeSkills(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, j.resumeSkills, j.resumeNew, j.resumeDismissed, j.resumeSeeded, j.autoAddSkills]);

  const docs = libraryDocs(goals, j.resumes);
  const defaults = new Set(libraryDocs(goals, []).map((d) => d.id));
  const [picked, setPicked] = useState<string | null>(null);
  const doc = docs.find((d) => d.id === picked) ?? docs[0]!;
  const role = careerRoles.find((r) => r.id === doc.roleId) ?? null;

  const byName = useMemo(() => new Map(all.filter((s) => !s.hidden).map((s) => [s.name.toLowerCase(), s])), [all]);
  const onResume = j.resumeSkills.flatMap((n) => byName.get(n.toLowerCase()) ?? []).map((s) => s.name);
  const asks = role ? roleAsks(role, buildSkillsFor(role, j.buildSkills, all.filter((s) => s.confirmed).map((s) => s.name))) : [];
  const split = skillsForDoc(onResume, asks, doc.hiddenSkills);
  const docSkills = [...split.asked, ...split.other];

  const experience = useExperience();
  const shownExperience = experience.filter((e) => !doc.hiddenExperience.includes(e.id));
  const coursework = skillCourses.filter((c) => /in progress/.test(c.units));

  const save = (patch: Partial<ResumeDoc>) => j.saveResume({ ...doc, ...patch });
  const headline = doc.headline ?? suggestedHeadline(role?.title ?? null, MAJOR);
  const summary = doc.summary ?? suggestedSummary({ major: MAJOR, roleTitle: role?.title ?? null, skills: docSkills });
  const letter = doc.letter ?? coverTemplate({ name: student.name, roleTitle: role?.title ?? null, school: school(student.from), major: MAJOR, skills: docSkills, experience: shownExperience.map((e) => e.phrase) });

  const page: Page = {
    kind: doc.kind, headline, summary, letter,
    education: [
      { school: school(student.to), detail: `${DEGREE} · planned transfer` },
      { school: school(student.from), detail: coursework.length ? `Coursework in progress: ${coursework.map((c) => `${c.code} ${c.title}`).join(", ")}` : "Transfer coursework" },
    ],
    experience: shownExperience,
    skills: [
      ...(split.asked.length ? [{ label: role ? `Skills ${role.title} roles ask for` : "Skills", names: split.asked }] : []),
      ...(split.other.length ? [{ label: split.asked.length ? "Other skills" : "Skills", names: split.other }] : []),
    ],
    projects: doc.showProjects ? doc.projects.filter((p) => p.title.trim()) : [],
    roleTitle: role?.title ?? null,
  };
  const text = pageText(page);

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast("Copied. Paste it into the application yourself."); } catch { toast("Copy isn't available in this browser. Try Download."); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = docFileName(doc, student.name);
    a.click();
    URL.revokeObjectURL(url);
  };
  const makeVersion = (roleId: string | null) => {
    const r = careerRoles.find((x) => x.id === roleId);
    const v = newVersion(doc, roleId, r?.title, docs.map((d) => d.id), Date.now());
    j.saveResume(v);
    setPicked(v.id);
    toast(`Made a new ${KIND_LABEL[doc.kind].toLowerCase()} for ${r?.title ?? "any role"}`, { description: "Your other version stays as it was." });
  };
  const resetDoc = () => {
    const before = doc;
    j.removeResume(doc.id);
    if (!defaults.has(doc.id)) setPicked(null);
    toast(defaults.has(doc.id) ? "Back to the suggested draft" : "Deleted this version", { action: { label: "Undo", onClick: () => { j.saveResume(before); setPicked(before.id); } } });
  };

  return (
    <div className="space-y-8">
      <Library docs={docs} goals={goals.map((g) => g.id)} current={doc.id} edited={new Set(j.resumes.map((d) => d.id))} onPick={setPicked} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="resume-editor" className="surface min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Editing · draft</p>
              <h2 id="resume-editor" className="mt-0.5 flex items-center gap-2 text-lg font-semibold">{role && <CareerMark id={role.id} size="sm" />}{doc.title}</h2>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><CopyPlus className="size-3.5" aria-hidden="true" />New version</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Copy this {KIND_LABEL[doc.kind].toLowerCase()} for</DropdownMenuLabel>
                {goals.map((g) => <DropdownMenuItem key={g.id} onSelect={() => makeVersion(g.id)}><CareerMark id={g.id} size="sm" />{g.title}</DropdownMenuItem>)}
                {careerRoles.filter((r) => !j.interestedRoles.includes(r.id)).map((r) => <DropdownMenuItem key={r.id} onSelect={() => makeVersion(r.id)}><CareerMark id={r.id} size="sm" />{r.title}</DropdownMenuItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => makeVersion(null)}><FileText className="size-4" aria-hidden="true" />Any role (general)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {doc.kind === "cover" ? (
            <div className="mt-6 space-y-3">
              <Field label="Letter" hint="A starting point from your real skills. Fill in the [brackets] and make it yours.">
                <Textarea value={letter} onChange={(e) => save({ letter: e.target.value })} rows={18} className="leading-relaxed" aria-label="Cover letter" />
              </Field>
              {doc.letter !== null && <Button variant="ghost" size="sm" onClick={() => save({ letter: null })}><RotateCcw className="size-3.5" aria-hidden="true" />Back to the template</Button>}
            </div>
          ) : (
            <div className="mt-6 space-y-7">
              <Field label="Header" hint={`${student.name} · ${student.email}. From your school account.`}>
                <Input value={headline} onChange={(e) => save({ headline: e.target.value })} aria-label="Line under your name" />
              </Field>
              <Field label="Summary" hint={doc.summary === null ? "Suggested from your skills. Edit it and it's yours." : undefined}>
                <Textarea value={summary} onChange={(e) => save({ summary: e.target.value })} rows={3} aria-label="Summary" />
                {doc.summary !== null && <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => save({ summary: null })}><RotateCcw className="size-3.5" aria-hidden="true" />Use the suggestion</Button>}
              </Field>
              <Field label="Education" hint="From your school records.">
                <ul className="space-y-1.5 text-sm">{page.education.map((e) => <li key={e.school}><span className="font-medium">{e.school}</span><span className="block text-muted-foreground">{e.detail}</span></li>)}</ul>
              </Field>
              <Field label="Experience" hint="Things you added and events you went to. Untick one to leave it off this version.">
                {experience.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing yet. <Link to="/career" search={{ tab: "skills" }} className="underline underline-offset-4">Add things you did</Link> on Your skills.</p>
                ) : (
                  <ul className="divide-y">
                    {experience.map((e) => (
                      <li key={e.id}>
                        <label className="flex cursor-pointer items-start gap-3 py-2.5 text-sm">
                          <Checkbox className="mt-0.5" checked={!doc.hiddenExperience.includes(e.id)} onCheckedChange={(v) => save({ hiddenExperience: v ? doc.hiddenExperience.filter((x) => x !== e.id) : [...doc.hiddenExperience, e.id] })} />
                          <span className="min-w-0"><span className="block font-medium">{e.title}</span><span className="block text-muted-foreground">{e.meta}</span></span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
              <SkillsEditor doc={doc} role={role?.title ?? null} split={split} byName={byName} all={all} onSave={save} />
              <ProjectsEditor doc={doc} onSave={save} />
            </div>
          )}
        </section>

        <section aria-labelledby="resume-preview" className="min-w-0 lg:sticky lg:top-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="resume-preview" className="text-sm font-medium text-muted-foreground">Preview · a draft, never sent</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void copy()}><Copy className="size-3.5" aria-hidden="true" />Copy text</Button>
              <Button size="sm" variant="outline" onClick={download}><Download className="size-3.5" aria-hidden="true" />Download as text</Button>
              {(j.resumes.some((d) => d.id === doc.id)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label="More for this document"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={resetDoc}>{defaults.has(doc.id) ? <><RotateCcw className="size-4" />Start over from the suggestion</> : <><Trash2 className="size-4" />Delete this version</>}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <DocPage key={doc.id} page={page} newSkills={j.resumeNew} />
        </section>
      </div>
    </div>
  );
}

/** Documents grouped by career, main goal first, general ones last. */
function Library({ docs, goals, current, edited, onPick }: { docs: ResumeDoc[]; goals: string[]; current: string; edited: Set<string>; onPick: (id: string) => void }) {
  const groups = groupDocs(docs, goals);
  return (
    <section aria-labelledby="resume-library">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="resume-library" className="text-lg font-semibold">Your library</h2>
        <p className="text-sm text-muted-foreground">One set for each career you're going for. All drafts; Sprout never sends them.</p>
      </div>
      {goals.length === 0 && (
        <div className="surface mt-4 flex flex-wrap items-center gap-4 p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl aqua-chip"><Target className="size-5" aria-hidden="true" /></span>
          <p className="min-w-0 flex-1 basis-60 text-sm"><span className="font-medium">Choose your goals for a resume and cover letter made for each.</span> <span className="text-muted-foreground">Until then, here's a general resume and CV.</span></p>
          <Button asChild size="sm" variant="outline"><Link to="/career">Choose your goals</Link></Button>
        </div>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((g) => {
          const r = careerRoles.find((x) => x.id === g.roleId);
          return (
            <div key={g.roleId ?? "general"} style={r ? careerStyle(r.id) : undefined} className={cn("surface p-3", r && "career-tint")}>
              <p className="flex items-center gap-2 px-2 pt-1 pb-2 text-sm font-semibold">
                {r ? <CareerMark id={r.id} size="sm" /> : <span className="grid size-6 place-items-center rounded-md bg-muted"><FileText className="size-3.5" aria-hidden="true" /></span>}
                <span className="min-w-0 truncate">{r?.title ?? "Any role"}</span>
                {r && goals[0] === r.id && <span className="ml-auto shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium">Main goal</span>}
              </p>
              <ul className="space-y-1">
                {g.docs.map((d) => {
                  const Icon = KIND_ICON[d.kind];
                  const on = d.id === current;
                  return (
                    <li key={d.id}>
                      <button type="button" aria-pressed={on} onClick={() => onPick(d.id)} style={EASE} className={cn("flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left text-sm transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none", on ? "glass-picked" : "hover:bg-muted/70")}>
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card shadow-soft"><Icon className="size-4" aria-hidden="true" /></span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{KIND_LABEL[d.kind]}{/\(v\d+\)$/.test(d.title) ? ` ${d.title.match(/\((v\d+)\)$/)![1]}` : ""}</span>
                          <span className="block truncate text-xs text-muted-foreground">{edited.has(d.id) ? "Draft · edited by you" : "Draft · from your skills"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string | undefined; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{label}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

const sourceOf = (s: PortfolioSkill | undefined) =>
  !s ? "" : s.selfReported ? "Added by you" : s.proofs.map((p) => (p.type === "class" ? p.code : p.title)).slice(0, 2).join(" · ");

/** Skills on her resume, with new ones marked and undoable, and a switch for adding them by hand instead. */
function SkillsEditor({ doc, role, split, byName, all, onSave }: { doc: ResumeDoc; role: string | null; split: { asked: string[]; other: string[] }; byName: Map<string, PortfolioSkill>; all: PortfolioSkill[]; onSave: (p: Partial<ResumeDoc>) => void }) {
  const j = useJourney();
  const onResume = j.resumeSkills.flatMap((n) => byName.get(n.toLowerCase()) ?? []).map((s) => s.name);
  const ordered = [...split.asked, ...split.other, ...onResume.filter((n) => hasName(doc.hiddenSkills, n))];
  const ready = pendingSkills(all, j.resumeSkills, j.resumeDismissed);
  const takenOff = j.resumeDismissed.filter((n) => byName.get(n.toLowerCase())?.confirmed);
  const fresh = j.resumeNew.filter((n) => hasName(onResume, n));
  const takeOff = (name: string) => {
    j.removeResumeSkill(name);
    toast(`Took ${name} off your resume`, { action: { label: "Undo", onClick: () => j.addResumeSkill(name) } });
  };
  return (
    <Field label="Skills" hint={role ? `Skills ${role} roles ask for come first.` : "Only skills you confirmed. Untick one to leave it off this version."}>
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
            const firstOther = role && split.asked.length > 0 && i === split.asked.length;
            return (
              <li key={n} className={cn("flex items-center gap-3 py-2 text-sm", firstOther && "border-t-2")}>
                <Checkbox checked={!hasName(doc.hiddenSkills, n)} aria-label={`Show ${n} on this version`} onCheckedChange={(v) => onSave({ hiddenSkills: v ? doc.hiddenSkills.filter((x) => x.toLowerCase() !== n.toLowerCase()) : [...doc.hiddenSkills, n] })} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-medium">{n}{isNew && <span style={EASE} className="aqua-chip rounded-full px-2 py-0.5 text-[11px] font-semibold animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none">New</span>}</span>
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
              <button key={n} type="button" onClick={() => j.addResumeSkill(n)} style={EASE} className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-medium shadow-soft transition-colors duration-200 hover:bg-muted motion-reduce:transition-none">
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
    </Field>
  );
}

function ProjectsEditor({ doc, onSave }: { doc: ResumeDoc; onSave: (p: Partial<ResumeDoc>) => void }) {
  const set = (projects: ResumeProject[]) => onSave({ projects });
  return (
    <Field label="Projects" hint="Optional. Something you made or studied on your own.">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Show a Projects section</span>
        <Switch checked={doc.showProjects} onCheckedChange={(on) => onSave({ showProjects: on, projects: on && doc.projects.length === 0 ? [{ id: `p-${Date.now().toString(36)}`, title: "", text: "" }] : doc.projects })} />
      </label>
      {doc.showProjects && (
        <div className="mt-3 space-y-3">
          {doc.projects.map((p) => (
            <div key={p.id} className="space-y-2 rounded-2xl bg-muted p-3">
              <div className="flex items-center gap-2">
                <Input value={p.title} placeholder="Project name" aria-label="Project name" onChange={(e) => set(doc.projects.map((x) => (x.id === p.id ? { ...x, title: e.target.value } : x)))} />
                <Button size="icon" variant="ghost" className="size-8 shrink-0 rounded-full" aria-label="Remove project" onClick={() => set(doc.projects.filter((x) => x.id !== p.id))}><X className="size-4" /></Button>
              </div>
              <Textarea value={p.text} placeholder="What you did, in a sentence or two" aria-label="What you did" rows={2} onChange={(e) => set(doc.projects.map((x) => (x.id === p.id ? { ...x, text: e.target.value } : x)))} />
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set([...doc.projects, { id: `p-${Date.now().toString(36)}`, title: "", text: "" }])}><Plus className="size-3.5" aria-hidden="true" />Add a project</Button>
        </div>
      )}
    </Field>
  );
}

/** Her activities and the events she really went to. Never events she only saved. */
function useExperience(): Entry[] {
  const j = useJourney();
  const found = useFound();
  return useMemo(() => {
    const own: Entry[] = j.activities.map((a) => ({
      id: a.id,
      title: a.role ? `${a.role}, ${a.title}` : a.title,
      meta: `${kindLabel(a.kind)} · ${a.when}`,
      text: a.did,
      phrase: experiencePhrase(a),
    }));
    const went = found.filter((e) => wentTo(attendance(e, SCRIPT_TODAY, j.eventChecks)));
    const events: Entry[] = went.map((e) => ({
      id: `event-${e.id}`,
      title: e.title,
      meta: `${e.role} · ${e.host} · ${new Date(`${e.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
      text: "",
      phrase: `I went to ${e.title}`,
    }));
    const titles = new Set(went.map((e) => e.title.toLowerCase()));
    const listings: Entry[] = opportunities
      .filter((o) => j.wentTo[o.id] && !titles.has(o.title.toLowerCase()))
      .map((o) => ({ id: `listing-${o.id}`, title: o.title, meta: `Went · ${o.kind === "club" ? "Club" : o.kind === "internship" ? "Internship" : o.kind === "class" ? "Class" : "Event"}`, text: "", phrase: `I went to ${o.title}` }));
    return [...own, ...events, ...listings];
  }, [j.activities, j.eventChecks, j.wentTo, found]);
}

type Page = {
  kind: DocKind;
  roleTitle: string | null;
  headline: string;
  summary: string;
  letter: string;
  education: { school: string; detail: string }[];
  experience: Entry[];
  skills: { label: string; names: string[] }[];
  projects: ResumeProject[];
};

/** The same document as plain text, for Copy and Download. */
function pageText(p: Page): string {
  if (p.kind === "cover") return `${p.letter.trim()}\n`;
  const out = [student.name, p.headline, `${student.email}`, ""];
  if (p.summary.trim()) out.push("SUMMARY", p.summary.trim(), "");
  out.push("EDUCATION", ...p.education.map((e) => `${e.school}\n  ${e.detail}`), "");
  if (p.experience.length) out.push("EXPERIENCE", ...p.experience.map((e) => `${e.title} (${e.meta})${e.text ? `\n  ${e.text}` : ""}`), "");
  for (const s of p.skills) out.push(s.label.toUpperCase(), s.names.join(", "), "");
  if (p.projects.length) out.push("PROJECTS", ...p.projects.map((x) => `${x.title}${x.text ? `\n  ${x.text}` : ""}`), "");
  return out.join("\n");
}

/** A clean printable page: white paper, simple type, the same content as the text she copies. */
function DocPage({ page, newSkills }: { page: Page; newSkills: string[] }) {
  const H = ({ children }: { children: ReactNode }) => <h3 className="mt-6 border-b pb-1 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{children}</h3>;
  return (
    <article
      aria-label="Document preview"
      style={EASE}
      className="mt-3 min-h-[34rem] rounded-md bg-card px-6 py-8 text-[13px] leading-relaxed text-card-foreground shadow-soft ring-1 ring-border animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none sm:px-10 sm:py-10"
    >
      {page.kind === "cover" ? (
        <>
          <p className="font-semibold">{student.name}</p>
          <p className="text-muted-foreground">{student.email}</p>
          <div className="mt-8 whitespace-pre-wrap">{page.letter}</div>
        </>
      ) : (
        <>
          <header className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">{student.name}</h2>
            {page.headline.trim() && <p className="mt-1">{page.headline}</p>}
            <p className="mt-1 text-muted-foreground">{student.email}</p>
          </header>
          {page.summary.trim() && <><H>Summary</H><p className="mt-2 whitespace-pre-wrap">{page.summary}</p></>}
          <H>Education</H>
          <ul className="mt-2 space-y-2">{page.education.map((e) => <li key={e.school}><p className="font-semibold">{e.school}</p><p>{e.detail}</p></li>)}</ul>
          {page.experience.length > 0 && <>
            <H>Experience</H>
            <ul className="mt-2 space-y-2.5">{page.experience.map((e) => <li key={e.id}><p className="flex flex-wrap justify-between gap-x-3"><span className="font-semibold">{e.title}</span><span className="text-muted-foreground">{e.meta}</span></p>{e.text && <p className="mt-0.5">{e.text}</p>}</li>)}</ul>
          </>}
          {page.skills.map((g) => (
            <div key={g.label}>
              <H>{g.label}</H>
              <ul className="mt-2 flex flex-wrap gap-x-1 gap-y-1">
                {g.names.map((n, i) => (
                  <li key={n} className="inline-flex items-center gap-1">
                    <span>{n}</span>
                    {hasName(newSkills, n) && <span style={EASE} className="aqua-chip rounded-full px-1.5 text-[10px] font-semibold animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none">New</span>}
                    {i < g.names.length - 1 && <span aria-hidden="true">·</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {page.projects.length > 0 && <>
            <H>Projects</H>
            <ul className="mt-2 space-y-2">{page.projects.map((p) => <li key={p.id}><p className="font-semibold">{p.title}</p>{p.text && <p>{p.text}</p>}</li>)}</ul>
          </>}
        </>
      )}
    </article>
  );
}

