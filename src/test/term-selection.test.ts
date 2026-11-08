import { describe, expect, it } from "vitest";
import { defaultSelectedTermId, selectTerm } from "@/lib/term-selection";

describe("Term selection", () => {
  it("selects the registering term by default", () => {
    expect(defaultSelectedTermId).toBe("su27");
  });
  it("replaces the previous selection with exactly one clicked term", () => {
    expect(selectTerm("su27", "f25")).toBe("f25");
  });
  it("keeps the current selection for an unknown term", () => {
    expect(selectTerm("su27", "missing")).toBe("su27");
  });
});