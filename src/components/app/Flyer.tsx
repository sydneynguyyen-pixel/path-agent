import type { CSSProperties, ReactNode } from "react";
import type { FlyerSpec, FlyerStyle } from "@/data/scenario";
import { cn } from "@/lib/utils";

/** Every size is a percent of the flyer's width, so one design works from thumbnail to full view. */
const cq = (n: number) => `${n}cqw`;
const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });
/** The largest type that keeps the longest line inside the given width. */
const fit = (lines: string[], width: number, max: number, charWidth = 0.6) => Math.min(max, width / (charWidth * Math.max(...lines.map((l) => l.length))));

const HEAVY: CSSProperties = { fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 0.95 };
const SMALL: CSSProperties = { fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: 600, fontSize: cq(4.6), lineHeight: 1.15 };
const GEOMETRIC: CSSProperties = { fontFamily: "Geist, sans-serif", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 };
const face = (fontFamily: string, lineHeight = 0.95): CSSProperties => ({ fontFamily: `'${fontFamily}', 'Helvetica Neue', Arial, sans-serif`, fontWeight: 400, lineHeight });
const PIXEL: CSSProperties = { ...face("Pixelify Sans", 0.9), fontWeight: 700 };
const FILL = abs({ inset: 0, width: "100%", height: "100%" });

/** A sticker edge: the same color pushed out in every direction. */
const ring = (color: string, r: number) => [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]].map(([x, y]) => `${cq(x! * r)} ${cq(y! * r)} 0 ${color}`).join(", ");
const burstPath = (points: number, inner: number) => `polygon(${Array.from({ length: points * 2 }, (_, i) => {
  const r = (i % 2 ? inner : 1) * 50;
  const a = (Math.PI * i) / points;
  return `${(50 + r * Math.sin(a)).toFixed(1)}% ${(50 - r * Math.cos(a)).toFixed(1)}%`;
}).join(", ")})`;

const Lines = ({ lines }: { lines: string[] }) => <>{lines.map((l) => <div key={l}>{l}</div>)}</>;
const Pic = ({ src, style }: { src: string; style: CSSProperties }) => <img src={src} alt="" loading="lazy" style={{ objectFit: "cover", maxWidth: "none", ...style }} onError={(e) => { e.currentTarget.style.display = "none"; }} />;
const Burst = ({ x, y, size, color, points = 8, inner = 0.4, turn = 0 }: { x: number; y: number; size: number; color: string; points?: number; inner?: number; turn?: number }) => <div style={abs({ left: cq(x), top: cq(y), width: cq(size), height: cq(size), background: color, clipPath: burstPath(points, inner), transform: `rotate(${turn}deg)` })} />;
const Grain = () => <div className="flyer-grain" style={abs({ inset: 0 })} />;
const Overlay = ({ children }: { children: ReactNode }) => <svg viewBox="0 0 100 100" aria-hidden="true" style={FILL}>{children}</svg>;

type Template = (f: FlyerSpec, photo: string) => ReactNode;

