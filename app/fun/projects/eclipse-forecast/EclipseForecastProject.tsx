"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import besselianData from "./besselian.json";
import {
  type BesselianRecord,
  DEG,
  TYPE_LABEL,
  TYPE_COLOR,
  greatestT,
  besselianStateAt,
} from "./besselian";
import {
  shadowAxisTrack,
  latLonToRender,
} from "./eclipseTrack";
import { makeShadowMaterial } from "./globeShader";

const RECORDS = besselianData as unknown as BesselianRecord[];

/** "YYYYMMDD" → "Aug 12, 2026". */
function fmtDate(id: string): string {
  const y = id.slice(0, 4);
  const m = Number(id.slice(4, 6));
  const d = id.slice(6, 8);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m - 1]} ${d}, ${y}`;
}

function fmtLon(lon: number): string {
  const a = Math.abs(lon);
  return `${a.toFixed(1)}°${lon >= 0 ? "E" : "W"}`;
}
function fmtLat(lat: number): string {
  const a = Math.abs(lat);
  return `${a.toFixed(1)}°${lat >= 0 ? "N" : "S"}`;
}

type Mode = "path" | "instant" | "animate" | "all";
const MODES: Array<{ key: Mode; label: string }> = [
  { key: "path", label: "Full path" },
  { key: "instant", label: "At peak" },
  { key: "animate", label: "Sweep" },
  { key: "all", label: "All paths" },
];

export default function EclipseForecastProject() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeId, setActiveId] = useState<string>(RECORDS[0].id);
  const [mode, setMode] = useState<Mode>("path");
  const [showDetails, setShowDetails] = useState(false);
  const [webglOk, setWebglOk] = useState(true);

  const rec = useMemo(() => RECORDS.find((r) => r.id === activeId) ?? RECORDS[0], [activeId]);
  const tPeak = useMemo(() => greatestT(rec), [rec]);

  const modeRef = useRef(mode);
  const recRef = useRef(rec);
  const tPeakRef = useRef(tPeak);
  const activeIdRef = useRef(activeId);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => {
    recRef.current = rec;
    tPeakRef.current = tPeak;
    activeIdRef.current = activeId;
  }, [rec, tPeak, activeId]);

  // Rebuild the central-line overlay when mode changes (without rebuilding
  // the whole WebGL scene, which re-runs only on activeId change).
  const refreshRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    let renderer: THREE.WebGLRenderer;
    try {
      const probe = document.createElement("canvas");
      const probeCtx = probe.getContext("webgl2") ?? probe.getContext("webgl");
      if (!probeCtx) throw new Error("no WebGL");
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      queueMicrotask(() => setWebglOk(false));
      return;
    }
    const dpr = window.devicePixelRatio || 1;

    (async () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      renderer.setSize(W, H);
      renderer.setPixelRatio(dpr);
      renderer.setClearColor(0x05060a, 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
      camera.position.set(0, 0, 4.2);

      // Star background.
      const starGeo = new THREE.BufferGeometry();
      const starN = 1400;
      const starPos = new Float32Array(starN * 3);
      for (let i = 0; i < starN; i++) {
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        const R = 40;
        starPos[i * 3] = R * r * Math.cos(th);
        starPos[i * 3 + 1] = R * u;
        starPos[i * 3 + 2] = R * r * Math.sin(th);
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      const stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, sizeAttenuation: true }),
      );
      scene.add(stars);

      const globeGeo = new THREE.SphereGeometry(1, 192, 128);
      const texLoader = new THREE.TextureLoader();
      const [dayTex, nightTex, bumpTex] = await Promise.all([
        texLoader.loadAsync("/eclipse-forecast/earth-blue-marble.jpg"),
        texLoader.loadAsync("/eclipse-forecast/earth-night.jpg"),
        texLoader.loadAsync("/eclipse-forecast/earth-topology.png"),
      ]);
      if (cancelled) {
        globeGeo.dispose();
        dayTex.dispose(); nightTex.dispose(); bumpTex.dispose();
        return;
      }
      dayTex.colorSpace = THREE.SRGBColorSpace;
      nightTex.colorSpace = THREE.SRGBColorSpace;
      for (const t of [dayTex, nightTex, bumpTex]) {
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
      const material = makeShadowMaterial(recRef.current, {
        day: dayTex,
        night: nightTex,
        bump: bumpTex,
      });
      const globe = new THREE.Mesh(globeGeo, material);
      scene.add(globe);

      // ---- Central-line overlay (explicit polyline guarantees visible path) ----
      const lineGroup = new THREE.Group();
      globe.add(lineGroup);

      const overlayLine = (
        track: Array<Array<{ lat: number; lon: number }>>,
        color: THREE.Color,
        opacity: number,
      ) => {
        for (const seg of track) {
          if (seg.length < 2) continue;
          const pts = seg.map((p) => new THREE.Vector3(...latLonToRender(p.lat, p.lon, 1.002)));
          const g = new THREE.BufferGeometry().setFromPoints(pts);
          const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: 2 });
          lineGroup.add(new THREE.Line(g, m));
        }
      };

      const rebuildOverlay = () => {
        for (const child of lineGroup.children) {
          const line = child as THREE.Line;
          line.geometry.dispose();
          (line.material as THREE.Material).dispose();
        }
        lineGroup.clear();
        if (modeRef.current === "all") {
          for (const r of RECORDS) {
            const segs = shadowAxisTrack(r, 120);
            const hex = TYPE_COLOR[r.type] === "#1e293b" ? "#7dd3fc" : TYPE_COLOR[r.type];
            overlayLine(segs, new THREE.Color(hex), 0.85);
          }
        } else {
          const segs = shadowAxisTrack(recRef.current, 200);
          const hex = TYPE_COLOR[recRef.current.type] === "#1e293b" ? "#ffffff" : TYPE_COLOR[recRef.current.type];
          overlayLine(segs, new THREE.Color(hex), 0.95);
        }
      };
      rebuildOverlay();
      refreshRef.current = rebuildOverlay;

      // ---- Drag-to-look orbit controls ----
      let dragging = false;
      let lastX = 0, lastY = 0;
      let targetRotY = 0, targetRotX = 0.18;
      let rotY = 0, rotX = 0.18;
      let cameraDist = 4.2;
      let targetDist = 4.2;

      const onDown = (e: PointerEvent) => {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        targetRotY += dx * 0.006;
        targetRotX = Math.max(-1.3, Math.min(1.3, targetRotX + dy * 0.006));
        lastX = e.clientX; lastY = e.clientY;
      };
      const onUp = () => { dragging = false; };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        targetDist = Math.max(1.5, Math.min(10, targetDist * Math.exp(e.deltaY * 0.0011)));
      };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });

      targetRotY = (90 - recRef.current.circumstances.lonDeg) * DEG;
      rotY = targetRotY;

      // Cosmetic sun direction = camera direction in the globe's local ECEF
      // frame, so the hemisphere facing the viewer is always lit.
      const camDir = new THREE.Vector3(0, 0, 1);
      const xAxis = new THREE.Vector3(1, 0, 0);
      const yAxis = new THREE.Vector3(0, 1, 0);
      const sunDirEcef = new THREE.Vector3();

      let animId = 0;
      const animate = () => {
        animId = requestAnimationFrame(animate);

        // Only the demo "sweep" mode auto-rotates; user dragging is the only
        // other thing that moves the globe (no rotation during sweeps).
        if (modeRef.current === "animate") {
          targetRotY += 0.004;
        }

        rotY += (targetRotY - rotY) * 0.12;
        rotX += (targetRotX - rotX) * 0.12;
        cameraDist += (targetDist - cameraDist) * 0.12;

        globe.rotation.y = rotY;
        globe.rotation.x = rotX;
        camera.position.z = cameraDist;

        // uSunDir = R⁻¹·(0,0,1) where R = Ry(rotY)·Rx(rotX).
        sunDirEcef.copy(camDir);
        sunDirEcef.applyAxisAngle(xAxis, -rotX);
        sunDirEcef.applyAxisAngle(yAxis, -rotY);
        material.uniforms.uSunDir.value.copy(sunDirEcef.normalize());

        const m = material.uniforms;
        m.uMode.value = modeRef.current === "path" ? 0
          : (modeRef.current === "instant" || modeRef.current === "animate") ? 1
          : 2; // all → shader shadow off; overlay draws every path
        if (modeRef.current === "animate") {
          m.uT.value = THREE.MathUtils.lerp(-3.5, 3.5, (Math.sin(performance.now() / 4200) + 1) / 2);
          m.uHighlight.value = 1;
        } else if (modeRef.current === "instant") {
          m.uT.value = tPeakRef.current;
          m.uHighlight.value = 1;
        }

        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      cleanups.push(() => {
        cancelAnimationFrame(animId);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
        canvas.removeEventListener("wheel", onWheel);
        window.removeEventListener("resize", onResize);
        for (const child of lineGroup.children) {
          const line = child as THREE.Line;
          line.geometry.dispose();
          (line.material as THREE.Material).dispose();
        }
        globeGeo.dispose();
        material.dispose();
        dayTex.dispose(); nightTex.dispose(); bumpTex.dispose();
        starGeo.dispose();
        (stars.material as THREE.Material).dispose();
        refreshRef.current = null;
      });
    })();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
      renderer.dispose();
    };
  }, [activeId]);

  // Mode-only change: refresh the overlay without rebuilding the WebGL scene.
  useEffect(() => {
    refreshRef.current?.();
  }, [mode]);

  const c = rec.circumstances;
  const stateAtPeak = useMemo(() => besselianStateAt(rec, tPeak), [rec, tPeak]);
  void activeIdRef;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
        {/* Globe (larger viewport) */}
        <div className="relative border border-border bg-[#05060a] h-115 sm:h-145 overflow-hidden">
          {webglOk ? (
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-center px-6">
              <p className="text-xs font-mono text-muted max-w-xs">
                Your browser blocked WebGL (hardware acceleration off), so the
                3D globe can&apos;t render here. Enable WebGL / hardware
                acceleration to view the Moon&apos;s shadow on Earth.
              </p>
            </div>
          )}
          {webglOk && (
            <div className="absolute top-3 left-3 flex gap-1.5 z-10 flex-wrap">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={`text-[0.6rem] font-mono uppercase tracking-wider px-2 py-1 border transition-colors ${
                    mode === m.key
                      ? "border-accent text-accent bg-background/70"
                      : "border-border/70 text-muted hover:text-accent hover:border-accent/60 bg-background/40"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
          <div className="absolute bottom-3 left-3 text-[0.6rem] font-mono text-muted/70 pointer-events-none">
            drag to look · scroll to zoom
          </div>
        </div>

        {/* Side panel: compact list + collapsible details */}
        <div className="border border-border p-3 space-y-3 text-sm font-mono">
          <div className="text-xs text-foreground/80">
            {mode === "all"
              ? "Every central path this decade"
              : `${TYPE_LABEL[rec.type]} eclipse · ${fmtDate(rec.id)}`}
          </div>

          {/* Compact, scrollable eclipse list */}
          <div className="max-h-64 overflow-y-auto pr-1 space-y-0.5">
            {RECORDS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveId(r.id)}
                className={`flex w-full items-center gap-2 px-2 py-1 text-[0.7rem] transition-colors text-left ${
                  r.id === activeId
                    ? "bg-accent/15 text-accent"
                    : "text-foreground/70 hover:bg-background/60 hover:text-foreground"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: TYPE_COLOR[r.type] }}
                />
                <span className="flex-1">{fmtDate(r.id)}</span>
                <span className="text-muted/60">{TYPE_LABEL[r.type][0]}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-[0.65rem] text-accent hover:underline"
          >
            {showDetails ? "Hide details" : "Show details"}
          </button>
          {showDetails && mode !== "all" && (
            <div className="space-y-2">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[0.7rem]">
                <dt className="text-muted">Saros</dt><dd>{rec.saros}</dd>
                <dt className="text-muted">Magnitude</dt><dd>{rec.magnitude.toFixed(3)}</dd>
                <dt className="text-muted">γ</dt><dd>{rec.gamma.toFixed(3)}</dd>
                <dt className="text-muted">ΔT</dt><dd>{rec.deltaTSeconds.toFixed(1)} s</dd>
                <dt className="text-muted">Peak (UTC)</dt><dd>{c.ut}</dd>
                <dt className="text-muted">Lat</dt><dd>{fmtLat(c.latDeg)}</dd>
                <dt className="text-muted">Lon</dt><dd>{fmtLon(c.lonDeg)}</dd>
                <dt className="text-muted">Sun alt</dt><dd>{c.sunAltitudeDeg.toFixed(1)}°</dd>
                <dt className="text-muted">Sun az</dt><dd>{c.sunAzimuthDeg.toFixed(1)}°</dd>
                <dt className="text-muted">Width</dt>
                <dd>{c.pathWidthKm > 0 ? `${c.pathWidthKm.toFixed(0)} km` : "—"}</dd>
                <dt className="text-muted">Duration</dt>
                <dd>{rec.type === "P" ? "—" : c.centralDuration}</dd>
              </dl>
              {rec.type !== "P" && (
                <div className="text-[0.6rem] text-foreground/50 leading-relaxed">
                  Cone at peak: x={stateAtPeak.x.toFixed(3)}, y={stateAtPeak.y.toFixed(3)},
                  d={stateAtPeak.d.toFixed(2)}°, µ={stateAtPeak.mu.toFixed(2)}°,
                  L₂={stateAtPeak.l2.toFixed(4)}
                </div>
              )}
              <p className="text-[0.6rem] leading-relaxed text-foreground/50">
                Shadow drawn from NASA&apos;s Besselian elements (VSOP87/ELP2000-82).
                Each surface fragment evaluates the 8 polynomials, rotates into the
                Moon-shadow&apos;s fundamental frame, and tests the penumbra/umbra
                cone on the oblate WGS84 Earth — 1:1 with NASA within ~1-2 km and
                ΔT (≈{rec.deltaTSeconds.toFixed(0)} s).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
