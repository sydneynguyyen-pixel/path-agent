import { describe, expect, it } from "vitest";
import { opportunities } from "@/data/scenario";
import { listings } from "@/data/listings";

describe("listings", () => {
  it("gives every opportunity the host's own description", () => {
    for (const o of opportunities) expect(listings[o.id]?.about.length, o.id).toBeGreaterThan(0);
  });
  it("only links to fictional .example sites", () => {
    for (const l of Object.values(listings)) for (const k of l.links ?? []) expect(new URL(k.url).hostname).toMatch(/\.example$/);
  });
});
