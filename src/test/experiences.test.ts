import { describe, expect, it } from "vitest";
import { experiences } from "@/data/scenario";
import { attendance, clashes, eventSkillKey, fromAccounts, seasonOf, sharedProfile, skillsFromEvents, timeline } from "@/lib/experiences";

const TODAY = "2026-11-08";
const all = fromAccounts(experiences, ["luma", "eventbrite", "handshake"]);
const byId = (id: string) => all.find((e) => e.id === id)!;

describe("event accounts", () => {
  it("shows nothing until a service is connected", () => {
    expect(fromAccounts(experiences, [])).toEqual([]);
  });

  it("shows only events from connected services", () => {
    const handshake = fromAccounts(experiences, ["handshake"]);
    expect(handshake.length).toBeGreaterThan(0);
    expect(handshake.every((e) => e.via.includes("handshake"))).toBe(true);
  });

  it("shows an event listed on two services once, with the stronger proof", () => {
    expect(all.filter((e) => e.id === "civic-hack")).toHaveLength(1);
    expect(byId("civic-hack").via).toEqual(["luma", "handshake"]);
    expect(byId("civic-hack").proof).toBe("checked-in");
    expect(fromAccounts(experiences, ["handshake"]).find((e) => e.id === "civic-hack")!.proof).toBe("rsvp");
  });
});

describe("attendance", () => {
  it("counts a check-in without asking", () => {
    expect(attendance(byId("figma-intro"), TODAY, {})).toBe("checked-in");
  });

  it("asks about a past ticket instead of assuming", () => {
    expect(attendance(byId("mhfa"), TODAY, {})).toBe("ask");
    expect(attendance(byId("mhfa"), TODAY, { mhfa: "went" })).toBe("confirmed");
    expect(attendance(byId("mhfa"), TODAY, { mhfa: "missed" })).toBe("missed");
  });

  it("treats future events as upcoming", () => {
    expect(attendance(byId("winter-fair"), TODAY, {})).toBe("upcoming");
  });
});

describe("timeline", () => {
  it("puts the soonest upcoming first and groups the past by term, newest first", () => {
    const t = timeline(all, TODAY);
    expect(t.upcoming[0]!.id).toBe("civic-data-up");
    expect(t.seasons.map((s) => s.season)).toEqual(["Fall 2026", "Summer 2026", "Spring 2026", "Fall 2025"]);
    expect(seasonOf("2026-05-02")).toBe("Spring 2026");
  });

  it("flags upcoming events that overlap", () => {
    const c = clashes(timeline(all, TODAY).upcoming);
    expect(c["civic-data-up"]!.id).toBe("survey-lab-up");
    expect(c["survey-lab-up"]!.id).toBe("civic-data-up");
    expect(c["winter-fair"]).toBeUndefined();
  });
});

describe("skills from events", () => {
  it("uses only events the student went to", () => {
    const names = skillsFromEvents(all, TODAY, {}).map((s) => s.name);
    expect(names).not.toContain("Active listening");
    expect(names).not.toContain("Survey design");
    expect(skillsFromEvents(all, TODAY, { mhfa: "went" }).map((s) => s.name)).toContain("Active listening");
  });

  it("merges a skill across events and keeps the strongest evidence", () => {
    const proto = skillsFromEvents(all, TODAY, {}).find((s) => s.id === "prototyping")!;
    expect(proto.events.map((e) => e.id).sort()).toEqual(["civic-hack", "figma-intro"]);
    expect(proto.level).toBe("Demonstrated");
  });

  it("links a skill to the course that also teaches it", () => {
    const obs = skillsFromEvents(all, TODAY, { symposium: "went" }).find((s) => s.id === "observation")!;
    expect(obs.courses).toEqual(["ANTH 2"]);
  });
});

describe("shared profile", () => {
  it("shares nothing by default", () => {
    expect(sharedProfile(all, TODAY, {}, {}, [])).toEqual({ experiences: [], skills: [] });
  });

  it("leaves out events the student didn't go to and skills they didn't confirm", () => {
    const reviews = { [eventSkillKey("prototyping")]: { confirmed: true } };
    const p = sharedProfile(all, TODAY, { mhfa: "missed" }, reviews, ["civic-hack", "mhfa", "winter-fair"]);
    expect(p.experiences.map((e) => e.id)).toEqual(["civic-hack"]);
    expect(p.skills.map((s) => s.id)).toEqual(["prototyping"]);
  });
});
