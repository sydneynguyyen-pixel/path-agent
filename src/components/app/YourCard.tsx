import { Link } from "@tanstack/react-router";
import { ArrowRight, Users } from "lucide-react";
import { goTogetherEvent } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import type { Found } from "@/lib/experiences";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PathCardStudio } from "@/components/app/PathCard";
import { usePortfolioSkills } from "@/hooks/use-portfolio-skills";

const useSkills = usePortfolioSkills;

/** Your Path card, made from skills that already have proof. Opens straight into the editor; the card updates as she edits. */
export function YourCard({ found }: { found: Found[] }) {
  const skills = useSkills(found).filter((s) => !s.hidden && !s.unsure);
  const options = skills.map((s) => ({ key: s.key, name: s.name, from: s.proofs.map((p) => (p.type === "class" ? p.code : p.title)).slice(0, 2).join(" · ") }));
  return (
    <div className="space-y-6">
      <PathCardStudio skills={options} />
      <CardShowsWhere />
    </div>
  );
}

/** Where other students see the card: only in the details of events she turns it on for. */
function CardShowsWhere() {
  const j = useJourney();
  const on = j.goTogether.showMe;
  return (
    <section aria-labelledby="card-where" className="surface space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl aqua-chip"><Users className="size-4" aria-hidden="true" /></span>
        <div className="min-w-0"><h3 id="card-where" className="font-semibold">Where it shows</h3><p className="mt-0.5 text-sm text-muted-foreground">Only on events you turn on Show me as going, in that event's details. Nowhere else.</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-full bg-muted py-1.5 pr-1.5 pl-4 text-sm">
          <span><span className="font-medium">{goTogetherEvent.name}</span><span className="text-muted-foreground"> · {goTogetherEvent.when}</span></span>
          <Switch checked={on} onCheckedChange={j.setShowMeGoing} aria-label={`Show me as going to ${goTogetherEvent.name}`} />
        </label>
        <Button asChild size="sm" variant="ghost"><Link to="/explore" search={{ open: goTogetherEvent.id }}>See it there<ArrowRight className="size-3.5" aria-hidden="true" /></Link></Button>
      </div>
    </section>
  );
}
