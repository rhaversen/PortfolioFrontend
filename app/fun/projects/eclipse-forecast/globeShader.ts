/**
 * Globe shadow shader — the 1:1 Besselian cone test done per fragment.
 *
 * The rendered surface IS the WGS84 ellipsoid (a unit sphere scaled by
 * (1, 1, b) in object space), so a fragment's object-space position is its
 * Earth-fixed ECEF coordinate in Earth radii, exactly as the validated spike
 * `render.ts` consumes.  Rotating / zooming the globe (a scene-graph transform)
 * does not touch this coordinate, so the cone test is always exact regardless
 * of where the camera looks — the antimeridian wraps naturally and there is
 * no raster discretisation.
 *
 * For each fragment we evaluate the 8 Besselian polynomials, build the
 * fundamental-frame axes (Xf, Yf, Zf), project the surface point to (ξ,η,ζ),
 * and test the penumbra / umbra / antumbra cone — identical to render.ts.
 *  ζ > 0  → sunlit hemisphere (ζ-axis points toward the Sun).
 *  penumbra : (ξ−x)² + (η−y)² ≤ (L1 + ζ·tanF1)²
 *  um/ant   : uR = L2 + ζ·tanF2 ;  uR < 0 → umbra (total, dark) ; uR ≥ 0 → antumbra.
 *
 * `uMode` selects generating the full path (loop the time sweep and OR the
 * coverage — the path-map convention, crisp at any zoom) or a single instant.
 */
import * as THREE from "three";

// WGS84 polar radius (in equatorial-radius units) injected into the shaders.
const B = (1 - 1 / 298.257223563).toFixed(10);   // b = 1 − f
const B2 = ((1 - 1 / 298.257223563) ** 2).toFixed(10);

export const VERT = /* glsl */ `
  varying vec3 vLocal;   // surface point in ECEF (Earth radii) — feeds the cone test
  varying vec2 vUv;      // equirect texture coords from SphereGeometry
  const float B = ${B};      // polar/equatorial radius ratio (b = 1 − f)
  const float B2 = ${B2};     // b²
  const float E2 = 1.0 - B2;  // WGS84 first eccentricity squared
  void main() {
    // SphereGeometry: pole at +Y, position = (cosφ cosλ, sinφ, cosφ sinλ) with
    // φ = latitude, λ = longitude.  Build the true WGS84 ECEF vector (h=0):
    //   N = 1 / sqrt(1 − e² sin²φ)
    //   ECEF = (N cosφ cosλ,  N cosφ sinλ,  b² N sinφ)
    vUv = uv;
    float sinLat = position.y;
    float cosLat = sqrt(max(0.0, 1.0 - sinLat * sinLat));
    float N = 1.0 / sqrt(1.0 - E2 * sinLat * sinLat);
    vec3 ecef = vec3(N * position.x,                  // +X  (lon 0°)
                     N * position.z,                  // +Y  (lon +90°E)
                     B2 * N * sinLat);                // +Z  (north pole)
    vLocal = ecef;
    // Render frame: align Earth's pole (ECEF +Z) with screen +Y so the globe
    // spins about the vertical axis under globe.rotation.y.  Swizzle so
    // (ecef.x, ecef.z, ecef.y) → screen (X right = lon 0°, Y up = pole,
    // Z toward camera = lon +90°E).
    vec3 render = vec3(ecef.x, ecef.z, ecef.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(render, 1.0);
  }
`;

