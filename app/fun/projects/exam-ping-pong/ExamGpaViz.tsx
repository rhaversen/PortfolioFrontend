"use client";

import { useEffect, useMemo, useRef } from "react";
import { type ExamNode, type SimState } from "./useExamSim";
import { GPA_H } from "./vizConfig";

const ML = 42;
const MR = 42;
const MT = 18;
const MB = 12;

const DANISH_TICKS = [-3, 0, 2, 4, 7, 10, 12];
const GRADE_MIN = -3;
const GRADE_MAX = 12;
const GRADE_RANGE = GRADE_MAX - GRADE_MIN;

const COLOR_UP   = { fill: "rgba(74,222,128,0.82)",  needle: "rgba(74,222,128,0.45)" };
const COLOR_DOWN = { fill: "rgba(251,146,60,0.82)", needle: "rgba(251,146,60,0.45)" };

function gradeToGpa(grade: number): number {
	const points: [number, number][] = [
		[-3, 0.0],
		[0, 1.0],
		[2, 1.3],
		[4, 2.0],
		[7, 2.7],
		[10, 3.3],
		[12, 4.0],
	];
	if (grade <= -3) return 0.0;
	if (grade >= 12) return 4.0;
	for (let i = 0; i < points.length - 1; i++) {
		const [g0, v0] = points[i];
		const [g1, v1] = points[i + 1];
		if (grade >= g0 && grade <= g1) {
			const t = (grade - g0) / (g1 - g0);
			return v0 + t * (v1 - v0);
		}
	}
	return 4.0;
}

interface GpaPoint {
	ms: number;
	avgGrade: number;
	gpa: number;
	examGrade: number;
	ects: number;
}

interface ComputedData {
	pts: GpaPoint[];
	maxEcts: number;
}

function computeGpaPoints(nodes: ExamNode[]): ComputedData {
	const passed = nodes.filter((n) => n.passed).sort((a, b) => a.dateMs - b.dateMs);
	let totalWG = 0;
	let totalEcts = 0;
	let maxEcts = 0;
	const pts: GpaPoint[] = [];
	for (const n of passed) {
		maxEcts = Math.max(maxEcts, n.ects);
		totalWG += n.grade * n.ects;
		totalEcts += n.ects;
		if (totalEcts > 0) {
			const avg = totalWG / totalEcts;
			pts.push({ ms: n.dateMs, avgGrade: avg, gpa: gradeToGpa(avg), examGrade: n.grade, ects: n.ects });
		}
	}
	return { pts, maxEcts };
}

