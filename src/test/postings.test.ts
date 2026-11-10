import { describe, expect, it } from "vitest";
import { experiences, opportunities } from "@/data/scenario";
import { postingFor } from "@/lib/postings";

describe("original postings", () => {
  it("links every opportunity and every event to where it was posted", () => {
    for (const item of [...opportunities, ...experiences]) expect(postingFor(item), item.id).toBeDefined();
  });

  it("uses one posting for an event that matches an opportunity", () => {
    for (const e of experiences.filter((e) => e.opportunityId)) {
      expect(postingFor(e)).toBe(postingFor(opportunities.find((o) => o.id === e.opportunityId)!));
    }
  });

  it("never links a fictional school or group to a real domain", () => {
    const real = ["lu.ma", "www.eventbrite.com", "app.joinhandshake.com"];
    for (const item of [...opportunities, ...experiences]) {
      const host = new URL(postingFor(item)!.url).hostname;
      expect(real.includes(host) || host.endsWith(".example"), `${item.id}: ${host}`).toBe(true);
    }
  });
});
