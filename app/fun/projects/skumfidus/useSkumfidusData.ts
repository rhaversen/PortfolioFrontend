"use client";

import { useMemo } from "react";
import data from "./skumfidus_dates.json";
import { analyzeTime, scoreTier, PATTERN_STATS, TIER_DEFS } from "./patterns";
import type { SkumfidusData, ScoredEntry, UserStats, MonthBucket, PatternDominance, NoveltyStats, MissRateStats, TierDistributionData, OneMinuteLate } from "./types";
import type { RawEntry } from "./types";

const COPENHAGEN_FMT = new Intl.DateTimeFormat("en-US", {
	timeZone: "Europe/Copenhagen",
	hour12: false,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
});

function fixMojibake(str: string): string {
	if (!/[\u00C0-\u00FF]/.test(str)) return str;
	try {
		const bytes = new Uint8Array(str.length);
		for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
		return new TextDecoder("utf-8").decode(bytes);
	} catch {
		return str;
	}
}

function extractCommentary(msg: string): { novelty: boolean; commentary: string } {
	const trimmed = msg.trim();
	if (trimmed.toLowerCase() === "skumfidus") {
		return { novelty: false, commentary: "" };
	}
	return { novelty: true, commentary: trimmed };
}

function isoWeekKey(localDate: string): string {
	const [y, m, d] = localDate.split("-").map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	const dayNum = date.getUTCDay() || 7;
	date.setUTCDate(date.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function parseEntry(e: RawEntry): ScoredEntry {
	const iso = e.datetime.replace(" ", "T").replace(" UTC", "Z");
	const date = new Date(iso);
	const parts = COPENHAGEN_FMT.formatToParts(date);
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
	const year = get("year");
	const month = get("month");
	const day = get("day");
	const hour = get("hour");
	const minute = get("minute");
	const h = Number(hour) % 24;
	const m = Number(minute);
	const a = analyzeTime(h, m);
	const localDate = `${year}-${month}-${day}`;
	const nov = extractCommentary(fixMojibake(e.message));
	return {
		date,
		localDate,
		monthKey: `${year}-${month}`,
		weekKey: isoWeekKey(localDate),
		localTime: `${hour}:${minute}`,
		h,
		m,
		user: e.user,
		message: fixMojibake(e.message),
		score: a.score,
		tier: scoreTier(a.score),
		patterns: a.matched.map((p) => p.symbol),
		patternCount: a.matched.length,
		novelty: nov.novelty,
		commentary: nov.commentary,
		isMiss: a.score <= 50,
	};
}

function computeUserStats(entries: ScoredEntry[]): UserStats[] {
	const map = new Map<string, ScoredEntry[]>();
	for (const e of entries) {
		const arr = map.get(e.user) ?? [];
		arr.push(e);
		map.set(e.user, arr);
	}
	const stats: UserStats[] = [];
	for (const [user, arr] of map) {
		let total = 0;
		for (const e of arr) {
			total += e.score;
		}
		stats.push({
			user,
			count: arr.length,
			totalScore: total,
			avgScore: total / arr.length,
		});
	}
	stats.sort((a, b) => b.totalScore - a.totalScore);
	return stats;
}

function computeMonthly(entries: ScoredEntry[]): { buckets: MonthBucket[]; users: string[] } {
	const users = Array.from(new Set(entries.map((e) => e.user))).sort();
	const map = new Map<string, MonthBucket>();
	for (const e of entries) {
		const b = map.get(e.monthKey) ?? { monthKey: e.monthKey, byUser: new Map(), total: 0 };
		b.byUser.set(e.user, (b.byUser.get(e.user) ?? 0) + 1);
		b.total += 1;
		map.set(e.monthKey, b);
	}
	const buckets = Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
	return { buckets, users };
}

function tierIndex(score: number) {
	return TIER_DEFS.findIndex((t) => score < t.max);
}

function computeTierDistribution(entries: ScoredEntry[], users: string[]): TierDistributionData {
	const tiers = TIER_DEFS;
	const combinedCounts = tiers.map(() => 0);
	const perUser = tiers.map(() => users.map(() => 0));
	for (const e of entries) {
		const ti = tierIndex(e.score);
		combinedCounts[ti] += 1;
		perUser[ti][users.indexOf(e.user)] += 1;
	}
	return {
		combined: tiers.map((t, i) => ({
			label: t.label,
			count: combinedCounts[i],
			byUser: perUser[i],
		})),
	};
}

function computeCumulative(entries: ScoredEntry[], users: string[]) {
	const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
	const running = new Map<string, number>(users.map((u) => [u, 0]));
	const points: { t: number; scores: number[] }[] = [];
	for (const e of sorted) {
		running.set(e.user, (running.get(e.user) ?? 0) + e.score);
		points.push({ t: e.date.getTime(), scores: users.map((u) => running.get(u) ?? 0) });
	}
	return points;
}

function computePatternDominance(entries: ScoredEntry[], users: string[]): PatternDominance[] {
	const patternMap = new Map<string, Map<string, number>>();
	for (const e of entries) {
		for (const psym of e.patterns) {
			const umap = patternMap.get(psym) ?? new Map();
			umap.set(e.user, (umap.get(e.user) ?? 0) + 1);
			patternMap.set(psym, umap);
		}
	}
	return PATTERN_STATS.map((p) => {
		const umap = patternMap.get(p.symbol) ?? new Map();
		const byUser = users.map((u) => ({ user: u, count: umap.get(u) ?? 0 }));
		const total = byUser.reduce((s, x) => s + x.count, 0);
		const maxCount = Math.max(0, ...byUser.map((x) => x.count));
		const leaders = byUser.filter((x) => x.count === maxCount && maxCount > 0);
		return { pattern: p, byUser, leader: leaders.length === 1 ? leaders[0].user : null, total };
	});
}

function computeMonthlyAvgScore(entries: ScoredEntry[], users: string[]) {
	const map = new Map<string, Map<string, { sum: number; count: number }>>();
	for (const e of entries) {
		const b = map.get(e.monthKey) ?? new Map();
		const cur = b.get(e.user) ?? { sum: 0, count: 0 };
		cur.sum += e.score;
		cur.count += 1;
		b.set(e.user, cur);
		map.set(e.monthKey, b);
	}
	const monthKeys = Array.from(map.keys()).sort();
	const allMonths: string[] = [];
	if (monthKeys.length > 0) {
		const [startY, startM] = monthKeys[0].split("-").map(Number);
		const [endY, endM] = monthKeys[monthKeys.length - 1].split("-").map(Number);
		let y = startY;
		let m = startM;
		while (y < endY || (y === endY && m <= endM)) {
			allMonths.push(`${y}-${String(m).padStart(2, "0")}`);
			m += 1;
			if (m > 12) {
				m = 1;
				y += 1;
			}
		}
	}
	return allMonths.map((mk) => {
		const b = map.get(mk);
		return {
			monthKey: mk,
			byUser: users.map((u) => {
				const cur = b?.get(u);
				return cur ? Math.round((cur.sum / cur.count) * 10) / 10 : 0;
			}),
			counts: users.map((u) => b?.get(u)?.count ?? 0),
		};
	});
}

function computeTimeHeatmap(entries: ScoredEntry[]) {
	const grid: number[][] = Array.from({ length: 24 }, () => new Array(60).fill(0));
	for (const e of entries) {
		grid[e.h][e.m] += 1;
	}
	return grid;
}

function computeTimeHeatmaps(entries: ScoredEntry[], users: string[]) {
	const grids: number[][][] = users.map(() => Array.from({ length: 24 }, () => new Array(60).fill(0)));
	for (const e of entries) {
		const ui = users.indexOf(e.user);
		if (ui >= 0) grids[ui][e.h][e.m] += 1;
	}
	return grids;
}

function computeNoveltyStats(entries: ScoredEntry[], users: string[]): NoveltyStats[] {
	return users.map((u) => {
		const userEntries = entries.filter((e) => e.user === u);
		const total = userEntries.length;
		const novel = userEntries.filter((e) => e.novelty);
		const novelCount = novel.length;
		const commentMap = new Map<string, number>();
		for (const e of novel) {
			const key = e.message.toLowerCase().trim();
			commentMap.set(key, (commentMap.get(key) ?? 0) + 1);
		}
		const topComments = Array.from(commentMap.entries())
			.map(([text, count]) => ({ text, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);
		return {
			user: u,
			total,
			novelCount,
			novelRate: total > 0 ? novelCount / total : 0,
			topComments,
			messages: novel,
		};
	});
}

function computeMissRate(entries: ScoredEntry[], users: string[]): MissRateStats[] {
	return users.map((u) => {
		const userEntries = entries.filter((e) => e.user === u);
		const total = userEntries.length;
		const misses = userEntries.filter((e) => e.isMiss);
		return {
			user: u,
			total,
			missCount: misses.length,
			missRate: total > 0 ? misses.length / total : 0,
			misses,
		};
	});
}

function computeOneMinuteLate(entries: ScoredEntry[]): OneMinuteLate[] {
	const out: OneMinuteLate[] = [];
	for (const miss of entries) {
		if (!miss.isMiss) continue;
		const totalMin = (miss.h * 60 + miss.m - 1 + 1440) % 1440;
		const ph = Math.floor(totalMin / 60);
		const pm = totalMin % 60;
		const prev = analyzeTime(ph, pm);
		if (prev.score <= 50) continue;
		out.push({
			miss,
			user: miss.user,
			missTime: miss.localTime,
			prevTime: `${pad2(ph)}:${pad2(pm)}`,
			missScore: miss.score,
			prevScore: prev.score,
		});
	}
	out.sort((a, b) => a.miss.date.getTime() - b.miss.date.getTime());
	return out;
}

function computeMissRateByMonth(entries: ScoredEntry[], users: string[]) {
	const map = new Map<string, { total: number; misses: number[] }>();
	for (const e of entries) {
		const b = map.get(e.monthKey) ?? { total: 0, misses: users.map(() => 0) };
		b.total += 1;
		if (e.isMiss) b.misses[users.indexOf(e.user)] += 1;
		map.set(e.monthKey, b);
	}
	const months = Array.from(map.keys()).sort();
	return months.map((mk) => ({
		monthKey: mk,
		total: map.get(mk)!.total,
		misses: map.get(mk)!.misses,
		missTotal: map.get(mk)!.misses.reduce((s, x) => s + x, 0),
	}));
}

const USER_COLORS: Record<string, { bg: string; stroke: string }> = {
	"Rasmus Haversen": { bg: "bg-accent", stroke: "var(--accent)" },
	"Sarah Cornelia Thrane": { bg: "bg-pink-500", stroke: "#ec4899" },
};
const FALLBACK_BG_PALETTE = ["bg-accent", "bg-pink-500", "bg-foreground/60", "bg-muted"];
const FALLBACK_STROKE_PALETTE = ["var(--accent)", "#ec4899", "var(--foreground)", "var(--muted)"];

const _colorCache = new Map<string, string>();
const _strokeCache = new Map<string, string>();

export function resetColorCaches() {
	_colorCache.clear();
	_strokeCache.clear();
}

export function colorFor(user: string) {
	let c = _colorCache.get(user);
	if (!c) {
		const preset = USER_COLORS[user];
		c = preset ? preset.bg : FALLBACK_BG_PALETTE[_colorCache.size % FALLBACK_BG_PALETTE.length];
		_colorCache.set(user, c);
	}
	return c;
}

export function strokeFor(user: string) {
	let c = _strokeCache.get(user);
	if (!c) {
		const preset = USER_COLORS[user];
		c = preset ? preset.stroke : FALLBACK_STROKE_PALETTE[_strokeCache.size % FALLBACK_STROKE_PALETTE.length];
		_strokeCache.set(user, c);
	}
	return c;
}

export function pad2(n: number) {
	return String(n).padStart(2, "0");
}

export function firstName(user: string): string {
	return user.split(" ")[0];
}

export function formatTimes(times: string[]): string {
	if (times.length === 0) return "(none)";
	const sorted = [...times].sort();
	const max = 15;
	const shown = sorted.slice(0, max).join(", ");
	const suffix = times.length > max ? ` …+${times.length - max}` : "";
	return shown + suffix;
}

export function useSkumfidusData(): SkumfidusData {
	const scored = useMemo<ScoredEntry[]>(
		() => (data as RawEntry[]).map(parseEntry).sort((a, b) => a.date.getTime() - b.date.getTime()),
		[],
	);

	const { buckets, users } = useMemo(() => computeMonthly(scored), [scored]);
	const userStats = useMemo(() => computeUserStats(scored), [scored]);
	const tierDist = useMemo(() => computeTierDistribution(scored, users), [scored, users]);
	const cumulative = useMemo(() => computeCumulative(scored, users), [scored, users]);
	const patternDominance = useMemo(() => computePatternDominance(scored, users), [scored, users]);
	const monthlyAvg = useMemo(() => computeMonthlyAvgScore(scored, users), [scored, users]);
	const heatmap = useMemo(() => computeTimeHeatmap(scored), [scored]);
	const heatmaps = useMemo(() => computeTimeHeatmaps(scored, users), [scored, users]);
	const noveltyStats = useMemo(() => computeNoveltyStats(scored, users), [scored, users]);
	const missRate = useMemo(() => computeMissRate(scored, users), [scored, users]);
	const oneMinuteLate = useMemo(() => computeOneMinuteLate(scored), [scored]);
	const missByMonth = useMemo(() => computeMissRateByMonth(scored, users), [scored, users]);

	// Assign colors deterministically based on sorted user order
	useMemo(() => {
		resetColorCaches();
		for (const u of users) {
			colorFor(u);
			strokeFor(u);
		}
	}, [users]);

	const total = scored.length;
	const totalScore = useMemo(() => scored.reduce((s, e) => s + e.score, 0), [scored]);
	const maxHeat = Math.max(1, ...heatmap.flat());
	const maxHeats = heatmaps.map((g) => Math.max(1, ...g.flat()));
	const missTotal = useMemo(() => scored.filter((e) => e.isMiss).length, [scored]);
	const noveltyTotal = useMemo(() => scored.filter((e) => e.novelty).length, [scored]);

	return {
		entries: scored,
		users,
		userStats,
		tierDist,
		cumulative,
		patternDominance,
		monthlyAvg,
		months: buckets,
		heatmap,
		heatmaps,
		noveltyStats,
		missRate,
		oneMinuteLate,
		missByMonth,
		total,
		totalScore,
		missTotal,
		noveltyTotal,
		maxHeat,
		maxHeats,
	};
}
