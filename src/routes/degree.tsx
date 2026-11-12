import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { DegreeAuditView } from "@/components/app/DegreeAudit";
import { DegreeTree } from "@/components/app/DegreeTree";
import { TryPanel, TryStrip, useTryChange } from "@/components/app/TryChange";
import { useDegreeAudit } from "@/hooks/use-degree-audit";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
import { useJourney } from "@/lib/journey";
import type { Camera } from "@/lib/map";
import { NO_CHANGE } from "@/lib/whatif";

const VIEWS = [
  { id: "audit", label: "Audit" },
  { id: "tree", label: "Tree" },
] as const;
type DegreeView = (typeof VIEWS)[number]["id"];

export const Route = createFileRoute("/degree")({
  validateSearch: (s: Record<string, unknown>): { view?: DegreeView; try?: boolean; row?: string; slot?: string } => ({
    ...(s["view"] === "tree" ? { view: "tree" as const } : {}),
    ...(s["try"] === true || s["try"] === "true" || s["try"] === 1 ? { try: true } : {}),
    ...(typeof s["row"] === "string" ? { row: s["row"] } : {}),
    ...(typeof s["slot"] === "string" ? { slot: s["slot"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Degree — Trellis" },
      { name: "description", content: "What you've finished, what's left, and every way to graduation." },
      { property: "og:title", content: "Degree — Trellis" },
      { property: "og:description", content: "What you've finished, what's left, and every way to graduation." },
    ],
  }),
  component: DegreePage,
});

// Kept outside the page so coming back to the tree lands on the same spot.
const treeCam: MutableRefObject<Camera | null> = { current: null };

function DegreePage() {
  const search = Route.useSearch();
  const { view = "audit", row, slot } = search;
  const trying = view === "tree" && !!search.try;
  const navigate = Route.useNavigate();
  const j = useJourney();
  const { audit, input } = useDegreeAudit();
  const preview = useTryChange(audit);
  const panel = useMemo(() => (trying ? <div className="try-inline"><TryPanel /></div> : null), [trying]);

  // Leaving the preview always puts the plan back.
  useEffect(() => () => j.setWhatIf(NO_CHANGE), []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTrying = (on: boolean) => {
    if (!on) j.setWhatIf(NO_CHANGE);
    void navigate({ search: on ? { view: "tree", try: true } : { view: "tree" }, replace: true, state: true });
  };

  return (
    <div className="map-canvas">
      <h1 className="sr-only">Degree</h1>
      {view === "audit" ? <DegreeAuditView audit={audit} row={row} slot={slot} /> : <DegreeTree audit={audit} input={input} memory={treeCam} trying={trying} changed={trying ? preview.changed : undefined} panel={panel} />}
      <div className="map-ui map-top">
        <ViewSwitch value={view} onPick={(v) => void navigate({ search: v === "audit" ? {} : { view: v }, replace: true, state: true })} />
        <button type="button" className="map-glass map-try" aria-pressed={trying} onClick={() => setTrying(!trying)}>{trying ? "Done" : "Try a change"}</button>
        {trying && <TryStrip />}
      </div>
      {trying && <div className="map-ui try-side pm-wide-only"><TryPanel /></div>}
    </div>
  );
}

function ViewSwitch({ value, onPick }: { value: DegreeView; onPick: (v: DegreeView) => void }) {
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  return (
    <div className="map-glass map-switch">
      <div ref={containerRef} className="map-zoom dg-switch has-pill relative" role="group" aria-label="View">
        <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
        {VIEWS.map((v) => <button key={v.id} type="button" aria-pressed={value === v.id} onClick={() => onPick(v.id)}>{v.label}</button>)}
      </div>
    </div>
  );
}