const TEMPLATES: Record<FlyerStyle, Template> = {
  haze: (f) => {
    const size = fit(f.headline, 88, 21);
    return <div className="flyer-grain" style={abs({ inset: 0, background: `radial-gradient(52% 44% at 66% 14%, ${f.accent}, transparent 72%), radial-gradient(40% 40% at 28% 26%, ${f.pop}, transparent 72%), radial-gradient(56% 42% at 40% 96%, ${f.accent}, transparent 72%), radial-gradient(40% 36% at 92% 74%, ${f.pop}, transparent 75%)` })}>
      <div style={abs({ top: cq(14), left: 0, right: 0, textAlign: "center", ...HEAVY, fontSize: cq(8) })}>{f.when}</div>
      <div style={abs({ top: "50%", left: 0, right: 0, transform: "translateY(-50%)", textAlign: "center", ...HEAVY, fontSize: cq(size), filter: `blur(${cq(2.4)})`, opacity: 0.6 })}><Lines lines={f.headline} /></div>
      <div style={abs({ top: "50%", left: 0, right: 0, transform: "translateY(-50%)", textAlign: "center", ...HEAVY, fontSize: cq(size) })}><Lines lines={f.headline} /></div>
      <div style={abs({ bottom: cq(9), left: 0, right: 0, textAlign: "center", ...SMALL, fontSize: cq(5.4) })}>{f.note}</div>
    </div>;
  },
  poster: (f) => (
    <>
      <div style={abs({ left: cq(-6), top: cq(-5), ...HEAVY, fontSize: cq(62), lineHeight: 0.82 })}>{f.headline[0]!.slice(0, 4)}</div>
      <div style={abs({ left: cq(-4), bottom: cq(-9), ...HEAVY, fontSize: cq(62), lineHeight: 0.82 })}>{(f.headline[1] ?? f.headline[0]!).slice(0, 4)}</div>
      <div style={abs({ left: cq(11), right: cq(11), top: cq(30), height: cq(40), background: f.accent, display: "flex", boxShadow: `0 0 0 ${cq(0.7)} ${f.ink}` })}>
        <div style={{ width: cq(5), background: f.ink }} />
        <div style={{ padding: `${cq(4)} ${cq(4)}`, color: "#fff", ...HEAVY, fontSize: cq(fit(f.headline, 62, 14)), alignSelf: "center" }}><Lines lines={f.headline} /></div>
      </div>
      <div style={abs({ left: cq(11), top: cq(70), background: f.ink, color: f.brand, padding: `${cq(1.5)} ${cq(3)}`, ...SMALL, fontSize: cq(5.6) })}>{f.when}</div>
    </>
  ),
  bands: (f, photo) => {
    const band = (top: number, background: string, color: string, children: ReactNode) => <div style={abs({ top: cq(top), left: 0, right: 0, height: cq(25), background, color, display: "flex", alignItems: "center", padding: `0 ${cq(5)}`, ...HEAVY, fontWeight: 500, fontSize: cq(fit([String(children)], 90, 19, 0.52)) })}>{children}</div>;
    return <>
      {band(0, f.brand, f.ink, f.headline[0])}
      <Pic src={photo} style={abs({ top: cq(25), left: 0, width: "100%", height: cq(25), objectPosition: f.focus })} />
      {band(50, f.accent, f.pop, f.headline[1] ?? f.note)}
      {band(75, f.deep ?? f.ink, f.brand, f.when)}
    </>;
  },
  cutout: (f, photo) => (
    <>
      <div style={abs({ top: cq(5), left: 0, right: 0, textAlign: "center", ...HEAVY, fontSize: cq(fit([f.headline.join(" ")], 90, 15)) })}>{f.headline.join(" ")}</div>
      <div style={abs({ top: cq(22), left: 0, right: 0, textAlign: "center", ...HEAVY, fontSize: cq(6) })}>{f.note}</div>
      <Pic src={photo} style={abs({ top: cq(31), left: cq(13), width: cq(74), height: cq(52), objectPosition: f.focus })} />
      <div style={abs({ bottom: cq(5), left: 0, right: 0, textAlign: "center", ...HEAVY, fontSize: cq(8) })}>{f.when}</div>
    </>
  ),
  checker: (f, photo) => (
    <>
      {[[75, 0], [50, 13], [75, 25], [25, 25], [0, 50], [75, 50], [50, 50]].map(([l, t]) => <div key={`${l}-${t}`} style={abs({ left: cq(l!), top: cq(t!), width: cq(25), height: cq(13), background: f.accent })} />)}
      <Pic src={photo} style={abs({ left: cq(28), top: cq(36), width: cq(72), height: cq(46), filter: "grayscale(1) contrast(1.15)", objectPosition: f.focus })} />
      <div style={abs({ top: cq(6), left: cq(6), ...HEAVY, fontSize: cq(fit(f.headline, 62, 16)) })}><Lines lines={f.headline} /></div>
      <div style={abs({ left: 0, right: 0, bottom: 0, height: cq(18), background: f.accent, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", padding: `0 ${cq(6)}`, ...HEAVY, fontSize: cq(6.6) })}><span>{f.when}</span><span style={{ fontWeight: 500, fontSize: cq(4.8) }}>{f.note}</span></div>
    </>
  ),
  /** A photo with a two-tone block curving through the middle. */
  slab: (f, photo) => (
    <>
      <Pic src={photo} style={{ ...FILL, objectPosition: f.focus, filter: "brightness(.85)" }} />
      <Overlay>
        <rect x="4" y="11" width="92" height="60" fill={f.ink} />
        <path d="M4 11H85C80 30 62 44 34 44H4Z" fill={f.brand} />
        <path d="M96 44H60C42 44 25 57 19 71H96Z" fill={f.brand} />
      </Overlay>
      <div style={abs({ top: cq(14), left: 0, right: 0, textAlign: "center", color: "#fff", textTransform: "uppercase", ...GEOMETRIC, fontSize: cq(fit(f.headline, 86, 14.5, 0.68)), lineHeight: 1 })}><Lines lines={f.headline} /></div>
      <div style={abs({ top: cq(50), left: cq(9), right: cq(9), color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start" })}>
        <div><div style={{ ...GEOMETRIC, fontSize: cq(7.6) }}>{f.when}</div><div style={{ ...GEOMETRIC, fontWeight: 400, fontSize: cq(5), marginTop: cq(2) }}>{f.note}</div></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ width: cq(9), height: cq(9) }}><path d="M2 12h20M14 4l8 8-8 8" /></svg>
      </div>
      <Grain />
    </>
  ),
  /** A solid color, a black-and-white photo, and the name running along a looping ribbon. */
  ribbon: (f, photo) => (
    <>
      <div style={abs({ top: 0, left: cq(7), width: cq(6), height: cq(11), background: "#fff", clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)" })} />
      <div style={abs({ top: cq(17), left: cq(7), color: "#fff" })}>
        <div style={{ ...GEOMETRIC, fontWeight: 400, fontSize: cq(5.6) }}>{f.note}</div>
        <div style={{ ...GEOMETRIC, fontWeight: 700, fontSize: cq(fit(f.headline, 46, 11, 0.56)), marginTop: cq(2), lineHeight: 1.02 }}><Lines lines={f.headline} /></div>
        <div style={{ ...GEOMETRIC, fontWeight: 400, fontSize: cq(5.2), marginTop: cq(3.5) }}>{f.when}</div>
      </div>
      <Pic src={photo} style={abs({ left: cq(38), top: cq(38), width: cq(70), height: cq(70), borderRadius: "50%", filter: "grayscale(1) contrast(1.15)", objectPosition: f.focus })} />
      <Overlay>
        <path id="flyer-ribbon" d="M108 12C82 2 60 12 60 32 60 50 44 62 46 76 48 92 80 94 108 88" fill="none" stroke="#fff" strokeWidth="6.6" />
        <text fill="#111" fontFamily="'Archivo Black', Arial, sans-serif" fontSize="3.5" letterSpacing=".12" dominantBaseline="central"><textPath href="#flyer-ribbon">{`${f.headline.join(" ").toUpperCase()} • `.repeat(5)}</textPath></text>
      </Overlay>
    </>
  ),
  /** A color panel on a photo, with the same picture cropped into a circle. */
  inset: (f, photo) => (
    <>
      <Pic src={photo} style={{ ...FILL, objectPosition: f.focus }} />
      <div style={abs({ left: cq(9), right: cq(9), top: cq(5), bottom: cq(5), background: f.brand })} />
      <Burst x={15} y={10} size={11} color={f.ink} points={14} inner={0.72} />
      <div style={abs({ top: cq(10), right: cq(15), textAlign: "right", textTransform: "uppercase", fontFamily: "'Helvetica Neue', Arial, sans-serif", lineHeight: 1.15 })}><div style={{ fontWeight: 800, fontSize: cq(5) }}>{f.note}</div><div style={{ fontWeight: 400, fontSize: cq(4.2) }}>{f.when}</div></div>
      <Pic src={photo} style={abs({ left: cq(26), top: cq(23), width: cq(48), height: cq(48), borderRadius: "50%", objectPosition: f.focus })} />
      <div style={abs({ top: cq(73), left: cq(15), right: cq(15), textTransform: "uppercase", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: cq(fit(f.headline, 70, 8.6, 0.66)), lineHeight: 1.05 })}><div style={{ fontWeight: 400 }}>{f.headline[0]}</div><div style={{ fontWeight: 800 }}>{f.headline[1]}</div></div>
    </>
  ),
  /** A full photo with chunky tilted type and scattered stars. */
  scatter: (f, photo) => {
    const size = fit(f.headline, 74, 25, 0.72);
    return <>
      <Pic src={photo} style={{ ...FILL, objectPosition: f.focus }} />
      <div style={abs({ inset: 0, background: "linear-gradient(170deg, rgba(10,12,30,.72) 0%, rgba(10,12,30,.3) 46%, rgba(10,12,30,0) 72%)" })} />
      <div style={abs({ top: cq(7), left: cq(7), transform: "rotate(-7deg)", transformOrigin: "left top", color: f.accent, ...face("Bowlby One", 0.92), fontSize: cq(size) })}>{f.headline.map((l, i) => <div key={l} style={{ marginLeft: cq(i * 7) }}>{l}</div>)}</div>
      <div style={abs({ top: cq(8), right: cq(6), color: f.accent, textAlign: "right", ...SMALL, fontSize: cq(4.8) })}>{f.note}</div>
      <Burst x={78} y={30} size={15} color={f.pop} turn={12} />
      <Burst x={7} y={55} size={13} color={f.deep ?? f.accent} turn={-10} />
      <Burst x={60} y={62} size={11} color={f.accent} turn={20} />
      <div style={abs({ bottom: cq(5), left: 0, right: 0, textAlign: "center", color: f.accent, ...face("Bowlby One", 1), fontSize: cq(5.6), textShadow: "0 0 2cqw rgba(0,0,0,.7)" })}>{f.when}</div>
    </>;
  },
  /** A full photo between two color bars, with a big soft headline. */
  marquee: (f, photo) => {
    const [day = f.when, time] = f.when.split(" · ");
    return <>
      <Pic src={photo} style={{ ...FILL, objectPosition: f.focus, filter: "brightness(.72) saturate(1.1)" }} />
      <div style={abs({ top: 0, left: 0, right: 0, height: cq(11), background: f.brand, color: f.ink, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${cq(5)}`, ...SMALL, fontWeight: 700, fontSize: cq(4.8) })}><span>{day}</span><span>{time}</span></div>
      <div style={abs({ top: "50%", left: 0, right: 0, transform: "translateY(-50%) rotate(-3deg)", textAlign: "center", color: f.accent, textTransform: "lowercase", ...face("Caprasimo", 0.88), fontSize: cq(fit(f.headline, 90, 24, 0.6)), textShadow: `${cq(0.9)} ${cq(1)} 0 ${f.pop}` })}><Lines lines={f.headline} /></div>
      <div style={abs({ bottom: 0, left: 0, right: 0, height: cq(11), background: f.brand, color: f.ink, display: "flex", alignItems: "center", justifyContent: "center", ...SMALL, fontWeight: 700, fontSize: cq(4.8) })}>{f.note}</div>
    </>;
  },
  /** Magazine cover: huge type on a flat color, biting into the photo. */
  masthead: (f, photo) => (
    <>
      <Pic src={photo} style={abs({ left: cq(5), right: cq(5), top: cq(24), width: cq(90), height: cq(55), objectPosition: f.focus })} />
      <div style={abs({ top: cq(3.5), left: cq(5), ...face("Archivo Black", 0.88), letterSpacing: "-0.045em", fontSize: cq(fit(f.headline, 90, 22, 0.66)) })}><Lines lines={f.headline} /></div>
      <div style={abs({ left: cq(5), top: cq(82), ...face("Instrument Serif", 1), fontStyle: "italic", fontSize: cq(9) })}>{f.note}</div>
      <div style={abs({ right: cq(5), top: cq(84), ...face("Instrument Serif", 1), textTransform: "uppercase", fontSize: cq(4.8) })}>{f.when}</div>
    </>
  ),
  /** Printed paper with a slab headline and a photo framed in chalk. */
  scrawl: (f, photo) => (
    <>
      <div style={abs({ top: cq(5), left: cq(6), right: cq(6), display: "flex", justifyContent: "space-between", color: f.accent, ...HEAVY, fontSize: cq(5) })}><span>{f.note}</span></div>
      <div style={abs({ top: cq(12), left: cq(6), color: f.accent, ...face("Alfa Slab One", 1), fontSize: cq(fit(f.headline, 88, 15, 0.68)) })}><Lines lines={f.headline} /></div>
      <Pic src={photo} style={abs({ left: cq(7), top: cq(36), width: cq(86), height: cq(42), objectPosition: f.focus })} />
      <Overlay>
        <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.300 36.600C30 35.400 62 36.400 93.900 35.500 93.200 50 94.500 64 93.500 78.800 70 77.800 30 79.200 6.800 78.300 7.500 64 5.800 50 6.300 36.600Z" strokeWidth=".6" />
          <path d="M8 34.800C34 36.300 70 34.300 92.500 35.700M92.200 79.800C66 78.500 34 80.300 5.500 78.900M5.400 40C6.300 54 4.900 66 6 77" strokeWidth=".35" />
          <path d="M14 95H28M72 95H87M18 97H30M70 97H82" strokeWidth=".5" />
        </g>
      </Overlay>
      <div style={abs({ top: cq(81), left: 0, right: 0, textAlign: "center", color: f.accent, transform: "rotate(-2deg)", ...face("Yellowtail", 1), fontSize: cq(11) })}>{f.when}</div>
      <Grain />
    </>
  ),
  /** A one-color photo print with a sticker on top and a date stamp. */
  patch: (f, photo) => {
    const [when = f.when, time] = f.when.split(" · ");
    return <>
      <Pic src={photo} style={{ ...FILL, objectPosition: f.focus, filter: "grayscale(1) contrast(1.35) brightness(1.2)" }} />
      <div style={abs({ inset: 0, background: f.brand, mixBlendMode: "multiply" })} />
      <div style={abs({ top: cq(9), left: "50%", transform: "translateX(-50%)", background: f.ink, color: f.accent, borderRadius: 999, padding: `${cq(1.6)} ${cq(4.5)}`, ...HEAVY, fontSize: cq(5.4), lineHeight: 1 })}>{f.note}</div>
      <div style={abs({ top: cq(23), left: cq(9), color: f.accent, textTransform: "lowercase", ...face("Archivo Black", 0.9), letterSpacing: "-0.03em", fontSize: cq(29), textShadow: ring(f.ink, 1.5) })}>{f.headline[0]}</div>
      <div style={abs({ top: cq(46), left: cq(11), color: f.accent, transform: "rotate(-5deg)", ...face("Yellowtail", 1), fontSize: cq(33), textShadow: ring(f.ink, 1.5) })}>{f.headline[1]}</div>
      <div style={abs({ right: cq(4), bottom: cq(4), width: cq(32), height: cq(32), borderRadius: "50%", border: `${cq(0.8)} solid #fff`, color: "#fff", display: "grid", placeContent: "center", textAlign: "center", transform: "rotate(8deg)", ...HEAVY, fontSize: cq(4.8), lineHeight: 1.2 })}><div>{when}</div>{time && <div>{time}</div>}</div>
      <Grain />
    </>;
  },
  /** Cut paper: mismatched letters on graph paper, with taped labels. */
  collage: (f) => (
    <>
      <div style={abs({ left: cq(-14), bottom: cq(-16), width: cq(48), height: cq(42), background: f.accent, borderRadius: "58% 42% 48% 52%" })} />
      <div style={abs({ right: cq(-16), top: cq(-8), width: cq(38), height: cq(52), background: f.accent, borderRadius: "46% 54% 40% 60%" })} />
      <div style={abs({ left: cq(11), right: cq(11), top: cq(13), height: cq(62), backgroundImage: `linear-gradient(${f.pop} 1px, transparent 1px), linear-gradient(90deg, ${f.pop} 1px, transparent 1px)`, backgroundSize: `${cq(5)} ${cq(5)}`, boxShadow: `inset 0 0 0 1px ${f.pop}` })} />
      <div style={abs({ top: cq(4.5), left: 0, right: 0, textAlign: "center", color: f.accent, ...HEAVY, fontSize: cq(5.2) })}>{f.note}</div>
      <div style={abs({ top: cq(17), left: 0, right: 0, color: f.ink, textAlign: "center", textTransform: "uppercase", ...face("Anton", 1), fontSize: cq(16.5), textShadow: ring(f.accent, 1.1) })}>
        {f.headline.map((l) => <div key={l}>{[...l].map((c, i) => <span key={i} style={{ display: "inline-block", transform: `translateY(${cq(i % 3 === 1 ? -0.8 : i % 3 === 2 ? 0.7 : 0)}) rotate(${i % 2 ? 4 : -3}deg)` }}>{c}</span>)}</div>)}
      </div>
      <div style={abs({ top: cq(79), left: "50%", transform: "translateX(-50%) rotate(-2deg)", background: f.ink, color: f.accent, padding: `${cq(2.2)} ${cq(5)}`, ...HEAVY, fontSize: cq(7) })}>{f.when}</div>
    </>
  ),
  /** Blocky pixel type with warning tape strung across the bottom. */
  tape: (f) => {
    const steps = Array.from({ length: 5 }, (_, i) => `${cq((i + 1) * 0.55)} ${cq((i + 1) * 0.55)} 0 ${f.pop}`).join(", ");
    const strip = (top: number, turn: number, background: string) => <div style={abs({ top: cq(top), left: cq(-15), right: cq(-15), height: cq(9), background, color: "#fff", transform: `rotate(${turn}deg)`, display: "flex", alignItems: "center", justifyContent: "center", ...HEAVY, fontStyle: "italic", fontSize: cq(5) })}>{`${f.when}   ·   `.repeat(5)}</div>;
    return <>
      <div style={abs({ top: cq(7), left: 0, right: 0, textAlign: "center", letterSpacing: "0.32em", textTransform: "uppercase", ...SMALL, fontWeight: 500, fontSize: cq(3.8) })}>{f.note}</div>
      <div style={abs({ top: cq(15), left: 0, right: 0, textAlign: "center", color: f.accent, textTransform: "uppercase", ...PIXEL, fontSize: cq(fit(f.headline, 80, 26, 0.68)), textShadow: steps })}><Lines lines={f.headline} /></div>
      {strip(84, 4, f.ink)}
      {strip(70, -4, f.accent)}
    </>;
  },
  /** A white card with design-tool handles over big circles and sparks. */
  expo: (f) => {
    const handles = [[0, 0], [50, 0], [100, 0], [0, 100], [50, 100], [100, 100], [0, 50], [100, 50]];
    return <>
      <div style={abs({ left: cq(-18), top: cq(-20), width: cq(76), height: cq(76), borderRadius: "50%", background: f.pop })} />
      <div style={abs({ right: cq(-14), bottom: cq(-16), width: cq(66), height: cq(66), borderRadius: "50%", background: f.pop })} />
      <div style={abs({ top: cq(6), left: cq(7), border: `${cq(0.5)} solid ${f.ink}`, background: "#fff", borderRadius: 999, padding: `${cq(1.2)} ${cq(4)}`, ...SMALL, fontSize: cq(4.4) })}>{f.note}</div>
      <div style={abs({ left: cq(10), right: cq(10), top: cq(22), height: cq(46), background: "#fff", border: `${cq(0.4)} solid ${f.ink}`, display: "grid", placeContent: "center", textAlign: "center" })}>
        {handles.map(([x, y]) => <div key={`${x}-${y}`} style={abs({ left: `${x}%`, top: `${y}%`, width: cq(2), height: cq(2), background: f.ink, transform: "translate(-50%, -50%)" })} />)}
        <div style={{ ...face("Archivo Black", 0.95), letterSpacing: "-0.03em", fontSize: cq(15) }}>{f.headline[0]}</div>
        <div style={{ ...PIXEL, fontSize: cq(17), marginTop: cq(1) }}>{f.headline[1]}</div>
      </div>
      <Burst x={68} y={10} size={22} color={f.accent} points={7} inner={0.32} turn={8} />
      <Burst x={3} y={62} size={17} color={f.ink} points={6} inner={0.3} turn={-14} />
      <div style={abs({ top: cq(75), left: 0, right: 0, textAlign: "center", ...PIXEL, fontSize: cq(10) })}>{f.when}</div>
    </>;
  },
};

/** A fictional flyer. Decorative: everything it says is also written next to it. */
export function Flyer({ flyer, photo, className }: { flyer: FlyerSpec; photo: string; className?: string }) {
  return <div className={cn("flyer", className)} aria-hidden="true" style={{ background: flyer.brand, color: flyer.ink }}>{TEMPLATES[flyer.style](flyer, photo)}</div>;
}
