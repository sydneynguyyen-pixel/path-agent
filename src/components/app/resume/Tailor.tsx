import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, Pencil, RotateCcw, Undo2, X } from "lucide-react";
import { readPosting } from "@/lib/posting";
import { orderEntries, type ResumeAccent, type ResumeDoc, type ResumePage, type ResumeTemplate } from "@/lib/resume";
import {
  guessJob, listDiff, mergeDecisions, sectionLines, TAILOR_LABEL, TAILOR_ORDER,
  type Decision, type DiffItem, type TailorChange, type TailorInput, type TailorSection, type Tailoring,
} from "@/lib/tailor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AgentFace, SproutSays } from "@/components/app/Brand";
import { Spot } from "@/components/app/Illustrations";
import { MiniPaper } from "./ResumePaper";

export const HONEST = "Tailored from your records; no AI is connected here.";
const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const isText = (f: File) => f.type.startsWith("text/") || /\.(txt|md|text)$/i.test(f.name);

export type Dropped = { posting: string; company: string; title: string; baseId: string };

/**
 * "Drop a job": Sprout's ask box for a posting. Paste the description (a link gets an honest "I can't open
 * links"), or drop text or a .txt file on it (read in the browser, never uploaded). Company, job title and the
 * base version show as small editable chips once there's text, prefilled when the posting says them plainly.
 */
export function DropJob({ bases, baseId, onTailor, focusKey }: { bases: ResumeDoc[]; baseId: string; onTailor: (d: Dropped) => void; focusKey?: number }) {
  const [text, setText] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [base, setBase] = useState(baseId);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const typed = useRef({ company: false, title: false });
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setBase(baseId); }, [baseId]);
  useEffect(() => { if (focusKey) box.current?.focus(); }, [focusKey]);

  const take = (t: string) => {
    setText(t);
    setNote(null);
    const g = guessJob(t);
    if (!typed.current.company) setCompany(g.company);
    if (!typed.current.title) setTitle(g.title);
  };
  const read = readPosting(text);
  const named = company.trim() && title.trim();
  const ready = read.kind === "ok" && !!named;
  const go = () => { if (ready) onTailor({ posting: text.trim(), company: company.trim(), title: title.trim(), baseId: base }); };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!isText(file)) { setNote("I can only read text files, like a .txt."); return; }
      const r = new FileReader();
      r.onload = () => take(String(r.result ?? ""));
      r.readAsText(file);
      return;
    }
    const t = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text");
    if (t) take(t);
  };
  const message = note ?? (read.kind === "link" ? "I can't open links here. Paste the description text and I'll read it."
    : read.kind === "short" ? "That's too short to read. Paste the full description."
    : read.kind === "ok" && !named ? "Add the company and job title." : "");

  return (
    <section aria-label="Drop a job" className="rs-drop surface">
      <div className="min-w-0 flex-1">
        <SproutSays className="max-w-md">Drop a job and I'll tailor a copy.</SproutSays>
        <div className="rs-ask agent-ring mt-3" data-over={over ? "" : undefined}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false); }} onDrop={onDrop}>
          <textarea ref={box} value={text} onChange={(e) => take(e.target.value)} rows={3} aria-label="Job description"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); go(); } }}
            placeholder="Paste the job description, a link, or drop a .txt file" className="rs-ask-input" />
          <button type="button" className="agent-send rs-ask-send" disabled={!ready} onClick={go} aria-label="Tailor my resume" title="Tailor"><ArrowUp className="size-4.5" aria-hidden="true" /></button>
        </div>
        {text.trim() && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <label className="rs-chip"><input value={company} aria-label="Company" placeholder="+ Company" onChange={(e) => { typed.current.company = true; setCompany(e.target.value); }} /><Pencil className="size-3 shrink-0 opacity-60" aria-hidden="true" /></label>
            <label className="rs-chip"><input value={title} aria-label="Job title" placeholder="+ Job title" onChange={(e) => { typed.current.title = true; setTitle(e.target.value); }} /><Pencil className="size-3 shrink-0 opacity-60" aria-hidden="true" /></label>
            <label className="rs-chip">
              <span className="text-muted-foreground">From:</span>
              <select value={base} aria-label="Start from" onChange={(e) => setBase(e.target.value)}>
                {bases.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
              <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden="true" />
            </label>
          </div>
        )}
        <p aria-live="polite" className={cn("text-sm", message && "mt-2")}>{message}</p>
        <p className="mt-2 text-xs text-muted-foreground">From your records · nothing is uploaded or sent.</p>
      </div>
      <Spot name="envelope" className="hidden w-24 shrink-0 self-center lg:block" />
    </section>
  );
}

const LIT: Record<TailorSection, string> = { summary: "summary", skills: "skills", experience: "entry", education: "education" };

