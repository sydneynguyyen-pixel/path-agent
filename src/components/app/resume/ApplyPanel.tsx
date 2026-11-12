import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useJourney } from "@/lib/journey";
import { APP_STATUS, blankApplication, type Application, type ResumeDoc, type ResumeFolder } from "@/lib/resume";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel, Section, StatusChip } from "./bits";
import { docName, shortDate } from "./data";


/** Apply tab: applications she records herself for this folder, each tied to the resume version she sent. */
export function ApplyPanel({ folder, docs, apps, currentDoc }: { folder: ResumeFolder; docs: ResumeDoc[]; apps: Application[]; currentDoc: ResumeDoc }) {
  const j = useJourney();
  const [editing, setEditing] = useState<Application | null>(null);
  const sendable = docs.filter((d) => d.kind !== "cover");
  const start = () => setEditing({ ...blankApplication(folder.id, currentDoc.kind !== "cover" ? currentDoc.id : sendable[0]?.id ?? null, Date.now(), folder.job?.title ?? ""), company: folder.job?.org ?? "" });
  const sentName = (a: Application) => docName(docs.find((d) => d.id === a.resumeId) ?? j.resumes.find((d) => d.id === a.resumeId));
  const remove = (a: Application) => {
    j.removeApplication(a.id);
    toast(`Removed ${a.company}`, { action: { label: "Undo", onClick: () => j.saveApplication(a) } });
  };

  return (
    <>
      <Section title="Applications" aside={apps.length ? String(apps.length) : undefined}>
        {apps.length === 0 && !editing && (
          <div className="rounded-2xl bg-muted px-4 py-4 text-sm">
            <p className="font-medium">Track where you've applied.</p>
            <p className="mt-0.5 text-muted-foreground">Your resume versions stay attached so you always know what you sent.</p>
          </div>
        )}
        {apps.length > 0 && (
          <ul className="grid gap-2">
            {apps.map((a) => (
              <li key={a.id} className="rounded-2xl bg-muted/60 px-3 py-2.5 text-sm">
                <div className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{a.company}</span>
                    <span className="block text-xs text-muted-foreground">{a.role}</span>
                  </span>
                  <StatusChip status={a.status} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {[a.applied ? `Applied ${shortDate(a.applied)}` : "Not applied yet", sentName(a) && `Sent ${sentName(a)}`].filter(Boolean).join(" · ")}
                </p>
                {(a.next || a.followUp) && <p className="mt-1 text-xs">Next: {[a.next, a.followUp && `follow up ${shortDate(a.followUp)}`].filter(Boolean).join(", ")}</p>}
                <div className="mt-1.5 -ml-2 flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(a)}><Pencil className="size-3.5" aria-hidden="true" />Edit<span className="sr-only"> {a.company}</span></Button>
                  {a.link && <Button asChild size="sm" variant="ghost" className="h-7"><a href={a.link} target="_blank" rel="noreferrer noopener"><ExternalLink className="size-3.5" aria-hidden="true" />Posting</a></Button>}
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => remove(a)}><Trash2 className="size-3.5" aria-hidden="true" />Remove<span className="sr-only"> {a.company}</span></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {editing ? (
          <AppForm key={editing.id} initial={editing} docs={sendable} isNew={!apps.some((a) => a.id === editing.id)} onCancel={() => setEditing(null)} onSave={(a, isNew) => { j.saveApplication(a); setEditing(null); toast(isNew ? `Added ${a.company} to your tracker` : `Saved ${a.company}`); }} />
        ) : (
          <Button size="sm" variant="outline" className="mt-3" onClick={start}><Plus className="size-3.5" aria-hidden="true" />Add an application</Button>
        )}
      </Section>
      <p className="text-xs text-muted-foreground">You apply on the employer's site. This is your own record; Sprout never applies or sends anything.</p>
    </>
  );
}

function AppForm({ initial, docs, isNew, onSave, onCancel }: { initial: Application; docs: ResumeDoc[]; isNew: boolean; onSave: (a: Application, isNew: boolean) => void; onCancel: () => void }) {
  const [a, setA] = useState(initial);
  const set = (patch: Partial<Application>) => setA((x) => ({ ...x, ...patch }));
  const ok = a.company.trim() && a.role.trim();
  const id = (k: string) => `rs-app-${k}`;
  return (
    <form
      aria-label={isNew ? "Add an application" : `Edit ${initial.company}`}
      className="mt-3 grid gap-3 rounded-2xl bg-card p-3 shadow-soft"
      onSubmit={(e) => { e.preventDefault(); if (ok) onSave({ ...a, company: a.company.trim(), role: a.role.trim(), link: a.link.trim() }, isNew); }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0"><FieldLabel htmlFor={id("company")}>Company</FieldLabel><Input id={id("company")} value={a.company} onChange={(e) => set({ company: e.target.value })} autoFocus /></div>
        <div className="min-w-0"><FieldLabel htmlFor={id("role")}>Role title</FieldLabel><Input id={id("role")} value={a.role} onChange={(e) => set({ role: e.target.value })} /></div>
      </div>
      <div className="min-w-0"><FieldLabel htmlFor={id("link")} note="Optional">Link to the posting</FieldLabel><Input id={id("link")} type="url" value={a.link} placeholder="https://" onChange={(e) => set({ link: e.target.value })} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0"><FieldLabel htmlFor={id("applied")}>Date applied</FieldLabel><Input id={id("applied")} type="date" value={a.applied} onChange={(e) => set({ applied: e.target.value, status: e.target.value && a.status === "saved" ? "applied" : a.status })} /></div>
        <div className="min-w-0">
          <FieldLabel htmlFor={id("resume")}>Resume you sent</FieldLabel>
          <select id={id("resume")} value={a.resumeId ?? ""} onChange={(e) => set({ resumeId: e.target.value || null })} className="h-9 w-full rounded-md border bg-card px-2 text-sm">
            <option value="">Not decided yet</option>
            {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
      </div>
      <fieldset className="min-w-0">
        <legend className="mb-1 text-xs font-medium">Status</legend>
        <div className="flex flex-wrap gap-1.5">
          {APP_STATUS.map((s) => <button key={s.id} type="button" aria-pressed={a.status === s.id} onClick={() => set({ status: s.id })} className={cn("rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 motion-reduce:transition-none", a.status === s.id ? "glass-active" : "bg-muted text-muted-foreground hover:text-foreground")}>{s.label}</button>)}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <div className="min-w-0"><FieldLabel htmlFor={id("next")} note="Optional">Next step</FieldLabel><Input id={id("next")} value={a.next} placeholder="Thank-you note, prep for interview…" onChange={(e) => set({ next: e.target.value })} /></div>
        <div className="min-w-0"><FieldLabel htmlFor={id("follow")} note="Optional">Follow up on</FieldLabel><Input id={id("follow")} type="date" value={a.followUp} onChange={(e) => set({ followUp: e.target.value })} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!ok}>{isNew ? "Add to tracker" : "Save changes"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

/** A folder's applications in brief, for the folder bar. */
export function AppsBrief({ apps, onOpen }: { apps: Application[]; onOpen: () => void }) {
  if (!apps.length) return <button type="button" onClick={onOpen} className="text-left text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">No applications yet. Track one</button>;
  return (
    <ul className="grid gap-1">
      {apps.slice(0, 3).map((a) => (
        <li key={a.id}>
          <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 rounded-xl px-2 py-1 text-left text-sm hover:bg-muted">
            <span className="min-w-0 flex-1 truncate"><span className="font-medium">{a.company}</span><span className="text-muted-foreground"> · {a.role}</span></span>
            <StatusChip status={a.status} />
          </button>
        </li>
      ))}
      {apps.length > 3 && <li><button type="button" onClick={onOpen} className="px-2 text-xs text-muted-foreground hover:text-foreground">and {apps.length - 3} more</button></li>}
    </ul>
  );
}
