import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronDown, Circle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SubjectIcon, AgentAvatar, TermIcon } from "./Brand";
import { Spot } from "./Illustrations";
import { careerRoles, ledgerSkills, gapSkills, opportunities, skillCourses, type Skill, type SkillCourse } from "@/data/scenario";
import { GAP_STAGE, doneLine, gapProgress, planName } from "@/lib/opportunities";
import { useId, useState, type ReactNode } from "react";
import { useJourney } from "@/lib/journey";
import { readPosting } from "@/lib/posting";
import { cn } from "@/lib/utils";

type Status = "covered" | "started" | "practiced" | "planned" | "saved" | "missing";
type Outside = ReturnType<typeof gapProgress>;

/** Where she stands on one skill: coursework, a planned or draft course, or progress outside class (a club or internship she saved or went to). */
function useSkillStatus() {
  const j = useJourney();
  const saved = opportunities.filter((o) => j.savedOpportunities.includes(o.id));
  const went = Object.keys(j.wentTo);
  return (n: string): { status: Status; outside: Outside } => {
    const s = ledgerSkills.find((s) => s.name === n && !j.skillReviews[s.id]?.hidden);
    const planned = (!!s && skillCourses.find((c) => c.code === s.course)?.termId === "w27") || gapSkills.some((g) => g.name === n && j.draftCourses.includes(g.course));
    if (s && !planned) return { status: "covered", outside: null };
    const outside = gapProgress(n, saved, went);
    if (outside && outside.stage !== "planned") return { status: outside.stage, outside };
    return { status: planned ? "planned" : outside ? "saved" : "missing", outside };
  };
}

const chipTone = (st: Status) => (st === "covered" ? "bg-success-soft" : st === "missing" ? "bg-muted" : "aqua-chip");

/** Shared hover/focus highlight: a skill lights up the classes that add it, and a class lights up every skill it adds. */
const HOT = "transition-[background-color,box-shadow] duration-[240ms] ease-[cubic-bezier(.22,.8,.2,1)] motion-reduce:transition-none";
const HOT_ON = "bg-foreground/[0.04] ring-1 ring-foreground/10";

