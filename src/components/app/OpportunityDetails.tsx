import { useCallback, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bookmark, Briefcase, CalendarClock, CalendarDays, Check, ChevronRight, CircleDollarSign, GraduationCap, MapPin, Plus, Sparkles, Ticket, Users, Globe } from "lucide-react";
import { careerRoles, freeTime, goTogetherEvent, opportunities, type Opportunity, type OpportunityKind } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { listings, type ListingLink } from "@/data/listings";
import instagram from "@/assets/social/instagram.svg";
import discord from "@/assets/social/discord.svg";
import x from "@/assets/social/x.svg";
import facebook from "@/assets/social/facebook.svg";
import tiktok from "@/assets/social/tiktok.svg";
import linkedin from "@/assets/social/linkedin.svg";
import { chosenGoals } from "@/lib/goals";
import { buildsSkill, degreeLine, deadlineLine, doneLabel, goalGap, hostLine, otherWays, whyLine } from "@/lib/opportunities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Flyer } from "@/components/app/Flyer";
import { OrgLogo } from "@/components/app/SchoolLogo";
import { useSaveToPlan } from "@/components/app/PlanActions";
import { PostingLink } from "@/components/app/PostingLink";
import { WhoGoing, crowd, peopleCount, useKnown } from "@/components/app/WhoGoing";
import { PersonPhoto } from "@/components/app/PersonPhoto";
import { knownGoing } from "@/lib/going";
import { SproutSays } from "@/components/app/Brand";
import { growFrom, shrinkInto } from "@/lib/motion";
import { photoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";

export const KIND: Record<OpportunityKind, { label: string; tab: string; heading: string; icon: typeof Ticket }> = {
  class: { label: "Class", tab: "Classes", heading: "Classes you can take", icon: GraduationCap },
  event: { label: "Event", tab: "Events", heading: "Events to go to", icon: Ticket },
  internship: { label: "Internship", tab: "Internships", heading: "Internships to try", icon: Briefcase },
  club: { label: "Club", tab: "Clubs", heading: "Clubs to join", icon: Users },
};
export const shortTitle = (o: Opportunity) => o.title.split(" · ").at(-1)!;
/** Cards and their details share one image, so opening a card never waits on a second download. */
export const DETAIL_WIDTH = 800;
export type Open = (id: string) => void;

export function Photo({ o, width, className, eager = false }: { o: Opportunity; width: number; className?: string; eager?: boolean }) {
  return (
    <div className={cn("explore-photo", className)}>
      <img src={photoUrl(o.photo, width)} alt="" loading={eager ? "eager" : "lazy"} decoding={eager ? "sync" : "async"} onError={(e) => { e.currentTarget.style.display = "none"; }} />
    </div>
  );
}

export function KindChip({ kind, className }: { kind: OpportunityKind; className?: string }) {
  const k = KIND[kind];
  return <span className={cn("kind-tint inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground", `kind-${kind}`, className)}><k.icon className="size-3" aria-hidden="true" /> {k.label}</span>;
}

export function SaveButton({ o, compact = false, primary = false }: { o: Opportunity; compact?: boolean; primary?: boolean }) {
  const j = useJourney();
  const code = o.courseCode;
  const save = useSaveToPlan();
  const went = !!j.wentTo[o.id];
  const saved = code ? j.draftCourses.includes(code) : j.savedOpportunities.includes(o.id);
  const label = went ? doneLabel(o) : code ? (saved ? "In your draft plan" : "Add to draft plan") : saved ? "Saved to your plan" : "Save to my plan";
  const act = (e: { currentTarget: HTMLElement }) => save(o, e.currentTarget);
  if (compact) {
    return (
      <button type="button" onClick={act} disabled={went || (!!code && saved)} aria-pressed={saved} aria-label={`${label}: ${shortTitle(o)}`} className="save-btn relative z-20 grid size-8 shrink-0 place-items-center rounded-full border bg-card text-foreground hover:bg-secondary">
        {code ? (saved ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />) : <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden="true" />}
      </button>
    );
  }
  return <Button variant={primary && !saved && !went ? "default" : "outline"} className="save-btn" aria-pressed={saved} disabled={went || (!!code && saved)} onClick={act}>{code ? (saved ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />) : <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden="true" />} {label}</Button>;
}

export type Tone = "white" | "soft" | "muted" | "inherit";
export const TONE: Record<Tone, string> = { white: "text-white", soft: "text-foreground/80", muted: "text-muted-foreground", inherit: "text-current" };

export function HostRow({ o, tone = "soft", showKind }: { o: Opportunity; tone?: Tone; showKind?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2 text-xs font-medium", TONE[tone])}>
      <OrgLogo org={o.org} club={o.club} />
      <span className="truncate">{showKind && `${KIND[o.kind].label} · `}{hostLine(o)}</span>
    </div>
  );
}

/** The tradeoff: the same skill, a different kind of commitment. */
function OtherWays({ o, gaps, onOpen }: { o: Opportunity; gaps: string[]; onOpen: Open }) {
  const skill = goalGap(o, gaps) ?? o.fills[0]!;
  const ways = otherWays(o, skill, opportunities);
  if (ways.length === 0) return null;
  return (
    <section aria-labelledby="other-ways">
      <h3 id="other-ways" className="text-sm font-semibold">{buildsSkill(o) ? "Other ways" : "Ways"} to build {skill.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase())}</h3>
      <ul className="mt-1 divide-y">
        {ways.map((w) => (
          <li key={w.id}>
            <button type="button" onClick={() => onOpen(w.id)} className="flex w-full items-center gap-3 py-3 text-left">
              <span className="min-w-0 flex-1">
                <KindChip kind={w.kind} className="mb-1.5" />
                <span className="block text-sm font-medium">{shortTitle(w)}</span>
                <span className="block text-xs text-muted-foreground">{degreeLine(w)} · {w.cost === undefined ? w.when : `$${w.cost.toLocaleString("en-US")}`}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({ icon: Icon, label, children }: { icon: typeof Ticket; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-muted"><Icon className="size-4" aria-hidden="true" /></span>
      <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5">{children}</dd></div>
    </div>
  );
}

const SOCIAL = { instagram, discord, x, facebook, tiktok, linkedin } as const;

/** The host's own social account, shown with that site's real mark. */
function SocialMark({ kind }: { kind: ListingLink["kind"] }) {
  return <span className="social-mark" data-kind={kind} aria-hidden="true">{kind === "website" ? <Globe className="size-3" /> : <img src={SOCIAL[kind]} alt="" />}</span>;
}

/** The host's own words: what it is, what you'll do, who they are, and their links. Nothing here comes from Trellis. */
function ListingAbout({ o }: { o: Opportunity }) {
  const l = listings[o.id];
  return (
    <>
      {l && (
        <div className="space-y-3 text-sm leading-relaxed">
          <h3 className="text-sm font-semibold">About</h3>
          {l.about.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
          {l.doing && (
            <>
              <h3 className="pt-1 text-sm font-semibold">{o.kind === "class" ? "In this class" : o.kind === "internship" ? "What you'll do" : "What to expect"}</h3>
              <ul className="list-disc space-y-1 pl-5 marker:text-muted-foreground">{l.doing.map((d) => <li key={d}>{d}</li>)}</ul>
            </>
          )}
          {l.host && (
            <div className="flex items-start gap-3 pt-1">
              <OrgLogo org={o.org} club={o.club} className="!size-8 shrink-0" />
              <p className="min-w-0"><span className="font-semibold">About {o.host === "Bayview CC" || o.host === "Northgate State" ? shortTitle(o) : o.host}.</span> {l.host}</p>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <PostingLink item={o} />
        {l?.links?.map((k) => {
          return <a key={k.url} href={k.url} target="_blank" rel="noopener noreferrer" className="posting-pill"><SocialMark kind={k.kind} />{k.label}<span className="sr-only"> (opens in a new tab)</span></a>;
        })}
      </div>
    </>
  );
}

/** Everything Trellis adds, beside the listing. Events get a People tab for who's going; Home and requests open straight onto it. */
function SideColumn({ o, gaps, onOpen }: { o: Opportunity; gaps: string[]; onOpen: Open }) {
  const j = useJourney();
  const people = o.kind === "event";
  const [tab, setTab] = useState<"you" | "people">(people && j.detailsFocus?.tab === "people" ? "people" : "you");
  const count = peopleCount(o.id);
  return (
    <section aria-label="What Sprout found" className="details-trellis lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
      {people && (
        <div role="tablist" aria-label="Beside the listing" className="side-tabs">
          <button type="button" role="tab" aria-selected={tab === "you"} onClick={() => setTab("you")}><Sparkles className="size-3.5" aria-hidden="true" />For you</button>
          <button type="button" role="tab" aria-selected={tab === "people"} onClick={() => setTab("people")}><Users className="size-3.5" aria-hidden="true" />People{count > 0 && <span className="side-tab-count">{count}</span>}</button>
        </div>
      )}
      <div role={people ? "tabpanel" : undefined} className={cn("space-y-6 p-6 sm:p-7", people ? "pt-4 sm:pt-5" : "lg:pt-16")}>
        {tab === "people" ? <WhoGoing eventId={o.id} focus={j.detailsFocus?.peer} /> : (
          <>
            <SproutSays label="Why I picked it">{whyLine(o, gaps, freeTime)}</SproutSays>
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-1">
              <Fact icon={GraduationCap} label="Your degree">{degreeLine(o)}</Fact>
              <Fact icon={Sparkles} label={buildsSkill(o) ? "Skills you'd build" : "What it covers"}><span className="flex flex-wrap gap-1.5 pt-0.5">{o.fills.map((s) => <span key={s} className="rounded-full bg-card px-3 py-1 text-xs shadow-soft">{s}</span>)}</span></Fact>
            </dl>
            {people && <PeopleTeaser o={o} onPeople={() => setTab("people")} />}
            <OtherWays o={o} gaps={gaps} onOpen={onOpen} />
          </>
        )}
      </div>
    </section>
  );
}

/** On For you, one line about who's going: people she knows first, otherwise the count. */
function PeopleTeaser({ o, onPeople }: { o: Opportunity; onPeople: () => void }) {
  const j = useJourney();
  const known = useKnown();
  const c = crowd(o.id);
  const mine = j.goTogether.showMe ? knownGoing(c.peers.map((p) => p.id), c.peers, known) : [];
  const count = c.going;
  return (
    <button type="button" onClick={onPeople} className="who-teaser">
      <span className="flex shrink-0 -space-x-2">{(mine.length ? mine.map((m) => m.peer) : c.peers).slice(0, 3).map((p) => <PersonPhoto key={p.id} photo={p.photo} size="sm" className="ring-2 ring-white" />)}</span>
      <span className="min-w-0 flex-1 text-left text-sm">{mine.length ? <><span className="font-semibold">{mine.map((m) => m.peer.name.split(" ")[0]).join(" and ")}</span> {mine.length > 1 ? "are" : "is"} going</> : <>{count} Bayview students going</>}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

/** One details panel for every listing, opened from Explore, Home, Terms, Map and Career. */
export function OpportunityDetails() {
  const j = useJourney();
  const role = useRouterState({ select: (s) => (s.location.search as { role?: string }).role });
  const goal = careerRoles.find((r) => r.id === role && j.interestedRoles.includes(r.id)) ?? chosenGoals(careerRoles, j.interestedRoles)[0];
  const gaps = goal?.missing ?? [];
  const id = j.opportunityDetails;
  const o = opportunities.find((x) => x.id === id);
  const cardFor = (x: string | null) => (x ? document.querySelector<HTMLElement>(`article[data-opp="${CSS.escape(x)}"]`) : null);
  const panel = useRef<HTMLDivElement | null>(null);
  const openNow = useRef(id);
  openNow.current = id;
  // Stable on purpose: this runs when the panel mounts, so it animates once per open. Moving between listings inside the panel swaps in place.
  const attachPanel = useCallback((node: HTMLDivElement | null) => {
    panel.current = node;
    if (node) growFrom(node, cardFor(openNow.current));
  }, []);
  const onClose = () => shrinkInto(panel.current, cardFor(id), () => j.openOpportunity(null));
  const onOpen: Open = (next) => j.openOpportunity(next);

  return (
    <Dialog open={!!o} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent ref={attachPanel} className="card-details brand-app max-h-[92vh] gap-0 overflow-x-hidden overflow-y-auto p-0 sm:max-w-3xl lg:h-[88vh] lg:max-w-6xl lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
        {o && (
          <div className={`kind-${o.kind} lg:grid lg:h-full lg:grid-cols-3`}>
            {/* Left two thirds: everything the host posted. Each column scrolls on its own on wide screens. */}
            <div className="lg:col-span-2 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
            {o.flyer ? <div className="grid place-items-center py-7" style={{ background: o.flyer.brand }}><Flyer flyer={o.flyer} photo={photoUrl(o.photo, DETAIL_WIDTH)} className="size-72 rounded-xl shadow-soft" /></div> : <Photo o={o} width={DETAIL_WIDTH} eager className="h-56" />}
            {/* What the host posted: name, who runs it, when and where, and a link to their own page. */}
            <section aria-label="From the listing" className="space-y-5 p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 basis-64">
                  <KindChip kind={o.kind} />
                  <DialogTitle className="mt-3 text-2xl font-semibold leading-tight">{shortTitle(o)}</DialogTitle>
                  <DialogDescription asChild><div className="mt-2"><HostRow o={o} /></div></DialogDescription>
                </div>
                <SaveButton o={o} primary />
              </div>
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                <Fact icon={CalendarClock} label="When">{o.when}</Fact>
                {!o.when.includes(o.place) && <Fact icon={MapPin} label="Where">{o.place}</Fact>}
                {o.deadline && <Fact icon={CalendarDays} label="Deadline"><span className="font-medium">{deadlineLine(o)}</span></Fact>}
                {o.cost !== undefined && <Fact icon={CircleDollarSign} label="Cost">About ${o.cost.toLocaleString("en-US")} in tuition</Fact>}
              </dl>
              <ListingAbout o={o} />
            </section>
            </div>
            {/* Right third: everything Trellis adds, opened by Sprout's bubble: why she picked it, degree, skills, who's going, and other ways to build the same skill. */}
            <SideColumn key={`${o.id}-${j.detailsFocus?.peer ?? ""}`} o={o} gaps={gaps} onOpen={onOpen} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

