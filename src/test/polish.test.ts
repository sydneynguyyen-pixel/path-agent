import { describe, expect, it } from "vitest";
import { buildLensMap, lensAt } from "@/lib/glass";
import { DEFAULT_THEME, THEMES, resolveTheme } from "@/lib/theme";

describe("liquid glass lens", () => {
  it("leaves the flat center alone", () => {
    expect(lensAt(50, 20, 100, 40, 20, 8)).toEqual([0, 0]);
  });
  it("bends toward the center near each edge", () => {
    expect(lensAt(1, 20, 100, 40, 20, 8)[0]).toBeGreaterThan(0);
    expect(lensAt(99, 20, 100, 40, 20, 8)[0]).toBeLessThan(0);
    expect(lensAt(50, 1, 100, 40, 20, 8)[1]).toBeGreaterThan(0);
  });
  it("bends more at the rim than further in", () => {
    expect(lensAt(1, 20, 100, 40, 20, 8)[0]).toBeGreaterThan(lensAt(6, 20, 100, 40, 20, 8)[0]);
  });
  it("writes neutral gray outside the rounded corners", () => {
    const map = buildLensMap(40, 40, 20, 8);
    expect(map.length).toBe(40 * 40 * 4);
    expect(map[0]).toBe(128);
    expect(map[1]).toBe(128);
    expect(map[3]).toBe(255);
  });
});

describe("themes", () => {
  it("falls back to the clean default for anything unknown", () => {
    expect(resolveTheme("nope")).toBe(DEFAULT_THEME);
    expect(resolveTheme(null)).toBe(DEFAULT_THEME);
  });
  it("keeps a real theme", () => {
    for (const t of THEMES) expect(resolveTheme(t.id)).toBe(t.id);
  });
});
