import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Search, ArrowRight, CheckCheck } from "lucide-react";
import { ledgerSkills, opportunities, skillCourses } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReaderCredit, SkillRow } from "@/components/app/SkillsBits";
import { skillsSummary, confirmableSkills } from "@/lib/skills";
import { GAP_STAGE, doneLine, skillsFromDoing } from "@/lib/opportunities";
import { AgentAvatar } from "@/components/app/Brand";
import { Spot } from "@/components/app/Illustrations";
import { Careers, GapPlan } from "@/components/app/CareerDiscovery";
import { PageBanner } from "@/components/app/SeasonBanner";
import sceneSkills from "@/assets/scene-skills.jpg";

export const Route = createFileRoute("/skills")({
  validateSearch: (s: Record<string, unknown>): { tab?: string; role?: string; state?: string } => ({ ...(typeof s["tab"] === "string" ? { tab: s["tab"] } : {}), ...(typeof s["role"] === "string" ? { role: s["role"] } : {}), ...(typeof s["state"] === "string" ? { state: s["state"] } : {}) }),
  head: () => ({ meta: [{ title: "Skills — Path Agent" }, { name: "description", content: "Review synthetic course skills, explore careers and plan learning gaps." }, { property: "og:title", content: "Skills — Path Agent" }, { property: "og:description", content: "A source-linked skills ledger and student-controlled career exploration." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Skills,
});
function Ledger({ empty }: { empty: boolean }) {
  const j = useJourney(); const [filter, setFilter] = useState("All"); const [sort, setSort] = useState("theme"); const [reviewLow, setReviewLow] = useState(false);
  const visible = ledgerSkills.filter(s => !j.skillReviews[s.id]?.hidden && (filter === "All" || filter === "Confirmed" && j.skillReviews[s.id]?.confirmed || filter === "Needs your check" && !j.skillReviews[s.id]?.confirmed));
  const low = visible.filter(s => s.confidence === "Low" && !j.skillReviews[s.id]?.confirmed);
  const normal = visible.filter(s => s.confidence !== "Low" || j.skillReviews[s.id]?.confirmed);
  const groupFor = (s: typeof ledgerSkills[number]) => sort === "course" ? s["course"] : sort === "term" ? skillCourses.find(c => c.code === s["course"])?.term ?? "Other" : s.theme;
  const groups = [...new Set(normal.map(groupFor))];
  const summary = skillsSummary(ledgerSkills, j.skillReviews);
  const confirmable = confirmableSkills(ledgerSkills, j.skillReviews);
  const confirmAll = () => {
    const ids = confirmable.map(s => s.id);
    ids.forEach(id => j.reviewSkill(id, { confirmed: true }));
    toast(`${ids.length} ${ids.length === 1 ? "skill" : "skills"} confirmed`, { action: { label: "Undo", onClick: () => ids.forEach(id => j.reviewSkill(id, { confirmed: false })) } });
  };
  return <div className="space-y-6"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">What you've learned so far</h1><p className="mt-2 text-sm text-muted-foreground">From 6 courses at Bayview CC and Northgate State.</p><div className="mt-3"><ReaderCredit /></div></div><Spot name="books" className="hidden w-28 sm:block" /></header>{!empty && <div className="surface grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] md:gap-8"><div><h2 className="font-semibold">{summary.ready === 1 ? "1 skill is" : `${summary.ready} skills are`} ready for your resume</h2><p className="mt-1 text-sm text-muted-foreground">{summary.toCheck > 0 ? `${summary.toCheck} still ${summary.toCheck === 1 ? "needs" : "need"} a quick check.` : "You've checked every skill Path Agent found."}</p><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3"><div className="h-1.5 min-w-40 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Skills confirmed" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.ready}><div className="meter-fill aqua-chip h-full rounded-full" style={{ width: `${summary.total ? summary.ready / summary.total * 100 : 0}%` }} /></div>{confirmable.length > 0 ? <Button size="sm" variant="outline" onClick={confirmAll}><CheckCheck className="size-3" />Confirm all</Button> : summary.toCheck > 0 && <Button size="sm" variant="outline" onClick={() => { setFilter("Needs your check"); setReviewLow(true); }}>Check what's left<ArrowRight className="size-3" /></Button>}<Button size="sm" asChild><Link to="/skills-export"><FileText className="size-3" />Turn into resume text</Link></Button></div></div>{summary.strongestTheme && <div className="md:border-l md:pl-8"><div className="text-xs text-muted-foreground">Your strongest area</div><div className="mt-1 font-semibold">{summary.strongestTheme}</div><p className="mt-1 text-xs text-muted-foreground">{summary.strongestCount} {summary.strongestCount === 1 ? "skill" : "skills"} you've practiced or shown.</p></div>}</div>}{!empty && <OutsideClass />}{empty ? <div className="py-16 text-center"><AgentAvatar agent="reader" className="mx-auto size-24" /><h2 className="mt-4 text-lg font-semibold">No courses yet</h2><p className="mt-2 text-sm text-muted-foreground">Your skills will appear here when a syllabus is available.</p><Button variant="outline" className="mt-4" asChild><Link to="/skills">Return to Maya's demo</Link></Button></div> : <><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2">{["All", "Confirmed", "Needs your check"].map(f => <Button key={f} size="sm" variant={f === filter ? "default" : "outline"} aria-pressed={f === filter} onClick={() => setFilter(f)}>{f}</Button>)}</div><Select value={sort} onValueChange={setSort}><SelectTrigger className="w-40" aria-label="Sort skills"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="theme">By theme</SelectItem><SelectItem value="course">By course</SelectItem><SelectItem value="term">By term</SelectItem></SelectContent></Select></div><div key={`${filter}-${sort}`} className="stagger grid items-start gap-5 xl:grid-cols-2">{groups.map(g => <section key={g} className="surface p-5"><h2 className="border-b pb-3 font-semibold">{g}</h2><div className="divide-y">{normal.filter(s => groupFor(s) === g).map(s => <SkillRow key={s.id} skill={s} />)}</div></section>)}</div>{!visible.length && <p className="py-10 text-center text-muted-foreground">No skills match this filter.</p>}{low.length > 0 && <section className="surface border-dashed p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Not sure yet · {low.length}</h2><Button variant="outline" size="sm" onClick={() => setReviewLow(v => !v)}><Search className="size-3" />{reviewLow ? "Collapse" : "Review these"}</Button></div>{reviewLow && low.map(s => <SkillRow key={s.id} skill={s} />)}</section>}<details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Hidden skills</summary>{ledgerSkills.filter(s => j.skillReviews[s.id]?.hidden).map(s => <div key={s.id} className="mt-2 flex items-center gap-3">{s.name}<Button size="sm" variant="ghost" onClick={() => j.reviewSkill(s.id, { hidden: false })}>Restore<ArrowRight className="size-3" /></Button></div>)}</details></>}</div>;
}
function OutsideClass() {
  const j = useJourney();
  const went = Object.keys(j.wentTo);
  const rows = skillsFromDoing(opportunities.filter((o) => j.savedOpportunities.includes(o.id)), went);
  if (rows.length === 0) return null;
  return <section className="surface p-5"><h2 className="border-b pb-3 font-semibold">Outside class</h2><ul className="divide-y">{rows.map((r) => <li key={r.skill} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><div className="text-sm font-medium">{r.skill}</div><div className="mt-0.5 text-xs text-muted-foreground">{doneLine(r.via)}. Confirmed by you.</div></div><span className="aqua-chip shrink-0 rounded-full px-2 py-1 text-[11px]">{GAP_STAGE[r.stage]}</span></li>)}</ul></section>;
}
function Skills() {
  const search = Route.useSearch(); const navigate = useNavigate(); const tab = ["ledger", "careers", "plan"].includes(search.tab ?? "") ? search.tab ?? "ledger" : "ledger";
  return <div><PageBanner src={sceneSkills} position="50% 72%" /><div className="space-y-7"><Tabs value={tab} onValueChange={tab => navigate({ to: "/skills", search: { tab, ...(search.role ? { role: search.role } : {}) } })}><TabsList className="h-auto max-w-full flex-wrap justify-start gap-1"><TabsTrigger value="ledger">My skills</TabsTrigger><TabsTrigger value="careers">Careers to explore</TabsTrigger><TabsTrigger value="plan">Plan toward a role</TabsTrigger></TabsList><TabsContent value="ledger" className="mt-7"><Ledger empty={search.state === "empty"} /></TabsContent><TabsContent value="careers" className="mt-7"><Careers /></TabsContent><TabsContent value="plan" className="mt-7"><GapPlan roleId={search.role ?? "ux"} onRole={role => navigate({ to: "/skills", search: { tab: "plan", role } })} /></TabsContent></Tabs></div></div>;
}