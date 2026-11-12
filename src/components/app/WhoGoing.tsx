import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Clock, EyeOff, IdCard, Search, UserCheck, UserPlus } from "lucide-react";
import { goTogetherEvent, opportunities, type EventPeer } from "@/data/scenario";
import { alsoGoing, metStudents, pastMatches } from "@/data/people";
import { matchState } from "@/lib/opportunities";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { useJourney } from "@/lib/journey";
import { crowdFor, groupGoing, tieWith, type Crowd, type Known, type Tie } from "@/lib/going";
import { useSaveToPlan } from "@/components/app/PlanActions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PeerAction } from "@/components/app/GoTogether";
import { PeerPathCard } from "@/components/app/PathCard";
import { PersonPhoto } from "@/components/app/PersonPhoto";
import { cn } from "@/lib/utils";

const first = (p: EventPeer) => p.name.split(" ")[0]!;
const everyone = goTogetherEvent.visiblePeers;

/** Who she knows, from her own records and the friends she added. */
export function useKnown(): Known {
  const j = useJourney();
  return {
    friends: j.friends,
    met: metStudents.map((m) => ({ peerId: m.peerId, event: m.event })),
    went: pastMatches,
  };
}

export const crowd = (eventId: string) => crowdFor(eventId, everyone, { id: goTogetherEvent.id, going: goTogetherEvent.going, peers: everyone, asksYou: goTogetherEvent.asksYou }, alsoGoing);

/** How many people are going to an event, for the People tab's label. */
export function peopleCount(eventId: string) {
  return crowd(eventId).going;
}

/** Where she stands with each person at this event. The UX night keeps its scripted asks; other events only have the asks she sends. */
function useAsks(eventId: string) {
  const j = useJourney();
  if (eventId === goTogetherEvent.id) return { asks: j.goTogether, notes: j.goTogether.sentNotes ?? {} };
  const e = j.eventAsks[eventId] ?? { sentTo: [], notes: {} };
  return { asks: { sentTo: e.sentTo, matched: [], passed: [] }, notes: e.notes };
}

/** Everyone going who chose to be seen: asks first, then people she knows, then small cards that open into each person's full card. */
export function WhoGoing({ eventId, focus }: { eventId: string; focus?: string | undefined }) {
  const j = useJourney();
  const known = useKnown();
  const c = crowd(eventId);
  const { asks } = useAsks(eventId);
  const g = j.goTogether;
  const going = j.savedOpportunities.includes(eventId);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(focus ?? null);
  useEffect(() => { if (focus) setOpen(focus); }, [focus]);

  const groups = groupGoing(c.peers, asks, c.asksYou, known, query);
  const hidden = c.going - c.peers.length;
  const toggle = (id: string) => setOpen(open === id ? null : id);
  const sure = groups.known.filter((k) => k.together || k.tie?.kind !== "mutual");
  const maybe = groups.known.filter((k) => !k.together && k.tie?.kind === "mutual");
  return (
    <div className="space-y-5">
      <GoingBar eventId={eventId} crowd={c} />
      {going && g.showMe && (
        <>
          {c.peers.length > 6 && (
            <label className="who-search">
              <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or major" aria-label="Search who's going" />
            </label>
          )}

          {groups.requests.length > 0 && (
            <Group title="Asked to go with you">
              {groups.requests.map((p) => <Request key={p.id} peer={p} tie={tieWith(p, known, everyone)} open={open === p.id} onToggle={() => toggle(p.id)} />)}
            </Group>
          )}
          {sure.length > 0 && (
            <Group title="People you know">
              {sure.map(({ peer, tie, together }) => <PersonRow key={peer.id} eventId={eventId} peer={peer} tie={together ? { kind: "friend", text: "Going together" } : tie} open={open === peer.id} onToggle={() => toggle(peer.id)} />)}
            </Group>
          )}
          {maybe.length > 0 && (
            <Group title="People you may know">
              {maybe.map(({ peer, tie }) => <PersonRow key={peer.id} eventId={eventId} peer={peer} tie={tie} open={open === peer.id} onToggle={() => toggle(peer.id)} />)}
            </Group>
          )}
          {groups.others.length > 0 && (
            <Group title={`Everyone going · ${groups.others.length}`}>
              {groups.others.map((p) => <PersonRow key={p.id} eventId={eventId} peer={p} tie={null} open={open === p.id} onToggle={() => toggle(p.id)} />)}
            </Group>
          )}
          {!groups.requests.length && !groups.known.length && !groups.others.length && <p className="px-1 text-sm text-muted-foreground">No one matches "{query}".</p>}
          {hidden > 0 && !query && <p className="px-1 text-xs text-muted-foreground">{hidden} others are going without a card. Demo only: no request or note goes out.</p>}
        </>
      )}
    </div>
  );
}

