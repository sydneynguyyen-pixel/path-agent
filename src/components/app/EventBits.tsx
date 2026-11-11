import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Check, Plus } from "lucide-react";
import { experiences, eventPlatforms, type EventPlatform } from "@/data/scenario";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { clashes, fromAccounts, timeline, type Found } from "@/lib/experiences";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PostingLink } from "@/components/app/PostingLink";
import { AgentAvatar } from "@/components/app/Brand";
import { Ink } from "@/components/app/Ink";
import { photoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";
import { symposiumEvent } from "@/data/event";
import lumaLogo from "@/assets/luma-logo.png";
import eventbriteLogo from "@/assets/eventbrite-logo.png";
import handshakeLogo from "@/assets/handshake-logo.png";

export const PERSONAL: EventPlatform[] = ["luma", "eventbrite"];
export const PROOF_LINE = { "checked-in": "Checked in", ticket: "Ticket", rsvp: "RSVP" } as const;

export function useFound() {
  const j = useJourney();
  return useMemo(() => fromAccounts(experiences, [...j.eventAccounts, ...(j.access.handshake ? (["handshake"] as const) : [])]), [j.eventAccounts, j.access.handshake]);
}

const LOGOS: Record<EventPlatform, string> = { luma: lumaLogo, eventbrite: eventbriteLogo, handshake: handshakeLogo };

export function PlatformMark({ platform, className }: { platform: EventPlatform; className?: string }) {
  return <img src={LOGOS[platform]} alt="" aria-hidden="true" className={cn("size-10 shrink-0 rounded-xl border object-cover", className)} />;
}

export function Accounts({ onConnect }: { onConnect: (p: EventPlatform) => void }) {
  const j = useJourney();
  const count = (p: EventPlatform) => experiences.filter((e) => e.foundOn.some((f) => f.platform === p)).length;
  return (
    <section aria-label="Event accounts" className="grid gap-3 sm:grid-cols-3">
      {PERSONAL.map((p) => {
        const on = j.eventAccounts.includes(p);
        return (
          <div key={p} className="surface flex flex-col items-start gap-3 p-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <PlatformMark platform={p} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium">{eventPlatforms[p].name}{on && <Check className="size-3.5 text-mark-yes" aria-label="Connected" />}</div>
                <div className="text-xs text-muted-foreground">{on ? `${count(p)} events · read only` : eventPlatforms[p].what}</div>
              </div>
            </div>
            {on ? (
              <Button variant="ghost" size="sm" className="-ml-2 h-7 text-xs text-muted-foreground" onClick={() => j.unlinkEventAccount(p, eventPlatforms[p].name)}>Disconnect</Button>
            ) : (
              <Button variant="outline" size="sm" className="h-7" onClick={() => onConnect(p)}><Plus className="size-3.5" />Connect</Button>
            )}
          </div>
        );
      })}
      <div className="surface flex flex-col items-start gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <PlatformMark platform="handshake" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium">Handshake{j.access.handshake && <Check className="size-3.5 text-mark-yes" aria-label="Connected" />}</div>
            <div className="text-xs text-muted-foreground">{j.access.handshake ? `Through Bayview · ${count("handshake")} events` : "Off in your sources"}</div>
          </div>
        </div>
        {!j.access.handshake && <Button variant="outline" size="sm" className="h-7" asChild><Link to="/sources">Turn on in sources</Link></Button>}
      </div>
    </section>
  );
}

type Step = "ask" | "signing" | "reading";

export function ConnectDialog({ platform, onClose }: { platform: EventPlatform | null; onClose: () => void }) {
  const j = useJourney();
  const [step, setStep] = useState<Step>("ask");
  const info = platform ? eventPlatforms[platform] : null;
  const found = platform ? experiences.filter((e) => e.foundOn.some((f) => f.platform === platform)).length : 0;

  useEffect(() => {
    if (!platform || step === "ask") return;
    const t = setTimeout(() => {
      if (step === "signing") return setStep("reading");
      j.linkEventAccount(platform, eventPlatforms[platform].name, found);
      toast(`Found ${found} events on ${eventPlatforms[platform].name}`);
      onClose();
    }, step === "signing" ? 1100 : 1400);
    return () => clearTimeout(t);
  }, [platform, step, found, j, onClose]);

  useEffect(() => { if (platform) setStep("ask"); }, [platform]);

  return (
    <Dialog open={!!platform} onOpenChange={(v) => { if (!v && step === "ask") onClose(); }}>
      <DialogContent className="brand-app sm:max-w-md">
        {platform && info && (
          <>
            <div className="flex items-center gap-3"><PlatformMark platform={platform} /><DialogTitle>Connect {info.name}</DialogTitle></div>
            <DialogDescription>You sign in on {info.signIn}, so Path Agent never sees your password.</DialogDescription>
            {step === "ask" ? (
              <>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-secondary p-3"><div className="mb-1.5 text-xs font-medium text-muted-foreground">Path Agent can read</div><ul className="space-y-1"><li>Events you registered for</li><li>Check-ins, if the host scans you</li><li>Event descriptions</li></ul></div>
                  <div className="rounded-xl bg-secondary p-3"><div className="mb-1.5 text-xs font-medium text-muted-foreground">It can't</div><ul className="space-y-1"><li>Register or RSVP for you</li><li>Message hosts or guests</li><li>See payments</li></ul></div>
                </div>
                <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Not now</Button><Button onClick={() => setStep("signing")}>Continue to {info.signIn}</Button></div>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-secondary p-4 text-sm" role="status">
                <Ink className="size-5" />
                <span key={step} className="swap-enter">{step === "signing" ? `Waiting for you to sign in on ${info.signIn}…` : `Reading your ${info.name} events…`}</span>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DateBlock({ date, className }: { date: string; className?: string }) {
  const d = new Date(`${date}T12:00:00Z`);
  return (
    <div className={cn("grid w-12 shrink-0 place-items-center rounded-xl border bg-card py-1.5 text-center leading-none", className)}>
      <span className="text-[10px] font-medium uppercase text-muted-foreground">{d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}</span>
      <span className="mt-1 text-lg font-semibold">{d.getUTCDate()}</span>
    </div>
  );
}

export function Via({ e }: { e: Found }) {
  return <span>{e.via.map((p) => eventPlatforms[p].name).join(" and ")}</span>;
}

/** Events the student's accounts show are still ahead. */
/** compact: one dated list with no photos, for a side column. */
export function ComingUp({ compact = false }: { compact?: boolean }) {
  const j = useJourney();
  const found = useFound();
  const { upcoming } = timeline(found, SCRIPT_TODAY);
  const clash = clashes(upcoming);
  if (upcoming.length === 0) return null;
  return (
    <section className={compact ? "" : "mt-10"}>
      <div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="font-semibold">Coming up{compact && <span className="font-normal text-muted-foreground"> · {upcoming.length}</span>}</h2><Link to="/explore" search={{ calendar: true }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">All events <ArrowRight className="size-3" aria-hidden="true" /></Link></div>
      {compact ? (
        <ol className="surface stagger divide-y px-4">
          {upcoming.map((e) => (
            <li key={e.id} className="flex gap-3 py-4">
              <DateBlock date={e.date} className="shrink-0 self-start" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <h3 className="text-sm font-medium leading-snug">{e.title}</h3>
                <p className="text-xs text-muted-foreground">{e.host} · {e.time} · {e.place}</p>
                {e.id === symposiumEvent.id && <Button asChild size="sm" className="w-fit"><Link to="/event">Your plan for {symposiumEvent.day} <ArrowRight className="size-3.5" /></Link></Button>}
                {e.prep && <p className="flex items-start gap-2 text-xs"><AgentAvatar agent="planner" className="size-5 shrink-0" />{e.prep}</p>}
                {clash[e.id] && <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-1.5 text-xs"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />Overlaps with {clash[e.id]!.title} at {clash[e.id]!.time}.</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <PostingLink item={e} />
                  {e.opportunityId && <button type="button" onClick={() => j.openOpportunity(e.opportunityId!)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">See details <ArrowRight className="size-3" /></button>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
      <div className="stagger grid gap-3 sm:grid-cols-2">
        {upcoming.map((e) => (
          <article key={e.id} className="surface flex flex-col overflow-hidden">
            <div className="relative h-36 shrink-0">
              <img src={photoUrl(e.photo, 640)} alt="" loading="lazy" className="size-full object-cover" />
              <DateBlock date={e.date} className="absolute left-4 top-4 shadow-soft" />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="min-w-0">
                <h3 className="font-medium leading-snug">{e.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{e.host} · {e.time} · {e.place}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{PROOF_LINE[e.proof]} on <Via e={e} /></p>
              </div>
              {e.id === symposiumEvent.id && <Button asChild size="sm" className="w-fit"><Link to="/event">Your plan for {symposiumEvent.day} <ArrowRight className="size-3.5" /></Link></Button>}
              {e.prep && <p className="flex items-start gap-2 text-sm"><AgentAvatar agent="planner" className="size-6 shrink-0" />{e.prep}</p>}
              {clash[e.id] && <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-xs"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />Overlaps with {clash[e.id]!.title} at {clash[e.id]!.time}. You might pick one.</p>}
              <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1">
                <PostingLink item={e} />
                {e.opportunityId && <button type="button" onClick={() => j.openOpportunity(e.opportunityId!)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">See details <ArrowRight className="size-3" /></button>}
              </div>
            </div>
          </article>
        ))}
      </div>
      )}
    </section>
  );
}
