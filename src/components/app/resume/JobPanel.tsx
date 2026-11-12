import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Check, Plus } from "lucide-react";
import type { CareerRole } from "@/data/scenario";
import { readPosting } from "@/lib/posting";
import { article, comparePosting, inline, type Application, type ResumeDoc } from "@/lib/resume";
import { Button } from "@/components/ui/button";
import { CareerMark } from "@/components/app/CareerMark";
import { Section } from "./bits";

/**
 * Job tab: the role (or the application) this version aims at, and its posting read against this document.
 * A version tailored from a dropped posting opens with that posting already read.
 * Lists what's on it, what she has but hasn't added (one click), and what she doesn't have yet. Never a score.
 */
export function JobPanel({ doc, app, role, onDoc, confirmed, save, onAdd }: { doc: ResumeDoc; app: Application | null; role: CareerRole | null; onDoc: string[]; confirmed: string[]; save: (p: Partial<ResumeDoc>) => void; onAdd: (name: string) => void }) {
  const [text, setText] = useState(doc.posting ?? "");
  const [read, setRead] = useState(doc.posting ?? "");
  const result = useMemo(() => readPosting(read), [read]);
  const cmp = result.kind === "ok" ? comparePosting(result.found.map((f) => f.name), onDoc, confirmed) : null;
  const quote = (n: string) => (result.kind === "ok" ? result.found.find((f) => f.name === n)?.quote : undefined);
  const go = () => { save({ posting: text }); setRead(text); };

  return (
    <>
      <Section title="Aiming at">
        <div className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5 text-sm">
          {role ? <CareerMark id={role.id} size="sm" /> : null}
          <span className="min-w-0">
            <span className="block font-medium">{app ? [app.role, app.company].filter(Boolean).join(" — ") : role?.title ?? "Any role"}</span>
            <span className="block text-xs text-muted-foreground">{app ? (role ? `Tailored for this job, toward ${inline(role.title)}` : "Tailored for this job") : role ? "One of your goals" : "A general version for any role"}</span>
          </span>
        </div>
      </Section>

      <Section title="Job posting">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} aria-label="Job posting" placeholder="Paste the job description. Links aren't opened." className="w-full rounded-2xl border bg-card p-3 text-sm" />
        <Button size="sm" className="mt-2" onClick={go} disabled={!text.trim()}>Read this posting</Button>
      </Section>

      <div aria-live="polite" className="grid gap-5">
        {result.kind === "link" && <p className="text-sm">I can't open links here. Paste the description text and I'll read it.</p>}
        {result.kind === "short" && <p className="text-sm">That's too short to read. Paste the full description.</p>}
        {result.kind === "ok" && result.found.length === 0 && <p className="text-sm">I couldn't find skills I know in this posting. Your resume still speaks for itself.</p>}
        {cmp && result.kind === "ok" && result.found.length > 0 && (
          <>
            <Section title="Already on this resume" aside={String(cmp.on.length)}>
              {cmp.on.length ? <ul className="grid gap-1.5">{cmp.on.map((n) => <li key={n} className="flex items-start gap-2 text-sm"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft"><Check className="size-3" aria-hidden="true" /></span><span className="min-w-0"><span className="font-medium">{n}</span><Quote q={quote(n)} /></span></li>)}</ul> : <p className="text-sm text-muted-foreground">None yet. The next list may help.</p>}
            </Section>
            {cmp.canAdd.length > 0 && (
              <Section title="You have these. Add them?" aside={String(cmp.canAdd.length)}>
                <ul className="grid gap-1.5">
                  {cmp.canAdd.map((n) => (
                    <li key={n} className="flex items-start gap-2 text-sm">
                      <span className="min-w-0 flex-1"><span className="font-medium">{n}</span><Quote q={quote(n)} /></span>
                      <Button size="sm" variant="outline" className="h-7 shrink-0" aria-label={`Add ${n} to this resume`} onClick={() => { onAdd(n); toast(`Added ${n} to this resume`); }}><Plus className="size-3.5" aria-hidden="true" />Add</Button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {cmp.missing.length > 0 && (
              <Section title="Not yet" aside={String(cmp.missing.length)}>
                <ul className="grid gap-1.5">{cmp.missing.map((n) => <li key={n} className="text-sm"><span className="font-medium">{n}</span><Quote q={quote(n)} /></li>)}</ul>
                <Button asChild size="sm" variant="ghost" className="mt-2 -ml-3"><Link to="/career" search={role ? { plan: role.id } : {}}>Plan toward {role ? `${article(inline(role.title))} ${inline(role.title)} role` : "a role"}<ArrowRight className="size-3.5" aria-hidden="true" /></Link></Button>
              </Section>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Quote({ q }: { q: string | undefined }) {
  return q ? <span className="block text-xs text-muted-foreground">From the posting: "{q}"</span> : null;
}
