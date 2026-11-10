import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bookmark, Briefcase, CalendarClock, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign, GraduationCap, LayoutGrid, MapPin, Plus, Search, Send, Sparkles, Ticket, Users, X } from "lucide-react";
import { careerRoles, freeTime, goTogetherEvent, opportunities, terms, type Opportunity, type OpportunityKind } from "@/data/scenario";
import { SCRIPT_START, useJourney } from "@/lib/journey";
import { buildsSkill, gapSignal, degreeLine, doneLabel, goalFor, otherWays, deadlineDate, deadlineLabel, deadlineLine, detailLine, distinct, doableInFreeTime, exploreResults, goalGap, groupByDate, hostLine, matchesFilters, NO_FILTERS, timeLeftLine, whoIsGoing, whyLine, type ExploreFilters } from "@/lib/opportunities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AgentAvatar } from "@/components/app/Brand";
import { Flyer } from "@/components/app/Flyer";
import { OrgLogo } from "@/components/app/SchoolLogo";
import { PageBanner } from "@/components/app/SeasonBanner";
import { cn } from "@/lib/utils";
import { useSaveToPlan } from "@/components/app/PlanActions";
import { Roll } from "@/components/app/Roll";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
import { growFrom, shrinkInto } from "@/lib/motion";
import { photoUrl } from "@/lib/photos";
import sceneOpportunities from "@/assets/scene-opportunities.jpg";

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): { role?: string; open?: string } => ({ ...(typeof s["role"] === "string" ? { role: s["role"] } : {}), ...(typeof s["open"] === "string" ? { open: s["open"] } : {}) }),
  head: () => ({
    meta: [
      { title: "Opportunities — Path Agent" },
      { name: "description", content: "Classes, events, internships and clubs that fit your goal and your week." },
      { property: "og:title", content: "Opportunities — Path Agent" },
      { property: "og:description", content: "Search classes, clubs, events and internships picked for your goal and schedule." },
    ],
  }),
  component: Explore,
});

const ORDER: OpportunityKind[] = ["class", "event", "internship", "club"];
const KIND: Record<OpportunityKind, { label: string; tab: string; heading: string; icon: typeof Ticket }> = {
  class: { label: "Class", tab: "Classes", heading: "Classes you can take", icon: GraduationCap },
  event: { label: "Event", tab: "Events", heading: "Events to go to", icon: Ticket },
  internship: { label: "Internship", tab: "Internships", heading: "Internships to try", icon: Briefcase },
  club: { label: "Club", tab: "Clubs", heading: "Clubs to join", icon: Users },
};
const ANY = "any";
const shortTitle = (o: Opportunity) => o.title.split(" · ").at(-1)!;

type Open = (id: string) => void;

function Photo({ o, width, className, eager = false }: { o: Opportunity; width: number; className?: string; eager?: boolean }) {
  return (
    <div className={cn("explore-photo", className)}>
      <img src={photoUrl(o.photo, width)} alt="" loading={eager ? "eager" : "lazy"} decoding={eager ? "sync" : "async"} onError={(e) => { e.currentTarget.style.display = "none"; }} />
    </div>
  );
}

function KindChip({ kind, className }: { kind: OpportunityKind; className?: string }) {
  const k = KIND[kind];
  return <span className={cn("kind-tint inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground", `kind-${kind}`, className)}><k.icon className="size-3" aria-hidden="true" /> {k.label}</span>;
}

function SaveButton({ o, compact = false }: { o: Opportunity; compact?: boolean }) {
  const j = useJourney();
  const code = o.courseCode;
  const save = useSaveToPlan();
  const went = !!j.wentTo[o.id];
  const saved = code ? j.draftCourses.includes(code) : j.savedOpportunities.includes(o.id);
  const label = went ? doneLabel(o) : code ? (saved ? "In your draft plan" : "Add to draft plan") : saved ? "On your plan" : "Add to my plan";
  const act = (e: { currentTarget: HTMLElement }) => save(o, e.currentTarget);
  if (compact) {
    return (
      <button type="button" onClick={act} disabled={went || (!!code && saved)} aria-pressed={saved} aria-label={`${label}: ${shortTitle(o)}`} className="save-btn relative z-20 grid size-8 shrink-0 place-items-center rounded-full border bg-card text-foreground hover:bg-secondary">
        {code ? (saved ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />) : <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden="true" />}
      </button>
    );
  }
  return <Button variant="outline" className="save-btn" aria-pressed={saved} disabled={went || (!!code && saved)} onClick={act}>{code ? (saved ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />) : <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden="true" />} {label}</Button>;
}

