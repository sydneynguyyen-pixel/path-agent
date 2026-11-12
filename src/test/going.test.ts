import { describe, expect, it } from "vitest";
import { goTogetherEvent } from "@/data/scenario";
import { groupGoing, knownGoing, tieWith, type Known } from "@/lib/going";

const peers = goTogetherEvent.visiblePeers;
const none: Known = { friends: [], met: [{ peerId: "jordan", event: "Figma for Non-Designers" }], went: [{ peerId: "tomas", event: "Fall Career Fair" }] };
const asks = { sentTo: [], matched: [], passed: [] };

describe("who's going", () => {
  it("puts asks first, then people she knows, then everyone else", () => {
    const g = groupGoing(peers, asks, ["lena"], none);
    expect(g.requests.map((p) => p.id)).toEqual(["lena"]);
    expect(g.known.map((x) => x.peer.id)).toContain("jordan");
    expect(g.known.map((x) => x.peer.id)).toContain("tomas");
    expect(g.others.some((p) => p.id === "jordan" || p.id === "lena")).toBe(false);
    expect(g.requests.length + g.known.length + g.others.length).toBe(peers.length);
  });

  it("moves a match into people she knows, going together first", () => {
    const g = groupGoing(peers, { ...asks, matched: ["lena"] }, ["lena"], none);
    expect(g.requests).toEqual([]);
    expect(g.known[0]).toMatchObject({ together: true });
    expect(g.known[0]!.peer.id).toBe("lena");
  });

  it("shows friends of people she met as mutuals", () => {
    const ana = peers.find((p) => p.id === "ana")!;
    expect(tieWith(ana, none, peers)).toEqual({ kind: "mutual", text: "Friends with Jordan" });
    expect(tieWith(ana, { ...none, friends: ["ana"] }, peers)?.kind).toBe("friend");
  });

  it("filters by name, major or interest", () => {
    const g = groupGoing(peers, asks, ["lena"], none, "computer");
    const ids = [...g.requests, ...g.known.map((x) => x.peer), ...g.others].map((p) => p.id).sort();
    expect(ids).toEqual(["jordan", "kai"]);
  });

  it("only points out people she knows on other events", () => {
    expect(knownGoing(["jordan", "kai", "sofia"], peers, none).map((x) => x.peer.id)).toEqual(["jordan"]);
    expect(knownGoing(undefined, peers, none)).toEqual([]);
  });
});

import { crowdFor } from "@/lib/going";
describe("a crowd for every event", () => {
  const main = { id: "ux-night", going: 48, peers, asksYou: ["lena"] };
  it("keeps the scripted UX night", () => {
    expect(crowdFor("ux-night", peers, main, {})).toEqual({ going: 48, peers, asksYou: ["lena"] });
  });
  it("uses the classmates set for an event, and nobody asks", () => {
    const c = crowdFor("diary-studies", peers, main, { "diary-studies": ["jordan", "kai"] });
    expect(c.peers.map((p) => p.id)).toEqual(["jordan", "kai"]);
    expect(c.asksYou).toEqual([]);
    expect(c.going).toBeGreaterThan(c.peers.length);
  });
  it("gives other events a steady handful", () => {
    const a = crowdFor("archives-day", peers, main, {});
    expect(a.peers.length).toBeGreaterThanOrEqual(3);
    expect(crowdFor("archives-day", peers, main, {})).toEqual(a);
  });
});
