import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, IdCard, Mail, Pencil, UserPlus, Users } from "lucide-react";
import { FriendButton, useKnown } from "@/components/app/WhoGoing";
import { tieWith } from "@/lib/going";
import { goTogetherEvent, student, type EventPeer } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PeerPathCard } from "@/components/app/PathCard";
import { contactHref, usePeerState } from "@/components/app/GoTogether";
import { metStudents, people } from "@/data/people";
import { PersonPhoto } from "@/components/app/PersonPhoto";
import { callName, lowerFirst, notesFor, promiseEmail, promiseId } from "@/lib/event";

/** Everyone she's written a note about, with every note, newest event last. Private. */
export function PeopleMet() {
  const j = useJourney();
  const met = people.filter((p) => notesFor(p.id, j.event.notes).length > 0);
  return (
    <section className="space-y-10">
      <FriendRequests />
      <MatchCard />
      <div>
        <h2 className="text-xl font-semibold">People you've met</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Notes you wrote after talking to someone, and anything you said you'd do. Only you see these. They come back before you see that person again.</p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {metStudents.map((m) => <MetStudentItem key={m.peerId} met={m} />)}
          {met.map((p) => (
            <li key={p.id} className="surface flex flex-col p-6">
              <div className="flex items-center gap-4">
                <PersonPhoto photo={p.photo} org={p.org} size="lg" />
                <div className="min-w-0"><div className="font-semibold">{p.name}</div><div className="text-sm text-muted-foreground">{p.role}</div></div>
              </div>
              <ul className="mt-5 space-y-5 text-sm">
                {notesFor(p.id, j.event.notes).map((n) => <NoteItem key={n.date} personName={p.name} personId={p.id} note={n} />)}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A student she met: her note, and their card exactly as they share it. */
function MetStudentItem({ met }: { met: { peerId: string; event: string; date: string; text: string } }) {
  const [open, setOpen] = useState(false);
  const peer = goTogetherEvent.visiblePeers.find((p) => p.id === met.peerId);
  if (!peer) return null;
  const when = new Date(`${met.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return (
    <li className="surface flex flex-col p-6">
      <div className="flex items-center gap-4">
        <PersonPhoto photo={peer.photo} org={peer.org} size="lg" />
        <div className="min-w-0"><div className="font-semibold">{peer.name}</div><div className="text-sm text-muted-foreground">{peer.standing}, {peer.major} · Bayview</div></div>
      </div>
      <div className="mt-5 text-sm">
        <div className="text-xs text-muted-foreground">{met.event} · {when}</div>
        <p className="mt-1.5 flex items-start gap-2"><Pencil className="mt-1 size-3.5 shrink-0 text-muted-foreground" aria-label="Your note" />{met.text}</p>
      </div>
      <div className="mt-auto pt-5"><Button size="sm" variant="outline" onClick={() => setOpen(true)}><IdCard className="size-4" aria-hidden="true" />See {callName(peer.name)}'s card</Button></div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto bg-card sm:max-w-md">
          <DialogHeader><DialogTitle>{peer.name}'s card</DialogTitle><DialogDescription>Only what {callName(peer.name)} chose to share. Click the card to flip it.</DialogDescription></DialogHeader>
          <PeerPathCard peer={peer} />
        </DialogContent>
      </Dialog>
    </li>
  );
}

/** One note: when and where, what she wrote, and her to-do with a way to do it. */
function NoteItem({ personName, personId, note: n }: { personName: string; personId: string; note: { event: string; date: string; text: string; promise?: string | undefined } }) {
  const j = useJourney();
  const [drafting, setDrafting] = useState(false);
  const id = promiseId({ personId, date: n.date });
  const done = j.event.promises.some((x) => x.id === id && x.done);
  const email = n.promise ? promiseEmail(personName, n.event, n.promise, student.name) : null;
  const [body, setBody] = useState(email?.body ?? "");
  const when = new Date(`${n.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const copy = async () => {
    try { await navigator.clipboard.writeText(body); toast("Copied", { description: "Paste it into your email. Nothing was sent." }); } catch { toast("Copy isn't available here. Select the text instead."); }
  };
  return (
    <li>
      <div className="text-xs text-muted-foreground">{n.event} · {when}</div>
      {n.text && <p className="mt-1.5 flex items-start gap-2"><Pencil className="mt-1 size-3.5 shrink-0 text-muted-foreground" aria-label="Your note" />{n.text}</p>}
      {n.promise && (
        <div className={cn("mt-3 rounded-2xl px-4 py-3", done ? "bg-muted" : "bg-warning-soft")}>
          <div className="text-xs text-muted-foreground">{done ? "Done" : "You said you'd"}</div>
          <p className={cn("mt-0.5 font-medium", done && "text-muted-foreground line-through")}>{lowerFirst(n.promise)}</p>
          {!done && (
            <div className="mt-3 flex flex-wrap gap-2">
              {email && <Button size="sm" className="bg-card text-foreground hover:bg-card/80" variant="outline" onClick={() => setDrafting(true)}><Mail className="size-4" aria-hidden="true" />Draft the email</Button>}
              <Button size="sm" variant="ghost" onClick={() => { j.finishPromise(id, n.promise!, personId); toast("Marked done", { action: { label: "Undo", onClick: () => j.reopenPromise(id) } }); }}><Check className="size-4" aria-hidden="true" />Mark done</Button>
            </div>
          )}
        </div>
      )}
      {email && (
        <Dialog open={drafting} onOpenChange={setDrafting}>
          <DialogContent className="max-w-[calc(100vw-2rem)] bg-card sm:max-w-lg">
            <DialogHeader><DialogTitle>Email to {callName(personName)}</DialogTitle><DialogDescription>Sprout drafted this from your note. Edit it, then send it yourself. Nothing is sent for you.</DialogDescription></DialogHeader>
            <div className="text-sm"><span className="text-muted-foreground">Subject: </span>{email.subject}</div>
            <Textarea aria-label="Email draft" value={body} onChange={(e) => setBody(e.target.value)} rows={9} />
            <div className="flex flex-wrap gap-2">
              <Button asChild><a href={`mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(body)}`}><Mail className="size-4" aria-hidden="true" />Open in my email</a></Button>
              <Button variant="outline" onClick={() => void copy()}><Copy className="size-4" aria-hidden="true" />Copy</Button>
              <Button variant="ghost" className="ml-auto" onClick={() => { j.finishPromise(id, n.promise!, personId); setDrafting(false); toast("Marked done"); }}>I sent it</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </li>
  );
}

/** Friend requests she got (accept or not now), the ones she sent (still waiting), and her friends. Friends need both people to say yes. */
function FriendRequests() {
  const j = useJourney();
  const known = useKnown();
  const [card, setCard] = useState<EventPeer | null>(null);
  const everyone = goTogetherEvent.visiblePeers;
  const find = (ids: string[]) => ids.map((id) => everyone.find((p) => p.id === id)).filter((p): p is EventPeer => !!p);
  const incoming = find(j.friendIncoming);
  const sent = find(j.friendSent);
  const friends = find(j.friends);
  if (!incoming.length && !sent.length && !friends.length) return null;
  return (
    <section aria-labelledby="friends-title">
      <h2 id="friends-title" className="text-xl font-semibold">Friends</h2>
      <p className="mt-1 text-sm text-muted-foreground">Friends show first when you look at who's going. You're friends once you both say yes.</p>
      {incoming.length > 0 && (
        <>
          <h3 className="mt-5 text-sm font-semibold">Friend requests · {incoming.length}</h3>
          <ul className="surface mt-2 divide-y overflow-hidden">
            {incoming.map((p) => {
              const tie = tieWith(p, known, everyone);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5">
                  <button type="button" onClick={() => setCard(p)} aria-label={`See ${callName(p.name)}'s card`} className="shrink-0 rounded-full"><PersonPhoto photo={p.photo} org={p.org} size="md" /></button>
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-baseline gap-x-2"><span className="font-semibold">{p.name}</span><span className="text-sm text-muted-foreground">{p.standing} · {p.major}</span></div>
                    <p className="text-xs text-muted-foreground">Wants to be friends{tie ? ` · ${tie.text}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setCard(p)}><IdCard className="size-4" aria-hidden="true" />See card</Button>
                    <Button size="sm" variant="outline" onClick={() => j.answerFriend(p.id, false)}>Not now</Button>
                    <Button size="sm" onClick={() => { j.answerFriend(p.id, true); toast(`You and ${callName(p.name)} are friends`); }}><UserPlus className="size-4" aria-hidden="true" />Accept</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {(sent.length > 0 || friends.length > 0) && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {friends.map((p) => <FriendChip key={p.id} peer={p} label="Friend" onCard={() => setCard(p)} />)}
          {sent.map((p) => <FriendChip key={p.id} peer={p} label="Request sent" onCard={() => setCard(p)} />)}
        </ul>
      )}
      <Dialog open={!!card} onOpenChange={(o) => !o && setCard(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto bg-card sm:max-w-md">
          {card && <><DialogHeader><DialogTitle>{card.name}'s card</DialogTitle><DialogDescription>Only what {callName(card.name)} chose to share. Click the card to flip it.</DialogDescription></DialogHeader><PeerPathCard peer={card} /><FriendButton peer={card} /></>}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function FriendChip({ peer: p, label, onCard }: { peer: EventPeer; label: string; onCard: () => void }) {
  return (
    <li>
      <button type="button" onClick={onCard} className="friend-chip flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm">
        <PersonPhoto photo={p.photo} org={p.org} size="sm" />
        <span className="font-medium">{p.name}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </button>
    </li>
  );
}

/** Students who asked to go with you, or who you matched with: one slim row each, so ten requests still fit on a screen. Their full card opens on demand; contact comes only after you both say yes. */
function MatchCard() {
  const state = usePeerState();
  const [open, setOpen] = useState<EventPeer | null>(null);
  const shown = goTogetherEvent.visiblePeers.filter((p) => state(p) === "asked-you" || state(p) === "matched");
  if (shown.length === 0) {
    return (
      <section aria-labelledby="match-title" className="surface flex flex-wrap items-center gap-4 p-5">
        <span className="grid size-9 place-items-center rounded-xl aqua-chip"><Users className="size-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1 basis-60"><h2 id="match-title" className="font-semibold">Going together</h2><p className="text-xs text-muted-foreground">Say you're going to an event to see who else is going and pick who to go with.</p></div>
        <Button asChild size="sm" variant="outline"><Link to="/explore" search={{ open: goTogetherEvent.id }}>See who's going to {goTogetherEvent.name}</Link></Button>
      </section>
    );
  }
  const asking = shown.filter((p) => state(p) === "asked-you").length;
  return (
    <section aria-labelledby="match-title">
      <h2 id="match-title" className="text-xl font-semibold">Going together</h2>
      <p className="mt-1 text-sm text-muted-foreground">{asking > 0 ? `${asking} ${asking === 1 ? "student wants" : "students want"} to go with you. ` : ""}You only see each other's school email after you both say yes. Not now doesn't tell them.</p>
      <ul className="surface mt-5 divide-y overflow-hidden">
        {shown.map((p) => <MatchRow key={p.id} peer={p} onCard={() => setOpen(p)} />)}
      </ul>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto bg-card sm:max-w-md">
          {open && <><DialogHeader><DialogTitle>{open.name}'s card</DialogTitle><DialogDescription>Only what {callName(open.name)} chose to share. Click the card to flip it.</DialogDescription></DialogHeader><PeerPathCard peer={open} /></>}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function MatchRow({ peer: p, onCard }: { peer: EventPeer; onCard: () => void }) {
  const j = useJourney();
  const matched = usePeerState()(p) === "matched";
  const name = callName(p.name);
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
      <button type="button" onClick={onCard} aria-label={`See ${name}'s card`} className="shrink-0 rounded-full"><PersonPhoto photo={p.photo} org={p.org} size="lg" /></button>
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-baseline gap-x-2"><span className="font-semibold">{p.name}</span><span className="text-sm text-muted-foreground">{p.standing} · {p.major}</span></div>
        <p className="mt-0.5 text-sm">{matched ? <span className="inline-flex items-center gap-1 font-medium text-mark-yes"><Check className="size-3.5" aria-hidden="true" />Going together</span> : "Wants to go with you"} · {goTogetherEvent.name}, {goTogetherEvent.when}</p>
        {p.message && !matched ? <p className="who-note mt-2 max-w-2xl">{p.message}</p> : <p className="mt-0.5 text-xs text-muted-foreground">{p.why}.</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onCard}><IdCard className="size-4" aria-hidden="true" />See card</Button>
        {matched
          ? <Button asChild size="sm"><a href={contactHref(p)}><Mail className="size-4" aria-hidden="true" />Contact {name}</a></Button>
          : <><Button size="sm" variant="outline" onClick={() => j.notNow(p.id)}>Not now</Button><Button size="sm" onClick={() => j.askToGo(p.id)}>Let's go together</Button></>}
      </div>
    </li>
  );
}
