import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, Check, CircleDashed, LocateFixed, Minus, Plus, SlidersHorizontal, X } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type MutableRefObject } from "react";
import { SubjectIcon } from "@/components/app/Brand";
import { Visual } from "@/components/app/MapParts";
import { PathView } from "@/components/app/PathView";
import { useCanvasCamera } from "@/hooks/use-canvas-camera";
import { useSlidingPill } from "@/hooks/use-sliding-pill";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { centerOn, clampCamera, clampScale, fitCamera, layoutMap, MAX_SCALE, MIN_SCALE, NEAR_SCALE, nodeScale, PPM, rulerTicks, STATUS_LABEL, zoomAt, type Camera, type Insets, type MapLayer, type MapLayout, type MapNode, type MapSchool, type MapStatus } from "@/lib/map";
import { courseCode } from "@/lib/skills";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const VIEWS = [
  { id: "timeline", label: "Timeline" },
  { id: "map", label: "Map" },
  { id: "list", label: "List" },
] as const;
type MapView = (typeof VIEWS)[number]["id"];

export const Route = createFileRoute("/map")({
  validateSearch: (s: Record<string, unknown>): { view?: MapView } => (s["view"] === "map" || s["view"] === "list" ? { view: s["view"] } : {}),
  head: () => ({
    meta: [
      { title: "Map — Trellis" },
      { name: "description", content: "Every class, event, club and internship on one canvas, from your first term to graduation." },
      { property: "og:title", content: "Map — Trellis" },
      { property: "og:description", content: "Every class, event, club and internship on one canvas." },
    ],
  }),
  component: MapPage,
});

const LAYERS: { id: MapLayer; label: string }[] = [
  { id: "events", label: "Events" },
  { id: "internships", label: "Internships" },
  { id: "clubs", label: "Clubs" },
];
type Frame = "month" | "year" | "all";
const FRAMES: { id: Frame; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All" },
];
const COLOR: Record<MapLayer, string> = { events: "var(--map-event)", internships: "var(--map-internship)", clubs: "var(--map-club)" };
const colorOf = (layer?: MapLayer, school?: MapSchool) => (layer ? COLOR[layer] : school ? `var(--school-${school})` : "var(--foreground)");
const STATUSES: MapStatus[] = ["done", "now", "confirmed", "planned"];
const frameFor = (s: number): Frame => (s >= 2 ? "month" : s >= 0.5 ? "year" : "all");

function insetsFor(width: number): Insets {
  return width < 768 ? { l: 8, t: 160, r: 52, b: 140 } : { l: 272, t: 112, r: 68, b: 72 };
}

// Kept outside the page so coming back from Degree or Terms lands on the same spot.
const timelineCam: MutableRefObject<Camera | null> = { current: null };
const pathCam: MutableRefObject<Camera | null> = { current: null };

