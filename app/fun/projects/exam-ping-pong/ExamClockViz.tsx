"use client";

import { useEffect, useRef } from "react";
import type { ParsedExamRecord } from "./parser";
import {
	type ExamNode, type SimState,
	SIM_SPEED, YEAR_MS, ARC_SPEED_BASE, GLOW_DUR,
	circleAngle, cwDist, hexToRgba, msToAngle, tickParticle, useExamSim,
} from "./useExamSim";
import ExamTimelineViz from "./ExamTimelineViz";

const CX = 240;
const CY = 255;
const R = 172;
const W = 480;
const H = 510;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_DAY_1 = [1,32,60,91,121,152,182,213,244,274,305,335];

function angToXY(a: number, r = R, cx = CX, cy = CY): [number, number] {
	return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}

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

	// Exam dots — fade in over the 6 months before the exam date.
	// Retry exams (prevFailedId set) are invisible until their predecessor fires;
	// the arc particle travelling to them IS their representation until it lands.
	const FADE_WINDOW = YEAR_MS / 2;
	let hoveredNode: ExamNode | null = null;
	for (const node of nodes) {
		if (sim.fired.has(node.id)) continue;
		if (targeted.has(node.id)) continue;
		if (node.dateMs <= sim.time) continue;
		if (node.prevFailedId !== null && !sim.fired.has(node.prevFailedId)) continue;

		const timeUntil = node.dateMs - sim.time;
		const isRetryLanded = node.prevFailedId !== null && sim.fired.has(node.prevFailedId);
		if (!isRetryLanded && timeUntil > FADE_WINDOW) continue;

		const fadeAlpha = isRetryLanded ? 1 : 1 - timeUntil / FADE_WINDOW;
		const [x, y] = angToXY(node.angle);
		const hovered = fadeAlpha > 0.15 && mouse !== null && Math.hypot(mouse.x - x, mouse.y - y) < 10;
		if (hovered) hoveredNode = node;

		ctx.globalAlpha = fadeAlpha;
		ctx.beginPath();
		ctx.arc(x, y, 4, 0, Math.PI * 2);
		ctx.fillStyle = isRetryLanded
			? (hovered ? "#f87171" : "rgba(239, 68, 68, 0.55)")
			: (hovered ? "rgba(0,0,0,0.80)" : "rgba(0,0,0,0.40)");
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	// Arc particles — slide along the circle ring
	for (const p of sim.particles) {
		if (p.phase !== "arc") continue;
		const [x, y] = angToXY(p.angle);
		const a = Math.max(0, Math.min(1, p.alpha));
		const haloR = 14;
		const grad = ctx.createRadialGradient(x, y, 0, x, y, haloR);
		grad.addColorStop(0, hexToRgba(p.color, a * 0.45));
		grad.addColorStop(1, hexToRgba(p.color, 0));
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(x, y, haloR, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = a;
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.arc(x, y, 5, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	// Glow particles — expand and fade at fixed position (passed exam)
	for (const p of sim.particles) {
		if (p.phase !== "glow") continue;
		const a = Math.max(0, Math.min(1, p.alpha));
		const haloR = p.gr * 2.5;
		const grad = ctx.createRadialGradient(p.gx, p.gy, 0, p.gx, p.gy, haloR);
		grad.addColorStop(0, hexToRgba(p.color, a * 0.5));
		grad.addColorStop(1, hexToRgba(p.color, 0));
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(p.gx, p.gy, haloR, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = a;
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.arc(p.gx, p.gy, p.gr, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
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

export default function ExamClockViz({ records }: { records: ParsedExamRecord[] }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const mouseRef = useRef<{ x: number; y: number } | null>(null);
	const { nodes, byId, simRef, simStart, simEnd, reset } = useExamSim(records);

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
							uid, phase: "glow",
							color: "#4ade80", alpha: 1, t: 0,
							angle: node.angle, startAngle: node.angle, travelDist: 0,
							targetAngle: null, targetId: null,
							gx: ex, gy: ey, gr: 5,
							startMs: node.dateMs, targetMs: node.dateMs,
						});
					} else {
						const targetAngle = nextNode?.angle ?? null;
						const travelDist = targetAngle !== null
							? cwDist(node.angle, targetAngle)
							: Math.PI * 2;
						sim.particles.push({
							uid, phase: "arc",
							color: "#f87171", alpha: 1, t: 0,
							angle: node.angle, startAngle: node.angle, travelDist,
							targetAngle, targetId: node.nextId,
							gx: ex, gy: ey, gr: 5,
							startMs: node.dateMs, targetMs: nextNode?.dateMs ?? node.dateMs,
						});
					}
				}
			}

			sim.particles = sim.particles.filter(p => !tickParticle(p, dt));
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

	if (records.length === 0) return null;

	return (
		<div className="space-y-3">
			<div className="flex justify-center overflow-x-auto">
				<canvas ref={canvasRef} style={{ display: "block" }} />
			</div>
			<ExamTimelineViz nodes={nodes} simRef={simRef} simStart={simStart} simEnd={simEnd} />
			<div className="flex justify-center">
				<button
					onClick={reset}
					className="border border-border px-3 py-1 text-xs font-mono hover:bg-foreground/5 transition-colors"
				>
					↺  Reset
				</button>
			</div>
			<div className="flex items-center justify-center gap-5 text-[0.65rem] font-mono text-muted">
				<span className="flex items-center gap-1.5">
					<span className="inline-block w-2 h-2 rounded-full bg-white/45 shrink-0" />
					upcoming
				</span>
				<span className="flex items-center gap-1.5">
					<span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: "#4ade80" }} />
					passed
				</span>
				<span className="flex items-center gap-1.5">
					<span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: "#f87171" }} />
					failed → retry
				</span>
			</div>
		</div>
	);
}
