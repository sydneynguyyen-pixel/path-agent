import { describe, expect, it } from "vitest";
import { DEMO_SIGNUP_CODE, setupDirectory } from "@/data/scenario";
import { isSignupCode, searchDirectory } from "@/lib/onboarding";

describe("searchDirectory", () => {
  it("matches any part of the name, ignoring case", () => {
    expect(searchDirectory(setupDirectory.college, "  BAYV ").map((e) => e.id)).toEqual(["bayview"]);
    expect(searchDirectory(setupDirectory.transfer, "state").map((e) => e.id)).toEqual(["northgate", "harbor"]);
  });

  it("lists pickable entries first, even with no query", () => {
    for (const list of Object.values(setupDirectory)) expect(searchDirectory(list, "")[0]?.available).toBe(true);
  });

  it("returns nothing when no school matches", () => {
    expect(searchDirectory(setupDirectory.college, "zzz")).toEqual([]);
  });
});

describe("isSignupCode", () => {
  it("accepts only the demo code", () => {
    expect(isSignupCode(` ${DEMO_SIGNUP_CODE} `)).toBe(true);
    expect(isSignupCode("000000")).toBe(false);
    expect(isSignupCode("")).toBe(false);
  });
});