export const FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vLocal;   // ECEF surface point (Earth radii)
  varying vec2 vUv;      // equirect texture coords

  // Besselian polynomial coefficients (x,y,d,mu,L1,L2) — 4 terms each.
  uniform vec4 uX, uY, uD, uMu, uL1, uL2;
  uniform float uTanF1, uTanF2;
  uniform float uTmin, uTmax, uSteps;
  uniform float uT;
  uniform float uMode;       // 0 = full path (sweep coverage), 1 = single instant, 2 = off (all-paths overlay)
  uniform float uHighlight;
  uniform vec3 uSunDir;      // cosmetic sun direction in ECEF (camera-derived) for day/night
  uniform sampler2D uDay;    // NASA blue-marble equirect
  uniform sampler2D uNight;  // city-lights equirect
  uniform sampler2D uBump;   // topography (greyscale)

  const float DEG = 3.141592653589793 / 180.0;
  const float B = ${B};
  const float B2 = ${B2};
  const float E2 = 1.0 - B2;
  const float GRID_STEP = 15.0 * DEG;  // 15° graticule, radians

  float evalp(vec4 c, float t) { return c.x + c.y * t + c.z * t * t + c.w * t * t * t; }

  // Besselian fundamental-frame → ECEF basis at time t.
  void besselBasis(float t, out vec3 Xf, out vec3 Yf, out vec3 Zf,
                   out float bx, out float by, out float l1, out float l2) {
    bx  = evalp(uX,  t);
    by  = evalp(uY,  t);
    float d  = evalp(uD,  t);
    float mu = evalp(uMu, t);
    l1  = evalp(uL1, t);
    l2  = evalp(uL2, t);
    float sd = sin(d * DEG),  cd = cos(d * DEG);
    float sm = sin(mu * DEG), cm = cos(mu * DEG);
    Xf = vec3( sm,  cm, 0.0);
    Yf = vec3(-sd * cm,  sd * sm,  cd);
    Zf = vec3( cd * cm, -cd * sm,  sd);   // +ζ → toward the Sun
  }

  // Shadow coverage in .rgb: penumbra, umbra, antumbra (0..1) at time t.
  vec3 shadowAt(float t) {
    vec3 Xf, Yf, Zf; float bx, by, l1, l2;
    besselBasis(t, Xf, Yf, Zf, bx, by, l1, l2);
    float xi  = dot(vLocal, Xf);
    float eta = dot(vLocal, Yf);
    float zeta= dot(vLocal, Zf);
    vec3 cov = vec3(0.0);
    if (zeta > 0.0) {
      float dx = xi - bx, dy = eta - by;
      float r2 = dx * dx + dy * dy;
      float pR = l1 + zeta * uTanF1;
      if (pR > 0.0 && r2 <= pR * pR) {
        // Smooth penumbra edge (0 → 1 over ~1% of the cone radius).
        float edge = pR * 0.012;
        cov.x = smoothstep(pR + edge, pR - edge, sqrt(r2));
      }
      float uR = l2 + zeta * uTanF2;
      float ur = abs(uR);
      if (r2 <= ur * ur) {
        if (uR < 0.0) cov.y = 1.0;   // umbra (total — dark core)
        else          cov.z = 1.0;   // antumbra (annular — bright-centre ring)
      }
    }
    return cov;
  }

  void main() {
    // ECEF geodetic lat/lon — independent of the texture, feeds the cone test.
    float px = vLocal.x, py = vLocal.y, pz = vLocal.z;
    float rho = sqrt(px * px + py * py);
    float lat = atan(pz, B2 * rho);
    float lon = atan(py, px);
    // WGS84 ellipsoid normal at the surface point (used for lighting).
    vec3 nObj = normalize(vec3(px, py, pz / B2));

    // --- Real Earth surface ----------------------------------------------
    // The texture v-axis goes top (north) → bottom (south); SphereGeometry uv.y
    // already follows the same convention, so sample directly.
    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb * 0.6;
    float topo = texture2D(uBump, vUv).r;

    // --- Day/night blend (cosmetic: follows the camera, not the real Sun) --
    // uSunDir is the camera direction expressed in the globe's ECEF frame, so
    // the hemisphere facing the viewer is always lit and the whole globe is
    // readable regardless of where the (real) eclipse shadow falls.  The
    // shadow itself is real Besselian geometry (the cone test below) and is
    // gated on the fundamental-frame sunlit side (ζ > 0), so it is placed
    // exactly where the Moon's shadow physically falls.
    float sunDot = dot(nObj, uSunDir);
    float dayf = smoothstep(-0.08, 0.22, sunDot);
    vec3 base = mix(night * 0.18 + day * 0.05, day, dayf);
    // Subtle topographic relief shading on the day side.
    float rel = clamp(topo * 1.5 - 0.5, -0.25, 0.35);
    base *= 1.0 + rel * dayf * 0.5;

    // Graticule.
    float dlat = abs(fract(lat / GRID_STEP + 0.5) - 0.5) * GRID_STEP;
    float dlon = abs(fract(lon / GRID_STEP + 0.5) - 0.5) * GRID_STEP;
    float grid = max(smoothstep(0.020, 0.0, dlat), smoothstep(0.020, 0.0, dlon));
    base = mix(base, base * 1.45, grid * 0.10);

    // --- Shadow (real Besselian cone test) ---------------------------------
    // uMode: 0 = full path (sweep coverage), 1 = single instant (uT), 2 = off.
    vec3 cov = vec3(0.0);
    if (uMode < 0.5) {
      float n = uSteps;
      for (int i = 0; i < 512; i++) {
        float fi = float(i);
        if (fi >= n) break;
        float t = uTmin + (uTmax - uTmin) * (fi + 0.5) / n;
        vec3 c = shadowAt(t);
        cov = max(cov, c);
      }
    } else if (uMode < 1.5) {
      cov = shadowAt(uT);
      cov.x *= 0.7 + 0.3 * uHighlight;
    }

    // Composite. Penumbra → cool violet wash; antumbra → red ring; umbra →
    // near-black with a faint blue, over the natural surface.
    vec3 col = base;
    col = mix(col, vec3(0.30, 0.16, 0.38), cov.x * 0.45);
    col = mix(col, vec3(0.85, 0.20, 0.16), cov.z);
    col = mix(col, vec3(0.02, 0.03, 0.07), cov.y);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export type ShadowUniforms = {
  uX: THREE.Uniform;
  uY: THREE.Uniform;
  uD: THREE.Uniform;
  uMu: THREE.Uniform;
  uL1: THREE.Uniform;
  uL2: THREE.Uniform;
  uTanF1: THREE.Uniform;
  uTanF2: THREE.Uniform;
  uTmin: THREE.Uniform;
  uTmax: THREE.Uniform;
  uSteps: THREE.Uniform;
  uT: THREE.Uniform;
  uMode: THREE.Uniform;
  uHighlight: THREE.Uniform;
  uSunDir: THREE.Uniform;
};

export function makeShadowMaterial(
  rec: {
    tanF1: number;
    tanF2: number;
    coeff: {
      x: [number, number, number, number];
      y: [number, number, number, number];
      d: [number, number, number, number];
      l1: [number, number, number, number];
      l2: [number, number, number, number];
      mu: [number, number, number, number];
    };
  },
  textures: { day: THREE.Texture; night: THREE.Texture; bump: THREE.Texture },
): THREE.ShaderMaterial {
  const c = rec.coeff;
  const span = 3.5;
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uX: { value: new THREE.Vector4(...c.x) },
      uY: { value: new THREE.Vector4(...c.y) },
      uD: { value: new THREE.Vector4(...c.d) },
      uMu: { value: new THREE.Vector4(...c.mu) },
      uL1: { value: new THREE.Vector4(...c.l1) },
      uL2: { value: new THREE.Vector4(...c.l2) },
      uTanF1: { value: rec.tanF1 },
      uTanF2: { value: rec.tanF2 },
      uTmin: { value: -span },
      uTmax: { value: span },
      uSteps: { value: 210 },
      uT: { value: 0 },
      uMode: { value: 0 },
      uHighlight: { value: 1 },
      uSunDir: { value: new THREE.Vector3(0, 0, 1) },
      uDay: { value: textures.day },
      uNight: { value: textures.night },
      uBump: { value: textures.bump },
    },
  });
}
