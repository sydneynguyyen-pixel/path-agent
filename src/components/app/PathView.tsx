import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Briefcase, CalendarCheck, CalendarDays, CalendarPlus, Check, CircleDashed, GraduationCap, Handshake, Link2, ListTodo, Maximize, Minus, PanelLeft, Plus, NotebookPen, Search, Store, UserRound, Users, X } from "lucide-react";
import { memo, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type MutableRefObject, type ReactElement } from "react";
import { toast } from "sonner";
import { Visual } from "@/components/app/MapParts";
import { useNewestGrowIn } from "@/components/app/OverviewGrowIn";
import { linesToGoal, relatedTo } from "@/lib/motionOverview";
import "@/styles/motion-overview.css";
import { SchoolLogo } from "@/components/app/SchoolLogo";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { pathCategories, pathConnections, pathGoal, pathItems, type PathCategory, type PathItem, type PathState } from "@/data/map";
import { pastNotes } from "@/data/people";
import { useCanvasCamera } from "@/hooks/use-canvas-camera";
import { useJourney } from "@/lib/journey";
import type { Camera, Insets } from "@/lib/map";
import { centerPath, clampPath, connectionsOf, filterPath, fitPath, followUpCount, layoutPath, PATH_MAX_SCALE, PATH_MIN_SCALE, PATH_STATE_LABEL, pathItemsFor, routeLinks, zoomPath, type PathCard, type PathLayout } from "@/lib/path-map";

const COLOR: Record<PathCategory, string> = { classes: "var(--foreground)", events: "var(--map-event)", clubs: "var(--map-club)", internships: "var(--map-internship)", networking: "var(--map-network)", fairs: "var(--map-fair)" };
const ICON = { classes: GraduationCap, events: CalendarDays, clubs: Users, internships: Briefcase, networking: UserRound, fairs: Store } satisfies Record<PathCategory, unknown>;
const STATE_ICON = { plan: Check, suggested: CircleDashed, touch: Handshake, todo: ListTodo } satisfies Record<PathState, unknown>;
const CATEGORY_LABEL = Object.fromEntries(pathCategories.map((c) => [c.id, c.label])) as Record<PathCategory, string>;
/** Below this width the filter list starts closed, so the board keeps its room. */
const PANEL_MIN = 1100;
const DETAILS_W = 320;

function insetsFor(width: number, panel: boolean): Insets {
  if (width < 768) return { l: 12, t: 152, r: 12, b: 140 };
  return { l: 272 + (panel ? 268 : 0), t: 112, r: 24, b: 72 };
}

type Actions = {
  pick: (id: string) => void;
  open: (item: PathItem) => void;
  calendar: (item: PathItem) => void;
  connect: (item: PathItem) => void;
  dismiss: (item: PathItem) => void;
};

