import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileText, Mail, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { careerRoles } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { APP_STATUS, appRole, blankApplication, filterApps, type AppFilter, type Application, type ResumeAccent, type ResumeDoc, type ResumePage, type ResumeTemplate } from "@/lib/resume";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CareerMark } from "@/components/app/CareerMark";
import { FieldLabel } from "./bits";
import { shortDate } from "./data";
import { MiniPaper } from "./ResumePaper";

type Look = { page: ResumePage; template: ResumeTemplate; accent: ResumeAccent };

/**
 * Applications: her own bookkeeping. Base resumes (untailored, one per goal, and the CV) on top, then every
 * application newest first with its status, the resume version it uses, cover letter, next step and posting.
 * Sprout never applies or sends anything.
 */
export function Applications({ docs, bases, goals, lookOf, onOpen, onDrop, onCover }: {
  docs: ResumeDoc[]; bases: ResumeDoc[]; goals: string[]; lookOf: (d: ResumeDoc) => Look;
  onOpen: (docId: string) => void; onDrop: () => void; onCover: (app: Application) => void;
}) {
  const j = useJourney();
  const [f, setF] = useState<AppFilter>({ status: "all", roleId: "all", q: "" });
  const [editing, setEditing] = useState<Application | null>(null);
  const list = filterApps(j.applications, f);
  const docOf = (id: string | null | undefined) => (id ? docs.find((d) => d.id === id) ?? j.resumes.find((d) => d.id === id) : undefined);
  const roles = [...new Set([...goals, ...j.applications.map(appRole).filter((r): r is string => !!r)])];
  const remove = (a: Application) => {
    const tailored = j.resumes.filter((d) => d.applicationId === a.id);
    j.removeApplication(a.id);
    tailored.forEach((d) => j.removeResume(d.id));
    toast(`Removed ${a.company || a.role}`, { action: { label: "Undo", onClick: () => { j.saveApplication(a); tailored.forEach(j.saveResume); } } });
  };

  return (
    <div className="grid gap-8">
      <section aria-labelledby="rs-bases-h">
        <h2 id="rs-bases-h" className="text-base font-semibold">Base resumes</h2>
        <ul className="rs-bases mt-3">
          {bases.map((d) => {
            const l = lookOf(d);
            return (
              <li key={d.id}>
                <button type="button" onClick={() => onOpen(d.id)} className="rs-base !rounded-[18px]" aria-label={`Open ${d.title} in Build`}>
                  <MiniPaper page={l.page} template={l.template} accent={l.accent} width={56} />
                  <span className="min-w-0 text-left">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">{d.roleId && <CareerMark id={d.roleId} size="sm" />}<span className="truncate">{d.title}</span></span>
                    {j.resumes.some((x) => x.id === d.id) && <span className="block text-xs text-muted-foreground">Edited</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="rs-apps-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="rs-apps-h" className="text-base font-semibold">Applications</h2>
          <Button size="sm" variant="outline" className="bg-card" onClick={() => setEditing({ ...blankApplication(goals[0] ?? null, null, Date.now()), savedOn: "" })}><Plus className="size-3.5" aria-hidden="true" />Add one by hand</Button>
        </div>

        {j.applications.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,16rem)] md:items-center">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {[{ id: "all" as const, label: "All" }, ...APP_STATUS].map((s) => (
                <button key={s.id} type="button" aria-pressed={f.status === s.id} onClick={() => setF({ ...f, status: s.id })} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 motion-reduce:transition-none", f.status === s.id ? "glass-active" : "bg-card text-muted-foreground shadow-soft hover:text-foreground")}>{s.label}</button>
              ))}
            </div>
            <select aria-label="Filter by goal" value={f.roleId} onChange={(e) => setF({ ...f, roleId: e.target.value })} className="h-9 rounded-md border bg-card px-2 text-sm">
              <option value="all">Every goal</option>
              {roles.map((r) => <option key={r} value={r}>{careerRoles.find((x) => x.id === r)?.title ?? r}</option>)}
            </select>
            <label className="relative block min-w-0">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search by company" aria-label="Search by company" className="bg-card pl-9" />
            </label>
          </div>
        )}

        {editing && !j.applications.some((a) => a.id === editing.id) && (
          <AppForm key={editing.id} initial={editing} docs={docs.filter((d) => d.kind !== "cover")} isNew goals={goals} onCancel={() => setEditing(null)} onSave={(a) => { j.saveApplication(a); setEditing(null); toast(`Added ${a.company} to your applications`); }} />
        )}

        {j.applications.length === 0 ? (
          <div className="rs-empty mt-4">
            <p className="font-medium">No applications yet.</p>
            <Button size="sm" className="mt-3" onClick={onDrop}>Drop a job</Button>
          </div>
        ) : list.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing matches. <button type="button" className="underline underline-offset-4" onClick={() => setF({ status: "all", roleId: "all", q: "" })}>Clear filters</button></p>
        ) : (
          <ul className="mt-4 grid gap-3" aria-label="Your applications">
            {list.map((a) => {
              const resume = docOf(a.resumeId);
              const cover = docOf(a.coverId);
              const l = resume ? lookOf(resume) : null;
              const name = a.company || a.role;
              return (
                <li key={a.id}>
                  <article aria-label={[a.company, a.role].filter(Boolean).join(" — ")} className="rs-app">
                    {resume && l ? (
                      <button type="button" onClick={() => onOpen(resume.id)} className="rs-app-thumb !rounded-[10px]" aria-label={`Open the resume for ${name} in Build`}>
                        <MiniPaper page={l.page} template={l.template} accent={l.accent} width={64} />
                      </button>
                    ) : <span className="rs-app-thumb grid place-items-center bg-muted text-muted-foreground" aria-hidden="true"><FileText className="size-5" /></span>}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{a.company || "No company yet"}</h3>
                          <p className="text-sm">{a.role}</p>
                        </div>
                        <select aria-label={`Status for ${name}`} value={a.status} data-s={a.status} onChange={(e) => { j.saveApplication({ ...a, status: e.target.value as Application["status"] }); }} className="rs-status rs-status-select">
                          {APP_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[a.applied ? `Applied ${shortDate(a.applied)}` : a.savedOn ? `Saved ${shortDate(a.savedOn)}` : "Not applied yet", resume ? `Uses ${resume.title}` : "No resume picked"].join(" · ")}
                      </p>
                      {(a.next || a.followUp) && <p className="mt-1 text-sm">Next: {[a.next, a.followUp && `follow up ${shortDate(a.followUp)}`].filter(Boolean).join(", ")}</p>}
                      {a.posting && <p className="rs-snippet mt-1.5 text-xs text-muted-foreground">“{a.posting.replace(/\s+/g, " ").slice(0, 160)}{a.posting.length > 160 ? "…" : ""}”</p>}
                      <div className="mt-2 -ml-2 flex flex-wrap gap-1">
                        {cover
                          ? <Button size="sm" variant="ghost" className="h-7" onClick={() => onOpen(cover.id)}><Mail className="size-3.5" aria-hidden="true" />Cover letter<span className="sr-only"> for {name}</span></Button>
                          : <Button size="sm" variant="ghost" className="h-7" onClick={() => onCover(a)}><Mail className="size-3.5" aria-hidden="true" />Write a cover letter<span className="sr-only"> for {name}</span></Button>}
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(a)}><Pencil className="size-3.5" aria-hidden="true" />Edit<span className="sr-only"> {name}</span></Button>
                        {a.link && <Button asChild size="sm" variant="ghost" className="h-7"><a href={a.link} target="_blank" rel="noreferrer noopener"><ExternalLink className="size-3.5" aria-hidden="true" />Posting</a></Button>}
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => remove(a)}><Trash2 className="size-3.5" aria-hidden="true" />Remove<span className="sr-only"> {name}</span></Button>
                      </div>
                      {editing?.id === a.id && (
                        <AppForm key={a.id} initial={a} docs={docs.filter((d) => d.kind !== "cover")} isNew={false} goals={goals} onCancel={() => setEditing(null)} onSave={(x) => { j.saveApplication(x); setEditing(null); toast(`Saved ${x.company}`); }} />
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Sprout never applies or sends anything.</p>
      </section>
    </div>
  );
}

function AppForm({ initial, docs, goals, isNew, onSave, onCancel }: { initial: Application; docs: ResumeDoc[]; goals: string[]; isNew: boolean; onSave: (a: Application) => void; onCancel: () => void }) {
  const [a, setA] = useState(initial);
  const set = (patch: Partial<Application>) => setA((x) => ({ ...x, ...patch }));
  const ok = a.company.trim() && a.role.trim();
  const id = (k: string) => `rs-app-${initial.id}-${k}`;
  const roles = [...careerRoles].sort((x, y) => Number(goals.includes(y.id)) - Number(goals.includes(x.id)));
  return (
    <form aria-label={isNew ? "Add an application" : `Edit ${initial.company}`} className="mt-3 grid gap-3 rounded-[18px] bg-card p-3.5 shadow-soft"
      onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ ...a, company: a.company.trim(), role: a.role.trim(), link: a.link.trim() }); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0"><FieldLabel htmlFor={id("company")}>Company</FieldLabel><Input id={id("company")} value={a.company} onChange={(e) => set({ company: e.target.value })} autoFocus /></div>
        <div className="min-w-0"><FieldLabel htmlFor={id("role")}>Role title</FieldLabel><Input id={id("role")} value={a.role} onChange={(e) => set({ role: e.target.value })} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0"><FieldLabel htmlFor={id("link")} note="Optional">Link to the posting</FieldLabel><Input id={id("link")} type="url" value={a.link} placeholder="https://" onChange={(e) => set({ link: e.target.value })} /></div>
        <div className="min-w-0">
          <FieldLabel htmlFor={id("goal")}>Toward which goal</FieldLabel>
          <select id={id("goal")} value={appRole(a) ?? ""} onChange={(e) => set({ roleId: e.target.value || null })} className="h-9 w-full rounded-md border bg-card px-2 text-sm">
            {roles.map((r) => <option key={r.id} value={r.id}>{r.title}{goals.includes(r.id) ? "" : " (not a goal)"}</option>)}
            <option value="">Not sure yet</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0"><FieldLabel htmlFor={id("applied")}>Date applied</FieldLabel><Input id={id("applied")} type="date" value={a.applied} onChange={(e) => set({ applied: e.target.value, status: e.target.value && a.status === "saved" ? "applied" : a.status })} /></div>
        <div className="min-w-0">
          <FieldLabel htmlFor={id("resume")}>Resume for it</FieldLabel>
          <select id={id("resume")} value={a.resumeId ?? ""} onChange={(e) => set({ resumeId: e.target.value || null })} className="h-9 w-full rounded-md border bg-card px-2 text-sm">
            <option value="">Not decided yet</option>
            {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div className="min-w-0"><FieldLabel htmlFor={id("next")} note="Optional">Next step</FieldLabel><Input id={id("next")} value={a.next} placeholder="Thank-you note, prep for interview…" onChange={(e) => set({ next: e.target.value })} /></div>
        <div className="min-w-0"><FieldLabel htmlFor={id("follow")} note="Optional">Follow up on</FieldLabel><Input id={id("follow")} type="date" value={a.followUp} onChange={(e) => set({ followUp: e.target.value })} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!ok}>{isNew ? "Add to applications" : "Save changes"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
