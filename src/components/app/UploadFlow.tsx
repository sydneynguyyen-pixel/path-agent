import { useEffect, useState } from "react";
import { Check, FileText, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UploadSample } from "@/data/scenario";
import { canConfirmUpload } from "@/lib/onboarding";
import { Ink } from "./Ink";

const READ_MS = 1500;

/** The manual way in: pick a document, watch it get read, confirm what was found. Simulated, so it only ever uses a fictional sample and no real record can be dropped in. */
export function UploadFlow({ upload, onDone, onCancel }: { upload: UploadSample; onDone: () => void; onCancel: () => void }) {
  const [stage, setStage] = useState<"pick" | "reading" | "review">("pick");
  const [checked, setChecked] = useState<string[]>([]);
  const start = () => { setChecked([]); setStage("reading"); };

  useEffect(() => {
    if (stage !== "reading") return;
    const t = setTimeout(() => setStage("review"), READ_MS);
    return () => clearTimeout(t);
  }, [stage]);

  if (stage === "reading") return <div className="rounded-2xl border p-8 text-center" role="status"><Ink className="mx-auto block size-12" /><p className="mt-3 text-sm font-medium">Reading {upload.file}…</p></div>;

  if (stage === "review") return (
    <div>
      <div className="flex items-center gap-2 text-sm"><FileText className="size-4 shrink-0 text-muted-foreground" /><span className="truncate text-muted-foreground">{upload.file}</span></div>
      <h3 className="mt-3 font-medium">Found {upload.rows.length} {upload.noun}</h3>
      <ul className="mt-3 max-h-64 divide-y overflow-y-auto rounded-2xl border">
        {upload.rows.map((r) => (
          <li key={r.id} className="p-3 text-sm">
            <div className="flex items-center justify-between gap-3"><span className="min-w-0 font-medium">{r.label}</span><span className="shrink-0 text-right text-muted-foreground">{r.detail}</span></div>
            {r.unclear && (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">I couldn't read this clearly.</span>
                {checked.includes(r.id) ? <span className="flex items-center gap-1 font-medium text-mark-yes"><Check className="size-3.5" /> Checked</span> : <Button variant="outline" size="sm" onClick={() => setChecked((c) => [...c, r.id])}>It's right</Button>}
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setStage("pick")}>Start over</Button>
        <Button disabled={!canConfirmUpload(upload.rows, checked)} onClick={onDone}>Looks right</Button>
      </div>
    </div>
  );

  return (
    <div>
      {upload.feedUrl ? (
        <div><Input value={upload.feedUrl} readOnly aria-label="Calendar feed link" /><Button className="mt-3 w-full" onClick={start}>Add feed</Button></div>
      ) : (
        <button type="button" className="w-full rounded-2xl border-2 border-dashed p-8 text-center transition-colors hover:bg-secondary" onClick={start} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); start(); }}>
          <FileUp className="mx-auto size-8 text-muted-foreground" />
          <span className="mt-3 block text-sm font-medium">Drop your PDF here, or choose a file</span>
          <span className="mt-1 block text-xs text-muted-foreground">{upload.file}</span>
        </button>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Find it in {upload.where}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <span className="text-xs text-muted-foreground">Prototype: uses a fictional sample.</span>
      </div>
    </div>
  );
}
