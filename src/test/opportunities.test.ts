import { describe, expect, it } from "vitest";
import { careerRoles, freeTime, goTogetherEvent, opportunities, terms, type Term } from "@/data/scenario";
import { canConfirm, fillsLine, notOnPlan, degreeLine, doneLine, doneToast, gapProgress, goalFor, nextSuggestion, otherWays, planName, planTermId, skillsFromDoing, suggestionWhy, gapSignal, deadlineDate, deadlineLine, detailLine, exploreResults, fitsWeek, groupByDate, groupByGap, helloDraft, hostLine, NO_FILTERS, reasonFor, stillOpen, timeLeftLine, whoIsGoing, whyLine, type ExploreFilters } from "@/lib/opportunities";

const byId = (id: string) => opportunities.find((o) => o.id === id)!;

describe("explore data", () => {
  it("gives every gap of every role at least two different kinds of thing", () => {
    for (const role of careerRoles) {
      for (const { gap, items } of groupByGap(role.missing, opportunities, freeTime)) {
        expect(new Set(items.map((o) => o.kind)).size, `${role.id}: ${gap}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("has no way to pay for a listing", () => {
    for (const o of opportunities) expect(Object.keys(o).some((k) => /sponsor|paid|promot/i.test(k))).toBe(false);
  });
});

describe("schools nearby", () => {
  const ids = (f: Partial<ExploreFilters>) => exploreResults(opportunities, { ...NO_FILTERS, kind: "class", ...f }, [], freeTime).map((o) => o.id);

  it("shows only your schools until you ask for more", () => {
    expect(ids({})).not.toContain("lcc-psyc20");
    expect(ids({})).toContain("dsgn20");
  });
  it("adds nearby schools after your own", () => {
    const all = ids({ nearbySchools: true });
    expect(all).toContain("lcc-psyc20");
    expect(all.indexOf("dsgn20")).toBeLessThan(all.indexOf("rbc-soc31"));
  });
  it("shows a nearby school when you pick it by name", () => {
    expect(ids({ place: "Lakeshore CC" })).toEqual(expect.arrayContaining(["lcc-psyc20", "lcc-libr10"]));
  });
  it("prices every class and names how far away it is", () => {
    for (const o of opportunities.filter((x) => x.kind === "class")) expect(o.cost, o.id).toBeGreaterThan(0);
    expect(detailLine(byId("dsgn20"))).toBe("$1,188 · Fall 2027 · 3 semester units");
    expect(hostLine(byId("lcc-psyc20"))).toBe("Lakeshore CC · 9 mi away");
    expect(hostLine(byId("dsgn20"))).toBe("Northgate State");
  });
});

describe("reasonFor", () => {
  it("names the gap and the free time", () => {
    expect(reasonFor(byId("design-club"), "Usability testing", freeTime)).toBe("Fills your usability testing gap. Fits your Tuesday afternoons.");
  });
  it("keeps acronyms and says when a time is busy", () => {
    expect(reasonFor(byId("sql-sprint"), "SQL", freeTime)).toContain("your SQL gap");
    expect(reasonFor(byId("policy-committee"), "Policy evaluation", freeTime)).toContain("Meets Thursday evenings, when you're usually busy");
  });
});

describe("groupByGap", () => {
  it("shows an item once and puts what fits the week first", () => {
    const groups = groupByGap(["Policy evaluation", "Data analysis in R"], opportunities, freeTime);
    const ids = groups.flatMap((g) => g.items.map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
    const policy = groups[0]!.items;
    expect(fitsWeek(policy[policy.length - 1]!, freeTime)).toBe(false);
  });
});

describe("time left", () => {
  const lastTerm: Term[] = terms.map((t) => (t.id === "sp29" ? t : { ...t, status: "done" as const }));
  const noTerms: Term[] = terms.map((t) => ({ ...t, status: "done" as const }));

  it("counts remaining terms", () => {
    expect(timeLeftLine(terms, [byId("dsgn20"), byId("design-club")])).toBe("You have 5 terms left, through Spring 2029. All 2 of these still fit.");
  });
  it("drops what has passed and keeps what is open to recent grads", () => {
    expect(stillOpen([byId("dsgn20"), byId("library-usability")], lastTerm).map((o) => o.id)).toEqual(["library-usability"]);
  });
  it("never says it is too late", () => {
    expect(timeLeftLine(noTerms, [byId("dsgn20"), byId("library-usability")])).toBe("This is your last term, and it isn't too late. 1 of these 2 still fit.");
  });
});

describe("going together", () => {
  it("shows only a count until the student opts in", () => {
    expect(whoIsGoing(goTogetherEvent, false)).toEqual({ count: 4, visible: [], private: 4 });
  });
  it("then shows only people who also opted in", () => {
    const seen = whoIsGoing(goTogetherEvent, true);
    expect(seen.visible.map((p) => p.id)).toEqual(["tomas", "lena"]);
    expect(seen.private).toBe(2);
  });
  it("drafts a first-name note", () => {
    expect(helloDraft("Tomás R.", "UX night", "Maya Reyes")).toMatch(/^Hi Tomás, .*Want to go together\?\n\nMaya$/s);
  });
});

describe("explore filters", () => {
  const free = freeTime;
  const ids = (f: Partial<ExploreFilters>) => exploreResults(opportunities, { ...NO_FILTERS, ...f }, [], free).map((o) => o.id);

  it("searches titles, hosts and skills, with every word required", () => {
    expect(ids({ query: "archive open" })).toEqual(["archives-day"]);
    expect(ids({ query: "SQL" })).toContain("market-intern");
    expect(ids({ query: "nothing like this" })).toEqual([]);
  });
  it("narrows by type, skill, subject, place, industry and career together", () => {
    expect(new Set(exploreResults(opportunities, { ...NO_FILTERS, kind: "class" }, [], free).map((o) => o.kind))).toEqual(new Set(["class"]));
    expect(ids({ skill: "SQL", place: "Off campus" }).sort()).toEqual(["civic-data", "market-intern"]);
    expect(ids({ subject: "Art & history", industry: "Libraries & museums" })).toHaveLength(3);
    expect(ids({ careerGaps: ["Collections management"] }).sort()).toEqual(["archive-volunteers", "archives-day", "museum-intern"]);
  });
  it("never treats a class as free time, and drops what meets when the student is busy", () => {
    const result = ids({ freeTimeOnly: true });
    expect(result).not.toContain("dsgn20");
    expect(result).not.toContain("policy-committee");
    expect(result).toContain("ux-night");
  });
  it("puts what fills a gap first", () => {
    expect(exploreResults(opportunities, NO_FILTERS, ["SQL"], free).slice(0, 3).every((o) => o.fills.includes("SQL"))).toBe(true);
  });
  it("doesn't claim a gap the student doesn't have", () => {
    const o = opportunities.find((x) => x.id === "sql-sprint")!;
    expect(whyLine(o, ["Survey design"], free)).toMatch(/^Builds SQL\./);
    expect(whyLine(o, ["SQL"], free)).toMatch(/^Fills your SQL gap\./);
  });
  it("gives everything but classes a flyer", () => {
    for (const o of opportunities) expect(!!o.flyer, o.id).toBe(o.kind !== "class");
  });

  it("never repeats a flyer layout", () => {
    const styles = opportunities.flatMap((o) => (o.flyer ? [o.flyer.style] : []));
    expect(new Set(styles).size).toBe(styles.length);
  });

  it("gives classes and internships a deadline before they start, and nothing else", () => {
    for (const o of opportunities) {
      if (o.kind === "class" || o.kind === "internship") expect(o.deadline! < o.startsOn, o.id).toBe(true);
      else expect(o.deadline, o.id).toBeUndefined();
    }
  });

  it("lists classes by when to register, not when they start", () => {
    const classes = opportunities.filter((o) => o.kind === "class");
    const groups = groupByDate(classes, deadlineDate);
    expect(groups[0]!.date).toBe("2027-06-07");
    expect(groups.find((g) => g.date === "2027-06-18")!.items.map((o) => o.id)).toEqual(["cis22", "math17"]);
    expect(deadlineLine(byId("cis22"))).toBe("Register by Jun 18, 2027");
    expect(deadlineLine(byId("county-policy"))).toBe("Apply by Mar 1, 2027");
  });

  it("groups the calendar by date, soonest first", () => {
    const groups = groupByDate(opportunities);
    expect(groups.map((g) => g.date)).toEqual([...groups.map((g) => g.date)].sort());
    expect(groups.flatMap((g) => g.items)).toHaveLength(opportunities.length);
  });
});

describe("the loop from Explore to your plan and Skills", () => {
  const today = "2026-11-08";
  const gaps = ["Usability testing", "Survey design"];

  it("puts something happening soon in the term you're in, and later things in their own term", () => {
    expect(planTermId(byId("ux-night"), terms, today)).toBe("sp27");
    expect(planTermId(byId("library-usability"), terms, today)).toBe("su27");
  });

  it("only lets you confirm things that build a skill and are happening now", () => {
    expect(canConfirm(byId("design-club"), terms, today)).toBe(true);
    expect(canConfirm(byId("ux-night"), terms, today)).toBe(false);
    expect(canConfirm(byId("library-usability"), terms, today)).toBe(false);
    expect(canConfirm(byId("cis22"), terms, today)).toBe(false);
  });

  it("saving alone never counts as progress", () => {
    expect(gapProgress("Usability testing", [byId("design-club")], [])?.stage).toBe("planned");
    expect(skillsFromDoing([byId("design-club")], [])).toEqual([]);
  });

  it("never counts an event as a skill, even if it's marked as attended", () => {
    expect(gapProgress("Usability testing", [byId("ux-night")], ["ux-night"])).toBeNull();
    expect(skillsFromDoing([byId("ux-night")], ["ux-night"])).toEqual([]);
    expect(gapSignal(byId("ux-night"), "Usability testing")).toBe("Intro to usability testing");
  });

  it("calls joining a club a start and an internship practice", () => {
    expect(gapProgress("Usability testing", [byId("design-club")], ["design-club"])?.stage).toBe("started");
    expect(gapProgress("Usability testing", [byId("design-club"), byId("library-usability")], ["design-club", "library-usability"])).toMatchObject({ stage: "practiced", via: { id: "library-usability" } });
    expect(gapProgress("SQL", [byId("design-club")], ["design-club"])).toBeNull();
  });

  it("lists each skill once", () => {
    const skills = skillsFromDoing([byId("research-circle"), byId("nonprofit-eval")], ["research-circle", "nonprofit-eval"]).map((s) => s.skill);
    expect(skills.filter((s) => s === "Data analysis")).toHaveLength(1);
  });

  it("suggests the event that fits, then moves on once it's handled", () => {
    const first = nextSuggestion(opportunities, gaps, freeTime, [], today);
    expect(first?.id).toBe("ux-night");
    expect(suggestionWhy(first!, gaps, "UX researcher")).toBe("See usability testing up close, which UX researcher roles ask for. You're free Tuesday evenings.");
    expect(suggestionWhy(byId("design-club"), gaps, "UX researcher")).toBe("Practice usability testing each week, which UX researcher roles ask for. You're free Tuesday afternoons.");
    expect(nextSuggestion(opportunities, gaps, freeTime, ["ux-night"], today)?.id).toBe("design-club");
    expect(nextSuggestion(opportunities, ["Survey design"], freeTime, [], today)?.fills).toContain("Survey design");
  });

  it("never suggests something you're busy for or that's far off", () => {
    expect(nextSuggestion(opportunities, ["Policy evaluation"], freeTime, [], today)).toBeUndefined();
  });

  it("is honest about what counts toward the degree", () => {
    for (const o of opportunities) expect(o.kind === "class", o.id).toBe(o.degree !== undefined);
    expect(degreeLine(byId("library-usability"))).toBe("Won't count toward your degree");
    expect(degreeLine(byId("psyc41"))).toBe("Counts toward your major");
    expect(degreeLine(byId("lcc-psyc20"))).toBe("Ask your counselor if it counts");
  });

  it("offers one option of each other kind for the same skill", () => {
    const ways = otherWays(byId("ux-night"), "Usability testing", opportunities);
    expect(ways.map((o) => o.kind).sort()).toEqual(["class", "club", "internship"]);
    expect(ways.every((o) => o.fills.includes("Usability testing") && o.milesAway === undefined)).toBe(true);
    expect(otherWays(byId("design-club"), "Usability testing", opportunities).map((o) => o.kind).sort()).toEqual(["class", "internship"]);
  });

  it("names things the way a sentence would", () => {
    expect(planName(byId("ux-night"))).toBe("the UX night");
    expect(planName(byId("design-club"))).toBe("People + Products Club");
    expect(doneLine(byId("design-club"))).toBe("You joined People + Products Club");
    expect(doneToast(byId("design-club"))).toBe("Usability testing started");
  });

  it("works toward the role you marked", () => {
    expect(goalFor(careerRoles, ["museum"]).id).toBe("museum");
    expect(goalFor(careerRoles, []).id).toBe(careerRoles[0]!.id);
  });
});

describe("Explore only shows what isn't on the plan", () => {
  const cls = opportunities.find((o) => o.kind === "class" && o.courseCode)!;
  it("drops saved items and draft classes", () => {
    expect(notOnPlan(cls, [], [])).toBe(true);
    expect(notOnPlan(cls, [cls.id], [])).toBe(false);
    expect(notOnPlan(cls, [], [cls.courseCode!])).toBe(false);
  });
  it("only says what classes fill", () => {
    const other = opportunities.find((o) => o.kind !== "class")!;
    expect(fillsLine(other)).toBeUndefined();
  });
});
