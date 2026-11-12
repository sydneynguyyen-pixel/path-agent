import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Compass, FileText, MoreHorizontal, IdCard, Plus, Sparkles, Star, Target, Undo2, X } from "lucide-react";
import { careerInterests, careerRoles, opportunities, type CareerRole, type EventPlatform } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { buildSkillsFor, chosenGoals, goalLine, MAX_GOALS, suggestedRoles } from "@/lib/goals";
import { GAP_STAGE, gapProgress } from "@/lib/opportunities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/app/bits";
import { PageBanner } from "@/components/app/SeasonBanner";
import { GapPlan } from "@/components/app/CareerDiscovery";
import { ConnectDialog, useFound } from "@/components/app/EventBits";
import { CareerSkills } from "@/components/app/CareerSkills";
import { YourCard } from "@/components/app/YourCard";
import { ResumeTab } from "@/components/app/ResumeTab";
import { BuildSkills } from "@/components/app/BuildSkills";
import { usePortfolioSkills } from "@/hooks/use-portfolio-skills";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
import { CareerMark, careerStyle } from "@/components/app/CareerMark";
import sceneOpportunities from "@/assets/scene-opportunities.jpg";

export const Route = createFileRoute("/career")({
  validateSearch: (s: Record<string, unknown>): { plan?: string; resume?: boolean; tab?: "skills" | "card" | "resume" } => ({
    ...(typeof s["plan"] === "string" ? { plan: s["plan"] } : {}),
    ...(s["tab"] === "skills" || s["tab"] === "card" || s["tab"] === "resume" ? { tab: s["tab"] } : {}),
    ...(s["resume"] === true || s["resume"] === "true" ? { resume: true } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Career — Trellis" },
      { name: "description", content: "The careers you're working toward and the skills you have for them." },
      { property: "og:title", content: "Career — Trellis" },
      { property: "og:description", content: "Choose up to three careers and see the skills you have proof for." },
    ],
  }),
  component: Career,
});

/** Each Career sub-page names itself, so the header changes with the sidebar item. */
const HEAD: Record<CareerTab, { title: string; sub: string }> = {
  goals: { title: "Your goals", sub: "The careers you're working toward, main goal first." },
  skills: { title: "Your skills", sub: "What your classes and events show you can do." },
  card: { title: "Your card", sub: "What other students see when you go to something." },
  resume: { title: "Your resume", sub: "Resumes, CVs and cover letters for the roles you're going for." },
};

