import { useEffect, type RefObject } from "react";
import { buildLensMap } from "@/lib/glass";
import { svgDefs } from "@/lib/motion";

const NS = "http://www.w3.org/2000/svg";
const maps = new Map<string, string>();
let nextId = 0;

/** Only Chromium can run an SVG filter as a backdrop. Everywhere else keeps the plain .glass look. */
function canRefract() {
  return typeof navigator !== "undefined" && /Chrome\//.test(navigator.userAgent);
}

function mapFor(w: number, h: number, radius: number, bezel: number) {
  const key = `${w}|${h}|${radius}|${bezel}`;
  const known = maps.get(key);
  if (known) return known;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.putImageData(new ImageData(buildLensMap(w, h, radius, bezel), w, h), 0, 0);
  const url = canvas.toDataURL("image/png");
  maps.set(key, url);
  return url;
}

/** Bends whatever passes behind the element at its edges, like the rim of a glass lens. */
/**
 * `aberration` splits the bend per color channel (red bends a little more, blue a little less),
 * which gives the thin rainbow fringe real glass has at its edge. 0 keeps one plain bend.
 */
export function useLiquidGlass<T extends HTMLElement>(ref: RefObject<T | null>, { bezel = 12, scale = 34, blur = 0.4, saturate = 1.5, aberration = 0 } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !canRefract()) return;
    const id = `pa-lens-${nextId++}`;
    const filter = document.createElementNS(NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("filterUnits", "userSpaceOnUse");
    filter.setAttribute("color-interpolation-filters", "sRGB");
    filter.setAttribute("x", "0");
    filter.setAttribute("y", "0");
    const image = document.createElementNS(NS, "feImage");
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("preserveAspectRatio", "none");
    image.setAttribute("result", "map");
    const nodes: SVGElement[] = [image];
    const bends: { node: SVGElement; k: number }[] = [];
    const displace = (k: number, result: string) => {
      const node = document.createElementNS(NS, "feDisplacementMap");
      node.setAttribute("in", "SourceGraphic");
      node.setAttribute("in2", "map");
      node.setAttribute("xChannelSelector", "R");
      node.setAttribute("yChannelSelector", "G");
      node.setAttribute("result", result);
      bends.push({ node, k });
      nodes.push(node);
    };
    if (aberration > 0) {
      // Bend each channel by a slightly different amount, keep only that channel, then add them back up.
      const channels: [string, number, string][] = [["r", 1 + aberration, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"], ["g", 1, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"], ["b", 1 - aberration, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"]];
      for (const [c, k, matrix] of channels) {
        displace(k, `d${c}`);
        const keep = document.createElementNS(NS, "feColorMatrix");
        keep.setAttribute("in", `d${c}`);
        keep.setAttribute("type", "matrix");
        keep.setAttribute("values", matrix);
        keep.setAttribute("result", c);
        nodes.push(keep);
      }
      const add = (a: string, b: string, result: string) => {
        const node = document.createElementNS(NS, "feBlend");
        node.setAttribute("in", a);
        node.setAttribute("in2", b);
        node.setAttribute("mode", "screen");
        node.setAttribute("result", result);
        nodes.push(node);
      };
      add("r", "g", "rg");
      add("rg", "b", "bent");
    } else displace(1, "bent");
    // If a sample ever lands outside the backdrop, show the untouched page there instead of a black pixel.
    const merge = document.createElementNS(NS, "feMerge");
    for (const input of ["SourceGraphic", "bent"]) {
      const node = document.createElementNS(NS, "feMergeNode");
      node.setAttribute("in", input);
      merge.append(node);
    }
    nodes.push(merge);
    filter.append(...nodes);
    svgDefs().append(filter);

    const apply = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 2 || h < 2) return;
      const radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
      // Short pills get a thinner, gentler rim so the label sitting under them stays readable.
      image.setAttribute("href", mapFor(w, h, radius, Math.round(Math.min(bezel, h * 0.22))));
      const amount = scale * Math.min(1, (h / 46) ** 2);
      for (const b of bends) b.node.setAttribute("scale", String(amount * b.k));
      for (const node of [filter, image]) {
        node.setAttribute("width", String(w));
        node.setAttribute("height", String(h));
      }
      el.style.backdropFilter = `url(#${id}) blur(${blur}px) saturate(${saturate})`;
    };

    apply();
    // A pill changes size as it glides, so wait for it to land before redrawing the lens.
    let timer: ReturnType<typeof setTimeout>;
    const resizes = new ResizeObserver(() => {
      clearTimeout(timer);
      // While it's changing shape the old lens would be the wrong size, so use plain frost until it settles.
      el.style.backdropFilter = `blur(${blur}px) saturate(${saturate})`;
      timer = setTimeout(apply, 90);
    });
    resizes.observe(el);
    return () => {
      clearTimeout(timer);
      resizes.disconnect();
      filter.remove();
      el.style.backdropFilter = "";
    };
  }, [ref, bezel, scale, blur, saturate, aberration]);
}
