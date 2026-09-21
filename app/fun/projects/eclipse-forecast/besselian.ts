/**
 * Besselian-element shadow geometry — browser port of the validated
 * eclipse-spike projection (23/23 checks vs NASA circumstances, 69/69 selfcheck).
 *
 * NASA publishes Besselian elements for every eclipse: 8 polynomial coefficients
 * (x, y, d, L1, L2, µ) each a 4-term cubic in t (hours from t0), plus k1/k2 and
 * the cone half-angles tanF1/tanF2 and ΔT.   Because these are the same
 * VSOP87/ELP2000-82 ephemerides NASA's own map uses, the shadow drawn from them
 * is 1:1 with NASA's published paths (within the irreducible ~1-2 km lunar-limb
 * floor and the ΔT uncertainty).
 *
 * Geometry reference (fundamental frame ξ,η,ζ; ζ points toward the Sun, so the
 * sunlit hemisphere has ζ > 0).  Earth-fixed orientation of the fundamental
 * axes at hour-angle µ (west-positive) and axis declination d:
 *   Xf = ( sin µ,  cos µ, 0 )
 *   Yf = ( -sin d cos µ,  sin d sin µ,  cos d )
 *   Zf = ( cos d cos µ, -cos d sin µ,  sin d )   ← toward the Sun
 */
export type BesselianCoeff = {
  x: [number, number, number, number];
  y: [number, number, number, number];
  d: [number, number, number, number];
  l1: [number, number, number, number];
  l2: [number, number, number, number];
  mu: [number, number, number, number];
};

export type EclipseType = "P" | "A" | "T" | "H";

export type Circumstances = {
  ut: string;
  td: string;
  latDeg: number;
  lonDeg: number;
  sunAltitudeDeg: number;
  sunAzimuthDeg: number;
  pathWidthKm: number;
  centralDuration: string;
};

export type BesselianRecord = {
  id: string;
  type: EclipseType;
  saros: number;
  gamma: number;
  magnitude: number;
  deltaTSeconds: number;
  t0Tdt: string;
  k1: number;
  k2: number;
  tanF1: number;
  tanF2: number;
  coeff: BesselianCoeff;
  circumstances: Circumstances;
};

export const DEG = Math.PI / 180;
export const FLATTENING = 1 / 298.257223563; // WGS84
export const B_POLAR_SQ = (1 - FLATTENING) ** 2;

/** Evaluate a 4-coefficient Besselian polynomial at t (hours from t0). */
export function evalPoly(c: readonly [number, number, number, number], t: number): number {
  return c[0] + c[1] * t + c[2] * t * t + c[3] * t * t * t;
}

/** "HH:MM:SS" → decimal hours since midnight. */
export function hmsToHours(s: string): number {
  const p = s.split(":").map(Number);
  if (p.some(Number.isNaN)) return NaN;
  return p[0] + p[1] / 60 + (p[2] ?? 0) / 3600;
}

/** Decimal hour-of-day of the t0 reference instant (TDT). */
export function t0HourOfDay(rec: BesselianRecord): number {
  const m = rec.t0Tdt.match(/([\d.]+)\s*$/);
  return m ? Number(m[1]) : NaN;
}

/** Hours-from-t0 for a TDT clock time on the same date as t0. */
export function tFromTd(rec: BesselianRecord, td: string): number {
  return hmsToHours(td) - t0HourOfDay(rec);
}

/** Hours-from-t0 at greatest eclipse (NASA's TD). */
export function greatestT(rec: BesselianRecord): number {
  return tFromTd(rec, rec.circumstances.td);
}

/** Linear interpolation of the 8 polynomial sets between two time steps. */
export function besselianStateAt(rec: BesselianRecord, t: number) {
  const { coeff } = rec;
  return {
    x: evalPoly(coeff.x, t),
    y: evalPoly(coeff.y, t),
    d: evalPoly(coeff.d, t),
    mu: evalPoly(coeff.mu, t),
    l1: evalPoly(coeff.l1, t),
    l2: evalPoly(coeff.l2, t),
  };
}

export const TYPE_LABEL: Record<EclipseType, string> = {
  P: "Partial",
  A: "Annular",
  T: "Total",
  H: "Hybrid",
};

export const TYPE_COLOR: Record<EclipseType, string> = {
  P: "#a78bfa",
  A: "#f87171",
  T: "#1e293b",
  H: "#fb923c",
};
