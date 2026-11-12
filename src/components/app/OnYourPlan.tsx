import { Check, X } from "lucide-react";
import { opportunities, terms, type OpportunityKind } from "@/data/scenario";
import { OrgLogo } from "@/components/app/SchoolLogo";
import { PostingLink } from "@/components/app/PostingLink";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { canConfirm, confirmLabel, degreeLine, doneLabel } from "@/lib/opportunities";
import { useConfirmWent } from "@/components/app/PlanActions";
import { Button } from "@/components/ui/button";

/** Clubs, events and internships she saved, shown on Explore where she found them. Classes she drafts live on Terms instead. */
export function OnYourPlan({ kind }: { kind: OpportunityKind | "all" }) {
  const j = useJourney();
  const confirm = useConfirmWent();
  const items = opportunities
    .filter((o) => j.savedOpportunities.includes(o.id) && !o.courseCode && (kind === "all" || o.kind === kind))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="on-plan-title">
      <h2 id="on-plan-title" className="text-xl font-semibold">On your plan <span className="text-base font-normal text-muted-foreground">· {items.length}</span></h2>
      <ul className="surface mt-3 divide-y px-5">
        {items.map((o) => {
          const done = !!j.wentTo[o.id];
          return (
            <li key={o.id} className="flex flex-wrap items-center gap-3 py-4">
              <OrgLogo org={o.org} club={o.club} className="size-9" />
              <div className="min-w-0 flex-1 basis-48">
                <button type="button" onClick={() => j.openOpportunity(o.id)} className="text-left text-sm font-medium underline-offset-4 hover:underline">{o.title}</button>
                <div className="mt-0.5 text-xs text-muted-foreground">{o.when} · {degreeLine(o)}</div>
                <PostingLink item={o} className="mt-1" />
              </div>
              <div className="flex items-center gap-1">
                {done ? <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs"><Check className="size-3" aria-hidden="true" />{doneLabel(o)}</span>
                  <Button size="sm" variant="ghost" onClick={() => j.undoWent(o.id)}>Undo</Button>
                </> : <>
                  {canConfirm(o, terms, SCRIPT_TODAY) ? <Button size="sm" variant="outline" onClick={() => confirm(o)}>{confirmLabel(o)}</Button> : <span className="rounded-full bg-secondary px-3 py-1 text-xs">Planned</span>}
                  <Button size="icon" variant="ghost" className="size-8" aria-label={`Remove ${o.title} from your plan`} onClick={() => j.toggleSavedOpportunity(o.id)}><X className="size-4" aria-hidden="true" /></Button>
                </>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
