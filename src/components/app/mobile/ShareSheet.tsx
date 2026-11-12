import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import * as D from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronDown, IdCard, MapPin, ScanLine, Smartphone, X } from "lucide-react";
import { goTogetherEvent, opportunities, type EventPeer } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { calm } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PathCardStudio, PeerPathCard, TIERS, type Tier } from "@/components/app/PathCard";
import { FriendButton, crowd } from "@/components/app/WhoGoing";
import { PersonPhoto } from "@/components/app/PersonPhoto";
import { Button } from "@/components/ui/button";
import { cardLink, eventNow, toAtEvent, upcomingSaved, type AtEvent } from "./atEvent";
import { FollowUpComposer, useCardSkills } from "./FollowUp";
import { QrCode } from "./QrCode";
import "@/styles/mobile.css";

/** The card link's handle: her first name and last initial, as her card shows it. */
export const CARD_HANDLE = "maya-t";

type Step = { kind: "share" } | { kind: "find"; how: "scan" | "tap" } | { kind: "met"; peerId: string } | { kind: "follow"; peerId: string; eventId: string };

const peerById = (id: string) => goTogetherEvent.visiblePeers.find((p) => p.id === id);
const first = (p: EventPeer) => p.name.split(" ")[0]!;
const atEventById = (id: string) => {
  const o = opportunities.find((x) => x.id === id);
  return o ? toAtEvent(o) : null;
};

/** The phone tab bar's center button and the sheet it opens. Focus comes back to the button when the sheet closes. */
export function CardTab() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={button} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label="Show my card" className="card-tab">
        <span className="card-fab glass" aria-hidden="true"><IdCard className="size-6" /></span>
        <span aria-hidden="true">Card</span>
      </button>
      <ShareSheet open={open} onOpenChange={setOpen} returnFocus={button} />
    </>
  );
}

/** Drag the top of the sheet down to close it. Follows the finger; lets go and springs back if she didn't pull far. */
function useSwipeDown(onClose: () => void) {
  const start = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  return {
    dy,
    handlers: {
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest("button,select,a")) return;
        start.current = e.clientY;
        e.currentTarget.setPointerCapture?.(e.pointerId);
      },
      onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
        if (start.current !== null) setDy(Math.max(0, e.clientY - start.current));
      },
      onPointerUp: () => {
        if (start.current === null) return;
        start.current = null;
        if (dy > 110) onClose();
        setDy(0);
      },
      onPointerCancel: () => { start.current = null; setDy(0); },
    },
  };
}

