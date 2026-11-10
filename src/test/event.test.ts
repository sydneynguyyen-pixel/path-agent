import { describe, expect, it } from "vitest";
import { symposiumEvent } from "@/data/event";
import { people } from "@/data/people";
import { experiences, postings } from "@/data/scenario";
import { followUp, inviteDraft, nextCard, nextStep, notesFor, recall, toMeet, visibleClassmates } from "@/lib/event";
import { evidenceFor } from "@/lib/skills";
import { ledgerSkills } from "@/data/scenario";

const reyes = people.find((p) => p.id === "reyes")!;
const order = symposiumEvent.deck;

describe("meet deck", () => {
  it("has 4 to 6 people, all real entries", () => {
    expect(order.length).toBeGreaterThanOrEqual(4);
    expect(order.length).toBeLessThanOrEqual(6);
    expect(order.every((id) => people.some((p) => p.id === id))).toBe(true);
  });

  it("shows the next unanswered card and keeps only people she chose to meet", () => {
    expect(nextCard(order, {})).toBe("reyes");
    const deck = { reyes: "meet", priya: "save", sam: "skip", club: "meet" } as const;
    expect(nextCard(order, deck)).toBe("marcus");
    expect(toMeet(order, deck)).toEqual(["reyes", "club"]);
    expect(nextCard(order, { ...deck, marcus: "skip" })).toBeNull();
  });

  it("never scores or ranks people", () => {
    for (const p of people) expect(JSON.stringify(p)).not.toMatch(/\d+%|score|rank|sure|high|medium/i);
  });
});

describe("classmates", () => {
  it("names only classmates who opted in and counts the rest", () => {
    const { shown, others } = visibleClassmates(symposiumEvent.classmates);
    expect(shown.map((c) => c.name)).toEqual(["Ana M.", "Jo T."]);
    expect(others).toBe(3);
  });

  it("can have nobody to show", () => {
    expect(visibleClassmates(symposiumEvent.classmates.map((c) => ({ ...c, optedIn: false }))).shown).toEqual([]);
  });

  it("drafts an invite she sends herself", () => {
    expect(inviteDraft("Ana M.", "symposium", "Thursday", "Maya Torres")).toContain("Want to go together?");
  });
});

describe("follow-up", () => {
  it("asks for a line instead of inventing one", () => {
    expect(followUp(reyes, undefined, "symposium", "Maya Torres")).toEqual({ kind: "ask" });
    expect(followUp(reyes, "   ", "symposium", "Maya Torres")).toEqual({ kind: "ask" });
  });

  it("uses only her note", () => {
    const r = followUp(reyes, "The lab takes new RAs in January.", "symposium", "Maya Torres");
    expect(r.kind).toBe("draft");
    if (r.kind === "draft") {
      expect(r.text).toContain("Hi Dr. Reyes");
      expect(r.text).toContain("You mentioned: the lab takes new RAs in January.");
      expect(r.text).not.toMatch(/poster|study spaces|Campus Spaces/i);
    }
  });
});

describe("people you've met", () => {
  it("recalls a returning person's notes and what she said she'd do", () => {
    const r = recall("priya", [], []);
    expect(r?.before[0]!.event).toBe("Harbor Health info session");
    expect(r?.open).toEqual(["Send Priya my ANTH 2 poster"]);
    expect(recall("priya", [], [{ id: "priya-2026-04-09", personId: "priya", text: "x", done: true }])?.open).toEqual([]);
    expect(recall("reyes", [], [])).toBeNull();
  });

  it("keeps notes with the person across events", () => {
    const notes = notesFor("priya", [{ personId: "priya", event: "Psych Research Symposium", date: "2026-11-19", text: "Intern apps open in Feb." }]);
    expect(notes.map((n) => n.event)).toEqual(["Harbor Health info session", "Psych Research Symposium"]);
  });

  it("puts an open promise ahead of anything else as the next step", () => {
    expect(nextStep(["reyes"], [{ id: "a", personId: "priya", text: "Send Priya the poster", done: false }], people)).toBe("Send Priya the poster");
    expect(nextStep(["reyes"], [], people)).toBe("Send Dr. Reyes your follow-up");
    expect(nextStep([], [], people)).toBeNull();
  });
});

describe("event wiring", () => {
  it("is on Experiences with a posting link", () => {
    expect(experiences.some((e) => e.id === symposiumEvent.id && e.date === symposiumEvent.date)).toBe(true);
    expect(postings[symposiumEvent.id]).toBeDefined();
  });

  it("talking at the event moves a Taught skill to Practiced", () => {
    const skill = ledgerSkills.find((s) => s.id === symposiumEvent.skillId)!;
    expect(evidenceFor(skill)).toBe("Taught");
    expect(evidenceFor(skill, { practiced: true })).toBe("Practiced");
  });
});
