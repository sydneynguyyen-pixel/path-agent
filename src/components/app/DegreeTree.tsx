import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Maximize, Minus, Plus, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type MutableRefObject, type ReactNode } from "react";
import { DegreeMark } from "@/components/app/DegreeMark";
import { treeColumns, treeRows } from "@/data/degree";
import { useCanvasCamera } from "@/hooks/use-canvas-camera";
import { formatCredits, layoutTree, SLOT_LABEL, type AuditInput, type DegreeAudit, type TreeCard, type TreeLayout } from "@/lib/degree";
import { useJourney } from "@/lib/journey";
import { CourseLink } from "@/components/app/SkillsBits";
import { electiveClasses } from "@/data/degree";
import type { Camera, Insets, Viewport } from "@/lib/map";
import { centerPath, clampPath, fitPath, PATH_MAX_SCALE, PATH_MIN_SCALE, zoomPath } from "@/lib/path-map";

const TRY_PANEL_W = 300;
const insetsFor = (w: number, trying = false): Insets => ({ l: 288 + (trying ? TRY_PANEL_W : 0), t: trying ? 156 : 96, r: 24, b: 64, ...(w < 768 ? { l: 8, r: 8 } : {}) });
const DETAILS_W = 320;
const DETAILS_BOTTOM = 450;
const colorOf = (row: TreeCard["row"]) => treeRows.find((r) => r.id === row)?.color ?? "var(--foreground)";