export function ShareSheet({ open, onOpenChange, returnFocus }: { open: boolean; onOpenChange: (open: boolean) => void; returnFocus?: React.RefObject<HTMLElement | null> }) {
  const j = useJourney();
  const [step, setStep] = useState<Step>({ kind: "share" });
  // Undefined until she picks one: then the event happening now (by the scripted clock) is used.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const now = j.scriptNow();
  const auto = eventNow(opportunities, j.savedOpportunities, now);
  const at: AtEvent | null = picked === undefined ? auto : picked ? atEventById(picked) : null;
  const close = () => onOpenChange(false);
  const swipe = useSwipeDown(close);

  useEffect(() => { if (!open) setStep({ kind: "share" }); }, [open]);

  const back = step.kind === "follow" ? { kind: "met" as const, peerId: step.peerId } : { kind: "share" as const };
  const title = step.kind === "share" ? "Show my card" : step.kind === "find" ? (step.how === "scan" ? "Scan a card" : "Tap phones") : step.kind === "met" ? `You met ${first(peerById(step.peerId)!)}` : "Follow up";

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="share-overlay" />
        <D.Content
          className="share-sheet brand-app"
          aria-describedby={undefined}
          style={swipe.dy ? { transform: `translateY(${swipe.dy}px)`, transition: "none" } : undefined}
          onCloseAutoFocus={(e) => { if (returnFocus?.current) { e.preventDefault(); returnFocus.current.focus(); } }}
        >
          <div className="share-top" {...swipe.handlers}>
            <div className="share-grab" aria-hidden="true"><span /></div>
            <div className="share-head">
              {step.kind !== "share" ? (
                <button type="button" onClick={() => setStep(back)} className="share-icon-btn" aria-label="Back"><ArrowLeft className="size-5" aria-hidden="true" /></button>
              ) : <span className="size-11 shrink-0" aria-hidden="true" />}
              <D.Title className="min-w-0 flex-1 truncate text-center text-base font-semibold">{title}</D.Title>
              <D.Close className="share-icon-btn" aria-label="Close"><X className="size-5" aria-hidden="true" /></D.Close>
            </div>
          </div>

          {step.kind === "share" && <ShareStep at={at} onPick={setPicked} onFind={(how) => setStep({ kind: "find", how })} onFollow={(peerId, eventId) => setStep({ kind: "follow", peerId, eventId })} upcoming={upcomingSaved(opportunities, j.savedOpportunities, now)} />}
          {step.kind === "find" && at && <FindStep how={step.how} at={at} onPick={(p) => { j.meet(p.id, at.id); setStep({ kind: "met", peerId: p.id }); }} />}
          {step.kind === "met" && at && <MetStep peer={peerById(step.peerId)!} at={at} onFollow={() => setStep({ kind: "follow", peerId: step.peerId, eventId: at.id })} onDone={() => setStep({ kind: "share" })} />}
          {step.kind === "follow" && (
            <div className="share-body">
              <FollowUpComposer peer={peerById(step.peerId)!} eventId={step.eventId} onDone={() => setStep({ kind: "share" })} />
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Her card and its QR code, which event she's at, who can see it, and the two ways to connect. */
function ShareStep({ at, upcoming, onPick, onFind, onFollow }: { at: AtEvent | null; upcoming: AtEvent[]; onPick: (id: string | null) => void; onFind: (how: "scan" | "tap") => void; onFollow: (peerId: string, eventId: string) => void }) {
  const j = useJourney();
  const skills = useCardSkills();
  const [picking, setPicking] = useState(false);
  const choices = upcoming.length ? upcoming : opportunities.map(toAtEvent).filter((e): e is AtEvent => !!e);
  return (
    <>
      <div className="share-body space-y-5">
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={() => setPicking((v) => !v)} aria-expanded={picking} className={cn("share-chip", at && "aqua-chip")}>
            <MapPin className="size-4" aria-hidden="true" />
            {at ? <span>At {at.name} · {at.when}</span> : <span>Not at an event</span>}
            <ChevronDown className={cn("size-4 transition-transform", picking && "rotate-180")} aria-hidden="true" />
          </button>
          {picking && (
            <ul className="w-full space-y-1.5" aria-label={upcoming.length ? "Your upcoming events" : "Upcoming events"}>
              {choices.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => { onPick(e.id); setPicking(false); }} aria-pressed={at?.id === e.id} className={cn("share-row", at?.id === e.id && "glass-picked")}>
                    <span className="min-w-0 flex-1 text-left"><span className="block font-medium">{e.name}</span><span className="block text-xs text-muted-foreground">{e.when}</span></span>
                    {at?.id === e.id && <Check className="size-4" aria-hidden="true" />}
                  </button>
                </li>
              ))}
              {at && <li><button type="button" onClick={() => { onPick(null); setPicking(false); }} className="share-row text-muted-foreground">Not at an event</button></li>}
            </ul>
          )}
        </div>

        <figure className="share-qr">
          <QrCode value={cardLink(CARD_HANDLE)} label="QR code that opens your card" />
          <figcaption className="pt-1 pb-0.5 text-center text-xs text-[#5b6676]">Scan to see my card · demo link</figcaption>
        </figure>

        <div className="share-card"><PathCardStudio skills={skills} editing={false} /></div>

        <label className="share-line">
          <span className="text-sm text-muted-foreground">Who sees it</span>
          <select value={j.cardSeenBy} onChange={(e) => j.setCardSeenBy(e.target.value as Tier)} className="share-select">
            {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        <MetList onFollow={onFollow} />
      </div>
      <div className="share-foot">
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-12 text-base" disabled={!at} onClick={() => onFind("scan")}><ScanLine className="size-5" aria-hidden="true" />Scan a card</Button>
          <Button variant="outline" className="h-12 text-base" disabled={!at} onClick={() => onFind("tap")}><Smartphone className="size-5" aria-hidden="true" />Tap phones</Button>
        </div>
        {!at && <p className="mt-2 text-center text-xs text-muted-foreground">Pick the event you're at first.</p>}
      </div>
    </>
  );
}

/** People she met with this sheet, newest first: follow up, or see that she already did. */
function MetList({ onFollow }: { onFollow: (peerId: string, eventId: string) => void }) {
  const j = useJourney();
  const met = [...j.metAt].reverse();
  if (!met.length) return null;
  return (
    <section aria-labelledby="share-met">
      <h3 id="share-met" className="mb-2 px-1 text-xs font-medium text-muted-foreground">Follow up</h3>
      <ul className="space-y-1.5">
        {met.map((m) => {
          const p = peerById(m.peerId);
          const ev = atEventById(m.eventId);
          if (!p) return null;
          return (
            <li key={`${m.peerId}-${m.eventId}`} className="flex items-center gap-3 rounded-[14px] bg-card px-3 py-2">
              <PersonPhoto photo={p.photo} size="sm" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{p.name}</span><span className="block truncate text-xs text-muted-foreground">{ev?.name ?? "An event"}</span></span>
              {m.followedUp
                ? <span className="aqua-chip rounded-full px-2.5 py-1 text-[11px] font-medium">Followed up</span>
                : <Button size="sm" variant="outline" className="h-10 px-4" onClick={() => onFollow(m.peerId, m.eventId)}>Follow up</Button>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Scan or tap, honestly: neither works on the web, so it says so in one line and lists who's going so she can pick who she just met. */
function FindStep({ how, at, onPick }: { how: "scan" | "tap"; at: AtEvent; onPick: (p: EventPeer) => void }) {
  const j = useJourney();
  const [ready, setReady] = useState(how === "scan" || calm());
  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setReady(true), 1400);
    return () => window.clearTimeout(t);
  }, [ready]);
  const peers = crowd(at.id).peers;
  return (
    <div className="share-body space-y-4">
      {how === "scan" ? (
        <div className="share-viewfinder" aria-hidden="true"><span className="share-corners" /><span className="share-scanline" /></div>
      ) : (
        <div className="share-phones" aria-hidden="true"><span className="share-phone share-phone-a" /><span className="share-phone share-phone-b" /><span className="share-ripple" /></div>
      )}
      <p className="text-center text-xs text-muted-foreground">{how === "scan" ? "Demo: the camera stays off. Pick who you just met." : "Demo: phones can't tap on the web. Hold them together, then pick who you met."}</p>
      {ready ? (
        <section aria-labelledby="share-nearby">
          <h3 id="share-nearby" className="mb-2 px-1 text-xs font-medium text-muted-foreground">Nearby at {at.name}</h3>
          <ul className="space-y-1.5">
            {peers.map((p) => {
              const met = j.metAt.some((m) => m.peerId === p.id && m.eventId === at.id);
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => onPick(p)} className="share-row">
                    <PersonPhoto photo={p.photo} size="md" />
                    <span className="min-w-0 flex-1 text-left"><span className="block truncate font-medium">{p.name}</span><span className="block truncate text-xs text-muted-foreground">{p.standing} · {p.major}</span></span>
                    {met && <span className="aqua-chip rounded-full px-2.5 py-1 text-[11px] font-medium">Met</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : <p role="status" className="text-center text-sm">Hold your phones together…</p>}
    </div>
  );
}

/** Connected: their card as they share it, Add friend, and a private note in her words. */
function MetStep({ peer, at, onFollow, onDone }: { peer: EventPeer; at: AtEvent; onFollow: () => void; onDone: () => void }) {
  const j = useJourney();
  const met = j.metAt.find((m) => m.peerId === peer.id && m.eventId === at.id);
  const [note, setNote] = useState(met?.note ?? "");
  const save = (text: string) => { setNote(text); j.setMeetNote(peer.id, at.id, text); };
  return (
    <>
      <div className="share-body space-y-4">
        <div className="share-card"><PeerPathCard peer={peer} /></div>
        <FriendButton peer={peer} className="h-12" />
        <Field label="What we talked about" hint="Only you see this.">
          <textarea className="share-input min-h-24" value={note} onChange={(e) => save(e.target.value)} placeholder="A few words so you remember" />
        </Field>
        <button type="button" className="w-full py-2 text-center text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => { j.forgetMeet(peer.id, at.id); toast(`Removed ${first(peer)} from people you met`); onDone(); }}>Didn't meet {first(peer)}? Remove</button>
      </div>
      <div className="share-foot grid grid-cols-[1fr_auto] gap-2">
        <Button className="h-12 text-base" onClick={onFollow}>Write a follow-up</Button>
        <Button variant="ghost" className="h-12 px-5" onClick={onDone}>Done</Button>
      </div>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between px-1 text-sm font-medium">{label}{hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}</span>
      {children}
    </label>
  );
}
