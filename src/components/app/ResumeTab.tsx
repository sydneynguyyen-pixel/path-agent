import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Copy, CopyPlus, Download, FileDown, FileText, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { careerRoles, gapSkills, ledgerSkills, student } from "@/data/scenario";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { buildSkillsFor, chosenGoals } from "@/lib/goals";
import {
  baseDocs, blankApplication, blankDoc, contactLine, coverTemplate, docFileName, docLook, entryBullets, entrySection, hasName, KIND_LABEL, libraryDocs,
  newVersion, orderedSkills, orderEntries, resumeText, roleAsks, sectionHidden, skillLines, skillsForDoc, suggestedHeadline, suggestedSummary, syncResumeSkills,
  tailoredDoc, type Application, type PageEntry, type ResumeDoc, type ResumePage,
} from "@/lib/resume";
import { applyIdea, dismissIdea, ideasFor, type Idea } from "@/lib/resumeSuggest";
import { tailor, type TailorInput, type Tailoring } from "@/lib/tailor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFound } from "@/components/app/EventBits";
import { usePortfolioSkills } from "@/hooks/use-portfolio-skills";
import { Applications } from "@/components/app/resume/Applications";
import { ContentPanel } from "@/components/app/resume/ContentPanel";
import { JobPanel } from "@/components/app/resume/JobPanel";
import { FittedPaper, PaperContent } from "@/components/app/resume/ResumePaper";
import { StylePanel } from "@/components/app/resume/StylePanel";
import { DropJob, TailorFlow, type Dropped } from "@/components/app/resume/Tailor";
import { MAJOR, RESUME_TOOLS, educationFor, suggestedCourses, transcriptCourses, useResumeEntries } from "@/components/app/resume/data";
import "@/styles/resume.css";

const school = (s: string) => s.replace(/\s*\(.*\)$/, "");

type PanelId = "content" | "style" | "job";
const PANELS: { id: PanelId; label: string }[] = [{ id: "content", label: "Content" }, { id: "style", label: "Style" }, { id: "job", label: "Job" }];
export type ResumeView = "build" | "applications";
type View = ResumeView;

/** Build | Applications, in the same pill style as the Career tabs. */
export function ResumeViewToggle({ view, onView, count, className }: { view: View; onView: (v: View) => void; count: number; className?: string }) {
  const btn = (id: View, label: string, extra?: number) => (
    <button type="button" aria-pressed={view === id} onClick={() => onView(id)} className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors duration-200 motion-reduce:transition-none", view === id ? "glass-active font-medium" : "text-muted-foreground hover:text-foreground")}>
      {label}{extra ? <span className="text-muted-foreground">{extra}</span> : null}
    </button>
  );
  return (
    <div role="group" aria-label="Resume view" className={cn("inline-flex max-w-full items-center gap-1 rounded-full border bg-card/70 p-1", className)}>
      {btn("build", "Build")}
      {btn("applications", "Applications", count)}
    </div>
  );
}

type Run = { dropped: Dropped; base: ResumeDoc; input: TailorInput; result: Extract<Tailoring, { kind: "ok" }> };

/**
 * Career → Resume, two views. Build: drop a job (Sprout tailors a copy from her records, she accepts, edits or
 * keeps each part, then saves it as an application), above the board where any version is edited. Applications:
 * her base resumes and every application with its status and the version it uses.
 * Everything is a draft she copies or downloads herself. Nothing is sent.
 */
