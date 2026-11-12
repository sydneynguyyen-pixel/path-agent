import { describe, expect, it } from "vitest";
import { daysUntil, dueThisWeek, homeLayout, weekStrip, type HomeAlert } from "@/lib/home";
import { fallWork } from "@/data/scenario";

const a = (id: string, level: HomeAlert["level"]): HomeAlert => ({ id, level });

describe("home alerts", () => {
  const alerts = [a("u1", "update"), a("apply", "deadline"), a("match", "decision"), a("u2", "update"), a("u3", "update"), a("s1", "suggestion")];

  it("puts deadlines in the bar and never lets them be cleared", () => {
    const l = homeLayout(alerts, { apply: "dismissed" });
    expect(l.bar.map((x) => x.id)).toEqual(["apply"]);
    expect(l.rows.map((x) => x.id)).not.toContain("apply");
  });

  it("shows at most three action rows, decisions first, and sends the rest to the inbox", () => {
    const l = homeLayout(alerts, {});
    expect(l.rows.map((x) => x.id)).toEqual(["match", "u1", "u2"]);
    expect(l.inbox.map((x) => x.id)).toEqual(["u3"]);
    expect(l.unread).toBe(1);
  });

  it("moves snoozed and dismissed items to the inbox; only snoozed ones count on the bell", () => {
    const l = homeLayout(alerts, { match: "snoozed", u1: "dismissed" });
    expect(l.rows.map((x) => x.id)).toEqual(["u2", "u3"]);
    expect(l.inbox.map((x) => x.id)).toEqual(["match", "u1"]);
    expect(l.unread).toBe(1);
  });

  it("keeps suggestions out of the rows and the count", () => {
    const l = homeLayout(alerts, {});
    expect(l.suggestions.map((x) => x.id)).toEqual(["s1"]);
  });
});

describe("this week", () => {
  it("lists what's due in the seven days from today", () => {
    expect(dueThisWeek(fallWork, "2026-11-08").map((w) => w.label)).toEqual(["Interview transcript", "Written critique", "Museum visit notes"]);
  });
  it("counts days to a deadline", () => {
    expect(daysUntil("2026-11-30", "2026-11-08")).toBe(22);
  });

  it("lays out the next seven days with what's due on each", () => {
    const days = weekStrip([{ date: "2026-11-10" }, { date: "2026-11-10" }, { date: "2026-11-20" }], "2026-11-08");
    expect(days.map((d) => d.date)).toEqual(["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"]);
    expect(days.map((d) => d.items.length)).toEqual([0, 0, 2, 0, 0, 0, 0]);
  });
});
