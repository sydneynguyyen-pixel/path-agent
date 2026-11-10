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
export function useLiquidGlass<T extends HTMLElement>(ref: RefObject<T | null>, { bezel = 12, scale = 34, blur = 0.4, saturate = 1.5 } = {}) {
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
    const bend = document.createElementNS(NS, "feDisplacementMap");
    bend.setAttribute("in", "SourceGraphic");
    bend.setAttribute("in2", "map");
    bend.setAttribute("xChannelSelector", "R");
    bend.setAttribute("yChannelSelector", "G");
    bend.setAttribute("result", "bent");
    // If a sample ever lands outside the backdrop, show the untouched page there instead of a black pixel.
    const merge = document.createElementNS(NS, "feMerge");
    for (const input of ["SourceGraphic", "bent"]) {
      const node = document.createElementNS(NS, "feMergeNode");
      node.setAttribute("in", input);
      merge.append(node);
    }
    filter.append(image, bend, merge);
    svgDefs().append(filter);

    const apply = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 2 || h < 2) return;
      const radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
      // Short pills get a thinner, gentler rim so the label sitting under them stays readable.
      image.setAttribute("href", mapFor(w, h, radius, Math.round(Math.min(bezel, h * 0.22))));
      bend.setAttribute("scale", String(scale * Math.min(1, (h / 46) ** 2)));
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
      timer = setTimeout(apply, 90);
    });
    resizes.observe(el);
    return () => {
      clearTimeout(timer);
      resizes.disconnect();
      filter.remove();
      el.style.backdropFilter = "";
    };
  }, [ref, bezel, scale, blur, saturate]);
}
