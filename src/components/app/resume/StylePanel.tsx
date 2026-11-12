import { RESUME_ACCENTS, TEMPLATES, docLook, type ResumeDoc } from "@/lib/resume";
import { Section } from "./bits";

/** Style tab: three templates and the Your card accents. Stored on this document only. */
export function StylePanel({ doc, save, pages }: { doc: ResumeDoc; save: (p: Partial<ResumeDoc>) => void; pages: number }) {
  const { template, accent } = docLook(doc);
  return (
    <>
      <Section title="Template" hint="Every template keeps the same content, in the order recruiters expect for students: education first.">
        <div className="grid gap-2" role="group" aria-label="Template">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" aria-pressed={template === t.id} onClick={() => save({ template: t.id })} className="pc-option">
              <b>{t.name}</b><small>{t.note}</small>
            </button>
          ))}
        </div>
        {pages > 1 && doc.kind === "resume" && template !== "compact" && <p className="mt-3 text-xs text-muted-foreground">Running past one page? Compact fits more without cutting anything.</p>}
      </Section>
      <Section title="Accent" hint={template === "classic" ? "Classic uses it for the line under your name." : "For the rule under your name and the section headings."}>
        <div className="flex gap-2">
          {RESUME_ACCENTS.map((a) => <button key={a.id} type="button" aria-label={a.name} aria-pressed={accent.id === a.id} onClick={() => save({ accent: a.id })} className="pc-sw" style={{ background: a.c }} />)}
        </div>
      </Section>
    </>
  );
}
