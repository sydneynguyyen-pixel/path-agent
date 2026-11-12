import type { EventPeer } from "@/data/scenario";
import { matchState, type Asks } from "@/lib/opportunities";

/** How she knows someone. Friends she added come first, then people she met or went with, then friends of those. */
export type Tie = { kind: "friend" | "met" | "went" | "mutual"; text: string };
export type Known = { friends: string[]; met: { peerId: string; event: string }[]; went: { peerId: string; event: string }[] };

const first = (name: string) => name.split(" ")[0]!;

export function tieWith(p: EventPeer, k: Known, everyone: EventPeer[]): Tie | null {
  if (k.friends.includes(p.id)) return { kind: "friend", text: "Your friend" };
  const met = k.met.find((m) => m.peerId === p.id);
  if (met) return { kind: "met", text: `You met at ${met.event}` };
  const went = k.went.find((m) => m.peerId === p.id);
  if (went) return { kind: "went", text: `You went to ${went.event} together` };
  const close = new Set([...k.friends, ...k.met.map((m) => m.peerId)]);
  const mutual = (p.friendsWith ?? []).filter((id) => close.has(id)).map((id) => everyone.find((e) => e.id === id)).filter((e): e is EventPeer => !!e);
  if (mutual.length) return { kind: "mutual", text: `Friends with ${mutual.map((m) => first(m.name)).join(" and ")}` };
  return null;
}

export type GoingGroups = { requests: EventPeer[]; known: { peer: EventPeer; tie: Tie | null; together: boolean }[]; others: EventPeer[] };

/** Splits who's going into asks waiting on her, people she knows (going together first), and everyone else. A search narrows all three. */
export function groupGoing(peers: EventPeer[], asks: Asks, asksYou: string[], k: Known, query = ""): GoingGroups {
  const q = query.trim().toLowerCase();
  const hit = (p: EventPeer) => !q || [p.name, p.major, p.ask, p.standing].some((x) => x.toLowerCase().includes(q));
  const out: GoingGroups = { requests: [], known: [], others: [] };
  for (const p of peers.filter(hit)) {
    const state = matchState(p.id, asks, asksYou);
    const tie = tieWith(p, k, peers);
    if (state === "asked-you") out.requests.push(p);
    else if (state === "matched" || tie) out.known.push({ peer: p, tie, together: state === "matched" });
    else out.others.push(p);
  }
  const rank = (x: GoingGroups["known"][number]) => (x.together ? 0 : x.tie?.kind === "friend" ? 1 : x.tie?.kind === "mutual" ? 3 : 2);
  out.known.sort((a, b) => rank(a) - rank(b));
  return out;
}

/** People she knows who are going to another event. Strangers are never pointed out. */
export function knownGoing(ids: string[] | undefined, peers: EventPeer[], k: Known) {
  return (ids ?? [])
    .map((id) => peers.find((p) => p.id === id))
    .filter((p): p is EventPeer => !!p)
    .map((peer) => ({ peer, tie: tieWith(peer, k, peers) }))
    .filter((x): x is { peer: EventPeer; tie: Tie } => !!x.tie && x.tie.kind !== "mutual");
}

export type Crowd = { going: number; peers: EventPeer[]; asksYou: string[] };
const hash = (s: string) => [...s].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7);

/** Who's going to any event. The scripted UX night keeps its story; other events list the classmates set for them, or a steady handful picked from the id, so every event has a People tab that stays the same between visits. */
export function crowdFor(eventId: string, pool: EventPeer[], main: Crowd & { id: string }, scripted: Record<string, string[]>): Crowd {
  if (eventId === main.id) return { going: main.going, peers: main.peers, asksYou: main.asksYou };
  const h = hash(eventId);
  const set = scripted[eventId];
  const peers = set
    ? set.map((id) => pool.find((p) => p.id === id)).filter((p): p is EventPeer => !!p)
    : [...pool].sort((a, b) => hash(eventId + a.id) - hash(eventId + b.id)).slice(0, 3 + (h % 5));
  return { going: peers.length + 6 + (h % 28), peers, asksYou: [] };
}
