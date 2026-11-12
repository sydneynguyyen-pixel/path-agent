import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, ArrowRight, Check, LayoutGrid, Minus, Palette, Plus, RotateCcw } from "lucide-react";
import { SCRIPT_TODAY, useJourney } from "@/lib/journey";
import { themeFor, addWidget, DEFAULT_DESK, moveWidget, removeWidget, resizeWidget, resolveWallpaper, WALLPAPERS, WIDGET_KINDS, WIDGETS, type Placed, type WallpaperId, type WidgetGroup, type WidgetKind, type WidgetSize } from "@/lib/desktop";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import valleyFall from "@/assets/valley-fall.jpg";
import valleyWinter from "@/assets/valley-winter.jpg";
import valleySpring from "@/assets/valley-spring.jpg";
import valleySummer from "@/assets/valley-hero.jpg";
import bay from "@/assets/scene-home.jpg";

const ART: Partial<Record<WallpaperId, string>> = { fall: valleyFall, winter: valleyWinter, spring: valleySpring, summer: valleySummer, bay };

/** The wallpaper behind the whole window on Home, so the sidebar and widgets read as glass over it. */
export function Wallpaper() {
  const { desk } = useJourney();
  const id = resolveWallpaper(desk.wallpaper, SCRIPT_TODAY);
  const art = ART[id];
  return (
    <div aria-hidden="true" className={cn("desk-wall", `wall-${id}`)}>
      {art && <img key={id} src={art} alt="" width={1920} height={1088} />}
    </div>
  );
}

const SIZE_NAME: Record<WidgetSize, string> = { s: "Small", m: "Medium", l: "Large" };

