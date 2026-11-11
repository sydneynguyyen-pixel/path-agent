import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarClock, CalendarDays, Check, ChevronLeft, ChevronRight, GraduationCap, LayoutGrid, MapPin, Search, Sparkles, Users, X } from "lucide-react";
import { careerRoles, freeTime, goTogetherEvent, opportunities, terms, type Opportunity, type OpportunityKind } from "@/data/scenario";
import { SCRIPT_START, useJourney } from "@/lib/journey";
import { gapSignal, goalFor, deadlineDate, deadlineLabel, detailLine, distinct, doableInFreeTime, exploreResults, fillsLine, gapProgress, goalGap, groupByDate, hostLine, matchesFilters, NO_FILTERS, notOnPlan, timeLeftLine, type ExploreFilters } from "@/lib/opportunities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Flyer } from "@/components/app/Flyer";
import { OrgLogo } from "@/components/app/SchoolLogo";
import { PageBanner } from "@/components/app/SeasonBanner";
import { EventsBoard } from "@/components/app/EventsBoard";
import { cn } from "@/lib/utils";
import { Careers, GapPlan } from "@/components/app/CareerDiscovery";
import { DETAIL_WIDTH, HostRow, KIND, Photo, SaveButton, TONE, shortTitle, type Open, type Tone } from "@/components/app/OpportunityDetails";
import { electiveClasses, psychologyDegree } from "@/data/degree";
import { Roll } from "@/components/app/Roll";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
import { photoUrl } from "@/lib/photos";
import { PostingLink } from "@/components/app/PostingLink";
import sceneOpportunities from "@/assets/scene-opportunities.jpg";

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): { role?: string; open?: string; fills?: string; view?: "careers" | "plan"; calendar?: boolean } => ({
    ...(typeof s["role"] === "string" ? { role: s["role"] } : {}),
    ...(typeof s["open"] === "string" ? { open: s["open"] } : {}),
    ...(typeof s["fills"] === "string" ? { fills: s["fills"] } : {}),
    ...(s["view"] === "careers" || s["view"] === "plan" ? { view: s["view"] } : {}),
    ...(s["calendar"] === true || s["calendar"] === "true" ? { calendar: true } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Explore — Path Agent" },
      { name: "description", content: "Classes, events, internships and clubs that fit your goal and your week." },
      { property: "og:title", content: "Explore — Path Agent" },
      { property: "og:description", content: "Search classes, clubs, events and internships picked for your goal and schedule." },
    ],
  }),
  component: Explore,
});

const ORDER: OpportunityKind[] = ["class", "event", "internship", "club"];
const ANY = "any";

/** Makes a whole card open its details, while the save button on top stays its own control. */
function OpenCover({ o, onOpen }: { o: Opportunity; onOpen: Open }) {
  return <button type="button" className="absolute inset-0 z-10 rounded-[inherit]" aria-label={`See details: ${shortTitle(o)}`} onClick={() => onOpen(o.id)} />;
}

function signalsFor(o: Opportunity, gap: string | undefined) {
  const going = o.id === goTogetherEvent.id ? goTogetherEvent.going : 0;
  return [
    fillsLine(o) && { icon: GraduationCap, text: fillsLine(o)! },
    gap && { icon: Sparkles, text: gapSignal(o, gap) },
    doableInFreeTime(o, freeTime) && o.kind !== "internship" && { icon: Check, text: "Fits your free time" },
    going > 0 && { icon: Users, text: `${going} Bayview students going` },
  ].filter(Boolean) as { icon: typeof Check; text: string }[];
}

function Signals({ o, gap, tone = "soft", limit = 2 }: { o: Opportunity; gap: string | undefined; tone?: Tone; limit?: number }) {
  return <div className={cn("flex flex-col gap-0.5 text-xs", TONE[tone])}>{signalsFor(o, gap).slice(0, limit).map((x) => <span key={x.text} className="flex items-center gap-1 truncate"><x.icon className="size-3 shrink-0" aria-hidden="true" /> <span className="truncate">{x.text}</span></span>)}</div>;
}

/** A listing's picture on a neutral card: its flyer, or a photo for a class. Always the same square. */
function Art({ o, className }: { o: Opportunity; className?: string }) {
  return o.flyer ? <Flyer flyer={o.flyer} photo={photoUrl(o.photo, DETAIL_WIDTH)} className={cn("rounded-xl", className)} /> : <Photo o={o} width={DETAIL_WIDTH} className={cn("aspect-square shrink-0 rounded-xl", className)} />;
}

