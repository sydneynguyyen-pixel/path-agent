/**
 * The optics behind liquid glass. A rounded rectangle is treated as a lens: flat in the middle,
 * curving down inside a thin bezel. Each pixel says how far to bend what's behind it.
 */

/** How far to bend at one point, as -1..1 on each axis. Zero in the flat center. */
export function lensAt(x: number, y: number, w: number, h: number, radius: number, bezel: number): [number, number] {
  const px = x - w / 2;
  const py = y - h / 2;
  const qx = Math.abs(px) - (w / 2 - radius);
  const qy = Math.abs(py) - (h / 2 - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const distance = outside + Math.min(Math.max(qx, qy), 0) - radius;
  const fromEdge = -distance;
  if (fromEdge <= 0 || fromEdge >= bezel) return [0, 0];

  let nx: number;
  let ny: number;
  if (qx > 0 && qy > 0) {
    nx = (qx / outside) * Math.sign(px);
    ny = (qy / outside) * Math.sign(py);
  } else if (qx > qy) {
    nx = Math.sign(px);
    ny = 0;
  } else {
    nx = 0;
    ny = Math.sign(py);
  }
  // Bends hardest just inside the rim and eases to nothing at the inner edge of the bezel.
  // The first pixel and a half feathers in, so the lens has no hard seam against the page.
  const t = 1 - fromEdge / bezel;
  const strength = t * t * Math.min(1, fromEdge / 1.5);
  return [-nx * strength, -ny * strength];
}

/** An RGBA displacement map: red bends x, green bends y, and 128 means leave it alone. */
export function buildLensMap(w: number, h: number, radius: number, bezel: number): Uint8ClampedArray<ArrayBuffer> {
  const data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [dx, dy] = lensAt(x + 0.5, y + 0.5, w, h, radius, bezel);
      const i = (y * w + x) * 4;
      data[i] = 127.5 + dx * 127.5;
      data[i + 1] = 127.5 + dy * 127.5;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return data;
}