/** Plan toward a role. `intro` is the goal sentence; the posting reader opens under it on demand. Below, one gap view: what she has on the left, what to build (each missing skill with the classes that add it) on the right. */
export function GapPlan({ roleId, intro }: { roleId: string; intro?: ReactNode }) {
  const j = useJourney();
  const statusOf = useSkillStatus();
  const [hot, setHot] = useState<{ skill?: string; course?: string } | null>(null);
  const [postingOpen, setPostingOpen] = useState(false);
  const postingId = useId();
  const r = careerRoles.find((r) => r.id === roleId) ?? careerRoles[0];
  if (!r) return null;

  const needed = [...new Set([...r.why, ...r.missing])].map((n) => ({ name: n, ...statusOf(n) }));
  const have = needed.filter((s) => s.status === "covered" || s.status === "started" || s.status === "practiced");
  const build = needed.filter((s) => !have.includes(s));

  const addsOf = (code: string): Skill[] => [...ledgerSkills, ...gapSkills].filter((s) => s.course === code);
  const courses = r.suggestions
    .map((code) => skillCourses.find((c) => c.code === code))
    .filter((c): c is SkillCourse => !!c)
    .map((c) => {
      const adds = addsOf(c.code);
      const home = build.find((b) => adds.some((s) => s.name === b.name))?.name;
      return { course: c, adds, home };
    });
  const alsoUseful = courses.filter((c) => !c.home);

  const skillHot = (n: string) => !!hot && (hot.skill === n || (!!hot.course && addsOf(hot.course).some((s) => s.name === n)));
  const courseHot = (code: string) => !!hot && (hot.course === code || (!!hot.skill && addsOf(code).some((s) => s.name === hot.skill)));
  const watch = (target: { skill?: string; course?: string }) => ({
    onMouseEnter: () => setHot(target),
    onMouseLeave: () => setHot(null),
    onFocus: () => setHot(target),
    onBlur: () => setHot(null),
  });

  const courseRow = (entry: (typeof courses)[number], skipName?: string) => {
    const { course: c, adds } = entry;
    const others = adds.filter((s) => s.name !== skipName);
    const saved = c.code === "STAT 2" || j.draftCourses.includes(c.code);
    return (
      <li key={c.code} {...watch({ course: c.code })} className={cn("flex items-start gap-3 rounded-2xl bg-card/70 p-3", HOT, courseHot(c.code) && HOT_ON)}>
        <SubjectIcon course={c.code} />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold">{c.code} · {c.title}</h4>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{c.school}</span>
            <span aria-hidden="true">·</span>
            <span>{c.units}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1"><TermIcon term={c.term} />offered {c.term}</span>
          </p>
          {others.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-1">
              <span className="mr-0.5 text-[11px] text-muted-foreground">{skipName ? "Also adds" : "Adds"}</span>
              {others.map((s) => <span key={s.id} className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{s.name}</span>)}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" disabled={saved} onClick={() => { j.addDraftCourse(c.code); toast("Saved to your plan as a draft"); }}>
              {saved ? (c.code === "STAT 2" ? "Already planned" : "Draft saved") : "Add to my plan"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => j.openClass(c.code)}>See what you'll learn</Button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Plan toward a role</h1>
            <p className="mt-2 text-sm text-muted-foreground">A draft path for what you want to learn next.</p>
          </div>
          <Spot name="seedling" className="hidden w-16 sm:block" />
        </header>

        {intro}

        <div>
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground" aria-expanded={postingOpen} aria-controls={postingId} onClick={() => setPostingOpen((o) => !o)}>
            <FileText className="size-3.5" aria-hidden="true" />
            Aiming at a specific job?
            <ChevronDown className={cn("size-3.5 transition-transform duration-[240ms] ease-[cubic-bezier(.22,.8,.2,1)] motion-reduce:transition-none", postingOpen && "rotate-180")} aria-hidden="true" />
          </Button>
          {/* Kept mounted while closed so a pasted posting and its results survive toggling. */}
          <div id={postingId} hidden={!postingOpen} className="mt-2">
            <PostingReader statusOf={statusOf} />
          </div>
        </div>
      </div>

      <section aria-labelledby="gap-heading">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="gap-heading" className="text-lg font-semibold">Skills this role usually needs</h2>
          <p className="text-sm text-muted-foreground">{have.length} you have · {build.length} to build</p>
        </div>

        <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-8">
          {/* What you have */}
          <div>
            <h3 className="font-semibold">What you have</h3>
            <p className="mt-1 text-xs text-muted-foreground">Source: O*NET occupation data (U.S. Department of Labor, CC BY 4.0). Synthetic examples.</p>
            {have.length === 0
              ? <p className="mt-4 text-sm text-muted-foreground">None of this role's skills show up in your coursework yet.</p>
              : (
                <ul className="mt-3 space-y-1">
                  {have.map(({ name, status, outside }) => (
                    <li key={name} {...watch({ skill: name })} className={cn("-mx-2 flex items-start gap-3 rounded-xl px-2 py-2 text-sm", HOT, skillHot(name) && HOT_ON)}>
                      <Check className={cn("mt-0.5 size-4 shrink-0", status === "covered" && "text-mark-yes")} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        {name}
                        {outside && <span className="block text-xs text-muted-foreground">{doneLine(outside.via)}. Confirmed by you.</span>}
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", chipTone(status))}>{status === "covered" ? "Covered in coursework" : GAP_STAGE[status as "started" | "practiced"]}</span>
                    </li>
                  ))}
                </ul>
              )}

            <div className="mt-8 border-t pt-5">
              <h3 className="font-semibold">Beyond classes</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {r.beyond.map((n) => (
                  <li key={n} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />{n}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* What to build */}
          <div>
            <h3 className="font-semibold">What to build</h3>
            <p className="mt-1 text-xs text-muted-foreground">Courses that could help, under the skill each one adds.</p>
            <ul className="mt-3 space-y-3">
              {build.map(({ name, status, outside }) => {
                const here = courses.filter((c) => c.home === name);
                return (
                  <li key={name} className="surface p-3 sm:p-4">
                    <div {...watch({ skill: name })} className={cn("-m-1 flex items-start gap-3 rounded-xl p-1 text-sm", HOT, skillHot(name) && HOT_ON)}>
                      {status === "missing" ? <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
                      <span className="min-w-0 flex-1 font-medium">
                        {name}
                        {outside && <span className="block text-xs font-normal text-muted-foreground">Saved: {planName(outside.via)}</span>}
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px]", chipTone(status))}>{status === "planned" ? "In a planned course" : status === "saved" ? GAP_STAGE.planned : "Missing"}</span>
                    </div>
                    {here.length > 0
                      ? <ul className="mt-3 space-y-2">{here.map((c) => courseRow(c, name))}</ul>
                      : <p className="mt-2 pl-7 text-xs text-muted-foreground">None of the suggested courses teach this. Try something beyond classes.</p>}
                  </li>
                );
              })}
              {alsoUseful.length > 0 && (
                <li className="pt-2">
                  <h4 className="text-sm font-semibold">Also useful</h4>
                  <ul className="mt-2 space-y-2">{alsoUseful.map((c) => courseRow(c))}</ul>
                </li>
              )}
            </ul>
            <div className="mt-5 flex items-start gap-3">
              <AgentAvatar agent="planner" />
              <p className="text-sm text-muted-foreground">
                Saved to your draft plan.{" "}
                <Button asChild variant="link" size="sm" className="ml-1 px-0"><Link to="/map">See it on your Map<ArrowRight className="size-3" /></Link></Button>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PostingReader({ statusOf }: { statusOf: ReturnType<typeof useSkillStatus> }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ReturnType<typeof readPosting>>({ kind: "empty" });
  const label = { covered: "Covered in coursework", started: GAP_STAGE.started, practiced: GAP_STAGE.practiced, planned: "In a planned course", saved: GAP_STAGE.planned, missing: "Not yet" } as const;
  return (
    <section aria-label="Aiming at a specific job?" className="surface grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
      <div>
        <p className="text-sm text-muted-foreground">Paste the description to compare it with your skills.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} aria-label="Job posting" placeholder="Paste the full job description here (links are not opened in this prototype)" className="mt-3 w-full rounded-2xl border bg-card p-3 text-sm" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setResult(readPosting(text))} disabled={!text.trim()}>Read this posting</Button>
        </div>
      </div>
      <div aria-live="polite" className="min-w-0">
        {result.kind === "link" && <p className="text-sm">That's a link. Paste the job description text instead.</p>}
        {result.kind === "short" && <p className="text-sm">That's too short to read. Paste the full description.</p>}
        {result.kind === "ok" && (result.found.length === 0
          ? <p className="text-sm">I couldn't find any skills in this posting.</p>
          : (
            <div>
              <h3 className="text-xs font-semibold">{result.found.length} skills the posting asks for</h3>
              <ul className="mt-2 divide-y">
                {result.found.map((f) => {
                  const st = statusOf(f.name).status;
                  return (
                    <li key={f.name} className="py-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{f.name}</span>
                        <span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px]", chipTone(st))}>{label[st]}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">From the posting: "{f.quote}"</p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Skills found in this posting.</p>
            </div>
          ))}
      </div>
    </section>
  );
}