export function ResumeTab({ view: viewProp, onView }: { view?: View; onView?: (v: View) => void } = {}) {
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

  // The Career header can own the Build | Applications switch; on its own, the tab shows it.
  const [ownView, setOwnView] = useState<View>("build");
  const view = viewProp ?? ownView;
  const setView = (v: View) => { setOwnView(v); onView?.(v); };
  const docs = libraryDocs(goals, j.resumes);
  const defaults = new Set(libraryDocs(goals, []).map((d) => d.id));
  const bases = baseDocs(docs);
  const [picked, setPicked] = useState<string | null>(null);
  const doc: ResumeDoc = docs.find((d) => d.id === picked) ?? docs[0]!;
  const app = doc.applicationId ? j.applications.find((a) => a.id === doc.applicationId) ?? null : null;

  const [panel, setPanel] = useState<PanelId>("content");
  const [pages, setPages] = useState(1);
  const [run, setRun] = useState<Run | null>(null);
  const [focusDrop, setFocusDrop] = useState(0);

  // Editing a field rings its block on the page; clicking a block opens its field.
  const [flash, setFlash] = useState<string | null>(null);
  const [fieldFlash, setFieldFlash] = useState<string | null>(null);
  const [jump, setJump] = useState<{ block: string; n: number } | null>(null);
  const timers = useRef<{ page?: number; field?: number }>({});
  const ping = useCallback((block: string) => {
    setFlash(block);
    window.clearTimeout(timers.current.page);
    timers.current.page = window.setTimeout(() => setFlash(null), 650);
  }, []);
  const onJump = useCallback((block: string) => {
    setPanel("content");
    setJump((p) => ({ block, n: (p?.n ?? 0) + 1 }));
    setFieldFlash(block);
    window.clearTimeout(timers.current.field);
    timers.current.field = window.setTimeout(() => setFieldFlash(null), 900);
  }, []);
  useEffect(() => () => { window.clearTimeout(timers.current.page); window.clearTimeout(timers.current.field); }, []);

  // Skills: confirmed ones on her resume, the ones this career asks for first (or the version's own order).
  const byName = useMemo(() => new Map(all.filter((s) => !s.hidden).map((s) => [s.name.toLowerCase(), s])), [all]);
  const onResume = j.resumeSkills.flatMap((n) => byName.get(n.toLowerCase()) ?? []).map((s) => s.name);
  const confirmed = all.filter((s) => s.confirmed && !s.hidden).map((s) => s.name);
  const entries = useResumeEntries(found);

  /** Everything one version shows: its page, look and skills. Used for the board and every small picture. */
  const pageFor = (d: ResumeDoc) => {
    const role = careerRoles.find((r) => r.id === d.roleId) ?? null;
    const dApp = d.applicationId ? j.applications.find((a) => a.id === d.applicationId) ?? null : null;
    const asks = role ? roleAsks(role, buildSkillsFor(role, j.buildSkills, confirmed)) : [];
    const derived = skillsForDoc(onResume, asks, d.hiddenSkills);
    const own = orderedSkills([...derived.asked, ...derived.other], d.skillOrder, (n) => hasName(confirmed, n) || hasName(onResume, n), d.hiddenSkills);
    const split = d.skillOrder ? { asked: own.lead, other: own.rest } : derived;
    const docSkills = [...split.asked, ...split.other];
    const tools = RESUME_TOOLS.filter((t) => !hasName(d.hiddenSkills, t.name)).map((t) => t.name);
    const shown = entries.filter((e) => !d.hiddenExperience.includes(e.id));
    const courses = d.courses ?? suggestedCourses;
    const headline = d.headline ?? suggestedHeadline(role?.title ?? null, MAJOR);
    const summary = d.summary ?? suggestedSummary({ major: MAJOR, roleTitle: role?.title ?? null, skills: docSkills });
    const letter = d.letter ?? coverTemplate({ name: student.name, roleTitle: dApp?.role || role?.title || null, school: school(student.from), major: MAJOR, skills: docSkills, experience: shown.map((e) => e.phrase) }).replace("[organization]", dApp?.company || "[organization]");
    // An event she moved under Projects reads as the project itself: its name, then who ran it.
    const toEntry = (e: (typeof entries)[number]): PageEntry => {
      const asProject = entrySection(d, e) === "projects" && e.section !== "projects" && e.record?.type === "event";
      return { id: e.id, role: asProject ? e.record!.title : e.role, org: asProject && e.record?.type === "event" ? e.record.host : e.org, when: e.when, bullets: entryBullets(d, e.id, e.suggested) };
    };
    const inSection = (s: "experience" | "training" | "projects") => orderEntries(shown.filter((e) => entrySection(d, e) === s), d.entryOrder).map(toEntry);
    const page: ResumePage = {
      kind: d.kind,
      name: student.name,
      headline,
      contact: contactLine(student.email, school(student.from), j.resumeContact),
      summary: sectionHidden(d, "summary") ? "" : summary,
      letter,
      education: educationFor(courses),
      experience: inSection("experience"),
      projects: sectionHidden(d, "projects") ? [] : [
        ...inSection("projects"),
        ...(d.showProjects ? d.projects.filter((p) => p.title.trim()).map((p) => ({ id: `proj-${p.id}`, role: p.title, org: "", when: "", bullets: p.text.split("\n").map((l) => l.trim()).filter(Boolean) })) : []),
      ],
      training: sectionHidden(d, "training") ? [] : inSection("training"),
      skills: skillLines(docSkills, (n) => byName.get(n.toLowerCase())?.theme, tools),
    };
    return { role, page, look: docLook(d), split, docSkills, tools, shown, courses, headline, summary, letter };
  };
  const lookOf = (d: ResumeDoc) => { const p = pageFor(d); return { page: p.page, template: p.look.template, accent: p.look.accent }; };

  const cur = pageFor(doc);
  const { role, page, look, split, docSkills, tools, courses, headline, summary, letter } = cur;
  const save = (patch: Partial<ResumeDoc>) => j.saveResume({ ...doc, ...patch });
  const courseSkills = [...ledgerSkills, ...gapSkills].map((x) => ({ course: x.course, name: x.name }));

  // Sprout's ideas: only from her records (skills and where they came from, events, her words, her transcript).
  const ideas: Idea[] = doc.kind === "cover" ? [] : ideasFor({
    major: MAJOR,
    role,
    building: role ? buildSkillsFor(role, j.buildSkills, confirmed) : [],
    skills: all,
    onDoc: [...docSkills, ...tools],
    summary: page.summary,
    entries: entries.map((e) => ({ id: e.id, section: entrySection(doc, e), role: e.role, bullets: entryBullets(doc, e.id, e.suggested), hidden: doc.hiddenExperience.includes(e.id), record: e.record })),
    courses: transcriptCourses,
    onCourses: courses,
    courseSkills,
  }, doc);
  const takeIdea = (idea: Idea) => {
    if (!idea.apply) return;
    const before = doc;
    const wasSaved = j.resumes.some((d) => d.id === doc.id);
    const skillsBefore = { resumeSkills: j.resumeSkills, resumeNew: j.resumeNew };
    const { patch, addSkill, block } = applyIdea(doc, idea.apply);
    const changesDoc = Object.keys(patch).length > 0;
    const wasOn = !!addSkill && hasName(j.resumeSkills, addSkill);
    const wasDismissed = !!addSkill && hasName(j.resumeDismissed, addSkill);
    if (changesDoc) save(patch);
    if (addSkill && !wasOn) j.addResumeSkill(addSkill);
    ping(block);
    toast(`Used Sprout's idea: ${idea.title}`, {
      action: {
        label: "Undo",
        onClick: () => {
          if (changesDoc) { if (wasSaved) j.saveResume(before); else j.removeResume(before.id); }
          if (addSkill && !wasOn) { if (wasDismissed) j.removeResumeSkill(addSkill); else j.syncResumeSkills({ ...skillsBefore, seeded: true }); }
        },
      },
    });
  };
  const skipIdea = (idea: Idea) => save({ dismissedIdeas: dismissIdea(doc, idea.id) });
  const text = resumeText(page);

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
  // Download as PDF: the browser's own print dialog, with a print stylesheet that prints only the page.
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const title = document.title;
    document.title = docFileName(doc, student.name).replace(/\.txt$/, "");
    const id = window.requestAnimationFrame(() => {
      try { window.print(); } catch { /* no print dialog here */ }
      document.title = title;
      setPrinting(false);
    });
    return () => { window.cancelAnimationFrame(id); document.title = title; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printing]);

  const open = (id: string) => { setPicked(id); setView("build"); };
  const makeVersion = () => {
    const v = newVersion(doc, doc.roleId, role?.title, docs.map((d) => d.id), Date.now());
    j.saveResume(v);
    setPicked(v.id);
    toast(`Made a new version of ${doc.title}`, { description: "The one you started from stays as it was." });
  };
  const resetDoc = () => {
    const before = doc;
    j.removeResume(doc.id);
    if (!defaults.has(doc.id)) setPicked(null);
    toast(defaults.has(doc.id) ? "Back to the suggested draft" : "Deleted this version", { action: { label: "Undo", onClick: () => { j.saveResume(before); setPicked(before.id); } } });
  };

  // ---------- Drop a job ----------
  const startBase = bases.find((d) => d.id === (doc.applicationId ? doc.copiedFrom : doc.id)) ?? bases[0]!;
  const startTailor = (dropped: Dropped) => {
    const base = docs.find((d) => d.id === dropped.baseId) ?? startBase;
    const b = pageFor(base);
    const input: TailorInput = {
      posting: dropped.posting,
      company: dropped.company,
      title: dropped.title,
      major: MAJOR,
      skills: all,
      docSkills: b.docSkills,
      summary: b.summary,
      entries: entries.map((e) => ({
        id: e.id, section: entrySection(base, e), home: e.section, role: e.role, bullets: entryBullets(base, e.id, e.suggested), hidden: base.hiddenExperience.includes(e.id), record: e.record,
        skills: e.record?.type === "event" ? e.record.skills.map((s) => s.name) : j.activities.find((a) => a.id === e.id)?.skills ?? [],
      })),
      courses: transcriptCourses,
      onCourses: b.courses,
      courseSkills,
      doc: base,
    };
    const result = tailor(input);
    if (result.kind !== "ok") { toast(result.kind === "link" ? "I can't open links here. Paste the description text and I'll read it." : "Paste the full description and I'll read it."); return; }
    setRun({ dropped, base, input, result });
  };
  const saveTailored = (patch: Partial<ResumeDoc>) => {
    if (!run) return;
    const stamp = Date.now();
    const { dropped, base } = run;
    const appId = `app-${stamp.toString(36)}`;
    const d = tailoredDoc(base, patch, { id: `${base.kind}-${appId}`, title: `${KIND_LABEL[base.kind]} · ${dropped.title} — ${dropped.company}`, posting: dropped.posting, applicationId: appId });
    const a: Application = { ...blankApplication(base.roleId, d.id, stamp, dropped.title), id: appId, company: dropped.company, posting: dropped.posting, savedOn: SCRIPT_TODAY };
    j.saveResume(d);
    j.saveApplication(a);
    setRun(null);
    setPicked(d.id);
    setPanel("content");
    toast(`Saved ${dropped.company} to your applications`, { description: "Your base resume didn't change. Keep editing this version on the board." });
  };
  const writeCover = (a: Application) => {
    const c: ResumeDoc = { ...blankDoc("cover", a.roleId ?? null), id: `cover-${a.id}`, title: `Cover letter · ${[a.role, a.company].filter(Boolean).join(" — ")}`, applicationId: a.id };
    j.saveResume(c);
    j.saveApplication({ ...a, coverId: c.id });
    open(c.id);
  };

  // The document row: base versions and cover letters, plus the tailored version when one is open.
  const rowDocs = [...docs.filter((d) => !d.applicationId), ...(doc.applicationId ? [doc] : [])];
  const isResume = doc.kind === "resume";
  return (
    <div className="space-y-5">
      {viewProp === undefined && <ResumeViewToggle view={view} onView={setView} count={j.applications.length} />}

      {view === "applications" ? (
        <Applications docs={docs} bases={bases} goals={goals.map((g) => g.id)} lookOf={lookOf} onOpen={open} onCover={writeCover}
          onDrop={() => { setView("build"); setRun(null); setFocusDrop((n) => n + 1); }} />
      ) : (
        <>
          {run ? (
            <TailorFlow key={run.dropped.posting + run.dropped.baseId} base={run.base} input={run.input} result={run.result} job={run.dropped} roleId={run.base.roleId ?? goals[0]?.id ?? null}
              lookOf={lookOf} onSave={saveTailored} onCancel={() => setRun(null)} />
          ) : (
            <DropJob bases={bases} baseId={startBase.id} onTailor={startTailor} focusKey={focusDrop} />
          )}

          <nav aria-label="Documents" className="flex flex-wrap gap-2">
            {rowDocs.map((d) => (
              <button key={d.id} type="button" aria-pressed={d.id === doc.id} onClick={() => setPicked(d.id)}
                className={cn("min-w-0 max-w-full truncate !rounded-[14px] px-3.5 py-2 text-left text-sm font-medium transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none", d.id === doc.id ? "glass-picked" : "bg-card/80 text-muted-foreground shadow-soft hover:bg-card hover:text-foreground")}>
                {d.title}
              </button>
            ))}
          </nav>

          <div className="pc-stage rs-stage">
            <div className="rs-canvas">
              <div className="rs-toolbar">
                <span className="rs-count" aria-live="polite">
                  {pages === 1 ? "1 page" : `${pages} pages`}
                  {pages > 1 && isResume && <span className="font-normal text-muted-foreground">· try Compact</span>}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void copy()}><Copy className="size-3.5" aria-hidden="true" />Copy text</Button>
                  <Button size="sm" variant="outline" className="bg-card" onClick={download}><Download className="size-3.5" aria-hidden="true" />Download as text</Button>
                  <Button size="sm" variant="outline" className="bg-card" onClick={() => setPrinting(true)}><FileDown className="size-3.5" aria-hidden="true" />Download as PDF</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8 rounded-full bg-card" aria-label="More for this document"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!doc.applicationId && <DropdownMenuItem onSelect={makeVersion}><CopyPlus className="size-4" />Make a new version</DropdownMenuItem>}
                      {j.resumes.some((d) => d.id === doc.id) && !doc.applicationId && (
                        <DropdownMenuItem onSelect={resetDoc}>{defaults.has(doc.id) ? <><RotateCcw className="size-4" />Start over from the suggestion</> : <><Trash2 className="size-4" />Delete this version</>}</DropdownMenuItem>
                      )}
                      {doc.applicationId && <DropdownMenuItem onSelect={() => setView("applications")}><FileText className="size-4" />See it in Applications</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <FittedPaper key={doc.id} page={page} template={look.template} accent={look.accent} newSkills={j.resumeNew} flash={flash} onJump={onJump} onPages={setPages} />
            </div>

            <aside className="pc-panel" aria-label="Build your resume">
              <div className="pc-panel-head">
                <h2 className="text-base font-semibold">{doc.kind === "cover" ? "Write your letter" : `Build your ${KIND_LABEL[doc.kind].toLowerCase()}`}</h2>
                {app && <p className="mt-1 text-sm text-muted-foreground">For {[app.role, app.company].filter(Boolean).join(" at ")}</p>}
                <div className="pc-tabs segmented" role="tablist" aria-label="Resume settings">
                  {PANELS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={panel === t.id} onClick={() => setPanel(t.id)} className="pc-tab-btn">{t.label}</button>)}
                </div>
              </div>
              <div className="pc-panel-body" role="tabpanel" aria-label={PANELS.find((t) => t.id === panel)!.label}>
                {panel === "content" && (
                  <ContentPanel key={doc.id} doc={doc} save={save} ping={ping} fieldFlash={fieldFlash} jump={jump} onJumpDone={() => setJump(null)} headline={headline} summary={summary} letter={letter} entries={entries} courses={courses}
                    skills={{ split, byName, all, roleTitle: role?.title ?? null }} page={page} ideas={ideas} onUseIdea={takeIdea} onSkipIdea={skipIdea} />
                )}
                {panel === "style" && <StylePanel doc={doc} save={save} pages={pages} />}
                {panel === "job" && (
                  <JobPanel key={doc.id} doc={doc} app={app} role={role} onDoc={docSkills} confirmed={confirmed} save={save}
                    onAdd={(n) => { if (!hasName(j.resumeSkills, n)) j.addResumeSkill(n); if (hasName(doc.hiddenSkills, n)) save({ hiddenSkills: doc.hiddenSkills.filter((x) => x.toLowerCase() !== n.toLowerCase()) }); ping("skills"); }} />
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      {printing && typeof document !== "undefined" && createPortal(<div className="rs-print-root"><PaperContent page={page} template={look.template} accent={look.accent} /></div>, document.body)}
    </div>
  );
}
