import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageBanner } from "@/components/app/SeasonBanner";
import sceneOpportunities from "@/assets/scene-opportunities.jpg";
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { toast } from "sonner";
import { ArrowLeft, Bookmark, Check, Copy, MapPin, Pencil, Pin, RotateCcw, Send, Users, X } from "lucide-react";
import { symposiumEvent as ev } from "@/data/event";
import { people, type Person } from "@/data/people";
import { ledgerSkills } from "@/data/scenario";
import { callName, followUp, lowerFirst, nextCard, nextStep, promiseId, recall, toMeet, visibleClassmates, type DeckChoice } from "@/lib/event";
import { useJourney } from "@/lib/journey";
import { evidenceFor } from "@/lib/skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AgentAvatar } from "@/components/app/Brand";
import { Spot } from "@/components/app/Illustrations";
import { cn } from "@/lib/utils";

const STEPS = ["before", "during", "after"] as const;
type Step = (typeof STEPS)[number];
const STEP_LABEL: Record<Step, string> = { before: "Before", during: "At the event", after: "After" };

export const Route = createFileRoute("/event")({
  validateSearch: (s: Record<string, unknown>): { step?: Step } => (STEPS.includes(s["step"] as Step) ? { step: s["step"] as Step } : {}),
  head: () => ({
    meta: [
      { title: "Your plan for Thursday — Path Agent" },
      { name: "description", content: "Plan who to meet at the Psych Research Symposium, keep notes, and follow up in your own words." },
      { property: "og:title", content: "Your plan for Thursday — Path Agent" },
      { property: "og:description", content: "Who to meet, what to say, and a follow-up drafted from your own notes." },
    ],
  }),
  component: EventPage,
});

const byId = (id: string) => people.find((p) => p.id === id)!;

function EventPage() {
  const { step = "before" } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <>
    <PageBanner src={sceneOpportunities} position="50% 64%" />
    <div className="mx-auto max-w-md lg:max-w-6xl">
      <Link to="/semester" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Terms</Link>
      <h1 className="mt-3 text-3xl font-medium">{step === "after" ? "After the symposium" : `Your plan for ${ev.day}`}</h1>
      <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" />{ev.title} · Nov 19, {ev.time} · {ev.place}</p>
      <div role="tablist" aria-label="When" className="segmented mt-5 grid grid-cols-3 gap-1 rounded-full bg-secondary p-1 lg:max-w-md">
        {STEPS.map((s) => (
          <button key={s} role="tab" aria-selected={step === s} onClick={() => navigate({ to: "/event", search: s === "before" ? {} : { step: s }, replace: true })} className={cn("rounded-full py-1.5 text-xs text-muted-foreground", step === s && "glass-active font-medium text-foreground")}>
            {STEP_LABEL[s]}
          </button>
        ))}
      </div>
      <div key={step} className="swap-enter mt-6 space-y-6">
        {step === "before" && <Before />}
        {step === "during" && <During />}
        {step === "after" && <After />}
      </div>
    </div>
    </>
  );
}

// ---------- Before ----------