const CARD = "explore-card relative rounded-2xl border bg-card";
const CARD_GRID = "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";

/** The one card for every listing: its art on top with a clean edge, plain text below. The grid stays equal so none reads as the favorite. */
function OpportunityCard({ o, gaps, onOpen }: { o: Opportunity; gaps: string[]; onOpen: Open }) {
  return (
    <article data-opp={o.id} className={cn(CARD, "flex flex-col")}>
      <OpenCover o={o} onOpen={onOpen} />
      <Art o={o} className="w-full rounded-none" />
      <div className="flex flex-1 flex-col p-4">
        <HostRow o={o} tone="muted" />
        <h3 className="mt-2.5 line-clamp-2 text-base leading-snug font-semibold">{shortTitle(o)}</h3>
        <div className="mt-1 truncate text-sm text-muted-foreground">{detailLine(o)}</div>
        <div className="mt-auto pt-3"><div className="flex min-h-11 items-center justify-between gap-2 border-t pt-3"><div className="min-w-0"><Signals o={o} gap={goalGap(o, gaps)} tone="muted" limit={1} /></div><div className="flex shrink-0 items-center gap-1.5"><PostingLink item={o} compact /><SaveButton o={o} compact /></div></div></div>
      </div>
    </article>
  );
}

/** One section of the All tab: exactly one row. */
/** Tracks a horizontal row so its arrows can move it a page at a time and stop at either end. */
function useCardRow(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ prev: false, next: false });
  useEffect(() => {
    const row = ref.current;
    if (!row) return;
    const sync = () => setEnds({ prev: row.scrollLeft > 1, next: row.scrollLeft + row.clientWidth < row.scrollWidth - 1 });
    sync();
    row.addEventListener("scroll", sync, { passive: true });
    const resize = new ResizeObserver(sync);
    resize.observe(row);
    return () => { row.removeEventListener("scroll", sync); resize.disconnect(); };
  }, [count]);
  const move = (direction: -1 | 1) => {
    const row = ref.current;
    if (!row) return;
    row.scrollBy({ left: direction * row.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return { ref, ends, move };
}

const ARROW = "grid size-8 place-items-center rounded-full border bg-card text-foreground transition-colors hover:bg-secondary disabled:cursor-default disabled:text-muted-foreground/40 disabled:hover:bg-card";

function KindSection({ kind, items, gaps, onOpen, onSeeAll, control }: { kind: OpportunityKind; items: Opportunity[]; gaps: string[]; onOpen: Open; onSeeAll: () => void; control?: ReactNode }) {
  const { ref, ends, move } = useCardRow(items.length);
  if (items.length === 0) return null;
  const heading = KIND[kind].heading;
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{heading}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {control}
          {kind === "event" && <Link to="/explore" search={{ calendar: true }} resetScroll={false} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">All events <ArrowRight className="size-3.5" aria-hidden="true" /></Link>}
          {items.length > 4 && <button type="button" onClick={onSeeAll} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">See all <ArrowRight className="size-3.5" aria-hidden="true" /></button>}
          {(ends.prev || ends.next) && (
            <div className="flex gap-1.5">
              <button type="button" className={ARROW} disabled={!ends.prev} aria-label={`Previous: ${heading}`} onClick={() => move(-1)}><ChevronLeft className="size-4" aria-hidden="true" /></button>
              <button type="button" className={ARROW} disabled={!ends.next} aria-label={`Next: ${heading}`} onClick={() => move(1)}><ChevronRight className="size-4" aria-hidden="true" /></button>
            </div>
          )}
        </div>
      </div>
      <div ref={ref} className="explore-row">{items.map((o) => <OpportunityCard key={o.id} o={o} gaps={gaps} onOpen={onOpen} />)}</div>
    </section>
  );
}

function SignalChips({ o, gap }: { o: Opportunity; gap: string | undefined }) {
  return <div className="flex min-w-0 flex-wrap gap-1.5">{signalsFor(o, gap).slice(0, 2).map((x) => <span key={x.text} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium"><x.icon className="size-3 shrink-0" aria-hidden="true" /> {x.text}</span>)}</div>;
}

/** A full type: every result on the same card. */
function KindGrid({ items, gaps, onOpen }: { items: Opportunity[]; gaps: string[]; onOpen: Open }) {
  return <div className={CARD_GRID}>{items.map((o) => <OpportunityCard key={o.id} o={o} gaps={gaps} onOpen={onOpen} />)}</div>;
}

/** A dated list. Classes and internships sit on their deadline, since their start date isn't what you act on. */
function Calendar({ items, gaps, onOpen, byDeadline, showKind }: { items: Opportunity[]; gaps: string[]; onOpen: Open; byDeadline: boolean; showKind: boolean }) {
  const thisYear = new Date(SCRIPT_START).getUTCFullYear();
  return (
    <div className="space-y-5">
      {groupByDate(items, byDeadline ? deadlineDate : undefined).map(({ date, items: group }) => {
        const d = new Date(`${date}T12:00:00`);
        return (
          <section key={date} className="timeline-day">
            <h2 className="flex items-baseline gap-2 text-sm">
              <span className="font-semibold">{d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(d.getFullYear() === thisYear ? {} : { year: "numeric" }) })}</span>
              <span className="text-muted-foreground">{byDeadline ? deadlineLabel(group[0]!) : d.toLocaleDateString("en-US", { weekday: "long" })}</span>
            </h2>
            <div className="mt-3 space-y-3">
              {group.map((o) => (
                <article key={o.id} data-opp={o.id} className={cn(CARD, "flex items-start gap-4 p-4")}>
                  <OpenCover o={o} onOpen={onOpen} />
                  <div className="flex min-w-0 flex-1 flex-col self-stretch">
                    <div className="text-sm text-muted-foreground">{detailLine(o)}</div>
                    <h3 className="mt-1 text-base leading-snug font-semibold sm:text-lg">{shortTitle(o)}</h3>
                    <div className="mt-2"><HostRow o={o} tone="muted" showKind={showKind} /></div>
                    {o.place !== o.host && <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground"><span className="grid size-7 shrink-0 place-items-center"><MapPin className="size-3.5" aria-hidden="true" /></span> {o.place}</div>}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3"><SignalChips o={o} gap={goalGap(o, gaps)} /><div className="flex shrink-0 items-center gap-1.5"><PostingLink item={o} compact /><SaveButton o={o} compact /></div></div>
                  </div>
                  <Art o={o} className="size-24 sm:size-36" />
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FilterMenu({ label, any, value, options, onChange }: { label: string; any: string; value: string | null; options: { value: string; label: string }[]; onChange: (v: string | null) => void }) {
  return (
    <Select value={value ?? ANY} onValueChange={(v) => onChange(v === ANY ? null : v)}>
      <SelectTrigger aria-label={label} className={cn("h-9 w-auto max-w-56 gap-1.5 rounded-full text-xs", value && "glass-active border-transparent font-medium")}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{any}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors", active ? "glass-active font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>{children}</button>;
}

/** A row of choices sharing one glass pill that glides to whichever is on. */
function PillGroup({ className, children }: { className?: string; children: ReactNode }) {
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  return <div ref={containerRef} className={cn("has-pill relative flex flex-wrap items-center gap-1", className)}><span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />{children}</div>;
}

function SchoolScope({ nearby, onChange }: { nearby: boolean; onChange: (nearby: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium">
      <Switch checked={nearby} onCheckedChange={onChange} aria-label="Include schools nearby" />
      Include schools nearby
    </label>
  );
}

const menu = (pick: (o: Opportunity) => string[]) => distinct(opportunities.flatMap(pick)).map((v) => ({ value: v, label: v }));
const SKILLS = menu((o) => o.fills);
const SUBJECTS = menu((o) => [o.subject]);
const PLACES = menu((o) => [o.place]);
const INDUSTRIES = menu((o) => [o.industry]);

/** Your goal, what's left to build for it, and each gap as a one-tap filter. */
function GoalBar({ goalId, title, gaps, skill, onRole, onSkill }: { goalId: string; title: string; gaps: string[]; skill: string | null; onRole: (id: string) => void; onSkill: (s: string | null) => void }) {
  return (
    <section aria-label="Your goal" className="surface flex flex-wrap items-center gap-x-3 gap-y-2.5 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Aiming for</span>
        <Select value={goalId} onValueChange={onRole}>
          <SelectTrigger aria-label="Your goal" className="h-9 w-auto gap-1.5 rounded-full font-medium"><SelectValue placeholder={title} /></SelectTrigger>
          <SelectContent>{careerRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-muted-foreground">{gaps.length === 0 ? "Nothing left to build" : `${gaps.length} ${gaps.length === 1 ? "skill" : "skills"} to build`}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {gaps.map((g) => <button key={g} type="button" aria-pressed={skill === g} onClick={() => onSkill(skill === g ? null : g)} className={cn("rounded-full px-3 py-1.5 text-xs", skill === g ? "glass-active font-medium" : "bg-secondary text-foreground hover:bg-secondary/70")}>{g}</button>)}
      </div>
      <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
        <Link to="/explore" search={{ view: "careers" }} className="underline-offset-4 hover:text-foreground hover:underline">Other roles</Link>
        <Link to="/explore" search={{ view: "plan", role: goalId }} className="underline-offset-4 hover:text-foreground hover:underline">Plan toward it</Link>
      </div>
    </section>
  );
}

function Explore() {
  const j = useJourney();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [view, setView] = useState<"browse" | "calendar">(search.calendar ? "calendar" : "browse");
  // "All events" links (and the old /events page) open the calendar.
  useEffect(() => { if (search.calendar) setView("calendar"); }, [search.calendar]);
  const [local, setLocal] = useState<ExploreFilters>(() => (search.fills ? { ...NO_FILTERS, kind: "class" } : NO_FILTERS));

  // Links from other pages open a listing in the shared panel.
  useEffect(() => {
    if (search.open) j.openOpportunity(search.open);
    else if (j.goTogether.draftTo) j.openOpportunity(goTogetherEvent.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.open]);
  useEffect(() => { if (search.fills) setLocal((f) => ({ ...f, kind: "class" })); }, [search.fills]);

  const goal = careerRoles.find((r) => r.id === search.role) ?? goalFor(careerRoles, j.interestedRoles);
  const filters: ExploreFilters = { ...local, careerGaps: null };
  const update = (patch: Partial<ExploreFilters>) => setLocal((f) => ({ ...f, ...patch }));
  const setRole = (id: string) => navigate({ to: "/explore", search: { ...search, role: id }, replace: true, resetScroll: false });
  const clearFills = () => { const { fills: _fills, ...rest } = search; void navigate({ to: "/explore", search: rest, replace: true, resetScroll: false }); };
  const clear = () => { setLocal((f) => ({ ...NO_FILTERS, kind: f.kind, nearbySchools: f.nearbySchools })); clearFills(); };

  const onOpen: Open = (id) => j.openOpportunity(id);
  const saved = opportunities.filter((o) => j.savedOpportunities.includes(o.id));
  const went = Object.keys(j.wentTo);
  const gaps = goal.missing.filter((g) => { const p = gapProgress(g, saved, went); return !p || p.stage === "planned"; });

  const fillsSlot = search.fills ? psychologyDegree.categories.flatMap((c) => c.slots).find((s) => s.id === search.fills) : undefined;
  const fillers = fillsSlot ? electiveClasses.filter((e) => e.slot === fillsSlot.id).map((e) => e.id) : [];
  const candidates = opportunities.filter((o) => notOnPlan(o, j.savedOpportunities, j.draftCourses) && (!fillsSlot || (o.kind === "class" && (fillers.length === 0 || (fillers as string[]).includes(o.id)))));

  const results = exploreResults(candidates, filters, goal.missing, freeTime);
  const countFor = (kind: OpportunityKind) => candidates.filter((o) => o.kind === kind && matchesFilters(o, { ...filters, kind }, freeTime)).length;
  const allCount = candidates.filter((o) => matchesFilters(o, { ...filters, kind: "all" }, freeTime)).length;
  const hasFilters = !!(local.query || local.skill || local.subject || local.place || local.industry || local.freeTimeOnly || fillsSlot);
  const byDeadline = local.kind === "class" || local.kind === "internship";
  const shown = view === "calendar" && local.kind === "all" ? results.filter((o) => o.kind === "event" || o.kind === "club") : results;
  // Events in the calendar get their own board: month calendar, timeline and details.
  const eventsBoard = view === "calendar" && (local.kind === "all" || local.kind === "event");
  const schoolScope = <SchoolScope nearby={local.nearbySchools} onChange={(nearbySchools) => update({ nearbySchools })} />;

  if (search.view) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <Button variant="ghost" size="sm" asChild className="-ml-2"><Link to="/explore" search={search.role ? { role: search.role } : {}}><ArrowLeft className="size-4" aria-hidden="true" />Back to Explore</Link></Button>
        {search.view === "careers" ? <Careers /> : <GapPlan roleId={goal.id} onRole={(id) => void navigate({ to: "/explore", search: { view: "plan", role: id }, replace: true })} />}
      </div>
    );
  }

  return (
    <div>
      <PageBanner src={sceneOpportunities} position="50% 64%" />
      <div className={cn("mx-auto space-y-8", eventsBoard ? "max-w-7xl" : "max-w-5xl")}>
        <header className="text-center">
          <h1 className="text-3xl font-semibold md:text-4xl">What do you want to try next?</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Classes, clubs, events and internships picked for you.</p>
          <div className="relative mx-auto mt-5 max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={local.query} onChange={(e) => update({ query: e.target.value })} placeholder="Search classes, clubs, skills, places…" aria-label="Search opportunities" className="h-12 rounded-full bg-card pr-4 pl-11 shadow-soft" />
          </div>
        </header>

        <GoalBar goalId={goal.id} title={goal.title} gaps={gaps} skill={local.skill} onRole={setRole} onSkill={(skill) => update({ skill })} />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PillGroup>
              <Pill active={local.kind === "all"} onClick={() => update({ kind: "all" })}>All <span className="text-xs opacity-70"><Roll value={allCount} /></span></Pill>
              {ORDER.map((k) => <Pill key={k} active={local.kind === k} onClick={() => update({ kind: k })}>{KIND[k].tab} <span className="text-xs opacity-70"><Roll value={countFor(k)} /></span></Pill>)}
            </PillGroup>
            <PillGroup className="rounded-full border bg-card p-1">
              <Pill active={view === "browse"} onClick={() => setView("browse")}><LayoutGrid className="size-3.5" aria-hidden="true" /> Browse</Pill>
              <Pill active={view === "calendar"} onClick={() => setView("calendar")}><CalendarDays className="size-3.5" aria-hidden="true" /> {byDeadline ? "Deadlines" : "Calendar"}</Pill>
            </PillGroup>
          </div>
          <div className={cn("flex flex-wrap items-center gap-2", eventsBoard && "hidden")}>
            <FilterMenu label="Filter by skill" any="Any skill" value={local.skill} options={SKILLS} onChange={(skill) => update({ skill })} />
            <FilterMenu label="Filter by subject" any="Any subject" value={local.subject} options={SUBJECTS} onChange={(subject) => update({ subject })} />
            <FilterMenu label="Filter by school or place" any="Any school or place" value={local.place} options={PLACES} onChange={(place) => update({ place })} />
            <FilterMenu label="Filter by industry" any="Any industry" value={local.industry} options={INDUSTRIES} onChange={(industry) => update({ industry })} />
            <label className="ml-1 flex items-center gap-2 text-xs font-medium">
              <Switch checked={local.freeTimeOnly} onCheckedChange={(freeTimeOnly) => update({ freeTimeOnly })} aria-label="Only things I can do in my free time" />
              In my free time
            </label>
            {fillsSlot && <button type="button" onClick={clearFills} className="glass-active inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium">Classes for your {fillsSlot.need.toLowerCase()} <X className="size-3.5" aria-hidden="true" /></button>}
            {hasFilters && <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X className="size-3.5" aria-hidden="true" /> Clear</button>}
          </div>
        </div>

        <div aria-live="polite" className="sr-only">{results.length} results</div>
        {local.kind === "class" && <div className="flex justify-end">{schoolScope}</div>}
        {eventsBoard ? (
          <EventsBoard query={local.query} />
        ) : shown.length === 0 ? (
          <div className="surface p-10 text-center">
            <p className="font-medium">No matches. Try removing a filter.</p>
            <Button variant="outline" className="mt-3" onClick={clear}>Clear filters</Button>
          </div>
        ) : view === "calendar" ? (
          <Calendar items={shown} gaps={goal.missing} onOpen={onOpen} byDeadline={byDeadline} showKind={local.kind === "all"} />
        ) : local.kind === "all" ? (
          <div className="space-y-10">{ORDER.map((k) => <KindSection key={k} kind={k} items={results.filter((o) => o.kind === k)} gaps={goal.missing} onOpen={onOpen} onSeeAll={() => update({ kind: k })} {...(k === "class" ? { control: schoolScope } : {})} />)}</div>
        ) : (
          <KindGrid items={results} gaps={goal.missing} onOpen={onOpen} />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><CalendarClock className="size-4 shrink-0" aria-hidden="true" /> {timeLeftLine(terms, results)}</span>
        </div>
      </div>
    </div>
  );
}