/** Seeing who's going starts with saying you're going. Your card shows by default once you are, and you can go without it. */
function GoingBar({ eventId, crowd: c }: { eventId: string; crowd: Crowd }) {
  const j = useJourney();
  const save = useSaveToPlan();
  const event = opportunities.find((o) => o.id === eventId);
  const going = j.savedOpportunities.includes(eventId);
  const faces = c.peers.slice(0, 4);
  if (!going || !j.goTogether.showMe) {
    return (
      <div className="who-gate">
        <span className="flex -space-x-2">{faces.map((p) => <PersonPhoto key={p.id} photo={p.photo} size="sm" className="ring-2 ring-white" />)}</span>
        <div className="text-sm font-semibold">{c.going} Bayview students are going</div>
        {going
          ? <Button size="sm" className="w-full" onClick={() => j.setShowMeGoing(true)}><IdCard className="size-4" aria-hidden="true" />Show my card and see who</Button>
          : <Button size="sm" className="w-full" onClick={() => { if (event) save(event); j.setShowMeGoing(true); }}><Check className="size-4" aria-hidden="true" />I'm going</Button>}
        <p className="text-xs text-muted-foreground">{going ? "You're going without your card, so the list stays hidden too." : "Your card shows to others going, and you'll see theirs."}</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card/70 px-4 py-3">
      <Check className="size-4 shrink-0 text-mark-yes" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm"><span className="font-medium">You're going</span><span className="text-muted-foreground"> · your card is showing</span></div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button size="sm" variant="ghost">Change</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link to="/career" search={{ tab: "card" }}><IdCard />Edit your card</Link></DropdownMenuItem>
          <DropdownMenuItem onSelect={() => j.setShowMeGoing(false)}><EyeOff />Go without my card</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">{title}</h3>
      <ul className="who-list">{children}</ul>
    </section>
  );
}

/** Someone asked to go with her. Their note comes first, so it reads like a person, not a request. */
function Request({ peer: p, tie, open, onToggle }: { peer: EventPeer; tie: Tie | null; open: boolean; onToggle: () => void }) {
  const ref = useScrollWhenOpen(open);
  return (
    <li ref={ref} className="who-request">
      <div className="flex items-start gap-3">
        <PersonPhoto photo={p.photo} size="md" />
        <PeerSummary peer={p} tie={tie} />
      </div>
      {p.message && <p className="who-note">{p.message}</p>}
      <PeerAction peer={p} />
      <button type="button" className="who-more" aria-expanded={open} onClick={onToggle}>{open ? "Hide card" : `See ${first(p)}'s card`}<ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" /></button>
      {open && <div className="who-card"><PeerPathCard peer={p} /><FriendButton peer={p} /></div>}
    </li>
  );
}

/** Who someone is at a glance: name, year and major, school. How you know them sits under it when you do. */
function PeerSummary({ peer: p, tie }: { peer: EventPeer; tie: Tie | null }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold">{p.name}</span>
      <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><span className="who-standing">{p.standing}</span><span className="truncate">{p.major}</span></span>
      <span className="mt-1 flex items-center gap-1.5 text-xs font-medium"><SchoolLogo school={p.org} className="size-4" />Bayview CC</span>
      {tie && <span className="who-tie">{tie.text}</span>}
    </span>
  );
}

/** One person as a small card. Opening it shows their full card, how to ask, and Add friend. */
function PersonRow({ eventId, peer: p, tie, open, onToggle }: { eventId: string; peer: EventPeer; tie: Tie | null; open: boolean; onToggle: () => void }) {
  const ref = useScrollWhenOpen(open);
  return (
    <li ref={ref} className={cn("who-row", open && "who-row-open")}>
      <button type="button" className="who-row-head" aria-expanded={open} onClick={onToggle}>
        <PersonPhoto photo={p.photo} size="md" />
        <PeerSummary peer={p} tie={tie} />
        <ChevronDown className={cn("size-4 shrink-0 self-start text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="who-card">
          <PeerPathCard peer={p} />
          <AskWithNote eventId={eventId} peer={p} />
          <FriendButton peer={p} />
        </div>
      )}
    </li>
  );
}

/** Asking comes with an optional note in her own words, so it doesn't land as a stranger's ping. */
function AskWithNote({ eventId, peer }: { eventId: string; peer: EventPeer }) {
  const j = useJourney();
  const c = crowd(eventId);
  const { asks, notes } = useAsks(eventId);
  const state = j.goTogether.showMe ? matchState(peer.id, asks, c.asksYou) : "none";
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  if (eventId === goTogetherEvent.id && (state === "matched" || state === "asked-you")) return <PeerAction peer={peer} />;
  if (state === "you-asked") {
    return (
      <div className="space-y-2">
        {notes[peer.id] && <p className="who-note who-note-mine">{notes[peer.id]}</p>}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden="true" />Asked. It's a match if {first(peer)} says yes.</div>
      </div>
    );
  }
  if (!writing) return <Button size="sm" variant="outline" className="w-full" disabled={!j.goTogether.showMe} onClick={() => setWriting(true)}>Ask to go together</Button>;
  const send = () => { if (eventId === goTogetherEvent.id) j.askToGo(peer.id, note); else j.askAtEvent(eventId, peer.id, note); setWriting(false); };
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <textarea className="who-compose" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Say hi to ${first(peer)} (optional)`} aria-label={`Note to ${first(peer)}`} autoFocus />
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1">Ask to go together</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setWriting(false)}>Cancel</Button>
      </div>
    </form>
  );
}

/** Friends need both people to say yes: Add friend sends a request, and a request she got can be accepted here or on Explore → People. */
export function FriendButton({ peer, className }: { peer: EventPeer; className?: string }) {
  const j = useJourney();
  const name = first(peer);
  if (j.friends.includes(peer.id)) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className={cn("w-full", className)}><UserCheck className="size-4" aria-hidden="true" />Friends<ChevronDown className="size-3.5" aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => j.removeFriend(peer.id)}>Remove {name} as a friend</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    );
  }
  if (j.friendIncoming.includes(peer.id)) {
    return <Button size="sm" className={cn("w-full", className)} onClick={() => j.answerFriend(peer.id, true)}><UserPlus className="size-4" aria-hidden="true" />Accept friend request</Button>;
  }
  if (j.friendSent.includes(peer.id)) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className={cn("w-full", className)}><Clock className="size-4" aria-hidden="true" />Request sent<ChevronDown className="size-3.5" aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => j.cancelFriendRequest(peer.id)}>Cancel request</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    );
  }
  return <Button size="sm" variant="outline" className={cn("w-full", className)} onClick={() => j.requestFriend(peer.id)}><UserPlus className="size-4" aria-hidden="true" />Send friend request</Button>;
}

function useScrollWhenOpen(open: boolean) {
  const ref = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);
  return ref;
}
