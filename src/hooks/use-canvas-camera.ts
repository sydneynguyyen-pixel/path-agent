import { useCallback, useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from "react";
import type { Camera, Viewport } from "@/lib/map";
import { calm } from "@/lib/motion";

const FLY_MS = 480;
// Zoom glides: it trails the fingers slightly, then coasts to a stop after they lift.
const ZOOM_FOLLOW_MS = 70;
const ZOOM_COAST_MS = 170;
const ZOOM_RELEASE_MS = 34;
// A drag that ends while moving keeps sliding and slows to a stop.
const PAN_COAST_MS = 325;
const PAN_MIN_SPEED = 0.05; // px per ms

type Options = {
  minScale: number;
  maxScale: number;
  zoom: (c: Camera, s: number, x: number, y: number) => Camera;
  clamp: (c: Camera, v: Viewport) => Camera;
  /** Where the camera starts the first time the view has a size. */
  place: (v: Viewport) => Camera;
  /** Holds the camera between visits, so switching views keeps your place. */
  memory: MutableRefObject<Camera | null>;
};

/** Pan, pinch, wheel zoom and fly-to for a canvas. The caller decides how zoom and limits work. */
export function useCanvasCamera(options: Options) {
  const opts = useRef(options);
  opts.current = options;
  const view = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Viewport>({ w: 0, h: 0 });
  const [cam, setCam] = useState<Camera>(() => options.memory.current ?? { x: 0, y: 0, s: 1 });
  const camRef = useRef(cam);
  const frame = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const travel = useRef(0);
  const velocity = useRef({ x: 0, y: 0, t: 0 });
  const panning = useRef(false);
  const [dragging, setDragging] = useState(false);

  const move = useCallback((next: Camera) => {
    const el = view.current;
    const held = el?.clientWidth ? opts.current.clamp(next, { w: el.clientWidth, h: el.clientHeight }) : next;
    camRef.current = held;
    opts.current.memory.current = held;
    setCam(held);
  }, []);

  const glide = useRef({ on: false, target: 0, velocity: 0, x: 0, y: 0, input: 0, tick: 0 });
  const stopMotion = useCallback(() => {
    cancelAnimationFrame(frame.current);
    glide.current.on = false;
    glide.current.velocity = 0;
  }, []);

  /** Feeds one zoom step (in log scale) into the glide, around a screen point. */
  const nudgeZoom = useCallback((delta: number, x: number, y: number) => {
    const g = glide.current;
    const now = performance.now();
    const { zoom, minScale, maxScale } = opts.current;
    const clampLog = (v: number) => Math.min(Math.log(maxScale), Math.max(Math.log(minScale), v));
    if (calm()) return move(zoom(camRef.current, camRef.current.s * Math.exp(delta), x, y));
    if (!g.on) {
      cancelAnimationFrame(frame.current);
      g.target = Math.log(camRef.current.s);
      g.velocity = 0;
      g.input = now - 16;
    }
    g.target = clampLog(g.target + delta);
    g.velocity = g.velocity * 0.7 + (delta / Math.max(8, now - g.input)) * 0.3;
    g.input = now;
    g.x = x;
    g.y = y;
    if (g.on) return;
    g.on = true;
    g.tick = now;
    const step = (t: number) => {
      const dt = Math.min(48, t - g.tick);
      g.tick = t;
      if (t - g.input > ZOOM_RELEASE_MS) {
        g.target = clampLog(g.target + g.velocity * dt);
        g.velocity *= Math.exp(-dt / ZOOM_COAST_MS);
      }
      const c = camRef.current;
      const current = Math.log(c.s);
      const next = current + (g.target - current) * (1 - Math.exp(-dt / ZOOM_FOLLOW_MS));
      move(opts.current.zoom(c, Math.exp(next), g.x, g.y));
      if (Math.abs(g.target - next) < 0.0006 && Math.abs(g.velocity) < 0.00002 && t - g.input > ZOOM_RELEASE_MS) {
        g.on = false;
        return;
      }
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [move]);

  const fly = useCallback((target: Camera) => {
    stopMotion();
    if (calm()) return move(target);
    const from = camRef.current;
    const began = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / FLY_MS);
      const e = 1 - (1 - t) ** 3;
      move({ s: from.s * (target.s / from.s) ** e, x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e });
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [move, stopMotion]);

  useEffect(() => {
    const el = view.current;
    if (!el) return;
    let placed = !!opts.current.memory.current;
    const measure = () => {
      const v = { w: el.clientWidth, h: el.clientHeight };
      if (!placed && v.w) {
        placed = true;
        move(opts.current.place(v));
      }
      setSize(v);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // Two fingers on a trackpad move the canvas; a pinch arrives as a wheel event with ctrl held.
    // A mouse wheel zooms. Browsers report a trackpad's legacy wheelDelta as exactly -3x its
    // deltaY, which a mouse wheel never matches; sideways scroll is a trackpad too. Once a
    // trackpad is seen, its trailing momentum events keep panning for a moment.
    let trackpadAt = 0;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const legacy = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
      const pad = e.deltaMode === 0 && (e.deltaX !== 0 || (legacy !== undefined && legacy !== 0 && legacy === -3 * e.deltaY));
      if (pad) trackpadAt = e.timeStamp;
      const mouse = !pad && e.timeStamp - trackpadAt > 400;
      if (e.ctrlKey || e.metaKey) {
        nudgeZoom(-e.deltaY * 0.01, e.clientX - rect.left, e.clientY - rect.top);
      } else if (mouse) {
        // Lines or pages (Firefox) count as a full notch; pixel steps scale, so smooth wheels stay smooth.
        const px = e.deltaMode === 0 ? e.deltaY : Math.sign(e.deltaY) * 100;
        nudgeZoom(-Math.max(-0.25, Math.min(0.25, px * 0.002)), e.clientX - rect.left, e.clientY - rect.top);
      } else {
        stopMotion();
        const c = camRef.current;
        move({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY });
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", wheel);
      stopMotion();
    };
  }, [move, nudgeZoom, stopMotion]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Portaled menus bubble through React too, and aren't part of the canvas.
    if (e.button !== 0 || !e.currentTarget.contains(e.target as Node)) return;
    stopMotion();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) { travel.current = 0; velocity.current = { x: 0, y: 0, t: e.timeStamp }; }
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const map = pointers.current;
    const prev = map.get(e.pointerId);
    if (!prev) return;
    const point = { x: e.clientX, y: e.clientY };
    const c = camRef.current;
    if (map.size === 1) {
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      travel.current += Math.hypot(dx, dy);
      map.set(e.pointerId, point);
      if (travel.current < 4) return;
      if (!panning.current) {
        panning.current = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
        setDragging(true);
      }
      // Recent motion, smoothed, so the release carries the drag's speed.
      const dt = Math.max(1, e.timeStamp - velocity.current.t);
      const k = Math.min(1, dt / 50);
      velocity.current = { x: velocity.current.x * (1 - k) + (dx / dt) * k, y: velocity.current.y * (1 - k) + (dy / dt) * k, t: e.timeStamp };
      move({ ...c, x: c.x + dx, y: c.y + dy });
      return;
    }
    // Two fingers on a phone: pinch around their midpoint.
    const other = [...map.entries()].find(([id]) => id !== e.pointerId)?.[1];
    map.set(e.pointerId, point);
    if (!other) return;
    travel.current += 10;
    const rect = e.currentTarget.getBoundingClientRect();
    const before = Math.hypot(prev.x - other.x, prev.y - other.y) || 1;
    const after = Math.hypot(point.x - other.x, point.y - other.y);
    nudgeZoom(Math.log((after || 1) / before), (point.x + other.x) / 2 - rect.left, (point.y + other.y) / 2 - rect.top);
  };
  const coast = useCallback((vx: number, vy: number) => {
    const speed = Math.hypot(vx, vy);
    if (speed > 3) { vx *= 3 / speed; vy *= 3 / speed; }
    let t0 = performance.now();
    const step = (t: number) => {
      const dt = Math.min(48, t - t0);
      t0 = t;
      const decay = Math.exp(-dt / PAN_COAST_MS);
      vx *= decay;
      vy *= decay;
      const c = camRef.current;
      move({ ...c, x: c.x + vx * dt, y: c.y + vy * dt });
      if (Math.hypot(vx, vy) > 0.01) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [move]);
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const wasDrag = pointers.current.size === 1 && panning.current;
    pointers.current.delete(e.pointerId);
    if (!pointers.current.size) { panning.current = false; setDragging(false); }
    // Only a drag that was still moving when released keeps going.
    const v = velocity.current;
    if (wasDrag && e.type === "pointerup" && !calm() && e.timeStamp - v.t < 80 && Math.hypot(v.x, v.y) > PAN_MIN_SPEED) coast(v.x, v.y);
  };

  return { view, size, cam, camRef, travel, dragging, move, fly, pointer: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd } };
}