export function DegreeTree({ audit, input, memory, trying = false, changed, panel }: { audit: DegreeAudit; input: AuditInput; memory: MutableRefObject<Camera | null>; trying?: boolean; changed?: Set<string> | undefined; panel?: ReactNode }) {
  const layout = useMemo(() => layoutTree(audit, input), [audit, input]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const tryingRef = useRef(trying);
  tryingRef.current = trying;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { view, size, cam, camRef, travel, dragging, move, fly, pointer } = useCanvasCamera({
    memory,
    minScale: PATH_MIN_SCALE,
    maxScale: PATH_MAX_SCALE,
    zoom: zoomPath,
    clamp: (c: Camera, v: Viewport) => clampPath(c, layoutRef.current.bounds, v, insetsFor(v.w, tryingRef.current)),
    place: (v: Viewport) => fitPath(layoutRef.current.bounds, v, insetsFor(v.w, tryingRef.current)),
  });

  const viewport = { w: size.w, h: size.h };
  const insets = insetsFor(size.w, trying);
  // The change panel takes the left side, so the tree refits around it.
  const wasTrying = useRef(trying);
  useEffect(() => {
    if (wasTrying.current === trying || !size.w) return;
    wasTrying.current = trying;
    fly(fitPath(layoutRef.current.bounds, { w: size.w, h: size.h }, insetsFor(size.w, trying)));
  }, [trying, size.w, size.h, fly]);
  const zoomBy = (factor: number) => {
    const c = camRef.current;
    const x = insets.l + (size.w - insets.l - insets.r) / 2;
    const y = insets.t + (size.h - insets.t - insets.b) / 2;
    fly(centerPath((x - c.x) / c.s, (y - c.y) / c.s, c.s * factor, viewport, insets));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.target as Node)) return;
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
    if (travel.current >= 4) return;
    setSelectedId(id);
    // The details panel opens on the right, so slide anything it would cover out from under it.
    const card = layoutRef.current.cards.find((c) => c.id === id);
    const el = view.current;
    const c = camRef.current;
    if (!card || !el) return;
    const over = c.x + (card.x + card.w) * c.s - (el.clientWidth - DETAILS_W);
    if (over > 0 && c.y + card.y * c.s < DETAILS_BOTTOM) fly({ ...c, x: c.x - over });
  }, [travel, view, camRef, fly]);
  const pickFromList = useCallback((id: string) => setSelectedId(id), []);
  const onCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.target as Node) && travel.current < 4 && !(e.target as HTMLElement).closest(".dg-card")) setSelectedId(null);
  };
  const selected = layout.cards.find((c) => c.id === selectedId) ?? null;

  return (
    <>
      <div ref={view} className="map-view dg-tree-canvas" data-dragging={dragging || undefined} style={{ backgroundSize: `${22 * cam.s}px ${22 * cam.s}px`, backgroundPosition: `${cam.x}px ${cam.y}px` }} tabIndex={0} role="application" aria-label="Your path to graduation. Drag or use arrow keys to move, plus and minus to zoom." {...pointer} onClick={onCanvasClick} onKeyDown={onKeyDown}>
        <div className="map-world" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})` }}>
          <Board layout={layout} selectedId={selectedId} onPick={onPick} changed={changed} />
        </div>
      </div>
      <TreeList layout={layout} selectedId={selectedId} onPick={pickFromList} changed={changed} panel={panel} />
      <div className="map-ui map-tools map-glass pm-wide-only">
        <button type="button" className="map-icon-btn" aria-label="Zoom out" onClick={() => zoomBy(0.75)}><Minus className="size-3.5" /></button>
        <span className="map-percent" aria-live="polite">{Math.round(cam.s * 100)}%</span>
        <button type="button" className="map-icon-btn" aria-label="Zoom in" onClick={() => zoomBy(1.33)}><Plus className="size-3.5" /></button>
        <span className="map-tools-sep" aria-hidden="true" />
        <button type="button" className="map-icon-btn" aria-label="Fit the whole tree" title="Fit" onClick={() => fly(fitPath(layout.bounds, viewport, insets))}><Maximize className="size-3.5" /></button>
      </div>
      {selected && <Details key={selected.id} card={selected} audit={audit} onClose={() => setSelectedId(null)} />}
    </>
  );
}

/** Rendered once per layout, so moving the camera only touches one transform. */
const Board = memo(function Board({ layout, selectedId, onPick, changed }: { layout: TreeLayout; selectedId: string | null; onPick: (id: string) => void; changed?: Set<string> | undefined }) {
  return (
    <>
      {layout.columns.map((c) => (
        <div key={c.id} className="dg-col" data-now={c.id === "sp27" || undefined} style={{ left: c.x, width: 168 }}><b>{c.label}</b><span>{c.sub}</span></div>
      ))}
      {layout.rows.map((r) => (
        <div key={r.id} className="dg-rowlabel" style={{ top: r.y, height: r.h, "--c": r.color } as CSSProperties}><b>{r.name}</b><span>{r.status}</span></div>
      ))}
      <div className="dg-branch" style={{ left: layout.branch.x, top: layout.branch.y - 12 }}>{layout.branch.count} ways to finish it</div>
      <svg className="map-svg" width="1" height="1" aria-hidden="true">
        {layout.links.map((l) => <path key={l.id} d={l.d} className="dg-link" data-state={l.state} />)}
      </svg>
      {layout.cards.map((c) => <Card key={c.id} card={c} selected={selectedId === c.id} changed={isChanged(c, changed)} onPick={onPick} style={{ left: c.x, top: c.y, width: c.w, height: c.h }} />)}
    </>
  );
});

const isChanged = (c: TreeCard, changed?: Set<string>) => !!changed && (changed.has(c.id) || c.slots.some((s) => changed.has(s.id)));

function Card({ card: c, selected, changed = false, onPick, style }: { card: TreeCard; selected: boolean; changed?: boolean; onPick: (id: string) => void; style?: CSSProperties }) {
  return (
    <button type="button" className="dg-card" draggable={false} data-kind={c.kind} data-st={c.status} data-selected={selected || undefined} data-changed={changed || undefined} style={{ ...style, "--c": colorOf(c.row) } as CSSProperties} onClick={() => onPick(c.id)}>
      {c.kind === "grad" ? (
        <><span className="dg-grad-icon"><GraduationCap className="size-5" aria-hidden="true" /></span><span className="dg-card-title">{c.title}</span><span className="dg-card-sub">{c.sub}</span></>
      ) : (
        <><span className="dg-card-top"><span className="dg-card-title">{c.title}</span><DegreeMark status={c.status} /></span><span className="dg-card-sub">{c.sub}</span></>
      )}
    </button>
  );
}

/** Phones get the same cards as one list, row by row. */
function TreeList({ layout, selectedId, onPick, changed, panel }: { layout: TreeLayout; selectedId: string | null; onPick: (id: string) => void; changed?: Set<string> | undefined; panel?: ReactNode }) {
  const graduate = layout.cards.find((c) => c.kind === "grad")!;
  return (
    <div className="dg-tree-list">
      {panel}
      {layout.rows.map((r) => (
        <section key={r.id}>
          <h2 style={{ "--c": r.color } as CSSProperties}><b>{r.name}</b><span>{r.status}</span></h2>
          {treeColumns.map((col) => {
            const cards = layout.cards.filter((c) => c.row === r.id && c.col === col.id);
            if (!cards.length) return null;
            return (
              <div key={col.id} className="dg-list-step">
                <div className="dg-list-when">{col.label}{col.id !== "done" && col.id !== "later" && col.label !== col.sub ? ` · ${col.sub}` : ""}{cards.some((c) => c.kind === "way") ? ` · ${cards.length} ways to finish it` : ""}</div>
                {cards.map((c) => <Card key={c.id} card={c} selected={selectedId === c.id} changed={isChanged(c, changed)} onPick={onPick} />)}
              </div>
            );
          })}
        </section>
      ))}
      <Card card={graduate} selected={selectedId === graduate.id} changed={isChanged(graduate, changed)} onPick={onPick} />
    </div>
  );
}

function Details({ card: c, audit, onClose }: { card: TreeCard; audit: DegreeAudit; onClose: () => void }) {
  const j = useJourney();
  const saved = !!c.optionId && j.savedOpportunities.includes(c.optionId);
  const elective = electiveClasses.find((e) => e.id === c.optionId);
  const toggle = () => {
    if (!elective) return j.toggleSavedOpportunity(c.optionId!);
    if (saved) j.removeDraftCourse(elective.code);
    else j.addDraftCourse(elective.code);
  };
  const canAdd = c.optionId && c.optionId !== "lcc-psyc20";
  return (
    <aside className="map-ui map-inspector pm-details" aria-label={c.title} style={{ "--c": colorOf(c.row) } as CSSProperties}>
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1 font-medium">{c.title}</div>
        <button type="button" className="map-icon-btn -mr-1 -mt-1" aria-label="Close" onClick={onClose}><X className="size-3.5" /></button>
      </div>
      {c.kind === "grad" ? (
        <>
          <p className="mt-1 text-muted-foreground">{c.sub}</p>
          <div className="map-section">
            <Fact label="Earned" value={formatCredits(audit.earned)} />
            <Fact label="In progress" value={formatCredits(audit.now)} />
            <Fact label="Planned" value={formatCredits(audit.planned)} />
            <Fact label="Needed" value={String(audit.needed)} />
          </div>
          <Link to="/degree" className="map-section flex items-center gap-1 font-medium">Open the audit <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
        </>
      ) : (
        <>
          <div className="mt-2.5 flex flex-wrap gap-1">
            <span className="map-tag" style={{ "--st": "var(--foreground)" } as CSSProperties}>{SLOT_LABEL[c.status]}</span>
          </div>
          {c.way && (
            <>
              <p className="mt-2.5">{c.way.time}</p>
              <p className="mt-1 text-muted-foreground">{c.way.about}</p>
              <div className="map-section"><Fact label="Seats" value={c.way.seats} /></div>
              {j.atRisk ? (
                <button type="button" className="map-section block w-full text-left font-medium" onClick={() => j.setPanelOpen(true)}>Compare your options</button>
              ) : (
                <Link to="/portal" className="map-section flex items-center gap-1 font-medium">Go to registration <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
              )}
            </>
          )}
          {c.about && <p className="mt-2.5 text-muted-foreground">{c.about}</p>}
          {c.optionId === "lcc-psyc20" && <p className="mt-1 text-muted-foreground">It isn't in your audit until your counselor confirms it.</p>}
          {!c.way && !!c.slots.length && (
            <div className="map-section">
              {c.slots.map((s) => (
                <div key={s.id} className="flex items-start gap-2 py-1">
                  <DegreeMark status={s.status} />
                  <div className="min-w-0 flex-1"><span className="font-medium">{s.code ? <CourseLink course={s.code} /> : s.need}</span> <span className="text-muted-foreground">{s.code ? s.title : s.hint}</span>{s.grade ? <span className="text-muted-foreground"> · {s.grade}</span> : null}<div className="text-muted-foreground">{s.termName}</div></div>
                  <span className="shrink-0">{formatCredits(s.credits)}</span>
                </div>
              ))}
            </div>
          )}
          {canAdd && <button type="button" className="map-section block w-full text-left font-medium" onClick={toggle}>{saved ? "Remove from your plan" : "Add to your plan"}</button>}
        </>
      )}
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 py-0.5"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
