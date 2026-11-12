import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ArrowUp, ChevronLeft, Maximize2, Minimize2, Plus, RotateCw, X } from "lucide-react";
import { APPLY_DEADLINE, fallWork, options } from "@/data/scenario";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { awaySummary } from "@/lib/run";
import { daysUntil, dueThisWeek } from "@/lib/home";
import { barState, byRecent, OPTIONS_THREAD, placeholderFor, briefingStamp, shouldOpenBriefing, suggestionsFor, TODAY_THREAD, type ChatMsg, type Thread } from "@/lib/chat";
import { useLiquidGlass } from "@/hooks/use-liquid-glass";
import { AgentFace } from "./Brand";
import { AgentPanel } from "./AgentPanel";
import { NoteReply, Reply } from "./HomeWidgets";
import { RememberedNotes } from "./RunTrace";
import { BriefingEarlier, BriefingMessage, useBriefing } from "./Briefing";

/** The day the briefing last opened itself, so it does that once a day at most. */
const BRIEF_KEY = "pa-brief-seen";

const course = (id: string | null | undefined) => options.find((o) => o.id === id)?.course.replace("BCC ", "") ?? null;
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** How long the glass takes to change shape. Content swaps while it moves so nothing pops. */
const MORPH_MS = 560;

/** Types a suggestion into the box a letter at a time, then sends it, so she sees what she's asking. */
function useTypeOut(setText: (t: string) => void, send: (t: string) => void) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  useEffect(() => stop, []);
  return {
    stop,
    typeOut: (t: string) => {
      stop();
      if (reduceMotion()) { send(t); return; }
      let i = 0;
      timer.current = setInterval(() => {
        i += 1;
        setText(t.slice(0, i));
        if (i >= t.length) { stop(); setTimeout(() => send(t), 180); }
      }, 24);
    },
  };
}

/** Turns on a frame after mounting (so the fade-in actually plays) and off right away (so it fades out). */
function useShown(on: boolean) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!on) { setShown(false); return; }
    let b = 0;
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setShown(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [on]);
  return shown;
}

/** Questions that matter to her today; the second one changes visit to visit. */
function useSuggestions() {
  const j = useJourney();
  const [seed, setSeed] = useState(0);
  useEffect(() => setSeed(Math.floor(Math.random() * 1000)), []);
  return suggestionsFor({
    dueThisWeek: dueThisWeek(fallWork, SCRIPT_TODAY).length,
    daysToApply: daysUntil(APPLY_DEADLINE, SCRIPT_TODAY),
    interest: null,
    asked: j.chats.flatMap((t) => t.messages.filter((m) => m.from === "you").map((m) => m.text)),
    seed,
  });
}

