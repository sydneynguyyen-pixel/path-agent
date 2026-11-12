import { describe, expect, it, beforeEach } from "vitest";
import { courseAt, courseIn, firstThisSession, isLinked, jumpTarget, lightCourse, pileupKey, reflowPlan, staggerDelay } from "@/lib/motion-plan";

const courses = ["ENGL 1B", "STAT 2", "PSYC 1", "PSYC 10"];

describe("motion-plan", () => {
  it("finds the class a due chip or row names, preferring the longest code", () => {
    expect(courseIn("ENGL 1B Research paper, due Friday, Jan 29", courses)).toBe("ENGL 1B");
    expect(courseIn("PSYC 10 Lab report", courses)).toBe("PSYC 10");
    expect(courseIn("PSYC 1", courses)).toBe("PSYC 1");
    expect(courseIn("PSYC 100 Quiz", courses)).toBeNull();
    expect(courseIn(null, courses)).toBeNull();
  });

  it("links only the hovered class", () => {
    expect(isLinked("ENGL 1B", "ENGL 1B")).toBe(true);
    expect(isLinked("ENGL 1B", "STAT 2")).toBe(false);
    expect(isLinked(null, null)).toBe(false);
  });

  it("marks matching chips and rows, and clears the rest", () => {
    document.body.innerHTML = `<div id="r">
      <button aria-label="ENGL 1B Research paper, due Friday"><span class="class-chip">Research paper</span></button>
      <button aria-label="STAT 2 Quiz, due Monday"><span class="class-chip">Quiz</span></button>
      <ul><li class="class-chip cal-class"><b>ENGL 1B</b></li><li data-plan-course="STAT 2">STAT 2</li></ul>
    </div>`;
    const root = document.getElementById("r")!;
    const [chipA, chipB] = root.querySelectorAll("button");
    expect(courseAt(chipA!.firstElementChild, courses)).toBe("ENGL 1B");
    expect(courseAt(root.querySelector("b"), courses)).toBe("ENGL 1B");
    lightCourse(root, "ENGL 1B", courses);
    expect(chipA!.hasAttribute("data-plan-hot")).toBe(true);
    expect(chipB!.hasAttribute("data-plan-hot")).toBe(false);
    expect(root.querySelector(".cal-class")!.hasAttribute("data-plan-hot")).toBe(true);
    lightCourse(root, "STAT 2", courses);
    expect(chipA!.hasAttribute("data-plan-hot")).toBe(false);
    expect(root.querySelector("[data-plan-course]")!.hasAttribute("data-plan-hot")).toBe(true);
    lightCourse(root, null, courses);
    expect(root.querySelectorAll("[data-plan-hot]")).toHaveLength(0);
  });

  it("splits a result change into cards that came, stayed and left", () => {
    expect(reflowPlan(["a", "b", "c"], ["b", "d", "a"])).toEqual({ entering: ["d"], staying: ["b", "a"], leaving: ["c"] });
    expect(reflowPlan([], ["a"])).toEqual({ entering: ["a"], staying: [], leaving: [] });
  });

  it("staggers 30 ms apart and caps the wait", () => {
    expect([0, 1, 2].map(staggerDelay)).toEqual([0, 30, 60]);
    expect(staggerDelay(50)).toBe(240);
    expect(staggerDelay(-1)).toBe(0);
  });

  it("jumps to the picked event on that day, else the day's first", () => {
    const shown = [{ id: "x", date: "2026-11-12" }, { id: "y", date: "2026-11-14" }, { id: "z", date: "2026-11-14" }];
    expect(jumpTarget(shown, "2026-11-14", "z")).toBe("z");
    expect(jumpTarget(shown, "2026-11-14", "x")).toBe("y");
    expect(jumpTarget(shown, "2026-11-20", null)).toBeNull();
  });

  describe("once per session", () => {
    beforeEach(() => sessionStorage.clear());
    it("speaks the first time only", () => {
      const key = pileupKey(" 3 things due in Week 4. ");
      expect(key).toBe("pa-pileup-spoken:3 things due in Week 4.");
      expect(firstThisSession(key)).toBe(true);
      expect(firstThisSession(key)).toBe(false);
    });
  });
});
