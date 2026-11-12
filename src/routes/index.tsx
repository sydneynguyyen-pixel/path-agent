import { createFileRoute } from "@tanstack/react-router";
import { FALL_2026_START, FALL_2026_WEEKS, progress, student } from "@/data/scenario";
import { currentWeek } from "@/lib/weeks";
import { BlankHome } from "@/components/app/BlankState";
import { DeskWidgets } from "@/components/app/Desktop";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { ICONS, WidgetBody } from "@/components/app/HomeWidgets";
import { OverviewCountUp } from "@/components/app/OverviewCountUp";
import type { Placed } from "@/lib/desktop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Home — Trellis" },
      { name: "description", content: "Maya's full transfer path from Bayview to Northgate, with what needs attention now." },
      { property: "og:title", content: "Home — Trellis" },
      { property: "og:description", content: "Your whole degree path, every term through graduation, with sources on every claim." },
    ],
  }),
  component: Home,
});

function Home() {
  const j = useJourney();
  if (j.pathBuilt === false) return <BlankHome />;
  const today = new Date(`${SCRIPT_TODAY}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  const week = currentWeek(FALL_2026_START, FALL_2026_WEEKS, SCRIPT_TODAY);
  return (
    <div className="desk">
      <div className="desk-main">
        <div className="desk-greet">
          <p className="desk-eyebrow">{today}{week ? ` · Week ${week} of Fall` : ""}</p>
          <h1 className="desk-hello">Hi {student.name.split(" ")[0]}, you're on track.</h1>
        </div>
      </div>
      <DeskWidgets icons={ICONS} render={renderTile} />
    </div>
  );
}

function renderTile(w: Placed) {
  // Units count up as the bar fills; the suggestion marks itself as a plan card so saving flies its flyer to the Map tab.
  if (w.kind === "path") return <OverviewCountUp value={progress.earned}><WidgetBody w={w} /></OverviewCountUp>;
  if (w.kind === "next") return <div className="contents" data-plan-card=""><WidgetBody w={w} /></div>;
  return <WidgetBody w={w} />;
}
