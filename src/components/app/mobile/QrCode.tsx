import { useMemo } from "react";
import { create } from "qrcode";

/** A real, scannable QR code as inline SVG: black modules on pure white with a wide quiet zone, so a phone camera reads it even on a dim screen. */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { size, d } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: "M" });
    let path = "";
    for (let y = 0; y < modules.size; y++) {
      for (let x = 0; x < modules.size; x++) if (modules.get(y, x)) path += `M${x} ${y}h1v1h-1z`;
    }
    return { size: modules.size, d: path };
  }, [value]);
  const quiet = 4;
  const box = size + quiet * 2;
  return (
    <svg viewBox={`${-quiet} ${-quiet} ${box} ${box}`} role="img" aria-label={label} shapeRendering="crispEdges" className={className} data-qr={value}>
      <rect x={-quiet} y={-quiet} width={box} height={box} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