type Look = { page: ResumePage; template: ResumeTemplate; accent: ResumeAccent };

/**
 * After a drop: a small picture of her resume beside the steps, each section lighting up in turn with what
 * changed and why (about 350ms each; all at once with reduced motion). Then one card per section to accept,
 * edit or keep her original, and Save as application. Her base resume never changes.
 */
export function TailorFlow({ base, input, result, job, roleId, lookOf, onSave, onCancel }: {
  base: ResumeDoc; input: TailorInput; result: Extract<Tailoring, { kind: "ok" }>; job: { company: string; title: string };
  roleId: string | null; lookOf: (d: ResumeDoc) => Look; onSave: (patch: Partial<ResumeDoc>) => void; onCancel: () => void;
}) {
  const [step, setStep] = useState(() => (reduced() ? TAILOR_ORDER.length : 0));
  const [decisions, setDecisions] = useState<Partial<Record<TailorSection, Decision>>>({});
  const [editing, setEditing] = useState<TailorSection | null>(null);
  const done = step >= TAILOR_ORDER.length;
  useEffect(() => {
    if (done) return;
    const t = window.setTimeout(() => setStep((s) => s + 1), 350);
    return () => window.clearTimeout(t);
  }, [step, done]);

  const byId = (s: TailorSection) => result.changes.find((c) => c.section === s)!;
  // The picture fills in as each section is done; after that it follows her decisions.
  const shown = useMemo(() => {
    const d: Partial<Record<TailorSection, Decision>> = done ? decisions : Object.fromEntries(TAILOR_ORDER.slice(0, step).map((s) => [s, { kind: "accept" } as Decision]));
    return { ...base, ...mergeDecisions(result.changes, d, base) };
  }, [base, result, decisions, step, done]);
  const look = lookOf(shown);
  const changed = result.changes.filter((c) => c.changed);
  const open = changed.filter((c) => !decisions[c.section]);
  const decide = (s: TailorSection, d: Decision | null) => { setDecisions((x) => { const n = { ...x }; if (d) n[s] = d; else delete n[s]; return n; }); setEditing(null); };

  return (
    <section aria-label="Tailoring your resume" className="rs-tailor">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Tailoring for {job.title} at {job.company}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="size-3.5" aria-hidden="true" />Cancel</Button>
      </div>

      <div className="rs-run mt-4">
        <MiniPaper page={look.page} template={look.template} accent={look.accent} width={132} lit={done ? undefined : LIT[TAILOR_ORDER[step]!]} />
        <div className="min-w-0 flex-1">
          <ol className="grid gap-2" aria-label="What changed" aria-live="polite">
            {TAILOR_ORDER.map((s, k) => {
              const state = k < step ? "done" : k === step ? "active" : "pending";
              return (
                <li key={s} className="rs-step" data-state={state}>
                  <span className="rs-step-dot" aria-hidden="true">{state === "done" && <Check className="size-3" />}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{TAILOR_LABEL[s]}{state === "active" && <span className="sr-only"> (working)</span>}</span>
                    {state === "done" && <span className="rs-step-line block text-sm text-muted-foreground">{byId(s).line.replace(/^[^:]+:\s*/, "").replace(/^./, (c) => c.toUpperCase())}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          {!done && <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={() => setStep(TAILOR_ORDER.length)}>Show all changes now</Button>}
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><AgentFace className="size-5" />{HONEST}</p>
        </div>
      </div>

      {done && (
        <div role="region" aria-label="Review the changes" className="mt-6 grid gap-3">
          {result.changes.map((c) => (
            <ReviewCard key={c.section} change={c} input={input} base={base} decision={decisions[c.section]} editing={editing === c.section}
              onAccept={() => decide(c.section, { kind: "accept" })} onKeep={() => decide(c.section, { kind: "keep" })} onEdit={() => setEditing(c.section)}
              onEdited={(patch) => decide(c.section, { kind: "edit", patch })} onCancelEdit={() => setEditing(null)} onUndo={() => decide(c.section, null)} />
          ))}
          {(result.unconfirmed.length > 0 || result.gaps.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {result.unconfirmed.length > 0 && (
                <div className="rs-card p-3.5" role="group" aria-label="You may have these">
                  <p className="text-sm font-semibold">You may have {result.unconfirmed.length > 1 ? "these" : "this"} — check {result.unconfirmed.length > 1 ? "them" : "it"} on Your skills</p>
                  <ul className="mt-2 grid gap-1 text-sm">{result.unconfirmed.map((u) => <li key={u.name}><span className="font-medium">{u.name}</span><span className="text-xs text-muted-foreground"> · from {u.from}</span></li>)}</ul>
                  <Button asChild size="sm" variant="ghost" className="mt-1 -ml-3"><Link to="/career" search={{ tab: "skills" }}>Check on Your skills<ArrowRight className="size-3.5" aria-hidden="true" /></Link></Button>
                </div>
              )}
              {result.gaps.length > 0 && (
                <div className="rs-card p-3.5" role="group" aria-label="Not yet">
                  <p className="text-sm font-semibold">Not yet in your records</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">{result.gaps.map((g) => <li key={g} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{g}</li>)}</ul>
                  <Button asChild size="sm" variant="ghost" className="mt-1 -ml-3"><Link to="/career" search={roleId ? { plan: roleId } : {}}>Plan toward a role<ArrowRight className="size-3.5" aria-hidden="true" /></Link></Button>
                </div>
              )}
            </div>
          )}
          <div className="rs-review-foot">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">{open.length ? `${open.length} to review` : "All reviewed"}</p>
            <Button variant="outline" className="bg-card" disabled={!open.length} onClick={() => setDecisions((x) => ({ ...x, ...Object.fromEntries(open.map((c) => [c.section, { kind: "accept" }])) }))}>Accept all remaining</Button>
            <Button onClick={() => onSave(mergeDecisions(result.changes, decisions, base))}>Save as application</Button>
          </div>
        </div>
      )}
    </section>
  );
}

function Diff({ items, prose }: { items: DiffItem[]; prose?: boolean }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Empty</p>;
  // Prose (the summary) reads old then new; lists read in their new order with what came off at the end.
  const list = prose ? [...items.filter((x) => x.change === "removed"), ...items.filter((x) => x.change !== "removed")] : items;
  return (
    <ul className={cn("rs-diff", prose ? "grid gap-1.5" : "flex flex-wrap gap-1.5")}>
      {list.map((x) => (
        <li key={`${x.change}-${x.text}`} data-change={x.change}>
          {x.change === "added" ? <ins><span className="sr-only">Added: </span>{x.text}</ins>
            : x.change === "removed" ? <del><span className="sr-only">Removed: </span>{x.text}</del>
            : <span>{x.text}{x.change === "moved" && <span className="rs-moved"><ArrowUp className="size-3" aria-hidden="true" /><span className="sr-only"> (</span>moved up<span className="sr-only">)</span></span>}</span>}
        </li>
      ))}
    </ul>
  );
}

function ReviewCard({ change: c, input, base, decision, editing, onAccept, onKeep, onEdit, onEdited, onCancelEdit, onUndo }: {
  change: TailorChange; input: TailorInput; base: ResumeDoc; decision: Decision | undefined; editing: boolean;
  onAccept: () => void; onKeep: () => void; onEdit: () => void; onEdited: (p: Partial<ResumeDoc>) => void; onCancelEdit: () => void; onUndo: () => void;
}) {
  const s = c.section;
  const patch = decision?.kind === "edit" ? decision.patch : decision?.kind === "keep" ? {} : c.patch;
  const before = sectionLines(s, input, base);
  const after = sectionLines(s, input, { ...base, ...patch });
  const status = !decision ? null : decision.kind === "accept" ? "Accepted" : decision.kind === "edit" ? "Edited by you" : "Kept your original";
  return (
    <article aria-label={TAILOR_LABEL[s]} className="rs-card rs-review" data-decided={decision ? "" : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{TAILOR_LABEL[s]}</h3>
        {status && <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", decision?.kind === "keep" ? "bg-muted" : "glass-active")}>{status}</span>}
      </div>
      {!c.changed ? (
        <p className="mt-1 text-sm text-muted-foreground">{c.line.replace(/^[^:]+:\s*/, "").replace(/^./, (x) => x.toUpperCase())}. No change.</p>
      ) : (
        <>
          {c.notes.length > 0 && <ul className="mt-1.5 grid gap-0.5 text-sm">{c.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
          {editing ? (
            <Editor section={s} input={input} base={base} patch={patch} onDone={onEdited} onCancel={onCancelEdit} />
          ) : (
            <>
              <div className="mt-3"><Diff items={decision?.kind === "keep" ? before.map((text) => ({ text, change: "same" as const })) : listDiff(before, after)} prose={s === "summary"} /></div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {decision ? (
                  <Button size="sm" variant="ghost" className="h-8 -ml-2" onClick={onUndo}><Undo2 className="size-3.5" aria-hidden="true" />Change my mind<span className="sr-only"> about {TAILOR_LABEL[s]}</span></Button>
                ) : (
                  <>
                    <Button size="sm" className="h-8" onClick={onAccept}><Check className="size-3.5" aria-hidden="true" />Accept<span className="sr-only"> {TAILOR_LABEL[s]}</span></Button>
                    <Button size="sm" variant="outline" className="h-8 bg-card" onClick={onEdit}><Pencil className="size-3.5" aria-hidden="true" />Edit<span className="sr-only"> {TAILOR_LABEL[s]}</span></Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={onKeep}><RotateCcw className="size-3.5" aria-hidden="true" />Keep my original<span className="sr-only"> {TAILOR_LABEL[s]}</span></Button>
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </article>
  );
}

/** One section's editor, inline in its card, prefilled with the tailored version. */
function Editor({ section, input, base, patch, onDone, onCancel }: { section: TailorSection; input: TailorInput; base: ResumeDoc; patch: Partial<ResumeDoc>; onDone: (p: Partial<ResumeDoc>) => void; onCancel: () => void }) {
  const merged = { ...base, ...patch };
  const [summary, setSummary] = useState(merged.summary ?? input.summary);
  const [skills, setSkills] = useState(() => sectionLines("skills", input, merged));
  const [entries, setEntries] = useState(() => orderEntries(input.entries, merged.entryOrder).map((e) => ({ id: e.id, label: e.record?.type === "event" && (merged.entrySections?.[e.id] ?? e.section) === "projects" ? e.record.title : e.role, shown: !merged.hiddenExperience.includes(e.id) })));
  const [courses, setCourses] = useState(() => merged.courses ?? input.onCourses);
  const move = <T,>(list: T[], i: number, d: number) => { const n = [...list]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x as T); return n; };
  const label = TAILOR_LABEL[section];
  const done = () => {
    if (section === "summary") onDone({ summary, hiddenSections: (merged.hiddenSections ?? []).filter((x) => x !== "summary") });
    if (section === "skills") {
      const removed = sectionLines("skills", input, merged).filter((n) => !skills.includes(n));
      onDone({ skillOrder: skills, hiddenSkills: [...base.hiddenSkills.filter((n) => !skills.some((x) => x.toLowerCase() === n.toLowerCase())), ...removed] });
    }
    if (section === "experience") onDone({ ...patch, entryOrder: entries.map((e) => e.id), hiddenExperience: entries.filter((e) => !e.shown).map((e) => e.id) });
    if (section === "education") onDone({ courses });
  };
  let body: ReactNode = null;
  if (section === "summary") body = <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} aria-label="Tailored summary" />;
  if (section === "skills") body = (
    <ul className="grid gap-1" aria-label="Tailored skills">
      {skills.map((n, i) => (
        <li key={n} className="flex items-center gap-1 text-sm">
          <span className="min-w-0 flex-1 truncate">{n}</span>
          <Button size="icon" variant="ghost" className="size-7 rounded-full" disabled={i === 0} aria-label={`Move ${n} up`} onClick={() => setSkills(move(skills, i, -1))}><ArrowUp className="size-3.5" /></Button>
          <Button size="icon" variant="ghost" className="size-7 rounded-full" disabled={i === skills.length - 1} aria-label={`Move ${n} down`} onClick={() => setSkills(move(skills, i, 1))}><ArrowDown className="size-3.5" /></Button>
          <Button size="icon" variant="ghost" className="size-7 rounded-full" aria-label={`Leave ${n} off`} onClick={() => setSkills(skills.filter((x) => x !== n))}><X className="size-3.5" /></Button>
        </li>
      ))}
    </ul>
  );
  if (section === "experience") body = (
    <ul className="grid gap-1" aria-label="Tailored entries">
      {entries.map((e, i) => (
        <li key={e.id} className="flex items-center gap-2 text-sm">
          <Checkbox checked={e.shown} aria-label={`Show ${e.label}`} onCheckedChange={(v) => setEntries(entries.map((x) => (x.id === e.id ? { ...x, shown: !!v } : x)))} />
          <span className={cn("min-w-0 flex-1 truncate", !e.shown && "text-muted-foreground line-through")}>{e.label}</span>
          <Button size="icon" variant="ghost" className="size-7 rounded-full" disabled={i === 0} aria-label={`Move ${e.label} up`} onClick={() => setEntries(move(entries, i, -1))}><ArrowUp className="size-3.5" /></Button>
          <Button size="icon" variant="ghost" className="size-7 rounded-full" disabled={i === entries.length - 1} aria-label={`Move ${e.label} down`} onClick={() => setEntries(move(entries, i, 1))}><ArrowDown className="size-3.5" /></Button>
        </li>
      ))}
    </ul>
  );
  if (section === "education") body = (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tailored courses">
      {input.courses.map((c) => {
        const on = courses.includes(c.code);
        return <button key={c.code} type="button" aria-pressed={on} onClick={() => setCourses(on ? courses.filter((x) => x !== c.code) : [...courses, c.code])} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 motion-reduce:transition-none", on ? "glass-active" : "bg-muted text-muted-foreground hover:text-foreground")}>{c.title}</button>;
      })}
    </div>
  );
  return (
    <div className="mt-3 grid gap-3" role="group" aria-label={`Edit ${label}`}>
      {body}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" className="h-8" onClick={done}>Use my edit</Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