function Before() {
  const j = useJourney();
  const order = ev.deck;
  const done = nextCard(order, j.event.deck) === null;
  return (
    // Wide screens: why and goal | who to meet | going together, side by side.
    <div className={cn("grid items-start gap-6", done ? "lg:grid-cols-3" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]")}>
      <div className="space-y-6">
      <section className="surface p-5">
        <h2 className="text-sm font-medium">Why this one</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {ev.why.map((w) => <li key={w.text}>{w.text} <span className="text-xs text-muted-foreground">· {w.source}</span></li>)}
        </ul>
      </section>
      <Goal />
      </div>
      {done ? <MeetList /> : <MeetDeck />}
      {done && <GoTogether />}
    </div>
  );
}

function Goal() {
  const j = useJourney();
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState("");
  if (!editing)
    return (
      <section className="surface flex items-start gap-3 p-5">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">Your goal</div>
          <div className="mt-0.5 font-medium">{j.event.goal}</div>
        </div>
        <Button variant="ghost" size="sm" className="-mr-2 -mt-1" onClick={() => setEditing(true)}><Pencil className="size-3.5" />Change</Button>
      </section>
    );
  const pick = (g: string) => { if (g.trim()) j.setEventGoal(g.trim()); setEditing(false); };
  return (
    <section className="surface space-y-2 p-5">
      <div className="text-xs text-muted-foreground">Pick a goal for the evening</div>
      {ev.goals.map((g) => (
        <button key={g} onClick={() => pick(g)} className={cn("block w-full rounded-xl border px-3 py-2.5 text-left text-sm hover:bg-foreground/5", j.event.goal === g && "glass-active border-transparent font-medium")}>{g}</button>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); pick(custom); }} className="flex gap-2 pt-1">
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or write your own" aria-label="Your own goal" />
        <Button type="submit" variant="outline" disabled={!custom.trim()}>Use</Button>
      </form>
    </section>
  );
}

/** One person at a time. Right = meet, left = not this time, up = save. Private, no photos, no scores. */
function MeetDeck() {
  const j = useJourney();
  const order = ev.deck;
  const id = nextCard(order, j.event.deck)!;
  const person = byId(id);
  const left = order.length - Object.keys(j.event.deck).length;
  const [drag, setDrag] = useState({ x: 0, y: 0, on: false });
  const start = useRef<{ x: number; y: number } | null>(null);

  const answer = (c: DeckChoice) => { j.answerCard(id, c); setDrag({ x: 0, y: 0, on: false }); };
  const down = (e: RPointerEvent) => { if ((e.target as HTMLElement).closest("button")) return; start.current = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDrag({ x: 0, y: 0, on: true }); };
  const move = (e: RPointerEvent) => { if (start.current) setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, on: true }); };
  const up = () => {
    if (!start.current) return;
    start.current = null;
    if (drag.y < -90 && Math.abs(drag.y) > Math.abs(drag.x)) return answer("save");
    if (drag.x > 90) return answer("meet");
    if (drag.x < -90) return answer("skip");
    setDrag({ x: 0, y: 0, on: false });
  };
  const hint = drag.y < -50 && Math.abs(drag.y) > Math.abs(drag.x) ? "Save" : drag.x > 50 ? "Meet" : drag.x < -50 ? "Not this time" : null;

  return (
    <section aria-label="People you could meet">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Who to look for</h2>
        <span className="text-xs text-muted-foreground">{left} left · only you see this</span>
      </div>
      <div className="relative">
        <div aria-hidden="true" className="absolute inset-x-4 -bottom-2 h-full rounded-[1.5rem] border bg-card/60" />
        <article
          key={id}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "ArrowRight") answer("meet"); if (e.key === "ArrowLeft") answer("skip"); if (e.key === "ArrowUp") { e.preventDefault(); answer("save"); } }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          style={{ transform: `translate(${drag.x}px, ${Math.min(0, drag.y)}px) rotate(${drag.x / 30}deg)`, transition: drag.on ? "none" : "transform .25s ease" }}
          className="swap-enter surface relative touch-none select-none p-5"
        >
          {hint && <span className="absolute right-4 top-4 rounded-full glass-active px-2.5 py-1 text-xs font-medium">{hint}</span>}
          <PersonCard person={person} />
        </article>
      </div>
      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] gap-2">
        <Button variant="outline" onClick={() => answer("skip")}><X className="size-4" />Not this time</Button>
        <Button variant="outline" size="icon" aria-label="Save for later" title="Save for later" onClick={() => answer("save")}><Bookmark className="size-4" /></Button>
        <Button onClick={() => answer("meet")}><Check className="size-4" />Meet</Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Or swipe: right to meet, left to pass, up to save.</p>
    </section>
  );
}

