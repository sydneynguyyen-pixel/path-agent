import type { ReactNode } from "react";
import { APP_STATUS, type AppStatus } from "@/lib/resume";

import { fieldId } from "./data";

/** One part of the form. Its id matches a block on the page, so a click there lands here. */
export function Section({ block, title, aside, hint, flash, children }: { block?: string; title: string; aside?: ReactNode; hint?: ReactNode; flash?: boolean; children: ReactNode }) {
  return (
    <section id={block ? fieldId(block) : undefined} data-flash={flash ? "" : undefined} className="rs-field" aria-label={title}>
      <div className="mb-2 flex items-baseline justify-between gap-2 text-xs font-semibold">{title}{aside && <span className="font-medium text-muted-foreground">{aside}</span>}</div>
      {hint && <p className="-mt-1 mb-2.5 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

export function StatusChip({ status }: { status: AppStatus }) {
  return <span className="rs-status" data-s={status}>{APP_STATUS.find((s) => s.id === status)?.label}</span>;
}

/** A small label above a form control. */
export function FieldLabel({ htmlFor, children, note }: { htmlFor: string; children: ReactNode; note?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 flex items-baseline justify-between gap-2 text-xs font-medium">
      {children}
      {note && <span className="font-normal text-muted-foreground">{note}</span>}
    </label>
  );
}
