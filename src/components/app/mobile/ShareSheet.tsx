import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import * as D from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronDown, IdCard, Info, MapPin, ScanLine, Smartphone, X } from "lucide-react";
import { goTogetherEvent, opportunities, type EventPeer } from "@/data/scenario";
import { useJourney } from "@/lib/journey";
import { calm } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PathCardStudio, PeerPathCard, TIERS, type Tier } from "@/components/app/PathCard";
import { FriendButton, PeerSummary, crowd, useKnown } from "@/components/app/WhoGoing";
import { tieWith } from "@/lib/going";
import { EventMark } from "@/components/app/ItemMark";
import { Spot } from "@/components/app/Illustrations";
import { Textarea } from "@/components/ui/textarea";
import { PersonPhoto } from "@/components/app/PersonPhoto";
import { Button } from "@/components/ui/button";
import { cardLink, eventNow, toAtEvent, upcomingSaved, type AtEvent } from "./atEvent";
import { FollowUpComposer, useCardSkills } from "./FollowUp";
import { QrCode } from "./QrCode";
import "@/styles/mobile.css";

/** The card link's handle: her first name and last initial, as her card shows it. */
export const CARD_HANDLE = "maya-t";

type Step = { kind: "share" } | { kind: "find"; how: "scan" | "tap" } | { kind: "met"; peerId: string } | { kind: "follow"; peerId: string; eventId: string };

const iconBtn = "grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground";
const pill = (on: boolean) => cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors", on ? "glass-active font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground");
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
        <span className="card-fab glass-active" aria-hidden="true"><IdCard className="size-6" /></span>
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
          className="share-sheet brand-app app-canvas"
          aria-describedby={undefined}
          style={swipe.dy ? { transform: `translateY(${swipe.dy}px)`, transition: "none" } : undefined}
          onCloseAutoFocus={(e) => { if (returnFocus?.current) { e.preventDefault(); returnFocus.current.focus(); } }}
        >
          <div className="share-top" {...swipe.handlers}>
            <div className="share-grab" aria-hidden="true"><span /></div>
            <div className="glass relative mx-3 mb-2 flex items-center gap-1 rounded-full p-1">
              {step.kind !== "share" ? (
                <button type="button" onClick={() => setStep(back)} className={iconBtn} aria-label="Back"><ArrowLeft className="size-4" aria-hidden="true" /></button>
              ) : <span className="size-11 shrink-0" aria-hidden="true" />}
              <D.Title className="min-w-0 flex-1 truncate text-center text-sm font-semibold">{title}</D.Title>
              <D.Close className={iconBtn} aria-label="Close"><X className="size-4" aria-hidden="true" /></D.Close>
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
          <button type="button" onClick={() => setPicking((v) => !v)} aria-expanded={picking} className={cn(pill(!!at), "max-w-full bg-card/70", !at && "shadow-soft")}>
            <span className="grid size-6 shrink-0 place-items-center rounded-full aqua-chip"><MapPin className="size-3.5" aria-hidden="true" /></span>
            <span className="truncate">{at ? `At ${at.name} · ${at.when}` : "Not at an event"}</span>
            <ChevronDown className={cn("size-4 shrink-0 transition-transform", picking && "rotate-180")} aria-hidden="true" />
          </button>
          {picking && (
            <ul className="surface w-full space-y-0.5 p-3" aria-label={upcoming.length ? "Your upcoming events" : "Upcoming events"}>
              {choices.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => { onPick(e.id); setPicking(false); }} aria-pressed={at?.id === e.id} className={cn("flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors", at?.id === e.id ? "glass-picked" : "hover:bg-foreground/[0.03]")}>
                    <EventMark photo={e.photo} className="size-12" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-muted-foreground tabular-nums">{e.when}</span>
                      <span className="block truncate font-semibold leading-snug">{e.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{e.host}</span>
                    </span>
                    {at?.id === e.id && <Check className="size-4 shrink-0" aria-hidden="true" />}
                  </button>
                </li>
              ))}
              {at && <li><button type="button" onClick={() => { onPick(null); setPicking(false); }} className="flex min-h-11 w-full items-center rounded-2xl px-3 text-left text-sm text-muted-foreground hover:bg-foreground/[0.03]">Not at an event</button></li>}
            </ul>
          )}
        </div>

        <figure className="share-qr shadow-soft">
          <QrCode value={cardLink(CARD_HANDLE)} label="QR code that opens your card" />
          <figcaption className="pt-1 pb-0.5 text-center text-xs text-muted-foreground">Scan to see my card · demo link</figcaption>
        </figure>

        <div className="share-card"><PathCardStudio skills={skills} editing={false} /></div>

        <label className="surface flex items-center justify-between gap-3 py-1.5 pr-2 pl-5">
          <span className="text-sm text-muted-foreground">Who sees it</span>
          <select value={j.cardSeenBy} onChange={(e) => j.setCardSeenBy(e.target.value as Tier)} className="min-h-11 min-w-0 max-w-[62%] truncate rounded-full bg-transparent px-3 text-right text-sm font-medium hover:bg-foreground/5">
            {TIERS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        <MetList onFollow={onFollow} />
      </div>
      <div className="share-foot">
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-11" disabled={!at} onClick={() => onFind("scan")}><ScanLine className="size-4" aria-hidden="true" />Scan a card</Button>
          <Button variant="outline" className="h-11" disabled={!at} onClick={() => onFind("tap")}><Smartphone className="size-4" aria-hidden="true" />Tap phones</Button>
        </div>
        {!at && <p className="mt-2 text-center text-xs text-muted-foreground">Pick the event you're at first.</p>}
      </div>
    </>
  );
}

