"use client";

import { useEffect, useRef, useState } from "react";
import {
	type ExamNode, type SimState,
	SIM_SPEED, YEAR_MS, ARC_DURATION, GLOW_DUR,
	circleAngle, cwDist, msToAngle, tickParticle,
} from "./useExamSim";
import { CX, CY, R, W, H, MONTHS, MONTH_DAY_1, FADE_WINDOW_MS, angToXY } from "./vizConfig";
import { drawGlowAt } from "./drawUtils";

function drawFrame(
	ctx: CanvasRenderingContext2D,
	sim: SimState,
	nodes: ExamNode[],
	mouse: { x: number; y: number } | null,
	dpr: number,
): void {
	ctx.clearRect(0, 0, W * dpr, H * dpr);
	ctx.save();
	ctx.scale(dpr, dpr);

	const simDate = new Date(sim.time);
	const handAngle = msToAngle(sim.time);
	const targeted = new Set(sim.particles.filter(p => p.targetId !== null).map(p => p.targetId as string));

	// Circle
	ctx.beginPath();
	ctx.arc(CX, CY, R, 0, Math.PI * 2);
	ctx.strokeStyle = "rgba(0,0,0,0.18)";
	ctx.lineWidth = 1;
	ctx.stroke();

	// Month ticks + labels
	for (let m = 0; m < 12; m++) {
		const a = circleAngle(MONTH_DAY_1[m]);
		const [ix, iy] = angToXY(a, R - 7);
		const [ox, oy] = angToXY(a, R);
		const [lx, ly] = angToXY(a, R + 16);
		ctx.beginPath();
		ctx.moveTo(ix, iy);
		ctx.lineTo(ox, oy);
		ctx.strokeStyle = "rgba(0,0,0,0.22)";
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.font = "8px monospace";
		ctx.fillStyle = "rgba(0,0,0,0.38)";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(MONTHS[m], lx, ly);
	}

	// Season labels
	ctx.textAlign = "center";
	ctx.font = "bold 9px monospace";
	ctx.fillStyle = "rgba(180, 120, 0, 0.70)";
	ctx.fillText("SUMMER", CX, CY - R - 22);
	ctx.fillStyle = "rgba(30, 100, 180, 0.65)";
	ctx.fillText("WINTER", CX, CY + R + 22);

	// Universal visibility rule: alpha = clamp(0,1, 1 - (examDateMs - sim.time) / FADE_WINDOW_MS)
	// Dots and arcs both use this — no special cases.
	let hoveredNode: ExamNode | null = null;
	for (const node of nodes) {
		if (sim.fired.has(node.id)) continue;
		if (targeted.has(node.id)) continue;
		if (node.dateMs <= sim.time) continue;
		if (node.prevFailedId !== null && !sim.fired.has(node.prevFailedId)) continue;

		const alpha = Math.max(0, 1 - (node.dateMs - sim.time) / FADE_WINDOW_MS);
		if (alpha <= 0) continue;

		const [x, y] = angToXY(node.angle);
		const hovered = alpha > 0.15 && mouse !== null && Math.hypot(mouse.x - x, mouse.y - y) < 10;
		if (hovered) hoveredNode = node;
		const isRetry = node.prevFailedId !== null;

		ctx.globalAlpha = alpha;
		ctx.beginPath();
		ctx.arc(x, y, 4, 0, Math.PI * 2);
		ctx.fillStyle = isRetry
			? (hovered ? "#f87171" : "rgba(239, 68, 68, 0.55)")
			: (hovered ? "rgba(0,0,0,0.80)" : "rgba(0,0,0,0.40)");
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	// Arc particles — alpha uses the same window rule, but keyed on the particle's
	// interpolated date as it travels (startMs → targetMs), so it fades while moving.
	for (const p of sim.particles) {
		if (p.phase !== "arc") continue;
		const raw = Math.min(p.t / p.duration, 1);
		const currentDateMs = p.startMs + (p.targetMs - p.startMs) * raw;
		const a = Math.max(0, 1 - (currentDateMs - sim.time) / FADE_WINDOW_MS);
		if (a <= 0) continue;
		const [x, y] = angToXY(p.angle);
		ctx.globalAlpha = a;
		ctx.beginPath();
		ctx.arc(x, y, 4, 0, Math.PI * 2);
		ctx.fillStyle = p.color === "#f87171" ? "rgba(239, 68, 68, 0.55)" : p.color;
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	// Glow particles — expand and fade at fixed position
	for (const p of sim.particles) {
		if (p.phase !== "glow") continue;
		drawGlowAt(ctx, p.gx, p.gy, p.color, p.alpha, p.gr);
	}

	// Clock hand — simple line from center to circle edge
	const [hx, hy] = angToXY(handAngle, R);
	ctx.beginPath();
	ctx.moveTo(CX, CY);
	ctx.lineTo(hx, hy);
	ctx.strokeStyle = "rgba(0,0,0,0.80)";
	ctx.lineWidth = 1.5;
	ctx.lineCap = "round";
	ctx.stroke();

	// Center pivot
	ctx.beginPath();
	ctx.arc(CX, CY, 3, 0, Math.PI * 2);
	ctx.fillStyle = "rgba(0,0,0,0.75)";
	ctx.fill();

	// Center date
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "bold 24px monospace";
	ctx.fillStyle = "rgba(0,0,0,0.40)";
	ctx.fillText(String(simDate.getFullYear()), CX, CY - 8);
	ctx.font = "10px monospace";
	ctx.fillStyle = "rgba(0,0,0,0.28)";
	ctx.fillText(simDate.toLocaleString("en", { month: "short" }).toUpperCase(), CX, CY + 13);

	// Tooltip
	if (hoveredNode) {
		const [ex, ey] = angToXY(hoveredNode.angle);
		const label = hoveredNode.name;
		ctx.font = "10px monospace";
		const tw = ctx.measureText(label).width;
		const pad = 7;
		const th = 22;
		let bx = ex + 12;
		let by = ey - th / 2;
		if (bx + tw + pad * 2 > W - 4) bx = ex - tw - pad * 2 - 10;
		if (by < 4) by = 4;
		if (by + th > H - 4) by = H - th - 4;
		ctx.fillStyle = "rgba(255,255,255,0.92)";
		ctx.fillRect(bx, by, tw + pad * 2, th);
		ctx.strokeStyle = "rgba(0,0,0,0.15)";
		ctx.lineWidth = 0.5;
		ctx.strokeRect(bx, by, tw + pad * 2, th);
		ctx.fillStyle = "rgba(0,0,0,0.82)";
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(label, bx + pad, by + th / 2);
	}

	ctx.restore();
}

interface Props {
	nodes: ExamNode[];
	byId: Map<string, ExamNode>;
	simRef: { current: SimState };
	simEnd: number;
	reset: () => void;
}

export default function ExamClockViz({ nodes, byId, simRef, simEnd, reset }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const mouseRef = useRef<{ x: number; y: number } | null>(null);
	const [scale, setScale] = useState(1);

	useEffect(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		const observer = new ResizeObserver(([entry]) => {
			const available = entry.contentRect.width;
			setScale(available > 0 ? Math.min(1, available / W) : 1);
		});
		observer.observe(wrapper);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		canvas.style.width = `${W}px`;
		canvas.style.height = `${H}px`;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const onMove = (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		};
		const onLeave = () => { mouseRef.current = null; };
		canvas.addEventListener("mousemove", onMove);
		canvas.addEventListener("mouseleave", onLeave);

		let prev: number | null = null;
		let raf: number;

		const loop = (now: number) => {
			const dt = prev !== null ? Math.min(now - prev, 80) : 16;
			prev = now;

			const sim = simRef.current;
			const simDt = dt * SIM_SPEED * YEAR_MS / 1000;
			const prevTime = sim.time;
			sim.time += simDt;

			if (sim.time >= simEnd) {
				reset();
				raf = requestAnimationFrame(loop);
				return;
			}

			for (const node of nodes) {
				if (sim.fired.has(node.id)) continue;
				if (node.dateMs > prevTime && node.dateMs <= sim.time) {
					sim.particles = sim.particles.filter(p => p.targetId !== node.id);
					sim.fired.add(node.id);

					const [ex, ey] = angToXY(node.angle);
					const uid = sim.uid++;
					const nextNode = node.nextId ? byId.get(node.nextId) : undefined;

					if (node.passed) {
						sim.particles.push({
							uid, phase: "glow", duration: GLOW_DUR,
							color: "#4ade80", alpha: 1, t: 0,
							angle: node.angle, startAngle: node.angle, travelDist: 0,
							targetAngle: null, targetId: null,
							gx: ex, gy: ey, gr: 5,
							startMs: node.dateMs, targetMs: node.dateMs,
						});
					} else if (!node.nextId) {
						sim.particles.push({
							uid, phase: "glow", duration: GLOW_DUR,
							color: "#f87171", alpha: 1, t: 0,
							angle: node.angle, startAngle: node.angle, travelDist: 0,
							targetAngle: null, targetId: null,
							gx: ex, gy: ey, gr: 5,
							startMs: node.dateMs, targetMs: node.dateMs,
						});
					} else {
						const targetAngle = nextNode?.angle ?? null;
						const gapMs = nextNode !== undefined ? nextNode.dateMs - node.dateMs : 0;
						const fullLoops = nextNode !== undefined ? Math.floor(gapMs / YEAR_MS) : 0;
					// cwDist returns 2π for identical angles (same day-of-year).
					// When fullLoops > 0 those revolutions already cover that, so collapse the extra arc to 0.
					const rawArcDist = targetAngle !== null ? cwDist(node.angle, targetAngle) : Math.PI * 2;
					const arcDist = fullLoops > 0 && rawArcDist > Math.PI * 2 - 0.1 ? 0 : rawArcDist;
					const travelDist = targetAngle !== null
						? fullLoops * Math.PI * 2 + arcDist
							: Math.PI * 2;
						const duration = (fullLoops + 1) * ARC_DURATION;
						sim.particles.push({
							uid, phase: "arc", duration,
							color: "#f87171", alpha: 1, t: 0,
							angle: node.angle, startAngle: node.angle, travelDist,
							targetAngle, targetId: node.nextId,
							gx: ex, gy: ey, gr: 5,
							startMs: node.dateMs, targetMs: nextNode?.dateMs ?? node.dateMs,
						});
					}
				}
			}

			const nextParticles: (typeof sim.particles[number])[] = [];
			for (const p of sim.particles) {
				const done = tickParticle(p, dt);
				if (!done) nextParticles.push(p);
			}
			sim.particles = nextParticles;
			drawFrame(ctx, simRef.current, nodes, mouseRef.current, dpr);
			raf = requestAnimationFrame(loop);
		};

		raf = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(raf);
			canvas.removeEventListener("mousemove", onMove);
			canvas.removeEventListener("mouseleave", onLeave);
		};
	}, [nodes, byId, simRef, simEnd, reset]);

	return (
		<div ref={wrapperRef} style={{ width: "100%", maxWidth: W, height: H * scale, overflow: "hidden", marginLeft: "auto", marginRight: "auto" }}>
			<canvas
				ref={canvasRef}
				style={{
					display: "block",
					transformOrigin: "top left",
					transform: scale < 1 ? `scale(${scale})` : undefined,
				}}
			/>
		</div>
	);
}
