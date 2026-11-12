import { describe, expect, it } from "vitest";
import { themeFor, addWidget, cleanDesk, cleanWidgets, DEFAULT_WIDGETS, moveWidget, removeWidget, resizeWidget, resolveWallpaper, seasonFor, topicFor } from "@/lib/desktop";

describe("desktop widgets", () => {
  it("adds each kind once, at a size it supports", () => {
    const a = addWidget(DEFAULT_WIDGETS, "skills");
    expect(a.at(-1)).toEqual({ kind: "skills", size: "m" });
    expect(addWidget(a, "skills")).toBe(a);
    expect(addWidget([], "deadline", "l")).toEqual([{ kind: "deadline", size: "m" }]);
  });

  it("removes, moves and resizes", () => {
    expect(removeWidget(DEFAULT_WIDGETS, "week").map((w) => w.kind)).toEqual(["deadline", "path", "next"]);
    expect(moveWidget(DEFAULT_WIDGETS, "next", 0).map((w) => w.kind)).toEqual(["next", "week", "deadline", "path"]);
    expect(moveWidget(DEFAULT_WIDGETS, "week", 99).map((w) => w.kind)).toEqual(["deadline", "path", "next", "week"]);
    expect(resizeWidget(DEFAULT_WIDGETS, "path", "l").find((w) => w.kind === "path")?.size).toBe("l");
    expect(resizeWidget(DEFAULT_WIDGETS, "match", "l")).toBe(DEFAULT_WIDGETS);
    expect(resizeWidget(DEFAULT_WIDGETS, "deadline", "l")).toBe(DEFAULT_WIDGETS);
  });

  it("cleans what comes back from storage", () => {
    expect(cleanWidgets("nope")).toBe(DEFAULT_WIDGETS);
    expect(cleanWidgets([{ kind: "week", size: "s" }, { kind: "week", size: "l" }, { kind: "ghost", size: "m" }, null])).toEqual([{ kind: "week", size: "m" }]);
    expect(cleanDesk({ wallpaper: "neon" }).wallpaper).toBe("season");
    expect(cleanDesk({ wallpaper: "lilac", widgets: [] })).toEqual({ wallpaper: "lilac", widgets: [] });
  });
});

describe("wallpaper", () => {
  it("follows the term when set to season", () => {
    expect(seasonFor("2026-11-08")).toBe("fall");
    expect(seasonFor("2027-01-10")).toBe("winter");
    expect(seasonFor("2027-04-01")).toBe("spring");
    expect(seasonFor("2027-07-01")).toBe("summer");
    expect(resolveWallpaper("season", "2026-12-15")).toBe("winter");
    expect(resolveWallpaper("aqua", "2026-12-15")).toBe("aqua");
  });

  it("sets a site theme that matches the wallpaper", () => {
    expect(themeFor("season", "2026-11-08")).toBe("dawn");
    expect(themeFor("lilac", "2026-11-08")).toBe("orchid");
    expect(themeFor("summer", "2026-11-08")).toBe("meadow");
  });
});

describe("ask topics", () => {
  it("maps a question to the widget that answers it", () => {
    expect(topicFor("What's due this week?")).toBe("week");
    expect(topicFor("Can I still graduate Spring '28?")).toBe("path");
    expect(topicFor("Find a club for UX")).toBe("next");
    expect(topicFor("When is my transfer application due")).toBe("deadline");
    expect(topicFor("tell me a joke")).toBeNull();
  });
});