/** People she met with this sheet, newest first: follow up, or see that she already did. Rows like Friends on Explore → People. */
function MetList({ onFollow }: { onFollow: (peerId: string, eventId: string) => void }) {
  const j = useJourney();
  const met = [...j.metAt].reverse();
  if (!met.length) return null;
  return (
    <section aria-labelledby="share-met">
      <h3 id="share-met" className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">Follow up</h3>
      <ul className="surface divide-y overflow-hidden">
        {met.map((m) => {
          const p = peerById(m.peerId);
          const ev = atEventById(m.eventId);
          if (!p) return null;
          return (
            <li key={`${m.peerId}-${m.eventId}`} className="flex items-center gap-3 px-4 py-3">
              <PersonPhoto photo={p.photo} org={p.org} size="sm" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.name}</span><span className="block truncate text-xs text-muted-foreground">{ev?.name ?? "An event"}</span></span>
              {m.followedUp
                ? <span className="aqua-chip rounded-full px-2 py-px text-[11px] font-semibold text-foreground">Followed up</span>
                : <Button size="sm" variant="outline" className="h-11 px-4" onClick={() => onFollow(m.peerId, m.eventId)}>Follow up</Button>}
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
  const known = useKnown();
  const [ready, setReady] = useState(how === "scan" || calm());
  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setReady(true), 1400);
    return () => window.clearTimeout(t);
  }, [ready]);
  const peers = crowd(at.id).peers;
  return (
    <div className="share-body space-y-4">
      <div className="share-frame glass glass-tinted" aria-hidden="true">
        <span className="share-corners" />
        {how === "scan" ? <span className="share-scanline" /> : <><span className="share-ripple" /><Spot name="bridge" className="relative w-28" /></>}
      </div>
      <p className="notice flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"><Info className="size-4 shrink-0" aria-hidden="true" />{how === "scan" ? "Demo: the camera stays off. Pick who you just met." : "Demo: phones can't tap on the web. Hold them together, then pick who you met."}</p>
      {ready ? (
        <section aria-labelledby="share-nearby">
          <h3 id="share-nearby" className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">Nearby at {at.name}</h3>
          <ul className="who-list">
            {peers.map((p) => {
              const met = j.metAt.some((m) => m.peerId === p.id && m.eventId === at.id);
              return (
                <li key={p.id} className="who-row">
                  <button type="button" onClick={() => onPick(p)} className="who-row-head">
                    <PersonPhoto photo={p.photo} size="md" />
                    <PeerSummary peer={p} tie={tieWith(p, known, goTogetherEvent.visiblePeers)} />
                    {met && <span className="aqua-chip shrink-0 self-start rounded-full px-2 py-px text-[11px] font-semibold text-foreground">Met</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : <p role="status" className="text-center text-sm text-muted-foreground">Hold your phones together…</p>}
    </div>
  );
}

/** Connected: their card as they share it, Add friend, and a private note in her words. Laid out like an opened card on People. */
function MetStep({ peer, at, onFollow, onDone }: { peer: EventPeer; at: AtEvent; onFollow: () => void; onDone: () => void }) {
  const j = useJourney();
  const met = j.metAt.find((m) => m.peerId === peer.id && m.eventId === at.id);
  const [note, setNote] = useState(met?.note ?? "");
  const save = (text: string) => { setNote(text); j.setMeetNote(peer.id, at.id, text); };
  return (
    <>
      <div className="share-body">
        <div className="who-card mx-auto max-w-[340px] px-0">
          <PeerPathCard peer={peer} />
          <FriendButton peer={peer} />
          <label className="mt-2 block space-y-1.5">
            <span className="flex items-baseline justify-between px-1 text-sm font-medium">What we talked about<span className="text-xs font-normal text-muted-foreground">Only you see this.</span></span>
            <Textarea rows={3} className="bg-card" value={note} onChange={(e) => save(e.target.value)} placeholder="A few words so you remember" />
          </label>
          <button type="button" className="who-more justify-self-center py-2" onClick={() => { j.forgetMeet(peer.id, at.id); toast(`Removed ${first(peer)} from people you met`); onDone(); }}>Didn't meet {first(peer)}? Remove</button>
        </div>
      </div>
      <div className="share-foot grid grid-cols-[1fr_auto] gap-2">
        <Button className="h-11" onClick={onFollow}>Write a follow-up</Button>
        <Button variant="outline" className="h-11 px-5" onClick={onDone}>Done</Button>
      </div>
    </>
  );
}
