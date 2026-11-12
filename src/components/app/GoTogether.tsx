import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Clock, Mail, Users } from "lucide-react";
import { goTogetherEvent, student, type EventPeer } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { helloDraft, matchState, whoIsGoing } from "@/lib/opportunities";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PeerMiniCard, PeerPathCard } from "@/components/app/PathCard";

const first = (p: EventPeer) => p.name.split(" ")[0]!;

/** Where each person stands with you, from the journey. */
export function usePeerState() {
  const g = useJourney().goTogether;
  return (p: EventPeer) => (g.showMe || g.matched.includes(p.id) ? matchState(p.id, g, goTogetherEvent.asksYou) : "none");
}

/** The email opens in the student's own mail app. Nothing is sent for them. */
export function contactHref(p: EventPeer) {
  return `mailto:${p.email}?subject=${encodeURIComponent(`${goTogetherEvent.name} on Tuesday`)}&body=${encodeURIComponent(helloDraft(p.name, goTogetherEvent.shortName, student.name))}`;
}

/** The one action under a person's card: ask, answer their ask, wait, or contact once you both said yes. */
export function PeerAction({ peer, wide = false, onAsk }: { peer: EventPeer; wide?: boolean; onAsk?: () => void }) {
  const j = useJourney();
  const state = usePeerState()(peer);
  const size = wide ? "default" : "sm";
  if (state === "matched") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-mark-yes"><Check className="size-3.5" aria-hidden="true" />You're going together</div>
        <Button asChild size={size} className="w-full"><a href={contactHref(peer)}><Mail className="size-4" aria-hidden="true" />Contact {first(peer)}</a></Button>
      </div>
    );
  }
  if (state === "asked-you") {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium">{first(peer)} wants to go with you</div>
        <div className="flex gap-2">
          <Button size={size} className="flex-1" onClick={() => j.askToGo(peer.id)}>Let's go together</Button>
          <Button size={size} variant="ghost" onClick={() => j.notNow(peer.id)}>Not now</Button>
        </div>
      </div>
    );
  }
  if (state === "you-asked") {
    return <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" aria-hidden="true" />Asked. It's a match if {first(peer)} says yes.</div>;
  }
  return <Button size={size} variant="outline" className="w-full" onClick={onAsk ?? (() => j.askToGo(peer.id))}>Ask to go together</Button>;
}

/** Who's going to the event: a count until you opt in, then the cards of students who also chose to be seen. */
export function GoTogether() {
  const j = useJourney();
  const g = j.goTogether;
  const state = usePeerState();
  const who = whoIsGoing(goTogetherEvent, g.showMe);
  const [open, setOpen] = useState<EventPeer | null>(null);
  // People who asked you come first, then everyone else in the order they opted in.
  const order = { "asked-you": 0, matched: 1, "you-asked": 2, none: 3 } as const;
  const peers = [...who.visible].sort((a, b) => order[state(a)] - order[state(b)]);
  return (
    <div className="rounded-2xl bg-secondary p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-52">
          <div className="flex items-center gap-2 text-sm font-medium"><Users className="size-4 shrink-0" aria-hidden="true" /> {who.count} Bayview students going</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {g.showMe ? "Pick who you'd like to go with. It's a match only when you both say yes, and only then do you see their email." : "Turn this on to see the cards of others who are going."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <label className="flex items-center gap-2 text-xs font-medium">
            Show me as going
            <Switch checked={g.showMe} onCheckedChange={j.setShowMeGoing} aria-label="Show me as going" />
          </label>
          <Link to="/career" search={{ tab: "card" }} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Edit your card</Link>
        </div>
      </div>

      {g.showMe && (
        <>
          <ul className="peer-row mt-4" aria-label="Students going who chose to be seen">
            {peers.map((p) => (
              <PeerMiniCard key={p.id} peer={p} onOpen={() => setOpen(p)}><PeerAction peer={p} /></PeerMiniCard>
            ))}
          </ul>
          <p className="mt-1 px-1 text-xs text-muted-foreground">
            {who.private > 0 && `${who.private} others are going privately. `}Demo only: no request or email goes out.
          </p>
        </>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-[440px] rounded-[28px]">
          {open && (
            <>
              <DialogTitle>{open.name}</DialogTitle>
              <DialogDescription>{open.why}.</DialogDescription>
              <PeerPathCard peer={open} />
              <PeerAction peer={open} wide />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
