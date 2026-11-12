import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Copy, Download, FileDown, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";
import { careerRoles, gapSkills, ledgerSkills, student } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { buildSkillsFor, chosenGoals } from "@/lib/goals";
import {
  appsIn, blankDoc, contactLine, coverTemplate, docFileName, docLook, docsIn, entryBullets, entrySection, folderList, folderOf, hasName, jobFolder, jobFolderDocs,
  KIND_LABEL, libraryDocs, newVersion, resumeText, roleAsks, sectionHidden, skillLines, skillsForDoc, suggestedHeadline, suggestedSummary, syncResumeSkills,
  type PageEntry, type ResumeDoc, type ResumePage,
} from "@/lib/resume";
import { applyIdea, dismissIdea, ideasFor, type Idea } from "@/lib/resumeSuggest";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFound } from "@/components/app/EventBits";
import { usePortfolioSkills } from "@/hooks/use-portfolio-skills";
import { ApplyPanel } from "@/components/app/resume/ApplyPanel";
import { ContentPanel } from "@/components/app/resume/ContentPanel";
import { FolderBar, FolderRail, NewJobFolder } from "@/components/app/resume/Folders";
import { JobPanel } from "@/components/app/resume/JobPanel";
import { FittedPaper, PaperContent } from "@/components/app/resume/ResumePaper";
import { StylePanel } from "@/components/app/resume/StylePanel";
import { MAJOR, RESUME_TOOLS, educationFor, suggestedCourses, transcriptCourses, useResumeEntries } from "@/components/app/resume/data";
import "@/styles/resume.css";

const school = (s: string) => s.replace(/\s*\(.*\)$/, "");

type PanelId = "content" | "style" | "job" | "apply";
const PANELS: { id: PanelId; label: string }[] = [{ id: "content", label: "Content" }, { id: "style", label: "Style" }, { id: "job", label: "Job" }, { id: "apply", label: "Apply" }];

