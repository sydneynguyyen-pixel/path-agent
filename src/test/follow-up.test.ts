import { describe, expect, it } from "vitest";
import { followUpDraft, sharedSkill, type FollowUpInput } from "@/lib/followUp";

const base: FollowUpInput = {
  to: "Lena K.",
  event: "UX Night",
  note: "Her bus-stop sketches and how she turns research notes into visuals",
  herSkills: ["Observation", "User interviews", "Survey design"],
  theirSkills: ["Visual design", "user interviews", "Prototyping"],
  ask: "coffee",
  from: "Maya Torres",
};

describe("followUpDraft", () => {
  it("is deterministic: same input, same draft", () => {
    expect(followUpDraft(base)).toEqual(followUpDraft({ ...base }));
  });

  it("uses first names, the event, her note word for word, the shared skill and one ask", () => {
    const d = followUpDraft(base);
    expect(d.subject).toBe("Good to meet you at UX Night");
    expect(d.body).toBe(
      "Hi Lena,\n\nIt was good to meet you at UX Night. I enjoyed talking about your bus-stop sketches and how she turns research notes into visuals. We both have User interviews on our cards. Would you want to get coffee on campus sometime?\n\nMaya",
    );
    expect(d.shared).toBe("User interviews");
    // Her own words stay, read as written to Lena ("her" → "your").
    expect(d.body).toContain("your bus-stop sketches and how she turns research notes into visuals");
  });

  it("invents nothing: no note means no note line, no shared skill means no skill line", () => {
    const d = followUpDraft({ ...base, note: "   ", theirSkills: ["Prototyping"], ask: "keep-in-touch" });
    expect(d.shared).toBeNull();
    expect(d.body).toBe("Hi Lena,\n\nIt was good to meet you at UX Night. Let's stay in touch.\n\nMaya");
    // Nothing about them that she didn't write or that isn't on both cards.
    for (const word of ["Prototyping", "Graphic Design", "Torres", "K."]) expect(d.body).not.toContain(word);
  });

  it("keeps her own punctuation and asks for notes from the event", () => {
    const d = followUpDraft({ ...base, note: "Screen readers!", ask: "notes" });
    expect(d.body).toContain("I enjoyed talking about screen readers! ");
    expect(d.body).toContain("Want to swap notes from UX Night?");
  });

  it("matches shared skills without caring about case, in her order", () => {
    expect(sharedSkill(["Survey design", "Prototyping"], ["prototyping", "survey DESIGN"])).toBe("Survey design");
    expect(sharedSkill([], ["Prototyping"])).toBeNull();
  });
});
