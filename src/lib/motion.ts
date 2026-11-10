const NS = "http://www.w3.org/2000/svg";

export const calm = () => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** One hidden SVG holds every shared filter: each glass lens. */
export function svgDefs(): SVGDefsElement {
  const known = document.getElementById("pa-defs");
  if (known) return known as unknown as SVGDefsElement;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  const defs = document.createElementNS(NS, "defs");
  defs.id = "pa-defs";
  svg.append(defs);
  document.body.append(svg);
  return defs;
}

const ART = ".flyer, .explore-photo";
const SETTLE = "cubic-bezier(.22,.8,.2,1)";

function fromCard(panel: HTMLElement, card: HTMLElement) {
  const p = panel.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  const scale = Math.max(0.35, Math.min(1, c.width / p.width));
  return `translate(${c.left + c.width / 2 - (p.left + p.width / 2)}px, ${c.top + c.height / 2 - (p.top + p.height / 2)}px) scale(${scale})`;
}

/** The details panel grows out of the card that opened it, once, without touching the page behind it. */
export function growFrom(panel: HTMLElement, card: HTMLElement | null) {
  // React can attach the same panel twice, and measuring mid-animation would cancel the growth out.
  if (calm() || panel.dataset["grown"] !== undefined) return;
  panel.dataset["grown"] = "";
  const from = card ? fromCard(panel, card) : "translateY(10px) scale(.98)";
  panel.animate([{ transform: from, opacity: 0 }, { opacity: 1, offset: 0.4 }, { transform: "none", opacity: 1 }], { duration: 340, easing: SETTLE });
}

/** The details panel shrinks back into its card, then closes. */
export function shrinkInto(panel: HTMLElement | null, card: HTMLElement | null, done: () => void) {
  if (calm() || !panel) return done();
  if (panel.dataset["closing"] !== undefined) return;
  panel.dataset["closing"] = "";
  const timing = { duration: 220, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" } as const;
  panel.previousElementSibling?.animate({ opacity: [1, 0] }, timing);
  const to = card ? fromCard(panel, card) : "translateY(10px) scale(.98)";
  void panel.animate([{ transform: "none", opacity: 1 }, { opacity: 1, offset: 0.55 }, { transform: to, opacity: 0 }], timing).finished.then(done, done);
}

const visibleLink = (href: string) =>
  [...document.querySelectorAll<HTMLElement>(`a[href="${href}"]`)].find((a) => {
    const r = a.getBoundingClientRect();
    return r.width > 0 && r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight;
  });

/** A copy of the listing's picture arcs into a nav tab, and the tab catches it. */
export function flyTo(from: HTMLElement | null, href: string) {
  if (calm() || !from) return;
  const target = visibleLink(href);
  if (!target) return;
  const art = from.closest("article, [role=dialog], [data-plan-card]")?.querySelector<HTMLElement>(ART) ?? from;
  const a = art.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ghost = art.cloneNode(true) as HTMLElement;
  ghost.classList.add("flight");
  ghost.style.cssText = `width:${a.width}px;height:${a.height}px;`;

  const x0 = a.left + a.width / 2;
  const y0 = a.top + a.height / 2;
  const x1 = b.left + 28;
  const y1 = b.top + b.height / 2;
  const bend = Math.min(y0, y1) - Math.max(60, Math.abs(x1 - x0) * 0.16);
  ghost.style.offsetPath = `path("M ${x0} ${y0} Q ${(x0 + x1) / 2} ${bend} ${x1} ${y1}")`;
  document.body.append(ghost);

  const end = Math.max(0.1, 26 / a.width);
  const flight = ghost.animate(
    [
      { offsetDistance: "0%", transform: "scale(1)", opacity: 1 },
      { offset: 0.14, transform: "scale(1.05)", opacity: 1 },
      { offset: 0.86, opacity: 1 },
      { offsetDistance: "100%", transform: `scale(${end})`, opacity: 0.25 },
    ],
    { duration: 760, easing: "cubic-bezier(.5,.05,.2,1)", fill: "both" },
  );
  void flight.finished.finally(() => ghost.remove());
  void flight.finished.then(() => catchAt(target));
}

function catchAt(target: HTMLElement) {
  target.animate({ scale: [1, 1.04, 1] }, { duration: 320, easing: "ease-out" });
}
