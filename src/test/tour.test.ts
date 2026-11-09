import { describe, expect, it } from "vitest";
import { nextBeat, tourSlides } from "@/lib/tour";

describe("tourSlides", () => {
  it("has five uniquely named slides", () => {
    expect(tourSlides).toHaveLength(5);
    expect(new Set(tourSlides.map((s) => s.id)).size).toBe(5);
  });

  it("keeps each loop short enough to watch", () => {
    for (const slide of tourSlides) {
      const total = slide.beats.reduce((sum, b) => sum + b.ms, 0);
      expect(total).toBeLessThanOrEqual(8000);
    }
  });

  it("only clicks where the pointer already is", () => {
    for (const slide of tourSlides) {
      slide.beats.forEach((beat, i) => {
        if (beat.click) expect(slide.beats[i - 1]?.cursor).toBe(beat.cursor);
      });
    }
  });
});

describe("nextBeat", () => {
  it("advances, then loops", () => {
    expect(nextBeat(0, 3)).toBe(1);
    expect(nextBeat(2, 3)).toBe(0);
  });
});
