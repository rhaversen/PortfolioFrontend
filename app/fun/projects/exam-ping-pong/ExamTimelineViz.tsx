"use client";

import { useEffect, useRef } from "react";
import { type ExamNode, type SimState, hexToRgba } from "./useExamSim";

const TL_H = 88;

function drawTimeline(
	ctx: CanvasRenderingContext2D,
	sim: SimState,
	nodes: ExamNode[],
	mouse: { x: number; y: number } | null,
	dpr: number,
	canvasW: number,
	simStart: number,
	simEnd: number,
): void {
	ctx.clearRect(0, 0, canvasW * dpr, TL_H * dpr);
	ctx.save();
	ctx.scale(dpr, dpr);

	const ML = 24, MR = 24;
	const lineY = Math.round(TL_H * 0.48);
	const span = simEnd - simStart;
	const msToX = (ms: number) => ML + ((ms - simStart) / span) * (canvasW - ML - MR);

	const targeted = new Set(
		sim.particles.filter(p => p.targetId !== null).map(p => p.targetId as string),
	);

	// Semester ticks (Jan 1 = major, Jul 1 = minor) with year labels
	const startYear = new Date(simStart).getFullYear();
	const endYear = new Date(simEnd).getFullYear();
	for (let y = startYear; y <= endYear + 1; y++) {
		for (const mo of [0, 6]) {
			const ms = new Date(y, mo, 1).getTime();
			if (ms < simStart || ms > simEnd) continue;
			const x = msToX(ms);
			const isMajor = mo === 0;
			ctx.beginPath();
			ctx.moveTo(x, lineY - (isMajor ? 9 : 5));
			ctx.lineTo(x, lineY + (isMajor ? 9 : 5));
			ctx.strokeStyle = isMajor ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.10)";
			ctx.lineWidth = isMajor ? 1 : 0.75;
			ctx.stroke();
			if (isMajor) {
				ctx.font = "8px monospace";
				ctx.fillStyle = "rgba(0,0,0,0.32)";
				ctx.textAlign = "center";
				ctx.textBaseline = "top";
				ctx.fillText(String(y), x, lineY + 12);
			}
		}
	}

	// Main line
	ctx.beginPath();
	ctx.moveTo(ML, lineY);
	ctx.lineTo(canvasW - MR, lineY);
	ctx.strokeStyle = "rgba(0,0,0,0.18)";
	ctx.lineWidth = 1.5;
	ctx.stroke();

	// Exam dots — always visible for originals; retries appear only after predecessor fires
	let hoveredNode: ExamNode | null = null;
	for (const node of nodes) {
		if (sim.fired.has(node.id)) continue;
		if (targeted.has(node.id)) continue;
		if (node.prevFailedId !== null && !sim.fired.has(node.prevFailedId)) continue;

		const x = msToX(node.dateMs);
		const isRetry = node.prevFailedId !== null;
		const hovered = mouse !== null && Math.hypot(mouse.x - x, mouse.y - lineY) < 10;
		if (hovered) hoveredNode = node;

		ctx.beginPath();
		ctx.arc(x, lineY, 4, 0, Math.PI * 2);
		ctx.fillStyle = isRetry
			? (hovered ? "#f87171" : "rgba(239,68,68,0.55)")
			: (hovered ? "rgba(0,0,0,0.80)" : "rgba(0,0,0,0.40)");
		ctx.fill();
	}

	// Arc particles — interpolate linearly between startMs and targetMs.
	// Untargeted (failed with no known retry) travel toward simEnd while fading.
	for (const p of sim.particles) {
		if (p.phase !== "arc") continue;
		const a = Math.max(0, Math.min(1, p.alpha));
		let x: number;
		if (p.targetId === null) {
			const progress = 1 - a; // alpha 1→0 drives rightward drift
			const startX = msToX(p.startMs);
			const endX = msToX(simEnd);
			x = Math.max(ML, Math.min(canvasW - MR, startX + (endX - startX) * progress));
		} else {
			const progress = p.travelDist > 0
				? Math.min((p.angle - p.startAngle) / p.travelDist, 1)
				: 0;
			const ms = p.startMs + (p.targetMs - p.startMs) * progress;
			x = Math.max(ML, Math.min(canvasW - MR, msToX(ms)));
		}

		const haloR = 14;
		const grad = ctx.createRadialGradient(x, lineY, 0, x, lineY, haloR);
		grad.addColorStop(0, hexToRgba(p.color, a * 0.45));
		grad.addColorStop(1, hexToRgba(p.color, 0));
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(x, lineY, haloR, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = a;
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.arc(x, lineY, 5, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	// Glow particles — fixed at the exam's timeline position
	for (const p of sim.particles) {
		if (p.phase !== "glow") continue;
		const x = Math.max(ML, Math.min(canvasW - MR, msToX(p.startMs)));
		const a = Math.max(0, Math.min(1, p.alpha));
		const haloR = p.gr * 2.5;
		const grad = ctx.createRadialGradient(x, lineY, 0, x, lineY, haloR);
		grad.addColorStop(0, hexToRgba(p.color, a * 0.5));
		grad.addColorStop(1, hexToRgba(p.color, 0));
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(x, lineY, haloR, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = a;
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.arc(x, lineY, p.gr, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	// "Now" needle
	const nowX = Math.max(ML, Math.min(canvasW - MR, msToX(sim.time)));
	ctx.beginPath();
	ctx.moveTo(nowX, lineY - 12);
	ctx.lineTo(nowX, lineY + 12);
	ctx.strokeStyle = "rgba(0,0,0,0.80)";
	ctx.lineWidth = 1.5;
	ctx.lineCap = "round";
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(nowX - 4, lineY - 12);
	ctx.lineTo(nowX + 4, lineY - 12);
	ctx.lineTo(nowX, lineY - 5);
	ctx.closePath();
	ctx.fillStyle = "rgba(0,0,0,0.75)";
	ctx.fill();

	// Tooltip
	if (hoveredNode) {
		const x = msToX(hoveredNode.dateMs);
		const label = hoveredNode.name;
		ctx.font = "10px monospace";
		const tw = ctx.measureText(label).width;
		const pad = 7;
		const th = 22;
		let bx = x + 12;
		let by = lineY - th - 8;
		if (bx + tw + pad * 2 > canvasW - 4) bx = x - tw - pad * 2 - 10;
		if (by < 4) by = 4;
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
	simRef: { current: SimState };
	simStart: number;
	simEnd: number;
}

export default function ExamTimelineViz({ nodes, simRef, simStart, simEnd }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const mouseRef = useRef<{ x: number; y: number } | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const dpr = window.devicePixelRatio || 1;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const onMove = (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect();
			mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		};
		const onLeave = () => { mouseRef.current = null; };
		canvas.addEventListener("mousemove", onMove);
		canvas.addEventListener("mouseleave", onLeave);

		let raf: number;
		const loop = () => {
			// Sync physical pixels to CSS size every frame (handles resize automatically)
			const w = canvas.clientWidth;
			if (w > 0) {
				const physW = Math.round(w * dpr);
				const physH = Math.round(TL_H * dpr);
				if (canvas.width !== physW || canvas.height !== physH) {
					canvas.width = physW;
					canvas.height = physH;
				}
				drawTimeline(ctx, simRef.current, nodes, mouseRef.current, dpr, w, simStart, simEnd);
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(raf);
			canvas.removeEventListener("mousemove", onMove);
			canvas.removeEventListener("mouseleave", onLeave);
		};
	}, [nodes, simRef, simStart, simEnd]);

	return (
		<canvas
			ref={canvasRef}
			style={{ display: "block", width: "100%", height: `${TL_H}px` }}
		/>
	);
}