/** The widget column. Press and hold, or Edit, to rearrange, resize and remove. */
export function DeskWidgets({ icons, render }: { icons: Record<WidgetKind, ReactNode>; render: (w: Placed) => ReactNode }) {
  const { desk, setDesk } = useJourney();
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<"widgets" | "wallpaper" | null>(null);
  const [dragging, setDragging] = useState<WidgetKind | null>(null);
  const hold = useRef<number | null>(null);
  const list = desk.widgets;
  // Resizing, moving and removing morph: each tile grows or shrinks into its new spot (View Transitions; other browsers just change).
  const update = (f: (l: Placed[]) => Placed[]) => {
    const apply = () => setDesk((d) => ({ ...d, widgets: f(d.widgets) }));
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset["vt"]) return apply();
    document.documentElement.dataset["vt"] = "desk";
    morphing.current = true;
    doc.startViewTransition(() => flushSync(apply)).finished.finally(() => { delete document.documentElement.dataset["vt"]; morphing.current = false; });
  };
  // While dragging, the others make room as she passes over them, instead of one lighting up as a drop target.
  const morphing = useRef(false);
  const pushAside = (target: WidgetKind, i: number) => {
    if (!dragging || dragging === target || morphing.current) return;
    update((l) => moveWidget(l, dragging, i));
  };

  useEffect(() => {
    if (!editing) return;
    // Escape inside the customize sheet only closes the sheet.
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !sheet && !(e.target as Element | null)?.closest?.("[role=dialog]")) setEditing(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, sheet]);

  const startHold = (e: React.PointerEvent) => {
    if (editing || e.button !== 0 || (e.target as HTMLElement).closest("a,button,input")) return;
    hold.current = window.setTimeout(() => setEditing(true), 550);
  };
  const cancelHold = () => { if (hold.current) window.clearTimeout(hold.current); hold.current = null; };

  return (
    <section aria-labelledby="desk-widgets" className={cn("desk-widgets", editing && "desk-editing")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="desk-widgets" className="sr-only">Your widgets</h2>
        {editing ? (
          // The editing controls open where "Edit widgets" was, with Done in its place, so nothing jumps across the page.
          <div className="desk-edit-bar ml-auto flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="ghost" className="desk-pill" onClick={() => setDesk((d) => ({ ...d, widgets: DEFAULT_DESK.widgets }))}><RotateCcw className="size-3.5" aria-hidden="true" />Reset</Button>
            <Button size="sm" variant="outline" className="desk-pill" onClick={() => setSheet("wallpaper")}><Palette className="size-4" aria-hidden="true" />Theme</Button>
            <Button size="sm" variant="outline" className="desk-pill" onClick={() => setSheet("widgets")}><Plus className="size-4" aria-hidden="true" />Add widget</Button>
            <Button size="sm" className="rounded-full" onClick={() => setEditing(false)}><Check className="size-4" aria-hidden="true" />Done</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="desk-pill ml-auto" onClick={() => setEditing(true)}><LayoutGrid className="size-4" aria-hidden="true" />Edit widgets</Button>
        )}
      </div>

      {list.length === 0 ? (
        <button type="button" onClick={() => { setEditing(true); setSheet("widgets"); }} className="desk-empty">
          <Plus className="size-5" aria-hidden="true" /><span className="font-medium">Add your first widget</span>
        </button>
      ) : (
        <ul className="desk-grid">
          {list.map((w, i) => {
            const meta = WIDGETS[w.kind];
            return (
              <li
                key={w.kind}
                className={cn("desk-tile desk-glass", `desk-${w.size}`, dragging === w.kind && "desk-dragging")}
                style={{ animationDelay: `${(i % 3) * -0.11}s`, "--vt": `desk-${w.kind}` } as React.CSSProperties}
                draggable={editing}
                onDragStart={(e) => { setDragging(w.kind); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", w.kind); }}
                onDragEnd={() => setDragging(null)}
                onDragEnter={() => pushAside(w.kind, i)}
                onDragOver={(e) => { if (dragging) e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); setDragging(null); }}
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                aria-label={editing ? `${meta.title}, ${SIZE_NAME[w.size].toLowerCase()}. Drag to move.` : undefined}
              >
                <div className={cn("desk-tile-body", editing && "pointer-events-none select-none")} inert={editing || undefined}>{render(w)}</div>
                {editing && (
                  <>
                    <button type="button" className="desk-remove" onClick={() => update((l) => removeWidget(l, w.kind))} aria-label={`Remove ${meta.title}`}><Minus className="size-3.5" aria-hidden="true" /></button>
                    <div className="desk-tools">
                      <button type="button" className="desk-tool" disabled={i === 0} onClick={() => update((l) => moveWidget(l, w.kind, i - 1))} aria-label={`Move ${meta.title} earlier`}><ArrowLeft className="size-3.5" aria-hidden="true" /></button>
                      {meta.sizes.length > 1 && (
                        <span className="desk-sizes" role="radiogroup" aria-label={`${meta.title} size`}>
                          {meta.sizes.map((s) => (
                            <button key={s} type="button" role="radio" aria-checked={w.size === s} aria-label={SIZE_NAME[s]} onClick={() => update((l) => resizeWidget(l, w.kind, s))}>{s.toUpperCase()}</button>
                          ))}
                        </span>
                      )}
                      <button type="button" className="desk-tool" disabled={i === list.length - 1} onClick={() => update((l) => moveWidget(l, w.kind, i + 1))} aria-label={`Move ${meta.title} later`}><ArrowRight className="size-3.5" aria-hidden="true" /></button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Customize tab={sheet} onTab={setSheet} icons={icons} render={render} />
    </section>
  );
}

const GROUPS: ("All" | WidgetGroup)[] = ["All", "Today", "Path", "Career", "People"];

/** One sheet for adding widgets and picking a wallpaper. */
function Customize({ tab, onTab, icons, render }: { tab: "widgets" | "wallpaper" | null; onTab: (t: "widgets" | "wallpaper" | null) => void; icons: Record<WidgetKind, ReactNode>; render: (w: Placed) => ReactNode }) {
  const { desk, setDesk } = useJourney();
  const { setTheme } = useTheme();
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("All");
  const [picked, setPicked] = useState<WidgetKind | null>(null);
  const kinds = WIDGET_KINDS.filter((k) => group === "All" || WIDGETS[k].group === group);
  const onHome = (k: WidgetKind) => desk.widgets.some((w) => w.kind === k);
  return (
    <Sheet open={!!tab} onOpenChange={(o) => { if (!o) { onTab(null); setPicked(null); } }}>
      <SheetContent side="right" className="desk-sheet w-full overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle>Customize Home</SheetTitle><SheetDescription>Pick what sits on your Home and what's behind it.</SheetDescription></SheetHeader>
        <Tabs value={tab ?? "widgets"} onValueChange={(t) => onTab(t as "widgets" | "wallpaper")} className="mt-4">
          <TabsList className="rounded-full"><TabsTrigger value="widgets" className="rounded-full">Widgets</TabsTrigger><TabsTrigger value="wallpaper" className="rounded-full">Theme</TabsTrigger></TabsList>

          <TabsContent value="widgets" className="mt-4">
            {!picked && <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter widgets">
              {GROUPS.map((g) => <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className="pick-chip">{g}</button>)}
            </div>}
            {picked ? (
              <WidgetDetail key={picked} kind={picked} icon={icons[picked]} render={render} onBack={() => setPicked(null)} />
            ) : (
              <>
                {/* Not-yet-added first, since adding is why she's here; what's already on Home sits below, marked. */}
                {([["Add to Home", kinds.filter((k) => !onHome(k))], ["On your Home", kinds.filter(onHome)]] as const).map(([label, ks]) => ks.length > 0 && (
                  <section key={label} className="mt-5">
                    <h3 className="desk-gallery-head">{label}</h3>
                    <ul className="desk-gallery">
                      {ks.map((k) => {
                        const meta = WIDGETS[k];
                        const on = onHome(k);
                        const small = meta.sizes[0]!;
                        return (
                          <li key={k}>
                            <button type="button" className="desk-card" data-on={on || undefined} onClick={() => setPicked(k)} aria-label={`${meta.title}${on ? ", on your Home" : ""}. See sizes`}>
                              <span className="desk-card-art">
                                <span className="desk-preview" data-size={small} data-fit="card" aria-hidden="true" inert>
                                  <span className={cn("desk-tile desk-glass", `desk-${small}`)}><span className="desk-tile-body">{render({ kind: k, size: small })}</span></span>
                                </span>
                                {on && <span className="desk-card-check" aria-hidden="true"><Check className="size-3" /></span>}
                              </span>
                              <span className="flex min-w-0 items-center gap-2 px-1">
                                <span className="desk-icon desk-icon-xs">{icons[k]}</span>
                                <span className="truncate text-xs font-semibold">{meta.title}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="wallpaper" className="mt-4 space-y-5">
            <p className="text-xs text-muted-foreground">Your wallpaper also sets the colors across Sprout, like the sidebar and buttons.</p>
            {(["illustration", "color"] as const).map((kind) => (
              <fieldset key={kind}>
                <legend className="text-xs font-semibold">{kind === "illustration" ? "Illustrations" : "Colors"}</legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {WALLPAPERS.filter((w) => w.kind === kind).map((w) => {
                    const shown = resolveWallpaper(w.id, SCRIPT_TODAY);
                    const art = ART[shown];
                    const on = desk.wallpaper === w.id;
                    return (
                      <button key={w.id} type="button" aria-pressed={on} onClick={(e) => { setDesk((d) => ({ ...d, wallpaper: w.id })); setTheme(themeFor(w.id, SCRIPT_TODAY), e.currentTarget); }} className="desk-swatch">
                        <span className={cn("desk-swatch-art", `wall-${shown}`)}>{art && <img src={art} alt="" loading="lazy" />}{on && <span className="desk-swatch-check"><Check className="size-3.5" aria-hidden="true" /></span>}</span>
                        <span className="text-xs font-medium">{w.name}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/** One widget, opened from the gallery: see it at each size, then add it, or change or remove it if it's already on Home. */
function WidgetDetail({ kind, icon, render, onBack }: { kind: WidgetKind; icon: ReactNode; render: (w: Placed) => ReactNode; onBack: () => void }) {
  const { desk, setDesk } = useJourney();
  const meta = WIDGETS[kind];
  const placed = desk.widgets.find((w) => w.kind === kind);
  const [pick, setPick] = useState<WidgetSize>(placed?.size ?? (meta.sizes.includes("m") ? "m" : meta.sizes[0]!));
  const size = placed?.size ?? pick;
  const choose = (s: WidgetSize) => (placed ? setDesk((d) => ({ ...d, widgets: resizeWidget(d.widgets, kind, s) })) : setPick(s));
  return (
    <div className="desk-detail">
      <button type="button" onClick={onBack} className="desk-pill inline-flex h-8 items-center gap-1.5 px-3 text-xs font-medium"><ArrowLeft className="size-3.5" aria-hidden="true" />All widgets</button>
      <div className="mt-4 flex items-center gap-3">
        <span className="desk-icon">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{meta.title}</h3>
          <p className="text-xs text-muted-foreground">{meta.blurb}</p>
        </div>
        {placed && <span className="desk-on-home"><Check className="size-3.5" aria-hidden="true" />On Home</span>}
      </div>
      <div className="desk-detail-stage">
        <div key={size} className="desk-preview" data-size={size} data-fit="detail" aria-hidden="true" inert>
          <div className={cn("desk-tile desk-glass", `desk-${size}`)}><div className="desk-tile-body">{render({ kind, size })}</div></div>
        </div>
      </div>
      {meta.sizes.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Size</span>
          <span className="desk-sizes" role="radiogroup" aria-label={`${meta.title} size`}>
            {meta.sizes.map((s) => <button key={s} type="button" role="radio" aria-checked={size === s} aria-label={SIZE_NAME[s]} onClick={() => choose(s)}>{s.toUpperCase()}</button>)}
          </span>
        </div>
      )}
      <div className="mt-5">
        {placed ? (
          <Button variant="outline" className="w-full rounded-full" onClick={() => { setDesk((d) => ({ ...d, widgets: removeWidget(d.widgets, kind) })); onBack(); }}><Minus className="size-4" aria-hidden="true" />Remove from Home</Button>
        ) : (
          <Button className="w-full rounded-full" onClick={() => { setDesk((d) => ({ ...d, widgets: addWidget(d.widgets, kind, size) })); onBack(); }}><Plus className="size-4" aria-hidden="true" />Add to Home</Button>
        )}
      </div>
    </div>
  );
}
