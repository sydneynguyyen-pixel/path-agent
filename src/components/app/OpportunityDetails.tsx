import { useCallback, useRef } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bookmark, Briefcase, CalendarClock, CalendarDays, Check, ChevronRight, CircleDollarSign, GraduationCap, MapPin, Plus, Send, Ticket, Users } from "lucide-react";
import { careerRoles, freeTime, goTogetherEvent, opportunities, type Opportunity, type OpportunityKind } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { buildsSkill, degreeLine, deadlineLine, doneLabel, goalFor, goalGap, hostLine, otherWays, whoIsGoing, whyLine } from "@/lib/opportunities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AgentAvatar } from "@/components/app/Brand";
import { Flyer } from "@/components/app/Flyer";
import { OrgLogo } from "@/components/app/SchoolLogo";
import { useSaveToPlan } from "@/components/app/PlanActions";
import { PostingLink } from "@/components/app/PostingLink";
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

export function SaveButton({ o, compact = false }: { o: Opportunity; compact?: boolean }) {
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

/** One details panel for every listing, opened from Explore, Home, Terms, Map and Portfolio. */
export function OpportunityDetails() {
  const j = useJourney();
  const role = useRouterState({ select: (s) => (s.location.search as { role?: string }).role });
  const goal = careerRoles.find((r) => r.id === role) ?? goalFor(careerRoles, j.interestedRoles);
  const gaps = goal.missing;
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
      <DialogContent ref={attachPanel} className="card-details brand-app max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
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
                <PostingLink item={o} className="pt-1 text-sm" />
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