function drawGpaGraph(
	ctx: CanvasRenderingContext2D,
	data: ComputedData,
	simTime: number,
	dpr: number,
	canvasW: number,
	simStart: number,
	simEnd: number,
): void {
	const { pts: gpaPoints, maxEcts } = data;
	ctx.clearRect(0, 0, canvasW * dpr, GPA_H * dpr);
	ctx.save();
	ctx.scale(dpr, dpr);

	const plotW = canvasW - ML - MR;
	const plotH = GPA_H - MT - MB;

	const msToX = (ms: number) => ML + ((ms - simStart) / (simEnd - simStart)) * plotW;
	const gradeToY = (g: number) => MT + (1 - (g - GRADE_MIN) / GRADE_RANGE) * plotH;

	// Grid lines and y-axis labels
	for (const g of DANISH_TICKS) {
		const y = Math.round(gradeToY(g));

		ctx.beginPath();
		ctx.moveTo(ML, y);
		ctx.lineTo(canvasW - MR, y);
		ctx.strokeStyle = "rgba(0,0,0,0.07)";
		ctx.lineWidth = 0.5;
		ctx.stroke();

		ctx.font = "10px monospace";
		ctx.textBaseline = "middle";

		// Left: Danish grade
		ctx.fillStyle = "rgba(0,0,0,0.45)";
		ctx.textAlign = "right";
		const danishLabel = g === 0 ? "00" : g === 2 ? "02" : String(g);
		ctx.fillText(danishLabel, ML - 6, y);

		// Right: GPA
		ctx.fillStyle = "rgba(0,0,0,0.32)";
		ctx.textAlign = "left";
		ctx.fillText(gradeToGpa(g).toFixed(1), canvasW - MR + 6, y);
	}

	// Column headers
	ctx.font = "bold 11px monospace";
	ctx.fillStyle = "rgba(0,0,0,0.45)";
	ctx.textBaseline = "bottom";
	ctx.textAlign = "right";
	ctx.fillText("DK", ML - 6, MT - 6);
	ctx.textAlign = "left";
	ctx.fillText("GPA", canvasW - MR + 6, MT - 6);

	if (gpaPoints.length === 0) {
		ctx.restore();
		return;
	}

	// ── Needles from each exam dot to the running avg line (drawn first, below everything) ──
	for (const pt of gpaPoints) {
		const x = msToX(pt.ms);
		const dotY = gradeToY(pt.examGrade);
		const lineY = gradeToY(pt.avgGrade);
		if (Math.abs(dotY - lineY) < 1) continue;
		const col = pt.examGrade >= pt.avgGrade ? COLOR_UP : COLOR_DOWN;
		ctx.beginPath();
		ctx.moveTo(x, dotY);
		ctx.lineTo(x, lineY);
		ctx.strokeStyle = col.needle;
		ctx.lineWidth = 1.5;
		ctx.stroke();
	}

	// ── Running average step line ────────────────────────────────────────────
	ctx.beginPath();
	ctx.moveTo(msToX(gpaPoints[0].ms), gradeToY(gpaPoints[0].avgGrade));
	for (let i = 1; i < gpaPoints.length; i++) {
		ctx.lineTo(msToX(gpaPoints[i].ms), gradeToY(gpaPoints[i - 1].avgGrade));
		ctx.lineTo(msToX(gpaPoints[i].ms), gradeToY(gpaPoints[i].avgGrade));
	}
	ctx.lineTo(msToX(simEnd), gradeToY(gpaPoints[gpaPoints.length - 1].avgGrade));
	ctx.strokeStyle = "rgba(74,222,128,0.75)";
	ctx.lineWidth = 2;
	ctx.lineJoin = "round";
	ctx.stroke();

	// ── Avg dots on the step line ────────────────────────────────────────────
	for (const pt of gpaPoints) {
		const x = msToX(pt.ms);
		const y = gradeToY(pt.avgGrade);
		ctx.beginPath();
		ctx.arc(x, y, 2.5, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(74,222,128,0.90)";
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.75)";
		ctx.lineWidth = 0.75;
		ctx.stroke();
	}

	// ── Exam dots (size = ECTS weight, color = above/below avg) ─────────────
	const effectiveMax = maxEcts > 0 ? maxEcts : 1;
	for (const pt of gpaPoints) {
		const x = msToX(pt.ms);
		const y = gradeToY(pt.examGrade);
		const r = 3 + (pt.ects / effectiveMax) * 5.5;
		const col = pt.examGrade >= pt.avgGrade ? COLOR_UP : COLOR_DOWN;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fillStyle = col.fill;
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.75)";
		ctx.lineWidth = 1;
		ctx.stroke();
	}

	// ── Cursor ───────────────────────────────────────────────────────────────
	let cursorPt: GpaPoint | null = null;
	for (const pt of gpaPoints) {
		if (pt.ms <= simTime) cursorPt = pt;
		else break;
	}

	const cursorX = Math.max(ML, Math.min(canvasW - MR, msToX(simTime)));
	ctx.beginPath();
	ctx.moveTo(cursorX, MT);
	ctx.lineTo(cursorX, GPA_H - MB);
	ctx.strokeStyle = "rgba(0,0,0,0.45)";
	ctx.lineWidth = 1;
	ctx.setLineDash([3, 3]);
	ctx.stroke();
	ctx.setLineDash([]);

	if (cursorPt !== null) {
		const crossY = gradeToY(cursorPt.avgGrade);

		ctx.beginPath();
		ctx.arc(cursorX, crossY, 4.5, 0, Math.PI * 2);
		ctx.fillStyle = "rgba(0,0,0,0.65)";
		ctx.fill();
		ctx.strokeStyle = "rgba(255,255,255,0.85)";
		ctx.lineWidth = 1.5;
		ctx.stroke();

		const line1 = cursorPt.avgGrade.toFixed(2);
		const line2 = cursorPt.gpa.toFixed(2) + " GPA";
		ctx.font = "10px monospace";
		const tw = Math.max(ctx.measureText(line1).width, ctx.measureText(line2).width);
		const pad = 6;
		const bw = tw + pad * 2;
		const bh = 30;
		let bx = cursorX + 9;
		let by = crossY - bh / 2;
		if (bx + bw > canvasW - MR - 2) bx = cursorX - bw - 9;
		by = Math.max(MT + 1, Math.min(GPA_H - MB - bh - 1, by));

		ctx.fillStyle = "rgba(255,255,255,0.94)";
		ctx.fillRect(bx, by, bw, bh);
		ctx.strokeStyle = "rgba(0,0,0,0.10)";
		ctx.lineWidth = 0.5;
		ctx.strokeRect(bx, by, bw, bh);
		ctx.fillStyle = "rgba(0,0,0,0.82)";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(line1, bx + pad, by + 5);
		ctx.fillText(line2, bx + pad, by + 17);
	}

	ctx.restore();
}

interface Props {
	nodes: ExamNode[];
	simRef: { current: SimState };
	simStart: number;
	simEnd: number;
}

export default function ExamGpaViz({ nodes, simRef, simStart, simEnd }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const data = useMemo(() => computeGpaPoints(nodes), [nodes]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const dpr = window.devicePixelRatio || 1;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let raf: number;
		const loop = () => {
			const w = canvas.clientWidth;
			if (w > 0) {
				const physW = Math.round(w * dpr);
				const physH = Math.round(GPA_H * dpr);
				if (canvas.width !== physW || canvas.height !== physH) {
					canvas.width = physW;
					canvas.height = physH;
				}
				drawGpaGraph(ctx, data, simRef.current.time, dpr, w, simStart, simEnd);
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);

		return () => cancelAnimationFrame(raf);
	}, [data, simRef, simStart, simEnd]);

	return (
		<div className="space-y-1">
			<canvas
				ref={canvasRef}
				style={{ display: "block", width: "100%", height: `${GPA_H}px` }}
			/>
			<div className="flex items-center justify-center gap-5 text-[0.62rem] font-mono text-muted">
				<span className="flex items-center gap-1.5">
					<span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "rgba(74,222,128,0.85)" }} />
					above avg · size = ECTS
				</span>
				<span className="flex items-center gap-1.5">
					<span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: "rgba(251,146,60,0.85)" }} />
					below avg
				</span>
			</div>
		</div>
	);
}