/**
 * Career → Resume. Folders of resumes, CVs and cover letters (one per goal, one per specific job, and General),
 * each with the applications she tracks. The page sits on the Your card board; the panel beside it edits it.
 * Everything is a draft she copies or downloads herself. Nothing is sent.
 */
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
  const folders = folderList(goals, j.resumeFolders, docs, (id) => careerRoles.find((r) => r.id === id)?.title);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const folder = folders.find((f) => f.id === folderId) ?? folders[0]!;
  const inFolder = docsIn(docs, folder.id);
  const doc: ResumeDoc = inFolder.find((d) => d.id === picked) ?? inFolder[0] ?? { ...blankDoc("resume", folder.roleId, folder.title), id: `resume-${folder.id}`, ...(folder.job ? { folder: folder.id } : {}) };
  const folderDocs = inFolder.length ? inFolder : [doc];
  const role = careerRoles.find((r) => r.id === doc.roleId) ?? null;
  const apps = appsIn(j.applications, folder.id);

  const [panel, setPanel] = useState<PanelId>("content");
  const [pages, setPages] = useState(1);
  const [newFolder, setNewFolder] = useState(false);

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

  // Skills: confirmed ones on her resume, the ones this career asks for first.
  const byName = useMemo(() => new Map(all.filter((s) => !s.hidden).map((s) => [s.name.toLowerCase(), s])), [all]);
  const onResume = j.resumeSkills.flatMap((n) => byName.get(n.toLowerCase()) ?? []).map((s) => s.name);
  const confirmed = all.filter((s) => s.confirmed && !s.hidden).map((s) => s.name);
  const asks = role ? roleAsks(role, buildSkillsFor(role, j.buildSkills, confirmed)) : [];
  const split = skillsForDoc(onResume, asks, doc.hiddenSkills);
  const docSkills = [...split.asked, ...split.other];
  const tools = RESUME_TOOLS.filter((t) => !hasName(doc.hiddenSkills, t.name)).map((t) => t.name);

  const entries = useResumeEntries(found);
  const shown = entries.filter((e) => !doc.hiddenExperience.includes(e.id));
  const courses = doc.courses ?? suggestedCourses;

  const save = (patch: Partial<ResumeDoc>) => j.saveResume({ ...doc, ...patch });
  const headline = doc.headline ?? suggestedHeadline(role?.title ?? null, MAJOR);
  const summary = doc.summary ?? suggestedSummary({ major: MAJOR, roleTitle: role?.title ?? null, skills: docSkills });
  const letter = doc.letter ?? coverTemplate({ name: student.name, roleTitle: folder.job?.title ?? role?.title ?? null, school: school(student.from), major: MAJOR, skills: docSkills, experience: shown.map((e) => e.phrase) });

  // An event she moved under Projects reads as the project itself: its name, then who ran it.
  const toEntry = (e: (typeof entries)[number]): PageEntry => {
    const asProject = entrySection(doc, e) === "projects" && e.section !== "projects" && e.record?.type === "event";
    return { id: e.id, role: asProject ? e.record!.title : e.role, org: asProject && e.record?.type === "event" ? e.record.host : e.org, when: e.when, bullets: entryBullets(doc, e.id, e.suggested) };
  };
  const inSection = (s: "experience" | "training" | "projects") => shown.filter((e) => entrySection(doc, e) === s).map(toEntry);
  const page: ResumePage = {
    kind: doc.kind,
    name: student.name,
    headline,
    contact: contactLine(student.email, school(student.from), j.resumeContact),
    summary: sectionHidden(doc, "summary") ? "" : summary,
    letter,
    education: educationFor(courses),
    experience: inSection("experience"),
    projects: sectionHidden(doc, "projects") ? [] : [
      ...inSection("projects"),
      ...(doc.showProjects ? doc.projects.filter((p) => p.title.trim()).map((p) => ({ id: `proj-${p.id}`, role: p.title, org: "", when: "", bullets: p.text.split("\n").map((l) => l.trim()).filter(Boolean) })) : []),
    ],
    training: sectionHidden(doc, "training") ? [] : inSection("training"),
    skills: skillLines(docSkills, (n) => byName.get(n.toLowerCase())?.theme, tools),
  };
  const look = docLook(doc);

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
    courseSkills: [...ledgerSkills, ...gapSkills].map((x) => ({ course: x.course, name: x.name })),
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

  const pick = (id: string) => { setPicked(id); };
  const pickFolder = (id: string) => { setFolderId(id); setPicked(null); };
  const makeVersion = (roleId: string | null) => {
    const r = careerRoles.find((x) => x.id === roleId);
    const v = newVersion(doc, roleId, r?.title, docs.map((d) => d.id), Date.now());
    j.saveResume(v);
    setFolderId(folderOf(v));
    setPicked(v.id);
    toast(`Made a new ${KIND_LABEL[doc.kind].toLowerCase()} for ${r?.title ?? "any role"}`, { description: "Your other version stays as it was." });
  };
  const resetDoc = () => {
    const before = doc;
    j.removeResume(doc.id);
    if (!defaults.has(doc.id)) setPicked(null);
    toast(defaults.has(doc.id) ? "Back to the suggested draft" : "Deleted this version", { action: { label: "Undo", onClick: () => { j.saveResume(before); setPicked(before.id); } } });
  };
  const makeJobFolder = (title: string, org: string, roleId: string | null) => {
    const stamp = Date.now();
    const f = jobFolder(title, org, roleId, stamp);
    const from = doc.kind === "cover" ? folderDocs.find((d) => d.kind === "resume") ?? blankDoc("resume", roleId) : doc;
    const made = jobFolderDocs(f, from, stamp);
    j.saveResumeFolder(f);
    for (const d of made) j.saveResume(d);
    setNewFolder(false);
    setFolderId(f.id);
    setPicked(made[0]!.id);
    toast(`Made a folder for ${f.title}`, { description: "With a copy of your resume and a cover letter to tailor." });
  };
  const deleteFolder = () => {
    const f = folder;
    const keptDocs = j.resumes.filter((d) => d.folder === f.id);
    const keptApps = j.applications.filter((a) => a.folderId === f.id);
    j.removeResumeFolder(f.id);
    setFolderId(null);
    setPicked(null);
    toast(`Deleted ${f.title}`, { action: { label: "Undo", onClick: () => { j.saveResumeFolder(f); keptDocs.forEach(j.saveResume); keptApps.forEach(j.saveApplication); setFolderId(f.id); } } });
  };

  const isResume = doc.kind === "resume";
  return (
    <div className="space-y-5">
      <FolderRail folders={folders} docs={docs} apps={j.applications} current={folder.id} mainGoal={goals[0]?.id} onPick={pickFolder} onNew={() => setNewFolder(true)} />
      <FolderBar folder={folder} docs={folderDocs} apps={apps} current={doc.id} edited={new Set(j.resumes.map((d) => d.id))} goals={goals.map((g) => g.id)}
        onPick={pick} onVersion={makeVersion} onTrack={() => setPanel("apply")} onDelete={folder.job ? deleteFolder : undefined} />

      <div className="pc-stage rs-stage">
        <div className="rs-canvas">
          <div className="rs-toolbar">
            <span className="rs-count" aria-live="polite">
              {pages === 1 ? "1 page" : `${pages} pages`}
              {pages > 1 && isResume && <span className="font-normal text-muted-foreground">· most student resumes fit on one. Try Compact or trim a bullet.</span>}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void copy()}><Copy className="size-3.5" aria-hidden="true" />Copy text</Button>
              <Button size="sm" variant="outline" className="bg-card" onClick={download}><Download className="size-3.5" aria-hidden="true" />Download as text</Button>
              <Button size="sm" variant="outline" className="bg-card" onClick={() => setPrinting(true)}><FileDown className="size-3.5" aria-hidden="true" />Download as PDF</Button>
              {j.resumes.some((d) => d.id === doc.id) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8 rounded-full bg-card" aria-label="More for this document"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={resetDoc}>{defaults.has(doc.id) ? <><RotateCcw className="size-4" />Start over from the suggestion</> : <><Trash2 className="size-4" />Delete this version</>}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <FittedPaper key={doc.id} page={page} template={look.template} accent={look.accent} newSkills={j.resumeNew} flash={flash} onJump={onJump} onPages={setPages} />
          <p className="text-xs text-muted-foreground">A draft until you copy or download it. Click any part of the page to edit it.</p>
        </div>

        <aside className="pc-panel" aria-label="Build your resume">
          <div className="pc-panel-head">
            <h2 className="text-base font-semibold">{doc.kind === "cover" ? "Write your letter" : `Build your ${KIND_LABEL[doc.kind].toLowerCase()}`}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{doc.title}. The page updates as you type.</p>
            <div className="pc-tabs" role="tablist" aria-label="Resume settings">
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
              <JobPanel key={doc.id} doc={doc} folder={folder} role={role} onDoc={docSkills} confirmed={confirmed} save={save}
                onAdd={(n) => { if (!hasName(j.resumeSkills, n)) j.addResumeSkill(n); if (hasName(doc.hiddenSkills, n)) save({ hiddenSkills: doc.hiddenSkills.filter((x) => x.toLowerCase() !== n.toLowerCase()) }); ping("skills"); }} />
            )}
            {panel === "apply" && <ApplyPanel folder={folder} docs={folderDocs} apps={apps} currentDoc={doc} />}
          </div>
        </aside>
      </div>

      <NewJobFolder open={newFolder} onOpenChange={setNewFolder} goals={goals.map((g) => g.id)} defaultRole={folder.roleId ?? goals[0]?.id ?? null} onMake={makeJobFolder} />
      {printing && typeof document !== "undefined" && createPortal(<div className="rs-print-root"><PaperContent page={page} template={look.template} accent={look.accent} /></div>, document.body)}
    </div>
  );
}
