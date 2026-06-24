"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ParsedExamRecord } from "./parser";

export const YEAR_MS = 365.25 * 24 * 3600 * 1000;
export const SUMMER_DAY = 172; // ≈ June 21
export const SIM_SPEED = 0.1; // years per real-second (fixed)
export const ARC_SPEED_BASE = (Math.PI * 2) / 900;
export const GLOW_DUR = 900;

export interface ExamNode {
	id: string;
	name: string;
	dateMs: number;
	angle: number; // position on the clock circle
	passed: boolean;
	nextId: string | null;
	prevFailedId: string | null;
}

export type ParticlePhase = "arc" | "glow";

export interface Particle {
	uid: number;
	phase: ParticlePhase;
	color: string;
	alpha: number;
	t: number;
	// arc movement (circle)
	angle: number;
	startAngle: number;
	travelDist: number;
	targetAngle: number | null;
	targetId: string | null;
	// glow position (circle)
	gx: number;
	gy: number;
	gr: number;
	// timeline positions
	startMs: number;
	targetMs: number;
}

export interface SimState {
	time: number;
	particles: Particle[];
	fired: Set<string>;
	uid: number;
}

export function hexToRgba(hex: string, alpha: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

function dayOfYear(d: Date): number {
	return Math.ceil((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86_400_000) + 1;
}

export function circleAngle(day: number): number {
	return ((day - SUMMER_DAY) / 365.25) * Math.PI * 2;
}

export function msToAngle(ms: number): number {
	return circleAngle(dayOfYear(new Date(ms)));
}

// Clockwise angular distance from → to, always in (0, 2π].
// Returns 2π when positions are identical (same day-of-year, different year).
export function cwDist(from: number, to: number): number {
	const d = ((to - from) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
	return d < 0.05 ? Math.PI * 2 : d;
}

export function buildNodes(records: ParsedExamRecord[]): ExamNode[] {
	const nodes: ExamNode[] = records.map((rec, i) => {
		const [d, m, y] = rec.date.split(".").map(Number);
		const dateMs = new Date(y, m - 1, d).getTime();
		return {
			id: `${rec.courseName}||${rec.date}||${i}`,
			name: rec.courseName,
			dateMs,
			angle: circleAngle(dayOfYear(new Date(dateMs))),
			passed: rec.passed,
			nextId: null,
			prevFailedId: null,
		};
	});

	nodes.sort((a, b) => a.dateMs - b.dateMs);

	const byId = new Map(nodes.map(n => [n.id, n]));
	for (let i = 0; i < nodes.length; i++) {
		if (!nodes[i].passed) {
			for (let j = i + 1; j < nodes.length; j++) {
				if (nodes[j].name === nodes[i].name) {
					nodes[i].nextId = nodes[j].id;
					const next = byId.get(nodes[j].id);
					if (next) next.prevFailedId = nodes[i].id;
					break;
				}
			}
		}
	}

	return nodes;
}

export function tickParticle(p: Particle, dt: number): boolean {
	p.t += dt;

	if (p.phase === "arc") {
		const traveled = p.angle - p.startAngle;
		let speed = ARC_SPEED_BASE;
		if (p.targetAngle !== null) {
			const progress = Math.min(traveled / p.travelDist, 1);
			speed = ARC_SPEED_BASE * Math.max(1 - 0.75 * progress, 0.25);
		}
		p.angle += speed * dt;
		const traveledNow = p.angle - p.startAngle;
		if (p.targetAngle !== null) {
			if (traveledNow >= p.travelDist - 0.02) return true;
		} else {
			p.alpha = Math.max(0, 1 - traveledNow / (Math.PI * 2));
			if (traveledNow >= Math.PI * 2) return true;
		}
		return false;
	}

	if (p.phase === "glow") {
		const t = Math.min(p.t / GLOW_DUR, 1);
		p.gr = 5 + t * 12;
		p.alpha = t < 0.2 ? 1.0 : Math.max(0, 1 - (t - 0.2) / 0.8);
		return t >= 1;
	}

	return true;
}

export function useExamSim(records: ParsedExamRecord[]) {
	const nodes = useMemo(() => buildNodes(records), [records]);
	const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

	const simStart = useMemo(() => {
		if (nodes.length === 0) return Date.now();
		return nodes[0].dateMs - YEAR_MS / 2;
	}, [nodes]);

	const simEnd = useMemo(() => {
		if (nodes.length === 0) return Date.now();
		return nodes[nodes.length - 1].dateMs + YEAR_MS / 12;
	}, [nodes]);

	const simRef = useRef<SimState>({ time: 0, particles: [], fired: new Set(), uid: 0 });

	const reset = useCallback(() => {
		simRef.current = { time: simStart, particles: [], fired: new Set(), uid: 0 };
	}, [simStart]);

	useEffect(() => { reset(); }, [reset]);

	return { nodes, byId, simRef, simStart, simEnd, reset };
}