function PersonCard({ person }: { person: Person }) {
  const j = useJourney();
  const back = recall(person.id, j.event.notes, j.event.promises);
  return (
    <div className="space-y-3">
      <div className="pr-20">
        <h3 className="text-lg font-medium leading-tight">{person.name}</h3>
        <p className="text-sm text-muted-foreground">{person.role}</p>
      </div>
      {back && (
        <div className="rounded-xl bg-secondary p-3 text-sm">
          <div className="text-xs font-medium text-muted-foreground">You've met · {back.before[0]?.event}</div>
          {back.before.map((n) => <p key={n.date} className="mt-1">“{n.text}”</p>)}
          {back.open.map((p) => <p key={p} className="mt-1 font-medium">You said you'd {lowerFirst(p)}</p>)}
        </div>
      )}
      <dl className="space-y-2.5 text-sm">
        <div><dt className="text-xs text-muted-foreground">Why for your goal</dt><dd>{person.fit} <span className="text-xs text-muted-foreground">· {person.fitSource}</span></dd></div>
        <div><dt className="text-xs text-muted-foreground">In common</dt><dd>{person.shared}</dd></div>
        <div><dt className="text-xs text-muted-foreground">You could say</dt><dd>“{person.opener}”</dd></div>
      </dl>
    </div>
  );
}

function MeetList() {
  const j = useJourney();
  const meet = toMeet(ev.deck, j.event.deck);
  const saved = ev.deck.filter((id) => j.event.deck[id] === "save");
  const restart = () => ev.deck.forEach((id) => j.answerCard(id, null));
  return (
    <section className="surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{meet.length ? `${meet.length} ${meet.length === 1 ? "person" : "people"} to meet` : "Nobody picked yet"}</h2>
        <Button variant="ghost" size="sm" className="-mr-2 h-7 text-xs text-muted-foreground" onClick={restart}><RotateCcw className="size-3" />Start over</Button>
      </div>
      <ul className="mt-2 space-y-1.5 text-sm">
        {meet.map((id) => <li key={id} className="flex items-center gap-2"><Check className="size-3.5 text-mark-yes" />{byId(id).name}</li>)}
        {saved.map((id) => <li key={id} className="flex items-center gap-2 text-muted-foreground"><Bookmark className="size-3.5" />{byId(id).name} · saved</li>)}
      </ul>
      {meet.length > 0 && <Button asChild variant="outline" size="sm" className="mt-4"><Link to="/event" search={{ step: "during" }}>Open at the event</Link></Button>}
    </section>
  );
}

function GoTogether() {
  const j = useJourney();
  const { shown, others } = visibleClassmates(ev.classmates);
  const inv = j.event.invite;
  const to = shown.find((c) => c.id === inv.to);
  return (
    <section className="surface p-5">
      <h2 className="flex items-center gap-2 text-sm font-medium"><Users className="size-4" />Going with someone?</h2>
      {shown.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No classmates have chosen to be shown for this one yet. {ev.going} Bayview students are going.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">{shown.length} chose to be shown{others > 0 ? ` · ${others} more going` : ""}</p>
          {to ? (
            <div className="mt-3 space-y-2">
              <label htmlFor="invite" className="flex items-center gap-2 text-xs text-muted-foreground"><AgentAvatar agent="drafter" className="size-5" />{inv.draft ? "Drafter wrote this. Edit anything." : "Write a note"} · to {to.name}</label>
              <Textarea id="invite" value={inv.draft} onChange={(e) => j.setInviteDraft(e.target.value)} rows={4} />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={j.cancelInvite}>Cancel</Button>
                <Button size="sm" disabled={!inv.draft.trim()} onClick={() => { j.sendInvite(); toast(`Sent to ${to.name}`, { description: "Demo only: no message went out." }); }}><Send className="size-3.5" />Send</Button>
              </div>
            </div>
          ) : (
            <ul className="mt-3 divide-y">
              {shown.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0"><div className="text-sm font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.note}</div></div>
                  {inv.sent.includes(c.id) ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3.5" />Asked</span> : <Button variant="outline" size="sm" onClick={() => j.startInvite(c.id)}>Ask to go together</Button>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

// ---------- During ----------

function During() {
  const j = useJourney();
  const list = ev.deck.filter((id) => j.event.deck[id] === "meet" || j.event.deck[id] === "save");
  return (
    <>
      <div className="sticky top-[calc(var(--top,0px)+0.5rem)] z-10 flex items-start gap-2 rounded-2xl glass-control px-4 py-3 text-sm">
        <Pin className="mt-0.5 size-4 shrink-0" /><span><span className="text-muted-foreground">Goal · </span>{j.event.goal}</span>
      </div>
      {list.length === 0 ? (
        <div className="surface p-6 text-center text-sm text-muted-foreground">
          Pick who to look for first.
          <Button asChild variant="outline" size="sm" className="mt-3 block w-fit mx-auto"><Link to="/event">Back to the plan</Link></Button>
        </div>
      ) : (
        <ul className="grid items-start gap-3 lg:grid-cols-2">{list.map((id) => <TalkRow key={id} person={byId(id)} />)}</ul>
      )}
      {j.event.talked.length > 0 && <Button asChild className="w-full lg:w-auto"><Link to="/event" search={{ step: "after" }}>I'm done for tonight</Link></Button>}
    </>
  );
}

function TalkRow({ person }: { person: Person }) {
  const j = useJourney();
  const talked = j.event.talked.includes(person.id);
  const note = j.event.notes.find((n) => n.personId === person.id);
  const [text, setText] = useState(note?.text ?? "");
  const [promise, setPromise] = useState(note?.promise ?? "");
  const save = () => j.setPersonNote(person.id, text, promise);
  return (
    <li className={cn("surface p-4", talked && "ring-1 ring-[var(--ring)]")}>
      <button onClick={() => j.markTalked(person.id, !talked)} aria-pressed={talked} className="flex w-full items-start gap-3 text-left">
        <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border", talked && "glass-on border-transparent text-white")}>{talked && <Check className="size-3.5" />}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{person.name}</span>
          <span className="block text-xs text-muted-foreground">{talked ? "Talked" : `“${person.opener}”`}</span>
        </span>
      </button>
      {talked && (
        <div className="mt-3 space-y-2 pl-9">
          <Input value={text} onChange={(e) => setText(e.target.value)} onBlur={save} placeholder="One line to remember" aria-label={`Note about ${person.name}`} />
          <Input value={promise} onChange={(e) => setPromise(e.target.value)} onBlur={save} placeholder="I said I'd… (optional)" aria-label={`Anything you said you'd do for ${person.name}`} />
        </div>
      )}
    </li>
  );
}

// ---------- After ----------

function After() {
  const j = useJourney();
  const talked = j.event.talked;
  const skill = ledgerSkills.find((s) => s.id === ev.skillId)!;
  const allPromises = [
    ...recallPromises(j),
    ...j.event.promises.filter((p) => !p.done),
  ];
  const step = nextStep(talked.filter((id) => !j.event.followUp.copied.includes(id)), allPromises, people);
  if (talked.length === 0)
    return (
      <div className="surface flex flex-col items-center gap-3 p-8 text-center">
        <Spot name="journal" className="w-24" />
        <p className="text-sm text-muted-foreground">Mark who you talked to and I'll help you follow up.</p>
        <Button asChild variant="outline" size="sm"><Link to="/event" search={{ step: "during" }}>At the event</Link></Button>
      </div>
    );
  const pending = talked.find((id) => !j.event.followUp.copied.includes(id));
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-6">
      <section className="surface flex items-center gap-4 p-5">
        <Spot name="flowers" className="w-16 shrink-0" />
        <div>
          <h2 className="text-lg font-medium">You did it</h2>
          <p className="text-sm text-muted-foreground">You talked with {talked.map((id) => callName(byId(id).name)).join(", ")}.</p>
        </div>
      </section>
      {pending ? <FollowUp key={pending} personId={pending} index={talked.indexOf(pending)} total={talked.length} /> : (
        <section className="surface p-5 text-sm"><Check className="mr-1.5 inline size-4 text-mark-yes" />All follow-ups copied.</section>
      )}
      </div>
      <div className="space-y-6">
      {j.event.followUp.copied.length > 0 && (
        <Link to="/portfolio" className="surface flex items-center justify-between gap-3 p-4 text-sm hover:bg-foreground/[.02]">
          <span><span className="font-medium">{skill.name}</span><span className="block text-xs text-muted-foreground">From {skill.course}, now with a real conversation behind it</span></span>
          <span className="shrink-0 text-xs">{skill.level} → <b>{evidenceFor(skill, j.skillReviews[skill.id])}</b></span>
        </Link>
      )}
      <Promises />
      {step && (
        <section className="rounded-2xl glass-control p-4 text-sm">
          <div className="text-xs text-muted-foreground">One next step</div>
          <div className="mt-0.5 font-medium">{step}</div>
        </section>
      )}
      </div>
    </div>
  );
}

/** Promises from earlier events with people she talked to again. */
function recallPromises(j: ReturnType<typeof useJourney>) {
  return j.event.talked.flatMap((id) => (recall(id, j.event.notes, j.event.promises)?.before ?? []).filter((n) => n.promise && !j.event.promises.some((p) => p.id === promiseId(n) && p.done)).map((n) => ({ id: promiseId(n), personId: id, text: n.promise!, done: false })));
}

function FollowUp({ personId, index, total }: { personId: string; index: number; total: number }) {
  const j = useJourney();
  const person = byId(personId);
  const note = j.event.notes.find((n) => n.personId === personId);
  const draft = followUp(person, note?.text, ev.shortName, ev.student);
  const f = j.event.followUp;
  const [line, setLine] = useState("");
  useEffect(() => { if (draft.kind === "draft" && f.to !== personId) j.startFollowUp(personId); }, [draft.kind, f.to, personId, j]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(f.draft); } catch { /* clipboard may be blocked; the text is still on screen */ }
    j.copyFollowUp();
    toast("Copied. Paste it wherever you talk to them.", { description: "Demo only: nothing was sent." });
  };

  return (
    <section className="surface space-y-3 p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">Follow up with {callName(person.name)}</h2>
        {total > 1 && <span className="text-xs text-muted-foreground">{index + 1} of {total}</span>}
      </div>
      {draft.kind === "ask" ? (
        <form onSubmit={(e) => { e.preventDefault(); j.setPersonNote(personId, line, note?.promise ?? ""); }} className="space-y-2">
          <p className="flex items-start gap-2 text-sm"><AgentAvatar agent="drafter" className="size-6 shrink-0" />I only write from your notes. What's one thing you talked about?</p>
          <div className="flex gap-2">
            <Input value={line} onChange={(e) => setLine(e.target.value)} placeholder="One line is enough" aria-label={`What you talked about with ${person.name}`} />
            <Button type="submit" disabled={!line.trim()}>Draft it</Button>
          </div>
        </form>
      ) : (
        <>
          <label htmlFor="followup" className="flex items-center gap-2 text-xs text-muted-foreground"><AgentAvatar agent="drafter" className="size-5" />From your note: “{note?.text}”</label>
          <Textarea id="followup" value={f.to === personId ? f.draft : ""} onChange={(e) => j.setFollowUpDraft(e.target.value)} rows={6} />
          <Button className="w-full" disabled={!f.draft.trim()} onClick={copy}><Copy className="size-4" />Copy and send</Button>
        </>
      )}
    </section>
  );
}

function Promises() {
  const j = useJourney();
  const list = [...recallPromises(j), ...j.event.promises.filter((p) => !p.done)];
  if (list.length === 0) return null;
  return (
    <section className="surface p-5">
      <h2 className="text-sm font-medium">What you said you'd do</h2>
      <ul className="mt-2 divide-y">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
            <button onClick={() => j.finishPromise(p.id, p.text, p.personId)} aria-label={`Mark done: ${p.text}`} className="grid size-5 shrink-0 place-items-center rounded-full border hover:bg-foreground/5" />
            <span className="min-w-0 flex-1">{p.text}<span className="block text-xs text-muted-foreground">{byId(p.personId).name}</span></span>
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">Remind me<Switch checked={j.event.reminders.includes(p.id)} onCheckedChange={() => j.toggleReminder(p.id)} /></label>
          </li>
        ))}
      </ul>
    </section>
  );
}