function Career() {
  const j = useJourney();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const goals = chosenGoals(careerRoles, j.interestedRoles);
  const found = useFound();
  const [connecting, setConnecting] = useState<EventPlatform | null>(null);
  // ?resume=true (old links, the Skills page's resume button) lands on the Resume tab.
  const tab: CareerTab = search.resume ? "resume" : search.tab ?? "goals";

  if (search.plan) {
    const planRole = careerRoles.find((r) => r.id === search.plan) ?? careerRoles[0]!;
    const isGoal = j.interestedRoles.includes(planRole.id);
    return (
      <div className="mx-auto max-w-5xl">
        <GapPlan
          roleId={planRole.id}
          intro={
            <BuildSkills
              key={planRole.id}
              role={planRole}
              onRole={(plan) => void navigate({ search: { plan }, replace: true, resetScroll: false })}
              action={!isGoal && <Button size="sm" variant="outline" disabled={j.interestedRoles.length >= MAX_GOALS} onClick={() => { const first = j.interestedRoles.length === 0; j.addGoal(planRole.id); toast(first ? "This is your main goal now" : "Added to your goals"); }}><Plus className="size-3.5" aria-hidden="true" />Add {planRole.title} to your goals</Button>}
            />
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageBanner src={sceneOpportunities} position="50% 40%" />
      <PageHeader {...HEAD[tab]} />
      <Tabs tab={tab} onChange={(t) => void navigate({ search: t === "goals" ? {} : { tab: t }, replace: true, resetScroll: false })} />
      <div className="mt-8 space-y-14">
        {tab === "skills" && <CareerSkills found={found} onConnect={setConnecting} resumeOpen={false} onResume={(open) => void navigate({ search: open ? { tab: "resume" } : { tab: "skills" } })} />}
        {tab === "resume" && <ResumeTab />}
        {tab === "card" && <YourCard found={found} />}
        {tab === "goals" && <><YourGoals goals={goals} /><Suggestions full={goals.length >= MAX_GOALS} /></>}
        <ConnectDialog platform={connecting} onClose={() => setConnecting(null)} />
        <p className="text-xs text-muted-foreground">Synthetic role examples informed by O*NET; not live role data. Role data comes from <a href="https://www.onetonline.org/" target="_blank" rel="noreferrer" className="underline">O*NET, a U.S. Department of Labor database (CC BY 4.0)</a>.</p>
      </div>
    </div>
  );
}

/** Goals and skills are two tabs, so careers to consider sit right under her goals instead of past every skill. */
type CareerTab = "goals" | "skills" | "card" | "resume";
function Tabs({ tab: current, onChange }: { tab: CareerTab; onChange: (t: CareerTab) => void }) {
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-selected="true"]');
  const tab = (id: CareerTab, label: string, Icon: typeof Target) => {
    const on = id === current;
    return <button type="button" role="tab" aria-selected={on} onClick={() => onChange(id)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors sm:px-5", on ? "glass-active font-medium" : "text-muted-foreground hover:text-foreground")}><Icon className="size-4" aria-hidden="true" />{label}</button>;
  };
  return (
    <div ref={containerRef} role="tablist" aria-label="Career" className="sub-tabs has-pill relative mt-6 inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border bg-card/70 p-1 [scrollbar-width:none]">
      <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
      {tab("goals", "Your goals", Target)}
      {tab("skills", "Your skills", Sparkles)}
      {tab("card", "Your card", IdCard)}
      {tab("resume", "Your resume", FileText)}
    </div>
  );
}

function YourGoals({ goals }: { goals: CareerRole[] }) {
  return (
    <section aria-labelledby="your-goals">
      <h2 id="your-goals" className="sr-only">Your goals</h2>
      <p className="text-sm text-muted-foreground">{goals.length} of {MAX_GOALS} goals. Your main goal decides what Sprout suggests.</p>
      {goals.length === 0 ? (
        <div className="surface mt-5 flex flex-wrap items-center gap-5 p-6">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl aqua-chip"><Target className="size-6" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1 basis-72">
            <p className="font-semibold">No goal yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Sprout won't guess one from your major. Add a career below, up to three. Until then, Explore shows broad picks and your skills below still count.</p>
          </div>
        </div>
      ) : (
        // The main goal is wide; other goals and an open slot stack beside it, so the row is never half empty.
        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          {goals.map((r, i) => <GoalCard key={r.id} role={r} main={i === 0} />)}
          {goals.length < MAX_GOALS && (
            <a href="#suggested" className={cn("goal-slot flex min-h-48 flex-col items-center justify-center gap-2 rounded-[1.75rem] p-6 text-center", goals.length === 1 && "xl:row-span-2")} >
              <span className="grid size-10 place-items-center rounded-full bg-card shadow-soft"><Plus className="size-4" aria-hidden="true" /></span>
              <span className="font-medium">Add another goal</span>
              <span className="max-w-60 text-sm text-muted-foreground">Optional. Aim at up to {MAX_GOALS} careers and switch your main one anytime.</span>
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function GoalCard({ role, main }: { role: CareerRole; main: boolean }) {
  const j = useJourney();
  const skills = usePortfolioSkills(useFound());
  const byName = new Map(skills.map((s) => [s.name.toLowerCase(), s]));
  const saved = opportunities.filter((o) => j.savedOpportunities.includes(o.id));
  const went = Object.keys(j.wentTo);
  const names = [...new Set([...role.why, ...buildSkillsFor(role, j.buildSkills)])];
  const have = names.filter((n) => byName.has(n.toLowerCase())).length;
  return (
    <article style={careerStyle(role.id)} className={cn("surface career-tint p-6", main ? "goal-main grid gap-x-10 gap-y-6 md:grid-cols-2 xl:col-span-2 xl:row-span-2 xl:p-8" : "flex flex-col")}>
      <div className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        {main
          ? <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold"><Star className="size-3.5 fill-current" aria-hidden="true" />Main goal</span>
          : <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => { j.setGoal(role.id); toast(`${role.title} is your main goal now`, { description: "Explore and Home follow it." }); }}><Star className="size-3.5" aria-hidden="true" />Make main goal</Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="-mr-2 -mt-1 size-8 rounded-full" aria-label={`More for ${role.title}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => { j.removeGoal(role.id); toast(`Removed ${role.title}`, { action: { label: "Undo", onClick: () => (main ? j.setGoal(role.id) : j.addGoal(role.id)) } }); }}><X className="size-4" />Remove from my goals</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h3 className="mt-4 flex items-center gap-3 text-xl font-semibold"><CareerMark id={role.id} />{role.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{role.description}</p>
      {main && <Actions role={role} main className="mt-auto pt-8 max-md:hidden" />}
      </div>
      <div>
      <p className={cn("text-sm font-medium", main ? "md:mt-1" : "mt-4")}>{goalLine(have, names.length)}</p>
      <ul className="mt-3 space-y-2">
        {names.map((n) => {
          const s = byName.get(n.toLowerCase());
          const outside = s ? null : gapProgress(n, saved, went);
          return (
            <li key={n} className="flex items-center gap-3 text-sm">
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", s ? "goal-have" : "bg-muted")}>{s ? <Check className="size-3.5 text-mark-yes" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}</span>
              <span className="min-w-0 flex-1">{n}<span className="sr-only">{s ? " (has proof)" : " (to build)"}</span></span>
              {outside && <span className="aqua-chip shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">{GAP_STAGE[outside.stage]}</span>}
            </li>
          );
        })}
      </ul>
      </div>
      <Actions role={role} main={main} className={main ? "md:hidden" : "mt-6"} />
    </article>
  );
}

function Actions({ role, main, className }: { role: CareerRole; main: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button asChild variant={main ? "default" : "outline"} size="sm"><Link to="/career" search={{ plan: role.id }}>Plan toward it<ArrowRight className="size-3.5" aria-hidden="true" /></Link></Button>
      {main && <Button asChild variant="ghost" size="sm"><Link to="/explore"><Compass className="size-3.5" aria-hidden="true" />Find ways to build these</Link></Button>}
    </div>
  );
}

function Suggestions({ full }: { full: boolean }) {
  const j = useJourney();
  const roles = suggestedRoles(careerRoles, j.interestedRoles, j.dismissedRoles, j.careerInterests);
  const turnedDown = careerRoles.filter((r) => j.dismissedRoles.includes(r.id));
  const add = (r: CareerRole) => {
    const first = j.interestedRoles.length === 0;
    j.addGoal(r.id);
    toast(first ? `${r.title} is your main goal` : `Added ${r.title} to your goals`, { description: first ? "Explore and Home follow it now." : undefined });
  };
  return (
    <section aria-labelledby="suggested">
      <h2 id="suggested" className="text-xl font-semibold">Careers to consider</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Sprout's suggestions, from your classes and what you care about. Nothing becomes a goal until you add it.</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-muted-foreground">I care about</span>
        {careerInterests.map((i) => {
          const on = j.careerInterests.includes(i);
          return <button key={i} type="button" aria-pressed={on} onClick={() => j.toggleCareerInterest(i)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors", on ? "glass-active" : "bg-card/80 shadow-soft hover:bg-card")}>{i}</button>;
        })}
      </div>
      {full && <p className="mt-4 text-sm text-muted-foreground">You have {MAX_GOALS} goals. Remove one to add another.</p>}
      <div className="mt-6 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <article key={r.id} style={careerStyle(r.id)} className="surface career-tint flex flex-col p-6">
            <div className="flex items-start justify-between gap-3"><CareerMark id={r.id} size="lg" /><span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{r.match}</span></div>
            <h3 className="mt-4 text-lg font-semibold">{r.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
            <p className="mt-4 text-xs font-semibold">Uses what you've learned</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{r.why.map((n) => <span key={n} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{n}</span>)}</div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button size="sm" disabled={full} onClick={() => add(r)}><Plus className="size-3.5" aria-hidden="true" />Add as a goal</Button>
              <Button asChild variant="ghost" size="sm"><Link to="/career" search={{ plan: r.id }}>See the path</Link></Button>
              <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={() => j.dismissRole(r.id, true)}>Not for me</Button>
            </div>
          </article>
        ))}
        {roles.length === 0 && <p className="text-sm text-muted-foreground">You've looked at every career in this demo.</p>}
      </div>
      {turnedDown.length > 0 && (
        <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>Not for you:</span>
          {turnedDown.map((r) => <button key={r.id} type="button" onClick={() => j.dismissRole(r.id, false)} className="inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline">{r.title}<Undo2 className="size-3" aria-hidden="true" /><span className="sr-only">Undo</span></button>)}
        </p>
      )}
    </section>
  );
}
