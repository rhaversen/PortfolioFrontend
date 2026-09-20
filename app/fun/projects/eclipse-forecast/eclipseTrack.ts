/**
 * Central-line projection of the Moon's shadow axis onto the WGS84 ellipsoid.
 *
 * NASA's Besselian elements give the shadow-axis cross-track coordinates
 * (x, y) in the fundamental frame; the axis is the line
 *   P(ζ) = x·Xf + y·Yf + ζ·Zf        (Zf points toward the Sun)
 * in Earth-fixed ECEF (equatorial radii).  Intersecting that line with the
 * oblate ellipsoid  X² + Y² + Z²/b² = 1  yields the two surface crossing
 * points; the sunward one (larger ζ) is where the central / umbral track
 * runs — the line NASA publishes as the eclipse's central path.
 *
 * This is the exact geometric inverse of the per-fragment cone test in
 * globeShader.ts: there each surface fragment projects into the fundamental
 * frame; here the fundamental-frame axis projects back to the surface.
 */
import {
  DEG,
  FLATTENING,
  evalPoly,
  greatestT,
  type BesselianRecord,
} from "./besselian";

const B = 1 - FLATTENING; // polar/equatorial radius ratio
const B2 = B * B;
const E2 = 1 - B2;

/** Fundamental-frame → ECEF basis axes at axis declination d and hour angle µ. */
function fundamentalAxes(dDeg: number, muDeg: number) {
  const sd = Math.sin(dDeg * DEG);
  const cd = Math.cos(dDeg * DEG);
  const sm = Math.sin(muDeg * DEG);
  const cm = Math.cos(muDeg * DEG);
  // Xf / Yf / Zf with Zf toward the Sun (matches globeShader.ts).
  const Xf: [number, number, number] = [sm, cm, 0];
  const Yf: [number, number, number] = [-sd * cm, sd * sm, cd];
  const Zf: [number, number, number] = [cd * cm, -cd * sm, sd];
  return { Xf, Yf, Zf };
}

/**
 * Latitude/longitude (degrees) of the shadow-axis surface crossing at time t
 * (hours from t0), sunward intersection, or null when the axis misses Earth
 * (no real ellipsoid intersection — happens for high-γ partials).
 */
export function shadowAxisPoint(
  rec: BesselianRecord,
  t: number,
): { lat: number; lon: number } | null {
  const { coeff } = rec;
  const x = evalPoly(coeff.x, t);
  const y = evalPoly(coeff.y, t);
  const d = evalPoly(coeff.d, t);
  const mu = evalPoly(coeff.mu, t);
  const { Xf, Yf, Zf } = fundamentalAxes(d, mu);

  // P(ζ) = base + ζ·Zf.
  const bx = x * Xf[0] + y * Yf[0];
  const by = x * Xf[1] + y * Yf[1];
  const bz = x * Xf[2] + y * Yf[2];

  // Ellipsoid (a = 1):  X² + Y² + Z²/b² = 1  →  A ζ² + B ζ + C = 0.
  // The two roots are the entry/exit of the axis line through the ellipsoid;
  // the sunward (largest ζ) crossing is the central-line surface point.
  const A = Zf[0] * Zf[0] + Zf[1] * Zf[1] + (Zf[2] * Zf[2]) / B2;
  const Bc = 2 * (bx * Zf[0] + by * Zf[1] + (bz * Zf[2]) / B2);
  const C = bx * bx + by * by + (bz * bz) / B2 - 1;
  const disc = Bc * Bc - 4 * A * C;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const zHi = (-Bc + sq) / (2 * A); // larger root = closer to the Sun
  const zLo = (-Bc - sq) / (2 * A);
  const zeta = zHi >= 0 ? zHi : zLo;

  const px = bx + zeta * Zf[0];
  const py = by + zeta * Zf[1];
  const pz = bz + zeta * Zf[2];
  const rho = Math.sqrt(px * px + py * py);
  if (rho < 1e-9) return null;
  const lat = (Math.atan2(pz, B2 * rho) / DEG);
  const lon = (Math.atan2(py, px) / DEG);
  return { lat, lon };
}

/**
 * The full central-line track as latitude/longitude polylines, sampled across
 * the eclipse window and split wherever the path crosses the antimeridian so
 * each segment is continuous (nowrap for rendering).
 */
export function shadowAxisTrack(
  rec: BesselianRecord,
  steps = 160,
): Array<Array<{ lat: number; lon: number }>> {
  const span = 3.5;
  const raw: Array<{ lat: number; lon: number } | null> = [];
  for (let i = 0; i <= steps; i++) {
    const t = -span + (2 * span) * (i / steps);
    raw.push(shadowAxisPoint(rec, t));
  }
  // Split into continuous segments on antimeridian jumps / gaps.
  const segments: Array<Array<{ lat: number; lon: number }>> = [];
  let cur: Array<{ lat: number; lon: number }> = [];
  for (const p of raw) {
    if (!p) {
      if (cur.length > 1) segments.push(cur);
      cur = [];
      continue;
    }
    if (cur.length > 0) {
      const prev = cur[cur.length - 1];
      if (Math.abs(p.lon - prev.lon) > 180) {
        if (cur.length > 1) segments.push(cur);
        cur = [];
      }
    }
    cur.push(p);
  }
  if (cur.length > 1) segments.push(cur);
  return segments;
}

/** geodetic lat/lon (deg) → render-space ECEF point (matches globeShader swizzle). */
export function latLonToRender(latDeg: number, lonDeg: number, scale = 1): [number, number, number] {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const sl = Math.sin(lat);
  const n = 1 / Math.sqrt(1 - E2 * sl * sl);
  const ecefX = n * Math.cos(lat) * Math.cos(lon); // lon 0°
  const ecefY = n * Math.cos(lat) * Math.sin(lon); // lon +90°E
  const ecefZ = B2 * n * sl;                         // north pole
  // render = (ecef.x, ecef.z, ecef.y)  → pole on +Y (see globeShader.ts VERT).
  return [ecefX * scale, ecefZ * scale, ecefY * scale];
}

export { greatestT };
