import { describe, expect, it } from "vitest";
import { addAsk, addReply, barState, briefingLead, briefingStamp, byRecent, chipsFor, OPTIONS_THREAD, shouldOpenBriefing, TODAY_THREAD, placeholderFor, replyFor, suggestionsFor, titleFor } from "@/lib/chat";
import { topicFor } from "@/lib/desktop";

describe("bar state", () => {
  const base = { focused: false, text: "", working: false, needs: false };
  it("rests white until something happens", () => expect(barState(base)).toBe("rest"));
  it("glows when she clicks in", () => expect(barState({ ...base, focused: true })).toBe("focus"));
  it("is ready to send only with text", () => {
    expect(barState({ ...base, focused: true, text: "  " })).toBe("focus");
    expect(barState({ ...base, focused: true, text: "hi" })).toBe("ready");
  });
  it("working wins over everything", () => expect(barState({ focused: true, text: "hi", working: true, needs: true })).toBe("working"));
  it("shows what needs her only when she isn't typing", () => {
    expect(barState({ ...base, needs: true })).toBe("needs");
    expect(barState({ ...base, needs: true, focused: true })).toBe("focus");
  });
});

describe("threads", () => {
  it("starts a new thread when none is open", () => {
    const { threads, id } = addAsk([], null, "What's due this week?", 10);
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({ id, title: "What's due this week?", at: 10 });
  });
  it("adds to the open thread", () => {
    const a = addAsk([], null, "first", 1);
    const b = addAsk(a.threads, a.id, "second", 2);
    expect(b.id).toBe(a.id);
    expect(b.threads[0]!.messages.map((m) => m.text)).toEqual(["first", "second"]);
  });
  it("never writes into the options run", () => {
    const { threads } = addAsk([], OPTIONS_THREAD, "hello", 3);
    expect(threads[0]!.id).not.toBe(OPTIONS_THREAD);
  });
  it("puts the reply in the same thread with its topic", () => {
    const a = addAsk([], null, "What's due this week?", 1);
    const t = addReply(a.threads, a.id, "What's due this week?", 2);
    expect(t[0]!.messages.at(-1)).toMatchObject({ from: "agent", topic: "week" });
  });
  it("lists the latest first", () => {
    const a = addAsk([], null, "old", 1);
    const b = addAsk(a.threads, null, "new", 5);
    expect(byRecent(b.threads).map((t) => t.title)).toEqual(["new", "old"]);
  });
});

describe("titles and replies", () => {
  it("keeps short questions whole", () => expect(titleFor("Can I take BUS 21?")).toBe("Can I take BUS 21?"));
  it("cuts long ones at a word", () => {
    const t = titleFor("Can I still graduate in Spring 2028 if I drop statistics this winter");
    expect(t.endsWith("…")).toBe(true);
    expect(t.length).toBeLessThanOrEqual(41);
  });
  it("turns a note into a remembered note, not a topic", () => expect(replyFor("No classes before 10 am")).toEqual({ topic: null, note: "No classes before 10 am" }));
});

describe("page hints", () => {
  it("follows the page", () => {
    expect(placeholderFor("/")).toBe("Ask anything…");
    expect(placeholderFor("/semester")).toBe("Ask about your terms…");
  });
  it("only suggests questions the preview can answer", () => {
    for (const p of ["/", "/semester", "/degree", "/explore", "/career", "/settings"]) {
      for (const c of chipsFor(p)) expect(topicFor(c), c).not.toBeNull();
    }
  });
});

describe("home suggestions", () => {
  const ctx = { dueThisWeek: 3, daysToApply: 21, interest: "UX research", asked: [], seed: 0 };
  it("leads with the most pressing thing", () => expect(suggestionsFor(ctx)[0]).toContain("application is due in 21 days"));
  it("changes the second one with the seed", () => {
    const seconds = new Set([0, 1, 2, 3].map((seed) => suggestionsFor({ ...ctx, seed })[1]));
    expect(seconds.size).toBeGreaterThan(1);
  });
  it("drops what she already asked", () => {
    const first = suggestionsFor(ctx)[0]!;
    expect(suggestionsFor({ ...ctx, asked: [first] })).not.toContain(first);
  });
  it("skips the deadline once it's far off", () => expect(suggestionsFor({ ...ctx, daysToApply: 90 }).join(" ")).not.toContain("application"));
  it("only suggests questions the preview can answer", () => {
    for (let seed = 0; seed < 8; seed++) for (const q of suggestionsFor({ ...ctx, seed })) expect(topicFor(q), q).not.toBeNull();
  });
});

describe("today briefing", () => {
  const base = { path: "/", closedOn: null, today: "2026-11-08", count: 1 };
  it("opens on Home when something needs her", () => expect(shouldOpenBriefing(base)).toBe(true));
  it("stays closed the rest of the day once she closes it", () => {
    expect(shouldOpenBriefing({ ...base, closedOn: "2026-11-08" })).toBe(false);
    expect(shouldOpenBriefing({ ...base, closedOn: "2026-11-07" })).toBe(true);
  });
  it("only opens itself on Home", () => expect(shouldOpenBriefing({ ...base, path: "/semester" })).toBe(false));
  it("doesn't open when nothing needs her", () => expect(shouldOpenBriefing({ ...base, count: 0 })).toBe(false));
  it("is dated like a message", () => expect(briefingStamp("2026-11-08")).toBe("Sun, Nov 8 · 7:30 AM"));
  it("says how many things need her", () => {
    expect(briefingLead(0)).toContain("Nothing needs you");
    expect(briefingLead(1)).toBe("One thing needs you today.");
    expect(briefingLead(3)).toContain("3 things need you");
  });
  it("never writes into the briefing", () => {
    const { threads } = addAsk([], TODAY_THREAD, "hello", 3);
    expect(threads[0]!.id).not.toBe(TODAY_THREAD);
  });
});
