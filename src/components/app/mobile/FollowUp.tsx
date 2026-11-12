import { useState } from "react";
import { toast } from "sonner";
import { Copy, Mail, Send } from "lucide-react";
import { goTogetherEvent, opportunities, student, type EventPeer } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { FOLLOW_UP_ASKS, followUpDraft, type FollowUpAsk } from "@/lib/followUp";
import { usePortfolioSkills } from "@/hooks/use-portfolio-skills";
import { useFound } from "@/components/app/EventBits";
import { SproutSays } from "@/components/app/Brand";
import { Button } from "@/components/ui/button";
import { eventName } from "./atEvent";

/** Skills on her card, the same list Your card offers (verified, not hidden). */
export function useCardSkills() {
  return usePortfolioSkills(useFound())
    .filter((s) => !s.hidden && !s.unsure)
    .map((s) => ({ key: s.key, name: s.name, from: s.proofs.map((p) => (p.type === "class" ? p.code : p.title)).slice(0, 2).join(" · ") }));
}

const first = (name: string) => name.split(" ")[0]!;

/**
 * The follow-up after meeting someone: Sprout's Drafter writes it from real data only, she edits it,
 * then sends it herself. Email shows only once the app already shares their school email (you both said yes).
 */
export function FollowUpComposer({ peer, eventId, onDone }: { peer: EventPeer; eventId: string; onDone?: () => void }) {
  const j = useJourney();
  const cardSkills = useCardSkills();
  const met = j.metAt.find((m) => m.peerId === peer.id && m.eventId === eventId);
  const ev = opportunities.find((o) => o.id === eventId);
  const event = ev ? eventName(ev) : goTogetherEvent.name;
  const drafter = j.agentOn.drafter;
  const [ask, setAsk] = useState<FollowUpAsk>("keep-in-touch");
  const draftFor = (a: FollowUpAsk) => followUpDraft({ to: peer.name, event, note: met?.note, herSkills: cardSkills.slice(0, 3).map((s) => s.name), theirSkills: peer.skills, ask: a, from: student.name });
  const initial = draftFor(ask);
  const [body, setBody] = useState(drafter ? initial.body : "");
  const subject = initial.subject;
  const canEmail = j.goTogether.matched.includes(peer.id);
  const name = first(peer.name);

  const pickAsk = (a: FollowUpAsk) => {
    setAsk(a);
    if (drafter) setBody(draftFor(a).body);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      j.followUpMeet(peer.id, eventId, "copy");
      toast("Copied", { description: "Paste it wherever you talk. Nothing was sent." });
      onDone?.();
    } catch {
      toast("Copy isn't available here. Select the text instead.");
    }
  };
  const send = () => {
    j.followUpMeet(peer.id, eventId, "trellis");
    toast("Demo only: no message went out.", { description: `You sent it to ${name} yourself.` });
    onDone?.();
  };

  return (
    <div className="space-y-4">
      {drafter && <SproutSays label="Drafter">From your note and both cards. Edit anything.</SproutSays>}
      <div role="radiogroup" aria-label="What to ask" className="flex flex-wrap gap-2">
        {FOLLOW_UP_ASKS.map((a) => (
          <button key={a.id} type="button" role="radio" aria-checked={ask === a.id} onClick={() => pickAsk(a.id)} className={`share-chip ${ask === a.id ? "glass-active font-medium" : ""}`}>{a.label}</button>
        ))}
      </div>
      <textarea className="share-input min-h-44" value={body} onChange={(e) => setBody(e.target.value)} aria-label={`Follow-up to ${name}`} placeholder={`Write to ${name}`} />
      <div className="grid gap-2">
        <Button className="h-12 w-full text-base" disabled={!body.trim()} onClick={send}><Send className="size-4" aria-hidden="true" />Send in Trellis</Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className={canEmail ? "h-12" : "col-span-2 h-12"} disabled={!body.trim()} onClick={() => void copy()}><Copy className="size-4" aria-hidden="true" />Copy</Button>
          {canEmail && (
            <Button asChild variant="outline" className="h-12">
              <a href={`mailto:${peer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} onClick={() => { j.followUpMeet(peer.id, eventId, "email"); onDone?.(); }}><Mail className="size-4" aria-hidden="true" />Email</a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
