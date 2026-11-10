import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PageHeader, SimLabel } from "@/components/app/bits";
import { SourceLogo } from "@/components/app/SourceLogo";
import { UploadFlow } from "@/components/app/UploadFlow";
import { Spot } from "@/components/app/Illustrations";
import { connectedSources } from "@/components/app/sourcesData";
import { UPLOAD_ORDER, uploadSamples, type UploadKey } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Your sources — Path Agent" },
      { name: "description", content: "Canvas, the student system, degree audit, articulation data and email: what Path Agent reads and why." },
      { property: "og:title", content: "Your sources — Path Agent" },
      { property: "og:description", content: "See and control every system Path Agent reads from." },
    ],
  }),
  component: Sources,
});

const CARD_STATUS = "flex items-center gap-1 text-sm font-medium text-mark-yes";
const VIEWS = [["school", "School connected"], ["manual", "School not connected"]] as const;

function Sources() {
  const j = useJourney();
  const [open, setOpen] = useState<UploadKey | null>(null);
  const sample = open ? uploadSamples[open] : null;
  const manual = j.setupMethod === "manual";
  const publicSources = connectedSources.filter((s) => s.id === "articulation");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Your sources" sub={manual ? "Add your records so Path Agent can use them." : "Turn off anything you don't want Path Agent to read."} right={<div className="flex items-center gap-4"><Spot name="stones" className="hidden w-40 sm:block" /><SimLabel>Simulated connections</SimLabel></div>} />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" role="group" aria-label="Demo view">
        Demo view
        <div className="flex rounded-full border bg-card p-0.5">
          {VIEWS.map(([id, label]) => <button key={id} type="button" aria-pressed={j.setupMethod === id} onClick={() => j.setSetupMethod(id)} className={cn("rounded-full px-3 py-1 font-medium", j.setupMethod === id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{label}</button>)}
        </div>
      </div>
      {manual ? (
        <div className="space-y-3">
          {UPLOAD_ORDER.map((k) => {
            const s = uploadSamples[k];
            return (
              <section key={k} className="surface flex items-center gap-4 p-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary"><FileText className="size-5" /></span>
                <div className="min-w-0 flex-1"><div className="font-medium">{s.title}</div><div className="text-sm text-muted-foreground">{s.why}{s.required ? "" : " · Optional"}</div></div>
                {j.uploads.includes(k) ? <span className={CARD_STATUS}><Check className="size-4" /> Added</span> : <Button variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(k)}>{s.action}</Button>}
              </section>
            );
          })}
          {publicSources.map((s) => (
            <section key={s.id} className="surface flex items-center gap-4 p-5">
              <SourceLogo id={s.id} />
              <div className="min-w-0 flex-1"><div className="font-medium">{s.name}</div><div className="text-sm text-muted-foreground">{s.what} · Public, nothing to add</div></div>
              <span className={CARD_STATUS}><Check className="size-4" /> Ready</span>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {connectedSources.map((s) => (
            <section key={s.id} className="surface flex items-start gap-4 p-5">
              <SourceLogo id={s.id} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{s.name}</div>
                <div className="text-sm text-muted-foreground">{s.what}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.vendor} · used for {s.usedBy.join(", ")} · {j.access[s.id] ? "Last synced 2 min ago" : "Off"}</div>
              </div>
              <Switch checked={j.access[s.id]} onCheckedChange={(v) => j.setAccess(s.id, v)} aria-label={`Allow ${s.name}`} className="shrink-0" />
            </section>
          ))}
        </div>
      )}
      <Dialog open={!!sample} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent className="brand-app sm:max-w-md">
          {sample && (
            <>
              <DialogTitle>{sample.title}</DialogTitle>
              <DialogDescription>{sample.why}. You check what Path Agent finds.</DialogDescription>
              <UploadFlow key={sample.key} upload={sample} onCancel={() => setOpen(null)} onDone={() => { j.addUpload(sample.key); setOpen(null); }} />
            </>
          )}
        </DialogContent>
      </Dialog>
      <p className="mt-4 text-xs text-muted-foreground">{manual ? "If your school connects later, these stay up to date on their own." : "You sign in on your school's own site, so Path Agent never sees your password."} Demo only. All records are synthetic.</p>
    </div>
  );
}