/** Makes a whole card open its details, while the save button on top stays its own control. */
function OpenCover({ o, onOpen }: { o: Opportunity; onOpen: Open }) {
  return <button type="button" className="absolute inset-0 z-10 rounded-[inherit]" aria-label={`See details: ${shortTitle(o)}`} onClick={() => onOpen(o.id)} />;
}

type Tone = "white" | "soft" | "muted" | "inherit";
const TONE: Record<Tone, string> = { white: "text-white", soft: "text-foreground/80", muted: "text-muted-foreground", inherit: "text-current" };

function HostRow({ o, tone = "soft", showKind }: { o: Opportunity; tone?: Tone; showKind?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2 text-xs font-medium", TONE[tone])}>
      <OrgLogo org={o.org} club={o.club} />
      <span className="truncate">{showKind && `${KIND[o.kind].label} · `}{hostLine(o)}</span>
    </div>
  );
}

function signalsFor(o: Opportunity, gap: string | undefined) {
  const going = o.id === goTogetherEvent.id ? goTogetherEvent.going : 0;
  return [
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

/** Cards and their details share one image, so opening a card never waits on a second download. */
const DETAIL_WIDTH = 800;
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
        <div className="mt-auto pt-3"><div className="flex min-h-11 items-center justify-between gap-2 border-t pt-3"><div className="min-w-0"><Signals o={o} gap={goalGap(o, gaps)} tone="muted" limit={1} /></div><SaveButton o={o} compact /></div></div>
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
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3"><SignalChips o={o} gap={goalGap(o, gaps)} /><SaveButton o={o} compact /></div>
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

function GoTogether() {
  const j = useJourney();
  const g = j.goTogether;
  const who = whoIsGoing(goTogetherEvent, g.showMe);
  const drafting = goTogetherEvent.visiblePeers.find((p) => p.id === g.draftTo);
  const sentNames = goTogetherEvent.visiblePeers.filter((p) => g.sentTo.includes(p.id)).map((p) => p.name.split(" ")[0]);
  return (
    <div className="rounded-2xl bg-secondary p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-52">
          <div className="flex items-center gap-2 text-sm font-medium"><Users className="size-4 shrink-0" aria-hidden="true" /> {who.count} Bayview students going</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {g.showMe ? "Only students who also turned this on can see you." : "Turn this on to see who else is going."}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium">
          Show me as going
          <Switch checked={g.showMe} onCheckedChange={j.setShowMeGoing} aria-label="Show me as going" />
        </label>
      </div>

      {g.showMe && (
        <div className="mt-4 space-y-2">
          {who.visible.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2">
              <div className="min-w-0"><div className="text-sm font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.note}</div></div>
              {g.sentTo.includes(p.id)
                ? <span className="flex items-center gap-1 text-xs font-medium text-mark-yes"><Check className="size-3.5" aria-hidden="true" /> Sent</span>
                : <Button size="sm" variant="outline" disabled={!!drafting} onClick={() => j.startHello(p.id)}>Say hi</Button>}
            </div>
          ))}
          {who.private > 0 && <p className="px-1 text-xs text-muted-foreground">{who.private} others are going privately.</p>}
        </div>
      )}

      {drafting && (
        <div className="mt-4 rounded-xl bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AgentAvatar agent="drafter" />
            {g.draft ? "Here's a draft. Edit it before you send." : "Write your message."}
          </div>
          <Textarea className="mt-2 min-h-24 text-sm" value={g.draft} onChange={(e) => j.setHelloDraft(e.target.value)} aria-label={`Message to ${drafting.name}`} />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={j.cancelHello}>Not now</Button>
            <Button size="sm" disabled={!g.draft.trim()} onClick={j.sendHello}><Send className="size-3.5" aria-hidden="true" /> Send to {drafting.name.split(" ")[0]}</Button>
          </div>
        </div>
      )}

      {sentNames.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Demo only: no message was sent. <Link to="/activity" className="underline underline-offset-4 hover:text-foreground">See it in Activity</Link>
        </p>
      )}
    </div>
  );
}