/** Three dots in a small glass bubble, rippling left to right while the agent thinks. */
function Thinking() {
  return (
    <div className="agent-says agent-in" role="status" aria-label="Sprout is thinking">
      <AgentFace className="!size-8 shrink-0" />
      <span className="agent-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

function AgentSays({ m, compact = false }: { m: ChatMsg; compact?: boolean }) {
  return (
    <div className="agent-says agent-in">
      <AgentFace className="!size-8 shrink-0" />
      <div className="min-w-0 flex-1 pt-1">
        {m.note ? <NoteReply note={m.note} compact={compact} /> : <Reply topic={m.topic ?? null} compact={compact} answer={m.live?.answer} />}
        {/* Honest about where the words came from: live answers say so; previews say nothing extra. */}
        {m.live && !compact && <p className="mt-2 text-xs text-muted-foreground">Live answer from your plan{m.live.factIds.length ? ` · ${m.live.factIds.length} ${m.live.factIds.length === 1 ? "fact" : "facts"} used` : ""}</p>}
      </div>
    </div>
  );
}

function Messages({ thread, typing }: { thread: Thread; typing: boolean }) {
  return (
    <>
      {thread.messages.map((m) => (m.from === "you" ? <p key={m.id} className="agent-you agent-in">{m.text}</p> : <AgentSays key={m.id} m={m} />))}
      {typing && <Thinking />}
    </>
  );
}

/** The pinned Today thread: this morning's briefing as Sprout's message, with older updates under it. */
function TodayLog() {
  return (
    <div className="agent-says agent-in">
      <AgentFace className="!size-8 shrink-0" />
      <div className="min-w-0 flex-1 pt-1">
        <p className="mb-2 text-xs text-muted-foreground">Agent brief · {briefingStamp(SCRIPT_TODAY)}</p>
        <BriefingMessage />
        <BriefingEarlier />
      </div>
    </div>
  );
}

function ThreadButton({ current, onClick, title, sub, face }: { current: boolean; onClick: () => void; title: string; sub: string; face?: boolean }) {
  return (
    <button type="button" className="agent-thread" aria-current={current || undefined} onClick={onClick}>
      <span className="flex items-center gap-3">
        {face && <AgentFace className="!size-8 shrink-0" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{sub}</span>
        </span>
      </span>
    </button>
  );
}

/**
 * Sprout on every page. One piece of glass that is the slim resting pill, the bar, and the whole chat:
 * it grows and shrinks between them, and the text box stays where it is the whole time.
 */
export function AgentChat() {
  const j = useJourney();
  if (j.pathBuilt !== true) return null;
  return <AgentShell />;
}

type Mode = "slim" | "bar" | "open";

function AgentShell() {
  const j = useJourney();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const open = j.chatOpen || j.panelOpen;
  const [slim, setSlim] = useState(false);
  const active = j.panelOpen ? OPTIONS_THREAD : j.activeChat;
  const onOptions = open && active === OPTIONS_THREAD;
  const onToday = open && active === TODAY_THREAD;
  const brief = useBriefing();
  const urgent = brief.items.filter((a) => a.level === "deadline" || a.level === "decision").length;
  const thread = j.chats.find((t) => t.id === active);
  const suggestions = useSuggestions();

  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);
  // Home shows the full bar and slims it on scroll. Every other page keeps it slim until she
  // hovers (or tabs/taps into it), then it grows to the full bar and slims again when she leaves.
  const home = path === "/";
  const [hover, setHover] = useState(false);
  const leave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEnter = () => { if (leave.current) clearTimeout(leave.current); setHover(true); };
  const onLeave = () => { if (leave.current) clearTimeout(leave.current); leave.current = setTimeout(() => setHover(false), 280); };
  useEffect(() => () => { if (leave.current) clearTimeout(leave.current); }, []);
  const resting = home ? slim : !(hover || focused || !!text || !!peek);
  const mode: Mode = open ? "open" : resting ? "slim" : "bar";
  const shellRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  useLiquidGlass(shellRef, { bezel: 18, scale: 46, blur: 6, saturate: 1.6, aberration: 0.22 });

  // The chat's content stays while the glass shrinks back down, then leaves.
  const [body, setBody] = useState(open);
  useEffect(() => {
    if (open) { setBody(true); return; }
    const t = setTimeout(() => setBody(false), MORPH_MS);
    return () => clearTimeout(t);
  }, [open]);

  // The bar grows by exactly the height of the answer above the text box.
  const [peekH, setPeekH] = useState(0);
  // How much of the page bottom the resting bar (and its suggestions) covers, so Shell's spacer lets the last thing on the page scroll clear of it.
  const dockRef = useRef<HTMLDivElement>(null);
  const docked = mode !== "open" && !peek;
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock || !docked) return;
    const measure = () => {
      // The bar slims on scroll; reserve room for its full resting size so the last widget clears it either way.
      if (dock.dataset["mode"] !== "bar") return;
      const clear = Math.ceil(window.innerHeight - dock.getBoundingClientRect().top);
      if (clear > 0) document.documentElement.style.setProperty("--agent-clear", `${clear}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(dock);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [docked, mode, path]);
  const [vh, setVh] = useState(800);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const size = () => { setVh(window.innerHeight); setPhone(window.innerWidth < 768); };
    size();
    window.addEventListener("resize", size);
    return () => window.removeEventListener("resize", size);
  }, []);
  const showPeek = mode === "bar" && !!peek;
  // The answer stays while the glass shrinks back to the bar, then leaves.
  const [linger, setLinger] = useState<string | null>(null);
  useEffect(() => {
    if (showPeek) { setLinger(peek); return; }
    const t = setTimeout(() => setLinger(null), MORPH_MS);
    return () => clearTimeout(t);
  }, [showPeek, peek]);
  const peekShown = useShown(showPeek);
  const bodyShown = useShown(open && body);
  useLayoutEffect(() => {
    const el = peekRef.current;
    if (!el || !showPeek) { setPeekH(0); return; }
    const ro = new ResizeObserver(() => setPeekH(el.offsetHeight));
    ro.observe(el);
    setPeekH(el.offsetHeight);
    return () => ro.disconnect();
  }, [showPeek, peek, linger]);
  const height = mode === "slim" ? 40 : mode === "open" ? Math.min(vh - (phone ? 124 : 32), 880) : 56 + (showPeek ? Math.min(peekH, vh * 0.5) : 0);

  const working = onOptions ? j.agentRun?.status === "running" : j.typingIn !== null || (!open && j.agentRun?.status === "running");
  const away = j.awayRun && j.agentRun ? awaySummary(j.agentRun, course(j.agentRun.result?.optionId)) : null;
  const needs = mode === "bar" && !showPeek ? (away ? (
    <button type="button" className="agent-tag" onClick={() => j.setPanelOpen(true)}><RotateCw className="size-3.5" aria-hidden="true" />{away.title.replace("While you were away: ", "")}</button>
  ) : j.stage === "failed" && !j.chosenId ? (
    <button type="button" className="agent-tag" onClick={() => j.setPanelOpen(true)}>STAT 2 is full · see options</button>
  ) : home && urgent > 0 ? (
    // Only something with a clock on it (a deadline or a decision) earns a tag; plain updates wait in the Today thread.
    <button type="button" className="agent-tag" onClick={() => setPeek(TODAY_THREAD)}><span className="agent-tag-dot" aria-hidden="true" />{urgent === 1 ? "1 thing needs you" : `${urgent} things need you`}</button>
  ) : undefined) : undefined;
  const state = barState({ focused, text, working, needs: !!needs });

  const send = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    setText("");
    if (onOptions) { j.steer(t); return; }
    const id = j.ask(t);
    if (!open) setPeek(id);
  };
  const { typeOut, stop } = useTypeOut(setText, send);
  const submit = (e: FormEvent) => { e.preventDefault(); send(text); };
  const collapse = () => { setShowList(false); j.setChatOpen(false); };
  const expand = () => { j.openChat(peek ?? j.activeChat); setPeek(null); };
  const pick = (id: string | null) => { setShowList(false); if (id === OPTIONS_THREAD) j.setPanelOpen(true); else j.openChat(id); };

  // Arriving on Home, the morning briefing opens above the bar, once a day, so it clearly comes from Sprout.
  const briefCount = brief.items.length;
  useEffect(() => {
    let seen: string | null = null;
    try { seen = localStorage.getItem(BRIEF_KEY); } catch { /* storage blocked: show it */ }
    if (!shouldOpenBriefing({ path, closedOn: seen, today: SCRIPT_TODAY, count: briefCount }) || open) return;
    const t = setTimeout(() => {
      setPeek((p) => p ?? TODAY_THREAD);
      try { localStorage.setItem(BRIEF_KEY, SCRIPT_TODAY); } catch { /* fine */ }
    }, 700);
    return () => clearTimeout(t);
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scrolling well down slims the bar; scrolling well back up (or to the top) brings it back.
  const calm = useRef({ text, focused, peek, open });
  calm.current = { text, focused, peek, open };
  useEffect(() => {
    const last = new WeakMap<EventTarget, number>();
    let travel = 0;
    const onScroll = (e: Event) => {
      const el = e.target === document ? document.scrollingElement : (e.target as Element | null);
      if (!el || !(el instanceof Element) || el.closest(".agent-shell")) return;
      const c = calm.current;
      if (c.open || c.peek || c.text || c.focused || location.pathname !== "/") return;
      const y = el.scrollTop;
      const dy = y - (last.get(el) ?? y);
      last.set(el, y);
      travel = Math.sign(dy) === Math.sign(travel) ? travel + dy : dy;
      if (y < 24) setSlim(false);
      else if (travel > 160) setSlim(true);
      else if (travel < -160) setSlim(false);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  // A new page starts fresh: answer put away, bar full size, chat folded.
  const latestOpen = useRef(open);
  latestOpen.current = open;
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) { firstPath.current = false; return; }
    setPeek(null); setSlim(false);
    if (latestOpen.current) j.setChatOpen(false);
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") collapse(); };
    window.addEventListener("keydown", esc);
    return () => { clearTimeout(t); window.removeEventListener("keydown", esc); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = logRef.current;
    if (el && !onOptions) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion() ? "auto" : "smooth" });
  }, [thread?.messages.length, j.typingIn, onOptions]);

  const peekToday = linger === TODAY_THREAD;
  const peekThread = linger ? j.chats.find((t) => t.id === linger) : undefined;
  const peekYou = peekThread?.messages.filter((m) => m.from === "you").at(-1);
  const peekAgent = peekThread?.messages.at(-1)?.from === "agent" ? peekThread.messages.at(-1) : undefined;

  const hasRun = j.stage !== "idle" || !!j.agentRun;
  const runSub = j.chosenId ? `You picked ${course(j.chosenId)}` : j.stage === "failed" ? "Pick a backup" : "Done";
  const title = onOptions ? "STAT 2 is full" : onToday ? "Agent brief" : thread?.title ?? "New chat";
  // Home shows suggestions while the bar waits; other pages show them once she clicks in to type.
  const chips = mode === "bar" && !peek && !text && (home || focused) && suggestions.length > 0;
  const placeholder = mode === "open" ? (onOptions ? "Tell the helpers something, like “No classes before 10 am”" : thread ? "Reply…" : "Ask anything…") : state === "needs" ? "Ask…" : placeholderFor(path);

  return (
    <>
      <div className="agent-scrim" data-show={open || undefined} onClick={collapse} aria-hidden="true" />
      <div ref={dockRef} className="agent-dock" data-mode={mode}>
        <div className="agent-chips" data-show={chips || undefined} aria-hidden={!chips}>
          {suggestions.map((c, i) => (
            <button key={c} type="button" tabIndex={chips ? 0 : -1} className="agent-chip agent-ring" onMouseDown={(e) => e.preventDefault()} style={{ transitionDelay: chips ? `${140 + i * 70}ms` : "0ms" }} onClick={() => typeOut(c)}><span className="agent-aura" aria-hidden="true"><i /></span>{c}</button>
          ))}
        </div>

        <div ref={shellRef} onPointerEnter={(e) => { if (e.pointerType === "mouse") onEnter(); }} onPointerLeave={(e) => { if (e.pointerType === "mouse") onLeave(); }} className="agent-shell agent-ring" data-mode={mode} data-state={state} data-peek={showPeek || undefined}
          style={{ height }} role={mode === "open" ? "dialog" : undefined} aria-label={mode === "open" ? "Chat with Sprout" : undefined}>
          <span className="agent-aura" aria-hidden="true"><i /></span>

          {body && (
            <div className="agent-body" data-show={bodyShown || undefined}>
              <nav aria-label="Past chats" className="agent-threads" data-show={showList || undefined}>
                <button type="button" className="agent-new" onClick={() => pick(null)}><Plus className="size-4" aria-hidden="true" />New chat</button>
                <ThreadButton face current={onToday} onClick={() => pick(TODAY_THREAD)} title="Agent brief" sub={`${briefingStamp(SCRIPT_TODAY)} · ${brief.lead}`} />
                {hasRun && j.stage === "failed" && (
                  <>
                    <h3 className="agent-group">Needs you</h3>
                    <ThreadButton current={onOptions} onClick={() => pick(OPTIONS_THREAD)} title="STAT 2 is full" sub={runSub} />
                  </>
                )}
                {(j.chats.length > 0 || (hasRun && j.stage !== "failed")) && <h3 className="agent-group">Earlier</h3>}
                {hasRun && j.stage !== "failed" && <ThreadButton current={onOptions} onClick={() => pick(OPTIONS_THREAD)} title="STAT 2 is full" sub={runSub} />}
                {byRecent(j.chats).map((t) => (
                  <ThreadButton key={t.id} current={!onOptions && t.id === active} onClick={() => pick(t.id)} title={t.title} sub={new Date(t.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} />
                ))}
                <RememberedNotes className="mt-auto px-2 pt-4" />
              </nav>
              <section className="agent-main">
                <header className="agent-head">
                  <button type="button" className="agent-icon md:hidden" aria-label="Past chats" onClick={() => setShowList(true)}><ChevronLeft className="size-4" aria-hidden="true" /></button>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold">{title}</h2>
                    {onToday ? <p className="truncate text-xs text-muted-foreground">Sprout's brief, updated every morning</p>
                      : !onOptions && <p className="truncate text-xs text-muted-foreground">Preview: answers are scripted until the live agent is connected.</p>}
                  </div>
                  <button type="button" className="agent-collapse" onClick={collapse}><Minimize2 className="size-4" aria-hidden="true" />Collapse</button>
                </header>
                <div ref={logRef} className="agent-log" aria-live="polite">
                  {onOptions ? <AgentPanel inChat /> : onToday ? <TodayLog /> : thread ? <Messages thread={thread} typing={j.typingIn === thread.id} /> : (
                    <div className="agent-in m-auto flex max-w-md flex-col items-center gap-4 text-center">
                      <AgentFace className="!size-14" />
                      <p className="text-lg font-semibold">What do you want to know?</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {suggestions.map((c) => <button key={c} type="button" className="agent-chip agent-ring" onClick={() => typeOut(c)}><span className="agent-aura" aria-hidden="true"><i /></span>{c}</button>)}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {mode === "bar" && peekToday && (
            <div className="agent-peek" data-show={peekShown || undefined} aria-live="polite">
              <div ref={peekRef} className="agent-peek-in">
                <div className="agent-says">
                  <AgentFace className="!size-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-xs text-muted-foreground">Agent brief · {briefingStamp(SCRIPT_TODAY)}</p>
                      <button type="button" className="agent-icon size-8" aria-label="Put brief away" onClick={() => setPeek(null)}><X className="size-4" aria-hidden="true" /></button>
                    </div>
                    <BriefingMessage compact />
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === "bar" && peekThread && peekYou && (
            <div className="agent-peek" data-show={peekShown || undefined} aria-live="polite">
              <div ref={peekRef} className="agent-peek-in">
                <div className="flex items-center justify-end gap-2">
                  <p className="agent-you min-w-0 truncate">{peekYou.text}</p>
                  <button type="button" className="agent-icon size-8" aria-label="Put answer away" onClick={() => setPeek(null)}><X className="size-4" aria-hidden="true" /></button>
                </div>
                <div className="mt-3">{peekAgent ? <AgentSays m={peekAgent} compact /> : <Thinking />}</div>
              </div>
            </div>
          )}

          {/* The text box. It never moves; the glass grows and shrinks around it. */}
          <form onSubmit={submit} className="agent-compose">
            {needs}
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => { stop(); setText(e.target.value); }}
              onFocus={() => { setFocused(true); setSlim(false); }}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              aria-label={onOptions ? "Tell the helpers" : "Ask Sprout"}
              className="agent-input"
            />
            {mode === "bar" && (
              <button type="button" onClick={expand} className="agent-icon agent-tool" aria-label="Open all chats" title="Open all chats"><Maximize2 className="size-4" aria-hidden="true" /></button>
            )}
            <button type="submit" disabled={!text.trim()} className="agent-send agent-tool" aria-label="Send"><ArrowUp className="size-4" aria-hidden="true" /></button>
          </form>
        </div>
      </div>
    </>
  );
}
