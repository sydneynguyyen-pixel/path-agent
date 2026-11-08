import { describe, expect, it } from "vitest";
import { subjectFor, seasonFor } from "@/components/app/Brand";

describe("Reader visual tags", () => {
  it("matches the course prefix before the title", () => {
    expect(subjectFor("MATH 13 Elementary Statistics")).toBe("math");
    expect(subjectFor("BCC PSYC 5 Statistics for Behavioral Sciences")).toBe("psychology");
  });
  it("uses a neutral book when the subject is uncertain", () => {
    expect(subjectFor("PHIL 2 Ethics")).toBe("neutral");
    expect(subjectFor("Elective Open elective")).toBe("neutral");
  });
  it("matches the term season without guessing from dates", () => {
    expect(seasonFor("Winter 2027")).toBe("winter");
    expect(seasonFor("Summer 2027")).toBe("summer");
    expect(seasonFor("Term 1")).toBe("neutral");
  });
});