/** The tradeoff: the same skill, a different kind of commitment. */
function OtherWays({ o, gaps, onOpen }: { o: Opportunity; gaps: string[]; onOpen: Open }) {
  const skill = goalGap(o, gaps) ?? o.fills[0]!;
  const ways = otherWays(o, skill, opportunities);
  if (ways.length === 0) return null;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{buildsSkill(o) ? "Other ways" : "Ways"} to build {skill.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase())}</div>
      <ul className="mt-1 divide-y">
        {ways.map((w) => (
          <li key={w.id}>
            <button type="button" onClick={() => onOpen(w.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
              <KindChip kind={w.kind} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{shortTitle(w)}</span>
                <span className="block text-xs text-muted-foreground">{degreeLine(w)} · {w.cost === undefined ? w.when : `$${w.cost.toLocaleString("en-US")}`}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Details({ o, gaps, onOpen, onClose, panelRef }: { o: Opportunity | undefined; gaps: string[]; onOpen: Open; onClose: () => void; panelRef: (node: HTMLDivElement | null) => void }) {
  return (
    <Dialog open={!!o} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent ref={panelRef} className="card-details brand-app max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        {o && (
          <div className={`kind-${o.kind}`}>
            {o.flyer ? <div className="grid place-items-center py-7" style={{ background: o.flyer.brand }}><Flyer flyer={o.flyer} photo={photoUrl(o.photo, DETAIL_WIDTH)} className="size-72 rounded-xl shadow-soft" /></div> : <Photo o={o} width={DETAIL_WIDTH} eager className="h-56" />}
            <div className="space-y-4 p-6">
              <div>
                <KindChip kind={o.kind} />
                <DialogTitle className="mt-2 text-xl font-semibold">{shortTitle(o)}</DialogTitle>
                <DialogDescription asChild><div className="mt-2"><HostRow o={o} /></div></DialogDescription>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2"><CalendarClock className="size-4 shrink-0" aria-hidden="true" /> {o.when}</div>
                {o.deadline && <div className="flex items-center gap-2 font-medium"><CalendarDays className="size-4 shrink-0" aria-hidden="true" /> {deadlineLine(o)}</div>}
                <div className="flex items-center gap-2"><MapPin className="size-4 shrink-0" aria-hidden="true" /> {o.place}</div>
                {o.cost !== undefined && <div className="flex items-center gap-2"><CircleDollarSign className="size-4 shrink-0" aria-hidden="true" /> About ${o.cost.toLocaleString("en-US")} in tuition</div>}
                <div className="flex items-center gap-2"><GraduationCap className="size-4 shrink-0" aria-hidden="true" /> {degreeLine(o)}</div>
              </div>
              <p className="text-sm">{whyLine(o, gaps, freeTime)}</p>
              <div>
                <div className="text-xs text-muted-foreground">{buildsSkill(o) ? "Skills you'd build" : "What it covers"}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{o.fills.map((s) => <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{s}</span>)}</div>
              </div>
              <OtherWays o={o} gaps={gaps} onOpen={onOpen} />
              {o.id === goTogetherEvent.id && <GoTogether />}
              <SaveButton o={o} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FilterMenu({ label, any, value, options, onChange }: { label: string; any: string; value: string | null; options: { value: string; label: string }[]; onChange: (v: string | null) => void }) {
  return (
    <Select value={value ?? ANY} onValueChange={(v) => onChange(v === ANY ? null : v)}>
      <SelectTrigger aria-label={label} className={cn("h-9 w-auto max-w-56 gap-1.5 rounded-full text-xs", value && "border-primary bg-secondary font-medium")}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{any}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors", active ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>{children}</button>;
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

function Explore() {
  const j = useJourney();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [view, setView] = useState<"browse" | "calendar">("browse");
  const [openId, setOpenId] = useState<string | null>(() => search.open ?? (j.goTogether.draftTo ? goTogetherEvent.id : null));
  const [local, setLocal] = useState<ExploreFilters>(NO_FILTERS);

  const career = careerRoles.find((r) => r.id === search.role);
  const goal = career ?? goalFor(careerRoles, j.interestedRoles);
  const filters: ExploreFilters = { ...local, careerGaps: career ? career.missing : null };
  const update = (patch: Partial<ExploreFilters>) => setLocal((f) => ({ ...f, ...patch }));
  const setCareer = (id: string | null) => navigate({ to: "/explore", search: id ? { role: id } : {}, replace: true, resetScroll: false });
  const clear = () => { setLocal((f) => ({ ...NO_FILTERS, kind: f.kind, nearbySchools: f.nearbySchools })); setCareer(null); };

  const results = exploreResults(opportunities, filters, goal.missing, freeTime);
  const countFor = (kind: OpportunityKind) => opportunities.filter((o) => o.kind === kind && matchesFilters(o, filters, freeTime)).length;
  const allCount = opportunities.filter((o) => matchesFilters(o, filters, freeTime)).length;
  const hasFilters = !!(local.query || local.skill || local.subject || local.place || local.industry || local.freeTimeOnly || career);
  const open = opportunities.find((o) => o.id === openId);
  const cardFor = (id: string | null) => (id ? document.querySelector<HTMLElement>(`article[data-opp="${CSS.escape(id)}"]`) : null);
  const panel = useRef<HTMLDivElement | null>(null);
  const openNow = useRef(openId);
  openNow.current = openId;
  // Stable on purpose: this runs when the panel mounts, so it animates once per open. Moving between listings inside the panel swaps in place.
  const attachPanel = useCallback((node: HTMLDivElement | null) => {
    panel.current = node;
    if (node) growFrom(node, cardFor(openNow.current));
  }, []);
  const closeCard = () => shrinkInto(panel.current, cardFor(openId), () => setOpenId(null));
  const byDeadline = local.kind === "class" || local.kind === "internship";
  const shown = view === "calendar" && local.kind === "all" ? results.filter((o) => o.kind === "event" || o.kind === "club") : results;
  const schoolScope = <SchoolScope nearby={local.nearbySchools} onChange={(nearbySchools) => update({ nearbySchools })} />;

  return (
    <div>
      <PageBanner src={sceneOpportunities} position="50% 64%" />
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-semibold md:text-4xl">What do you want to try next?</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Classes, clubs, events and internships picked for you.</p>
          <div className="relative mx-auto mt-5 max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={local.query} onChange={(e) => update({ query: e.target.value })} placeholder="Search classes, clubs, skills, places…" aria-label="Search opportunities" className="h-12 rounded-full bg-card pr-4 pl-11 shadow-soft" />
          </div>
        </header>

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
          <div className="flex flex-wrap items-center gap-2">
            <FilterMenu label="Filter by career" any="Any career" value={career?.id ?? null} options={careerRoles.map((r) => ({ value: r.id, label: r.title }))} onChange={setCareer} />
            <FilterMenu label="Filter by skill" any="Any skill" value={local.skill} options={SKILLS} onChange={(skill) => update({ skill })} />
            <FilterMenu label="Filter by subject" any="Any subject" value={local.subject} options={SUBJECTS} onChange={(subject) => update({ subject })} />
            <FilterMenu label="Filter by school or place" any="Any school or place" value={local.place} options={PLACES} onChange={(place) => update({ place })} />
            <FilterMenu label="Filter by industry" any="Any industry" value={local.industry} options={INDUSTRIES} onChange={(industry) => update({ industry })} />
            <label className="ml-1 flex items-center gap-2 text-xs font-medium">
              <Switch checked={local.freeTimeOnly} onCheckedChange={(freeTimeOnly) => update({ freeTimeOnly })} aria-label="Only things I can do in my free time" />
              In my free time
            </label>
            {hasFilters && <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X className="size-3.5" aria-hidden="true" /> Clear</button>}
          </div>
        </div>

        <div aria-live="polite" className="sr-only">{results.length} results</div>
        {local.kind === "class" && <div className="flex justify-end">{schoolScope}</div>}
        {shown.length === 0 ? (
          <div className="surface p-10 text-center">
            <p className="font-medium">No matches. Try removing a filter.</p>
            <Button variant="outline" className="mt-3" onClick={clear}>Clear filters</Button>
          </div>
        ) : view === "calendar" ? (
          <Calendar items={shown} gaps={goal.missing} onOpen={setOpenId} byDeadline={byDeadline} showKind={local.kind === "all"} />
        ) : local.kind === "all" ? (
          <div className="space-y-10">{ORDER.map((k) => <KindSection key={k} kind={k} items={results.filter((o) => o.kind === k)} gaps={goal.missing} onOpen={setOpenId} onSeeAll={() => update({ kind: k })} {...(k === "class" ? { control: schoolScope } : {})} />)}</div>
        ) : (
          <KindGrid items={results} gaps={goal.missing} onOpen={setOpenId} />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><CalendarClock className="size-4 shrink-0" aria-hidden="true" /> {timeLeftLine(terms, results)}</span>
          <Link to="/skills" search={{ tab: "plan", role: goal.id }} className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline">See your skill gaps <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
        </div>
      </div>
      <Details o={open} gaps={goal.missing} onOpen={setOpenId} onClose={closeCard} panelRef={attachPanel} />
    </div>
  );
}