function MapPage() {
  const { view = "timeline" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [layers, setLayers] = useState<Record<MapLayer, boolean>>({ events: true, internships: true, clubs: true });
  const pick = useCallback((v: MapView) => void navigate({ search: v === "timeline" ? {} : { view: v }, replace: true }), [navigate]);

  return (
    <div className="map-canvas">
      <h1 className="sr-only">Map</h1>
      {view === "timeline" ? <TimelineView layers={layers} memory={timelineCam} /> : <PathView mode={view} memory={pathCam} onShowMap={() => pick("map")} />}

      <div className="map-ui map-top">
        <ViewSwitch value={view} onPick={pick} />
        <Link to="/degree" search={{ view: "tree", try: true }} state={{ backTo: "map" }} className="map-glass map-try">Try a change</Link>
        {view !== "list" && (
          // Filters and the color key wait behind one button, so the map itself stays clear.
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="map-glass map-try gap-1.5"><SlidersHorizontal className="size-3.5" aria-hidden="true" />Key{view === "timeline" && LAYERS.some((l) => !layers[l.id]) ? ` · ${LAYERS.filter((l) => layers[l.id]).length} of ${LAYERS.length}` : ""}</button>
            </PopoverTrigger>
            <PopoverContent align="start" className="map-key w-60 rounded-2xl p-2">
              {view === "timeline" && (
                <section className="map-key-section">
                  <h2 className="map-key-head">Show on the map</h2>
                  <div className="flex flex-col" role="group" aria-label="Layers">
                    {LAYERS.map((l) => (
                      <button key={l.id} type="button" aria-pressed={layers[l.id]} onClick={() => setLayers((s) => ({ ...s, [l.id]: !s[l.id] }))} className="map-chip map-key-row" style={{ "--c": COLOR[l.id] } as CSSProperties}>
                        <span className="map-chip-dot" aria-hidden="true" />{l.label}
                        {layers[l.id] && <Check className="ml-auto size-3.5 text-muted-foreground" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <section className="map-key-section">
                <h2 className="map-key-head">What the marks mean</h2>
                {view === "timeline" ? (
                  <div className="map-key-marks">
                    {STATUSES.map((s) => <span key={s}><StatusMark status={s} plain />{STATUS_LABEL[s]}</span>)}
                  </div>
                ) : (
                  <div className="map-key-marks">
                    <span><i className="pm-key" data-solid="" aria-hidden="true" />On your plan</span>
                    <span><i className="pm-key" aria-hidden="true" />Suggested</span>
                  </div>
                )}
              </section>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

function ViewSwitch({ value, onPick }: { value: MapView; onPick: (v: MapView) => void }) {
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  return (
    <div className="map-glass map-switch">
      <div ref={containerRef} className="map-zoom has-pill relative" role="group" aria-label="View">
        <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
        {VIEWS.map((v) => <button key={v.id} type="button" aria-pressed={value === v.id} onClick={() => onPick(v.id)}>{v.label}</button>)}
      </div>
    </div>
  );
}

function TimelineView({ layers, memory }: { layers: Record<MapLayer, boolean>; memory: MutableRefObject<Camera | null> }) {
  const j = useJourney();
  const masters = j.mapMasters;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const layoutRef = useRef<MapLayout | null>(null);
  const { view, size, cam, camRef, travel, dragging, move, fly, pointer } = useCanvasCamera({
    memory,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    zoom: zoomAt,
    clamp: (c, v) => (layoutRef.current ? clampCamera(c, layoutRef.current, v, insetsFor(v.w)) : c),
    // Opens on the whole journey, first term to graduation, like the All button.
    place: (v) => fitAll(v),
  });

  function fitAll(v: { w: number; h: number }) {
    const rough = fitCamera(layoutMap({ masters, today: SCRIPT_TODAY }).bounds, v, insetsFor(v.w));
    return fitCamera(layoutMap({ masters, today: SCRIPT_TODAY, r: nodeScale(rough.s) / rough.s }).bounds, v, insetsFor(v.w));
  }
  const ratio = Math.round((nodeScale(cam.s) / cam.s) * 100) / 100;
  const layout = useMemo(() => layoutMap({ masters, today: SCRIPT_TODAY, r: ratio }), [masters, ratio]);
  layoutRef.current = layout;

  const viewport = { w: size.w, h: size.h };
  const insets = insetsFor(size.w);
  const middle = () => {
    const c = camRef.current;
    return { x: (insets.l + (size.w - insets.l - insets.r) / 2 - c.x) / nodeScale(c.s), y: (insets.t + (size.h - insets.t - insets.b) / 2 - c.y) / c.s };
  };
  const zoomBy = (factor: number) => {
    const c = camRef.current;
    const m = middle();
    fly(centerOn(m.x, m.y, clampScale(c.s * factor), viewport, insets));
  };
  const pickFrame = (f: Frame) => {
    if (f === "all") return fly(fitAll(viewport));
    const span = (size.h - insets.t - insets.b) / PPM;
    fly(centerOn(0, middle().y, f === "year" ? span / 12 : Math.max(2, span / 3), viewport, insets));
  };
  const goToday = () => fly(centerOn(0, layout.today, Math.max(camRef.current.s, 1), viewport, insets));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const c = camRef.current;
    const pan: Record<string, [number, number]> = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] };
    const step = pan[e.key];
    if (step) {
      e.preventDefault();
      move({ ...c, x: c.x + step[0], y: c.y + step[1] });
    } else if (e.key === "+" || e.key === "=") zoomBy(1.25);
    else if (e.key === "-") zoomBy(0.8);
    else if (e.key === "Escape") setSelectedId(null);
  };

  const onPick = useCallback((id: string) => {
    if (travel.current < 4) setSelectedId(id);
  }, [travel]);
  const onCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (travel.current < 4 && !(e.target as HTMLElement).closest(".mn")) setSelectedId(null);
  };
  const setMasters = j.setMapMasters;
  const onAdd = useCallback(() => setMasters(true), [setMasters]);

  const selected = selectedId ? layout.nodes.find((n) => n.id === selectedId) ?? null : null;
  const dot = Math.max(16, 22 * (cam.s < 0.5 ? cam.s * 2 : cam.s));
  const worldStyle = { transform: `translate(${cam.x}px, ${cam.y}px)`, "--s": cam.s, "--k": nodeScale(cam.s) } as CSSProperties;
  const ticks = size.h ? rulerTicks(cam, size.h, layout.lastMonth) : [];
  const todayY = cam.y + layout.today * cam.s;

  return (
    <>
      <div
        ref={view}
        className="map-view"
        data-dragging={dragging || undefined}
        style={{ backgroundSize: `${dot}px ${dot}px`, backgroundPosition: `${cam.x}px ${cam.y}px` }}
        tabIndex={0}
        role="application"
        aria-label="Your journey. Drag or use arrow keys to move, plus and minus to zoom."
        {...pointer}
        onClick={onCanvasClick}
        onKeyDown={onKeyDown}
      >
        <div className="map-world" style={worldStyle} data-near={cam.s >= NEAR_SCALE || undefined}>
          <World layout={layout} layers={layers} selectedId={selectedId} onPick={onPick} onAdd={onAdd} />
        </div>
      </div>

      <div className="map-ui map-ruler" aria-hidden="true">
        {ticks.map((t) => <div key={t.id} className={cn("map-tick", t.major && "map-tick-major")} style={{ top: t.y }}>{t.label}</div>)}
        {todayY > 0 && todayY < size.h && <div className="map-today-pill" style={{ top: todayY }}>Today</div>}
      </div>

      <div className="map-ui map-tools map-glass">
        <FramePicker value={frameFor(cam.s)} onPick={pickFrame} />
        <span className="map-tools-sep" aria-hidden="true" />
        <button type="button" className="map-icon-btn" aria-label="Zoom out" onClick={() => zoomBy(0.75)}><Minus className="size-3.5" /></button>
        <span className="map-percent" aria-live="polite">{Math.round(cam.s * 100)}%</span>
        <button type="button" className="map-icon-btn" aria-label="Zoom in" onClick={() => zoomBy(1.33)}><Plus className="size-3.5" /></button>
        <span className="map-tools-sep" aria-hidden="true" />
        <button type="button" className="map-icon-btn" aria-label="Go to today" title="Today" onClick={goToday}><LocateFixed className="size-3.5" /></button>
      </div>

      {selected && <Inspector key={selected.id} node={selected} onClose={() => setSelectedId(null)} onRemove={() => { setSelectedId(null); setMasters(false); }} />}
    </>
  );
}

function FramePicker({ value, onPick }: { value: Frame; onPick: (f: Frame) => void }) {
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>('[aria-pressed="true"]');
  return (
    <div ref={containerRef} className="map-zoom has-pill relative" role="group" aria-label="Jump to">
      <span ref={pillRef} className="sliding-pill liquid" aria-hidden="true" />
      {FRAMES.map((f) => <button key={f.id} type="button" aria-pressed={value === f.id} onClick={() => onPick(f.id)}>{f.label}</button>)}
    </div>
  );
}

/** Rendered once per layout, so moving the camera only touches one transform. */
const World = memo(function World({ layout, layers, selectedId, onPick, onAdd }: { layout: MapLayout; layers: Record<MapLayer, boolean>; selectedId: string | null; onPick: (id: string) => void; onAdd: () => void }) {
  const hidden = (layer?: MapLayer) => !!layer && !layers[layer];
  return (
    <>
      <svg className="map-svg" width="1" height="1" aria-hidden="true">
        <g className="map-scaled">
          <line x1={-4000} x2={4000} y1={layout.today} y2={layout.today} className="map-today-line" />
          {layout.links.map((l) => <path key={l.id} d={l.d} className="map-link" data-status={l.status} data-off={hidden(l.layer) || undefined} style={{ stroke: colorOf(l.layer, l.school) }} />)}
          {layout.spine.map((s) => <path key={s.id} d={`M 0 ${s.y1} L 0 ${s.y2}`} className="map-spine" data-status={s.status} style={{ stroke: colorOf(undefined, s.school) }} />)}
        </g>
        {layout.ports.filter((p) => p.layer).map((p) => <circle key={p.id} r={3} className="map-port" data-off={hidden(p.layer) || undefined} style={{ stroke: colorOf(p.layer), "--x": p.x, "--y": p.y } as CSSProperties} />)}
      </svg>
      {layout.nodes.map((n) => <Node key={n.id} node={n} off={hidden(n.layer)} selected={selectedId === n.id || selectedId === n.parent} onPick={onPick} onAdd={onAdd} />)}
      <svg className="map-svg map-ports" width="1" height="1" aria-hidden="true">
        {layout.ports.filter((p) => !p.layer).map((p) => <circle key={p.id} r={3} className="map-port" style={{ stroke: colorOf(undefined, p.school), "--x": p.x, "--y": p.y } as CSSProperties} />)}
      </svg>
    </>
  );
});

function StatusMark({ status, plain }: { status: MapStatus; plain?: boolean }) {
  if (status === "now" && !plain) return <span className="mn-status mn-status-now" data-st="now">Now</span>;
  const Icon = status === "done" ? Check : status === "confirmed" ? CalendarCheck : status === "planned" ? CircleDashed : null;
  return (
    <span className="mn-status" data-st={status} title={STATUS_LABEL[status]}>
      {Icon ? <Icon className="size-2.5" strokeWidth={2.5} aria-hidden="true" /> : <span className="block size-1.5 rounded-full" style={{ background: "var(--st)" }} />}
    </span>
  );
}

function Node({ node: n, off, selected, onPick, onAdd }: { node: MapNode; off: boolean; selected: boolean; onPick: (id: string) => void; onAdd: () => void }) {
  const style = { "--x": n.x, "--y": n.top, width: n.w, height: n.h, "--c": colorOf(n.layer, n.school) } as CSSProperties;
  const common = { type: "button" as const, className: "mn", style, draggable: false, "data-kind": n.kind, "data-status": n.status, "data-off": off || undefined, "data-selected": (selected && n.kind !== "work") || undefined };
  if (n.kind === "add") return <button {...common} onClick={onAdd}><Plus className="size-3" aria-hidden="true" />{n.title}</button>;
  const pick = () => onPick(n.parent ?? n.id);
  if (n.kind === "work") return <button {...common} onClick={pick}><span className="truncate font-medium">{n.title}</span><span className="ml-auto shrink-0 text-muted-foreground">{n.sub}</span></button>;
  if (n.kind === "school") return <button {...common} onClick={pick}><Visual visual={n.visual} title={n.title} /><span className="mn-text"><span className="mn-title">{n.title}</span><span className="mn-sub">{n.sub}</span></span></button>;
  if (n.kind === "milestone") return <button {...common} onClick={pick}><Visual visual={n.visual} title={n.title} /><span className="mn-title ml-1.5">{n.title}</span></button>;
  return (
    <button {...common} onClick={pick}>
      <span className="mn-row">
        <Visual visual={n.visual} title={n.title} />
        <span className="mn-text">
          <span className="mn-title">{n.title}</span>
          {n.kind === "term" ? <span className="mn-classes">{n.courses?.map((c, i) => <SubjectIcon key={`${c.code}-${i}`} course={c.code} />)}</span> : n.sub && <span className="mn-sub">{n.sub}</span>}
        </span>
        <StatusMark status={n.status} />
      </span>
    </button>
  );
}

const KIND_LABEL: Record<MapNode["kind"], string> = { school: "School", term: "Classes", work: "Classes", milestone: "Milestone", event: "Event", span: "", side: "Class at another school", add: "" };

function Inspector({ node: n, onClose, onRemove }: { node: MapNode; onClose: () => void; onRemove: () => void }) {
  const j = useJourney();
  const kind = n.layer === "clubs" ? "Club" : n.layer === "internships" ? "Internship" : KIND_LABEL[n.kind];
  return (
    <aside className="map-ui map-inspector" aria-label={n.title} style={{ "--c": colorOf(n.layer, n.school) } as CSSProperties}>
      <div className="flex items-start gap-2.5">
        <Visual visual={n.visual} title={n.title} />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{n.title}</div>
          {n.sub && <div className="text-[11px] text-muted-foreground">{n.sub}</div>}
        </div>
        <button type="button" className="map-icon-btn -mr-1 -mt-1" aria-label="Close" onClick={onClose}><X className="size-3.5" /></button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        <span className="map-tag" data-st={n.status}><StatusMark status={n.status} plain />{n.imagined ? "Imagined" : STATUS_LABEL[n.status]}</span>
        {kind && <span className="map-tag">{kind}</span>}
      </div>
      {n.when && <p className="mt-2.5">{n.when}{n.place ? ` · ${n.place}` : ""}</p>}
      {n.about && <p className="mt-1 text-muted-foreground">{n.about}</p>}
      {!!n.facts?.length && (
        <div className="map-section">
          {n.facts.map((f) => <div key={f.label} className="flex justify-between gap-3 py-0.5"><span className="shrink-0 text-muted-foreground">{f.label}</span><span className="text-right">{f.value}</span></div>)}
        </div>
      )}
      {!!n.courses?.length && n.kind === "term" && (
        <div className="map-section">
          <div className="map-section-title">Classes</div>
          {n.courses.map((c, i) => <button key={`${c.code}-${i}`} type="button" onClick={() => j.openClass(courseCode(c.code))} className="flex w-full items-center gap-2 py-1 text-left"><SubjectIcon course={c.code} /><span className="shrink-0 font-medium">{c.code}</span><span className="truncate text-muted-foreground">{c.title}</span></button>)}
        </div>
      )}
      {!!n.coursework?.length && (
        <div className="map-section">
          <div className="map-section-title">Key dates</div>
          {n.coursework.map((w) => <div key={w.title} className="flex justify-between gap-3 py-0.5"><span className="truncate">{w.title}</span><span className="shrink-0 text-muted-foreground">{w.date}</span></div>)}
        </div>
      )}
      {!!n.skills?.length && (
        <div className="map-section">
          <div className="map-section-title">Skills</div>
          <div className="flex flex-wrap gap-1">{n.skills.map((s) => <span key={s} className="map-tag" style={{ "--st": "var(--foreground)" } as CSSProperties}>{s}</span>)}</div>
        </div>
      )}
      {n.id === "ms-start" && <button type="button" className="map-section block w-full text-left text-muted-foreground hover:text-foreground" onClick={onRemove}>Remove this program</button>}
      {n.to && <Link to={n.to} search={n.to === "/career" ? { tab: "skills" as const } : {}} state={{ backTo: "map" }} className="map-section flex items-center gap-1 font-medium">{n.to === "/semester" ? "Open in Terms" : "See your skills"} <ArrowRight className="size-3.5" aria-hidden="true" /></Link>}
    </aside>
  );
}
