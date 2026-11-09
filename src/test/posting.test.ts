import { describe, expect, it } from "vitest";
import { readPosting } from "@/lib/posting";

describe("readPosting", () => {
  it("asks for the description when only a link is given", () => { expect(readPosting("https://www.linkedin.com/jobs/view/123").kind).toBe("link"); });
  it("finds skills with the sentence they came from", () => {
    const r = readPosting("You will run usability testing with customers. You should know SQL and build dashboards for the team. Nothing else here matters much to us at all.");
    expect(r.kind).toBe("ok");
    if (r.kind === "ok") { expect(r.found.map((f) => f.name)).toEqual(expect.arrayContaining(["Usability testing", "SQL", "Data visualization"])); expect(r.found[0]!.quote).toContain("usability"); }
  });
  it("does not invent skills", () => {
    const r = readPosting("We are a friendly team that likes lunch and long walks and board games on Fridays every single week of the year.");
    expect(r.kind === "ok" && r.found.length).toBe(0);
  });
});
