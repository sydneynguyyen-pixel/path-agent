import { noteFrom } from "./steer";
import { topicFor, type WidgetKind } from "./desktop";

/** One line in a chat. Agent replies come from the live agent when it's available, and a scripted preview otherwise. */
export type ChatMsg = { id: string; from: "you" | "agent"; text: string; topic?: WidgetKind | null; note?: string | undefined; live?: LiveReply | undefined };
/** An answer the live agent wrote from her plan, with the facts it used. Absent on scripted previews. */
export type LiveReply = { answer: string; topic: WidgetKind | null; factIds: string[]; model: string | null };
/** A saved conversation she can come back to. Each question she starts fresh gets its own. */
export type Thread = { id: string; title: string; at: number; messages: ChatMsg[] };

/** The options run ("STAT 2 is full") shows as a thread too, but its body is the live run, not messages. */
export const OPTIONS_THREAD = "options";

/** The pinned "Today" thread: Sprout's morning briefing. It's always first in her chats and she can't write into it. */
export const TODAY_THREAD = "today";

/** The briefing's first line, from how many things need her. */
export function briefingLead(n: number): string {
  return n === 0 ? "Nothing needs you today. I'll keep an eye on registration." : n === 1 ? "One thing needs you today." : `${n} things need you today. Everything else can wait.`;
}

/** When the briefing was written: each morning at 7:30, so it reads like a dated message, e.g. "Sun, Nov 8 · 7:30 AM". */
export function briefingStamp(today: string): string {
  const d = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  return `${d} · 7:30 AM`;
}

/** The briefing opens itself above the bar once a day, on Home, and only when something needs her. */
export function shouldOpenBriefing({ path, closedOn, today, count }: { path: string; closedOn: string | null; today: string; count: number }): boolean {
  return path === "/" && count > 0 && closedOn !== today;
}

/** How the bar looks right now. Color only shows when she's in it, it's ready to send, or the agent is working. */
export type BarState = "rest" | "focus" | "ready" | "working" | "needs";

export function barState({ focused, text, working, needs }: { focused: boolean; text: string; working: boolean; needs: boolean }): BarState {
  if (working) return "working";
  if (text.trim()) return "ready";
  if (focused) return "focus";
  if (needs) return "needs";
  return "rest";
}

/** A short title from the first question: the words she typed, cut at a word. */
export function titleFor(text: string, max = 40): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > 12 ? cut.slice(0, space) : cut).replace(/[,.;:]$/, "")}…`;
}

/** The scripted answer to one message: a note she gave the helpers, or a topic Home has a widget for. */
export function replyFor(text: string): Pick<ChatMsg, "topic" | "note"> {
  const note = noteFrom(text);
  return note ? { topic: null, note: note.text } : { topic: topicFor(text) };
}

/**
 * Adds her message to the open thread, or starts a new one when none is open.
 * Returns the thread it went into so the chat can show it.
 */
export function addAsk(threads: Thread[], activeId: string | null, text: string, now: number): { threads: Thread[]; id: string } {
  const t = text.trim();
  const msg: ChatMsg = { id: `m${now}`, from: "you", text: t };
  const open = activeId && activeId !== OPTIONS_THREAD && activeId !== TODAY_THREAD ? threads.find((x) => x.id === activeId) : undefined;
  if (open) return { id: open.id, threads: threads.map((x) => (x.id === open.id ? { ...x, at: now, messages: [...x.messages, msg] } : x)) };
  const id = `t${now}`;
  return { id, threads: [{ id, title: titleFor(t), at: now, messages: [msg] }, ...threads] };
}

/** The agent's answer lands in the same thread, after a short "working" moment. */
export function addReply(threads: Thread[], id: string, text: string, now: number, live?: LiveReply): Thread[] {
  const body: Pick<ChatMsg, "topic" | "note" | "live"> = live ? { topic: live.topic, live } : replyFor(text);
  return threads.map((x) => (x.id === id ? { ...x, at: now, messages: [...x.messages, { id: `m${now}a`, from: "agent", text, ...body }] } : x));
}

/** Most recent first. */
export const byRecent = (threads: Thread[]) => [...threads].sort((a, b) => b.at - a.at);

/** The bar's hint follows the page she's on. */
export function placeholderFor(path: string): string {
  if (path === "/") return "Ask anything…";
  if (path.startsWith("/semester") || path.startsWith("/terms")) return "Ask about your terms…";
  if (path.startsWith("/degree") || path.startsWith("/map")) return "Ask about your degree…";
  if (path.startsWith("/explore") || path.startsWith("/event")) return "Ask about clubs and events…";
  if (path.startsWith("/career")) return "Ask about your skills…";
  return "Ask Sprout…";
}

/** Two suggestions for the page she's on. Each one is a question the preview can answer. */
export function chipsFor(path: string): string[] {
  if (path.startsWith("/semester") || path.startsWith("/terms")) return ["What's due this week?", "Am I on track?"];
  if (path.startsWith("/degree") || path.startsWith("/map")) return ["Can I still graduate Spring '28?", "When is my application due?"];
  if (path.startsWith("/explore") || path.startsWith("/event")) return ["Find a club for UX research", "What skills should I build?"];
  if (path.startsWith("/career")) return ["What skills should I build?", "Find a club for UX research"];
  return ["What's due this week?", "Can I still graduate Spring '28?"];
}

/** What's going on for her right now, so Home can suggest questions that matter today. */
export type SuggestContext = { dueThisWeek: number; daysToApply: number; interest: string | null; asked: string[]; seed: number };

/**
 * Two questions for Home, picked from what she needs to know right now. The most pressing one leads;
 * the second rotates with `seed` so it changes visit to visit. Questions she already asked drop out.
 * Every suggestion is one the preview can answer.
 */
export function suggestionsFor({ dueThisWeek, daysToApply, interest, asked, seed }: SuggestContext): string[] {
  const seen = new Set(asked.map((a) => a.toLowerCase()));
  const pool: { q: string; weight: number }[] = [
    { q: daysToApply <= 1 ? "My application is due tomorrow. What's left?" : `My application is due in ${daysToApply} days. What's left?`, weight: daysToApply <= 30 ? 100 - daysToApply : 0 },
    { q: dueThisWeek === 1 ? "What's due this week?" : `What are the ${dueThisWeek} things due this week?`, weight: dueThisWeek > 0 ? 40 + dueThisWeek * 5 : 0 },
    { q: "Am I still on track to graduate?", weight: 30 },
    { q: interest ? `Find a club for ${interest}` : "Find a club that fits my goal", weight: 25 },
    { q: "What skills should I build next?", weight: 20 },
    { q: "Is there an event I could go to soon?", weight: 15 },
  ];
  const left = pool.filter((p) => p.weight > 0 && !seen.has(p.q.toLowerCase())).sort((a, b) => b.weight - a.weight);
  const [lead, ...rest] = left;
  if (!lead) return [];
  const second = rest.length ? rest[Math.abs(Math.floor(seed)) % rest.length] : undefined;
  return second ? [lead.q, second.q] : [lead.q];
}