export function PathView({ mode, memory, onShowMap }: { mode: "map" | "list"; memory: MutableRefObject<Camera | null>; onShowMap: () => void }) {
  const j = useJourney();
  const navigate = useNavigate();
  const meet = Object.values(j.event.deck).filter((v) => v === "meet").length;
  const items = useMemo(() => pathItemsFor(pathItems, j.skippedSuggestions, meet), [j.skippedSuggestions, meet]);
  const layout = useMemo(() => layoutPath(items), [items]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const [panelChoice, setPanelChoice] = useState<boolean | null>(null);
  const panelRef = useRef(panelChoice);
  panelRef.current = panelChoice;
  const panelFor = (w: number) => panelRef.current ?? w >= PANEL_MIN;

  const { view, size, cam, camRef, travel, dragging, move, fly, pointer } = useCanvasCamera({
    memory,
    minScale: PATH_MIN_SCALE,
    maxScale: PATH_MAX_SCALE,
    zoom: zoomPath,
    clamp: (c, v) => clampPath(c, layoutRef.current.bounds, v, insetsFor(v.w, panelFor(v.w))),
    place: (v) => fitPath(layoutRef.current.bounds, v, insetsFor(v.w, panelFor(v.w))),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectId, setConnectId] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PathCategory | "all">("all");

  const panelOpen = size.w >= 768 && (panelChoice ?? size.w >= PANEL_MIN);
  const insets = insetsFor(size.w, panelOpen);
  const viewport = { w: size.w, h: size.h };
  const matches = useMemo(() => filterPath(items, { query, category }), [items, query, category]);
  const matchIds = useMemo(() => new Set(matches.map((m) => m.id)), [matches]);
  const filtering = matches.length !== items.length;
  const focusId = connectId ?? selectedId;
  const routes = useMemo(() => routeLinks(layout, pathConnections, focusId).filter((r) => !connectId || r.active), [layout, focusId, connectId]);
  const linked = useMemo(() => (connectId ? new Set([connectId, ...connectionsOf(connectId, pathConnections, items).map((c) => c.item.id)]) : null), [connectId, items]);
  const selected = selectedId ? items.find((i) => i.id === selectedId) ?? null : null;
  // Picking a card (outside "Show connections", which already dims harder) lets the rest step back and lights its line to the goal.
  const focusCard = !connectId && selectedId ? layout.cards.find((c) => c.id === selectedId) ?? null : null;
  const near = useMemo(() => (focusCard ? relatedTo(focusCard.id, pathConnections) : null), [focusCard]);
  const toGoal = useMemo(() => (focusCard ? linesToGoal(focusCard, layout.cards) : null), [focusCard, layout.cards]);
  const grownId = useNewestGrowIn((id) => layout.cards.some((c) => c.id === id));

  const clearFocus = () => {
    setConnectId(null);
    setPinned(null);
  };
  // The details panel opens on the right, so anything being shown has to land to the left of it.
  const clearOfDetails = size.w >= 768 ? { ...insets, r: DETAILS_W } : insets;
  const flyToCard = (card: PathCard) => fly(centerPath(card.x + card.w / 2, card.y + card.h / 2, camRef.current.s, viewport, clearOfDetails));
  const revealTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** Waits out a possible double-click, so the card doesn't slide away between the two clicks. */
  const reveal = (id: string) => {
    clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => {
      const card = layoutRef.current.cards.find((c) => c.id === id);
      const c = camRef.current;
      const el = view.current;
      if (!card || !el || el.clientWidth < 768) return;
      const over = c.x + (card.x + card.w) * c.s - (el.clientWidth - DETAILS_W);
      if (over > 0) fly({ ...c, x: c.x - over });
    }, 260);
  };

  // Always the latest handlers, behind one stable object, so moving the camera doesn't re-render the cards.
  const latest = useRef<Actions>(null!);
  latest.current = {
    pick: (id) => {
      if (travel.current >= 4) return;
      setSelectedId(id);
      if (connectId && connectId !== id) clearFocus();
      reveal(id);
    },
    open: (item) => {
      if (!item.open) return;
      if (item.open.to === "/explore" && "open" in item.open.search) j.openOpportunity(item.open.search.open);
      else void navigate({ ...item.open, state: { backTo: "map" } });
    },
    calendar: (item) => {
      const had = j.mapCalendar.includes(item.id);
      j.toggleMapCalendar(item.id);
      toast(had ? "Removed from your calendar (simulated)" : "Added to your calendar (simulated)", { description: item.title });
    },
    connect: (item) => {
      const found = connectionsOf(item.id, pathConnections, items);
      setSelectedId(item.id);
      setConnectId(item.id);
      setPinned(found[0]?.id ?? null);
      if (mode === "list") onShowMap();
      const group = layout.cards.filter((c) => c.id === item.id || found.some((f) => f.item.id === c.id));
      if (!group.length) return;
      const x = (Math.min(...group.map((c) => c.x)) + Math.max(...group.map((c) => c.x + c.w))) / 2;
      const y = (Math.min(...group.map((c) => c.y)) + Math.max(...group.map((c) => c.y + c.h))) / 2;
      fly(centerPath(x, y, camRef.current.s, viewport, clearOfDetails));
    },
    dismiss: (item) => {
      j.skipSuggestion(item.id);
      if (selectedId === item.id) setSelectedId(null);
      if (connectId === item.id) clearFocus();
      toast("Taken off your map", { description: item.title, action: { label: "Undo", onClick: () => j.unskipSuggestion(item.id) } });
    },
  };
  const actions = useMemo<Actions>(() => ({
    pick: (id) => latest.current.pick(id),
    open: (item) => latest.current.open(item),
    calendar: (item) => latest.current.calendar(item),
    connect: (item) => latest.current.connect(item),
    dismiss: (item) => latest.current.dismiss(item),
  }), []);

  const zoomBy = (factor: number) => {
    const c = camRef.current;
    fly(zoomPath(c, c.s * factor, insets.l + (size.w - insets.l - insets.r) / 2, insets.t + (size.h - insets.t - insets.b) / 2));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // The right-click menu is portaled out, but its events still bubble through React to here.
    if (!e.currentTarget.contains(e.target as Node)) return;
    const c = camRef.current;
    const pan: Record<string, [number, number]> = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] };
    const step = pan[e.key];
    if (step) {
      e.preventDefault();
      move({ ...c, x: c.x + step[0], y: c.y + step[1] });
    } else if (e.key === "+" || e.key === "=") zoomBy(1.25);
    else if (e.key === "-") zoomBy(0.8);
    else if (e.key === "Escape") {
      setSelectedId(null);
      clearFocus();
    }
  };
  const onCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (travel.current >= 4 || !e.currentTarget.contains(e.target as Node) || (e.target as HTMLElement).closest(".pm-card, .pm-dot, .pm-notes")) return;
    setSelectedId(null);
    clearFocus();
  };
  const pickFromList = (item: PathItem) => {
    setSelectedId(item.id);
    if (connectId && connectId !== item.id) clearFocus();
    const card = layout.cards.find((c) => c.id === item.id);
    if (card && mode === "map") flyToCard(card);
  };

  const followUps = followUpCount(pastNotes, j.event.promises);
  const notesLine = followUps === 0 ? "No one to follow up with" : `${followUps} ${followUps === 1 ? "person" : "people"} to follow up`;
  const openNotes = () => {
    if (travel.current < 4) void navigate({ to: "/explore", search: { view: "people" }, state: { backTo: "map" } });
  };

  const dot = Math.max(16, 22 * cam.s);
  const why = routes.find((r) => r.id === (hovered ?? pinned));
  const filters = <Filters query={query} onQuery={setQuery} category={category} onCategory={setCategory} items={items} />;

  return (
    <>
      <div
        ref={view}
        className="map-view"
        data-dragging={dragging || undefined}
        style={{ backgroundSize: `${dot}px ${dot}px`, backgroundPosition: `${cam.x}px ${cam.y}px` }}
        tabIndex={0}
        role="application"
        aria-label="Your path, from your goal to each next step. Drag or use arrow keys to move, plus and minus to zoom."
        inert={mode === "list"}
        {...pointer}
        onClick={onCanvasClick}
        onKeyDown={onKeyDown}
      >
        <div className="map-world" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})` }}>
          <Board layout={layout} selectedId={selectedId} matchIds={filtering ? matchIds : null} linked={linked} near={near} toGoal={toGoal} grownId={grownId} calendar={j.mapCalendar} notesLine={notesLine} onNotes={openNotes} actions={actions} items={items} />
          <svg className="map-svg" width="1" height="1" aria-hidden="true">
            {routes.map((r) => <path key={r.id} d={r.d} className="pm-link" data-active={r.active || undefined} data-dim={(near && !r.active) || undefined} />)}
          </svg>
        </div>
        {routes.map((r) => {
          const on = why?.id === r.id;
          return (
            <button
              key={r.id}
              type="button"
              className="pm-dot"
              style={{ left: cam.x + r.x * cam.s, top: cam.y + r.y * cam.s }}
              aria-label="Why are these connected?"
              aria-expanded={on}
              data-on={on || undefined}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(r.id)}
              onBlur={() => setHovered(null)}
              onClick={() => {
                if (travel.current < 4) setPinned((p) => (p === r.id ? null : r.id));
              }}
            ><Link2 className="size-3" aria-hidden="true" /></button>
          );
        })}
        {why && (
          <div className="pm-why" role="tooltip" style={{ left: cam.x + why.x * cam.s, top: cam.y + why.y * cam.s }}>
            <strong>Why are these connected?</strong>
            <span>{why.why}</span>
          </div>
        )}
      </div>

      {mode === "map" && panelOpen && (
        <aside className="map-ui pm-panel" aria-label="Filter your map">
          {filters}
          <p className="pm-hint">Click to select. Double-click to open.</p>
          <div className="pm-panel-rows">
            {matches.map((i) => (
              <ItemMenu key={i.id} item={i} items={items} inCalendar={j.mapCalendar.includes(i.id)} actions={actions}>
                <button type="button" className="pm-row" aria-pressed={selectedId === i.id} onClick={() => pickFromList(i)} onDoubleClick={() => actions.open(i)}>
                  <span className="pm-square" style={{ "--c": COLOR[i.category] } as CSSProperties} aria-hidden="true" />
                  <span className="truncate">{i.title}</span>
                </button>
              </ItemMenu>
            ))}
            {!matches.length && <p className="pm-hint">Nothing matches.</p>}
          </div>
        </aside>
      )}

      {mode === "list" && (
        <div className="pm-list">
          <div className="pm-list-inner">
            {filters}
            {pathCategories.map((c) => {
              const rows = matches.filter((m) => m.category === c.id);
              if (!rows.length) return null;
              return (
                <section key={c.id} className="pm-list-group">
                  <h2>{c.label}<span>{rows.length}</span></h2>
                  {rows.map((i) => (
                    <ItemMenu key={i.id} item={i} items={items} inCalendar={j.mapCalendar.includes(i.id)} actions={actions}>
                      <button type="button" className="pm-list-row" aria-pressed={selectedId === i.id} onClick={() => pickFromList(i)} onDoubleClick={() => actions.open(i)} style={{ "--c": COLOR[i.category] } as CSSProperties}>
                        <ItemMark item={i} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{i.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{i.sub}</span>
                        </span>
                        <StateTag state={i.state} calendar={j.mapCalendar.includes(i.id)} />
                      </button>
                    </ItemMenu>
                  ))}
                </section>
              );
            })}
            {!matches.length && <p className="pm-hint mt-6">Nothing matches.</p>}
          </div>
        </div>
      )}

      {mode === "map" && (
        <div className="map-ui map-tools map-glass">
          <button type="button" className="map-icon-btn pm-wide-only" aria-label={panelOpen ? "Hide filter list" : "Show filter list"} aria-pressed={panelOpen} title="Filter list" onClick={() => setPanelChoice(!panelOpen)}><PanelLeft className="size-3.5" /></button>
          <span className="map-tools-sep pm-wide-only" aria-hidden="true" />
          <button type="button" className="map-icon-btn" aria-label="Zoom out" onClick={() => zoomBy(0.75)}><Minus className="size-3.5" /></button>
          <span className="map-percent" aria-live="polite">{Math.round(cam.s * 100)}%</span>
          <button type="button" className="map-icon-btn" aria-label="Zoom in" onClick={() => zoomBy(1.33)}><Plus className="size-3.5" /></button>
          <span className="map-tools-sep" aria-hidden="true" />
          <button type="button" className="map-icon-btn" aria-label="Fit the whole map" title="Fit" onClick={() => fly(fitPath(layout.bounds, viewport, insets))}><Maximize className="size-3.5" /></button>
          {connectId && (
            <>
              <span className="map-tools-sep" aria-hidden="true" />
              <button type="button" className="pm-clear" onClick={clearFocus}>Hide connections</button>
            </>
          )}
        </div>
      )}

      {selected && <Details key={selected.id} item={selected} items={items} inCalendar={j.mapCalendar.includes(selected.id)} connecting={connectId === selected.id} actions={actions} onClose={() => { setSelectedId(null); clearFocus(); }} onHide={clearFocus} onGo={pickFromList} />}
    </>
  );
}

function Filters({ query, onQuery, category, onCategory, items }: { query: string; onQuery: (q: string) => void; category: PathCategory | "all"; onCategory: (c: PathCategory | "all") => void; items: PathItem[] }) {
  return (
    <div>
      <label className="pm-search">
        <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search classes, people, events" aria-label="Search your map" />
      </label>
      <div className="pm-chips" role="group" aria-label="Category">
        <button type="button" className="map-chip" aria-pressed={category === "all"} onClick={() => onCategory("all")}>All</button>
        {pathCategories.map((c) => (
          <button key={c.id} type="button" className="map-chip" aria-pressed={category === c.id} disabled={!items.some((i) => i.category === c.id)} onClick={() => onCategory(c.id)} style={{ "--c": COLOR[c.id] } as CSSProperties}>
            <span className="pm-square" aria-hidden="true" />{c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ItemMark({ item }: { item: PathItem }) {
  if (item.visual) return <Visual visual={item.visual} title={item.title} />;
  const Icon = ICON[item.category];
  return <span className="mn-visual pm-icon"><Icon className="size-3.5" aria-hidden="true" /></span>;
}

function StateTag({ state, calendar }: { state: PathState; calendar: boolean }) {
  const Icon = STATE_ICON[state];
  return (
    <span className="pm-state" data-state={state}>
      <Icon className="size-3" aria-hidden="true" />{PATH_STATE_LABEL[state]}
      {calendar && <CalendarCheck className="ml-1 size-3" aria-label="On your calendar" />}
    </span>
  );
}

function ItemMenu({ item, items, inCalendar, actions, children }: { item: PathItem; items: PathItem[]; inCalendar: boolean; actions: Actions; children: ReactElement }) {
  const connected = connectionsOf(item.id, pathConnections, items).length > 0;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="pm-menu">
        {item.open && <ContextMenuItem onSelect={() => actions.open(item)}>{item.openLabel ?? "Open"}</ContextMenuItem>}
        {item.date && <ContextMenuItem onSelect={() => actions.calendar(item)}>{inCalendar ? "Remove from calendar" : "Add to calendar"}</ContextMenuItem>}
        {connected && <ContextMenuItem onSelect={() => actions.connect(item)}>Show connections</ContextMenuItem>}
        {item.state === "suggested" && (
          <>
            {(item.open || item.date || connected) && <ContextMenuSeparator />}
            <ContextMenuItem onSelect={() => actions.dismiss(item)}>Not for me</ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/** Rendered once per layout, so moving the camera only touches one transform. */
const Board = memo(function Board({ layout, selectedId, matchIds, linked, near, toGoal, grownId, calendar, notesLine, onNotes, actions, items }: { layout: PathLayout; selectedId: string | null; matchIds: Set<string> | null; linked: Set<string> | null; near: Set<string> | null; toGoal: Set<string> | null; grownId: string | null; calendar: string[]; notesLine: string; onNotes: () => void; actions: Actions; items: PathItem[] }) {
  const box = (b: { x: number; y: number; w: number; h: number }) => ({ left: b.x, top: b.y, width: b.w, height: b.h });
  return (
    <>
      <svg className="map-svg" width="1" height="1" aria-hidden="true">
        {layout.lines.map((l) => <path key={l.id} d={l.d} className="pm-line" data-solid={l.solid || undefined} data-focus={toGoal?.has(l.id) || undefined} data-dim={(toGoal && !toGoal.has(l.id)) || undefined} />)}
      </svg>
      <div className="pm-goal" style={box(layout.goal)}>
        <span>Goal</span>
        <strong>{pathGoal.role}</strong>
      </div>
      <div className="pm-path" style={box(layout.path)}>
        <span className="pm-logos" aria-hidden="true">
          <span className="mn-visual mn-visual-logo"><SchoolLogo school="bayview" className="size-full" /></span>
          <span className="mn-visual mn-visual-logo"><SchoolLogo school="northgate" className="size-full" /></span>
        </span>
        <span className="min-w-0">
          <span className="pm-path-label">Your path</span>
          <strong>{pathGoal.degree}</strong>
          <span className="pm-path-sub">{pathGoal.route} · {pathGoal.finish}</span>
        </span>
      </div>
      <button type="button" className="pm-notes" style={box(layout.notes)} onClick={onNotes}>
        <NotebookPen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0">
          <strong>Your notes</strong>
          <span>{notesLine}</span>
        </span>
      </button>
      {layout.columns.map((c) => (
        <div key={c.id} className="pm-head" style={{ ...box(c), "--c": COLOR[c.id] } as CSSProperties}>
          <span className="pm-square" aria-hidden="true" />{c.label}<span className="pm-count">{c.count}</span>
        </div>
      ))}
      {layout.cards.map((c) => (
        <ItemMenu key={c.id} item={c} items={items} inCalendar={calendar.includes(c.id)} actions={actions}>
          <button
            type="button"
            className="pm-card"
            draggable={false}
            style={{ ...box(c), "--c": COLOR[c.category] } as CSSProperties}
            data-cat={c.category}
            data-state={c.state}
            data-selected={selectedId === c.id || undefined}
            data-off={(matchIds && !matchIds.has(c.id)) || (linked && !linked.has(c.id)) || undefined}
            data-dim={(near && !near.has(c.id)) || undefined}
            data-grown={grownId === c.id || undefined}
            onClick={() => actions.pick(c.id)}
            onDoubleClick={() => actions.open(c)}
          >
            <span className="pm-card-top"><ItemMark item={c} /><span className="pm-card-title">{c.title}</span></span>
            <span className="pm-card-sub">{c.sub}</span>
            <StateTag state={c.state} calendar={calendar.includes(c.id)} />
          </button>
        </ItemMenu>
      ))}
    </>
  );
});

function Details({ item, items, inCalendar, connecting, actions, onClose, onHide, onGo }: { item: PathItem; items: PathItem[]; inCalendar: boolean; connecting: boolean; actions: Actions; onClose: () => void; onHide: () => void; onGo: (item: PathItem) => void }) {
  const connections = connectionsOf(item.id, pathConnections, items);
  const Icon = STATE_ICON[item.state];
  return (
    <aside className="map-ui map-inspector pm-details" aria-label={item.title} style={{ "--c": COLOR[item.category] } as CSSProperties}>
      <div className="flex items-start gap-2.5">
        <ItemMark item={item} />
        <div className="min-w-0 flex-1 font-medium">{item.title}</div>
        <button type="button" className="map-icon-btn -mr-1 -mt-1" aria-label="Close" onClick={onClose}><X className="size-3.5" /></button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        <span className="map-tag" style={{ "--st": "var(--foreground)" } as CSSProperties}><Icon className="size-3" aria-hidden="true" />{PATH_STATE_LABEL[item.state]}</span>
        <span className="map-tag" style={{ "--st": "var(--foreground)" } as CSSProperties}>{CATEGORY_LABEL[item.category]}</span>
      </div>
      {item.when && <p className="mt-2.5">{item.when}{item.place ? ` · ${item.place}` : ""}</p>}
      <p className="mt-1 text-muted-foreground">{item.about}</p>
      {!!connections.length && (
        <div className="map-section">
          <div className="map-section-title">Connected to</div>
          {connections.map((c) => (
            <button key={c.id} type="button" className="pm-connected" onClick={() => onGo(c.item)}>
              <span className="font-medium">{c.item.title}</span>
              <span className="text-muted-foreground">{c.why}</span>
            </button>
          ))}
          <button type="button" className="pm-link-btn" onClick={() => (connecting ? onHide() : actions.connect(item))}>{connecting ? "Hide connections" : "Show connections"}</button>
        </div>
      )}
      <div className="map-section flex flex-col items-start gap-1.5">
        {item.open && <button type="button" className="pm-link-btn font-medium" onClick={() => actions.open(item)}>{item.openLabel ?? "Open"} <ArrowRight className="size-3.5" aria-hidden="true" /></button>}
        {item.date && <button type="button" className="pm-link-btn" onClick={() => actions.calendar(item)}><CalendarPlus className="size-3.5" aria-hidden="true" />{inCalendar ? "Remove from calendar" : "Add to calendar"}</button>}
        {item.state === "suggested" && <button type="button" className="pm-link-btn text-muted-foreground" onClick={() => actions.dismiss(item)}>Not for me</button>}
      </div>
    </aside>
  );
}
