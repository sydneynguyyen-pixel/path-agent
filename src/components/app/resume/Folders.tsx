import { useState } from "react";
import { CopyPlus, FileText, Folder, FolderPlus, Mail, MoreHorizontal, ScrollText, Trash2 } from "lucide-react";
import { careerRoles } from "@/data/scenario";
import { KIND_LABEL, docsIn, folderCounts, type Application, type DocKind, type ResumeDoc, type ResumeFolder } from "@/lib/resume";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CareerMark, careerStyle } from "@/components/app/CareerMark";
import { AppsBrief } from "./ApplyPanel";
import { docName } from "./data";
import { FieldLabel } from "./bits";

const KIND_ICON: Record<DocKind, typeof FileText> = { resume: FileText, cv: ScrollText, cover: Mail };

function FolderIcon({ folder }: { folder: ResumeFolder }) {
  if (folder.roleId) return <CareerMark id={folder.roleId} size="md" />;
  return <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted"><Folder className="size-4.5" /></span>;
}

/** One folder per goal, one per specific job she adds, and General. Each shows its counts. */
export function FolderRail({ folders, docs, apps, current, mainGoal, onPick, onNew }: { folders: ResumeFolder[]; docs: ResumeDoc[]; apps: Application[]; current: string; mainGoal: string | undefined; onPick: (id: string) => void; onNew: () => void }) {
  return (
    <nav aria-label="Folders" className="rs-folders">
      {folders.map((f) => {
        const on = f.id === current;
        return (
          <button key={f.id} type="button" aria-pressed={on} onClick={() => onPick(f.id)} style={f.roleId ? careerStyle(f.roleId) : undefined} className={cn("rs-folder", on && "glass-picked")}>
            <FolderIcon folder={f} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{f.job ? f.job.title : f.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {f.job?.org ? `${f.job.org} · ` : f.roleId && f.roleId === mainGoal && !f.job ? "Main goal · " : ""}
                {folderCounts(docsIn(docs, f.id).length, apps.filter((a) => a.folderId === f.id).length)}
              </span>
            </span>
          </button>
        );
      })}
      <button type="button" onClick={onNew} className="rs-folder rs-folder-new text-sm font-medium"><FolderPlus className="size-4" aria-hidden="true" />New folder for a specific job</button>
    </nav>
  );
}

/** The open folder: its documents, New version, and its applications in brief. */
export function FolderBar({ folder, docs, apps, current, edited, onPick, onVersion, onTrack, onDelete, goals }: {
  folder: ResumeFolder; docs: ResumeDoc[]; apps: Application[]; current: string; edited: Set<string>;
  onPick: (id: string) => void; onVersion: (roleId: string | null) => void; onTrack: () => void; onDelete?: (() => void) | undefined; goals: string[];
}) {
  const doc = docs.find((d) => d.id === current);
  return (
    <section aria-label={`${folder.title} folder`} className="surface grid gap-4 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{folder.title}</h2>
          <div className="flex items-center gap-1">
            {doc && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8"><CopyPlus className="size-3.5" aria-hidden="true" />New version</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Copy this {KIND_LABEL[doc.kind].toLowerCase()} for</DropdownMenuLabel>
                  {folder.roleId && <DropdownMenuItem onSelect={() => onVersion(folder.roleId)}><CareerMark id={folder.roleId} size="sm" />This folder</DropdownMenuItem>}
                  {careerRoles.filter((r) => r.id !== folder.roleId).sort((a, b) => Number(goals.includes(b.id)) - Number(goals.includes(a.id))).map((r) => <DropdownMenuItem key={r.id} onSelect={() => onVersion(r.id)}><CareerMark id={r.id} size="sm" />{r.title}</DropdownMenuItem>)}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onVersion(null)}><FileText className="size-4" aria-hidden="true" />Any role (General)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-8 rounded-full" aria-label="More for this folder"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end"><DropdownMenuItem onSelect={onDelete}><Trash2 className="size-4" />Delete this folder</DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Documents">
          {docs.map((d) => {
            const Icon = KIND_ICON[d.kind];
            const on = d.id === current;
            return (
              <li key={d.id}>
                <button type="button" aria-pressed={on} onClick={() => onPick(d.id)} className={cn("flex items-center gap-2.5 rounded-2xl py-1.5 pr-3.5 pl-1.5 text-left text-sm transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none", on ? "glass-picked" : "bg-muted/60 hover:bg-muted")}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-card shadow-soft"><Icon className="size-4" aria-hidden="true" /></span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{docName(d)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{edited.has(d.id) ? "Edited by you" : "Suggested draft"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="min-w-0 border-t pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">Applications</h3>
        <AppsBrief apps={apps} onOpen={onTrack} />
      </div>
    </section>
  );
}

/** "New folder for a specific job": a job title, the organization, and which career it's toward. */
export function NewJobFolder({ open, onOpenChange, goals, defaultRole, onMake }: { open: boolean; onOpenChange: (o: boolean) => void; goals: string[]; defaultRole: string | null; onMake: (title: string, org: string, roleId: string | null) => void }) {
  const [title, setTitle] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState<string>(defaultRole ?? "");
  const ok = title.trim().length > 0;
  const roles = [...careerRoles].sort((a, b) => Number(goals.includes(b.id)) - Number(goals.includes(a.id)));
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setTitle(""); setOrg(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New folder for a specific job</DialogTitle>
          <DialogDescription>It starts with a copy of the resume you're looking at and a fresh cover letter, so you can tailor both.</DialogDescription>
        </DialogHeader>
        <form id="rs-new-folder" className="grid gap-3" onSubmit={(e) => { e.preventDefault(); if (ok) { onMake(title, org, role || null); setTitle(""); setOrg(""); } }}>
          <div><FieldLabel htmlFor="rs-job-title">Job title</FieldLabel><Input id="rs-job-title" value={title} placeholder="UX Research Intern" onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
          <div><FieldLabel htmlFor="rs-job-org" note="Optional">Organization</FieldLabel><Input id="rs-job-org" value={org} placeholder="Acme Health" onChange={(e) => setOrg(e.target.value)} /></div>
          <div>
            <FieldLabel htmlFor="rs-job-role">Toward which career</FieldLabel>
            <select id="rs-job-role" value={role} onChange={(e) => setRole(e.target.value)} className="h-9 w-full rounded-md border bg-card px-2 text-sm">
              {roles.map((r) => <option key={r.id} value={r.id}>{r.title}{goals.includes(r.id) ? "" : " (not a goal)"}</option>)}
              <option value="">Not sure yet</option>
            </select>
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="rs-new-folder" disabled={!ok}>Make folder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
