export type Digits = [number, number, number, number];

export type PatternDef = {
	name: string;
	symbol: string;
	match: (d: Digits) => boolean;
};

export const PATTERNS: PatternDef[] = [
	{
		name: "All Identical",
		symbol: "AA:AA",
		match: (d) => d[0] === d[1] && d[1] === d[2] && d[2] === d[3],
	},
	{
		name: "Both Halves Doubled",
		symbol: "AA:BB",
		match: (d) => d[0] === d[1] && d[2] === d[3] && d[0] !== d[2],
	},
	{
		name: "Palindrome",
		symbol: "AB:BA",
		match: (d) => d[0] === d[3] && d[1] === d[2],
	},
	{
		name: "Ascending Run",
		symbol: "A,A+1:A+2,A+3",
		match: (d) => d[1] === d[0] + 1 && d[2] === d[1] + 1 && d[3] === d[2] + 1,
	},
	{
		name: "Hour = Minute",
		symbol: "AB:AB",
		match: (d) => d[0] === d[2] && d[1] === d[3],
	},
	{
		name: "Minute Digits Match Last Hour Digit",
		symbol: "AB:BB",
		match: (d) => d[1] === d[2] && d[1] === d[3],
	},
	{
		name: "Sarah's favorite",
		symbol: "Sarah's favorite",
		match: (d) => d[0] === 2 && d[1] === 0 && d[2] === 0 && d[3] === 3,
	},
	{
		name: "Rasmus's favorite",
		symbol: "Rasmus's favorite",
		match: (d) => d[0] === 2 && d[1] === 0 && d[2] === 0 && d[3] === 0,
	}
];

export const ALL_TIMES: { time: string; digits: Digits }[] = (() => {
	const out: { time: string; digits: Digits }[] = [];
	for (let h = 0; h < 24; h++) {
		for (let m = 0; m < 60; m++) {
			const d: Digits = [Math.floor(h / 10), h % 10, Math.floor(m / 10), m % 10];
			out.push({ time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, digits: d });
		}
	}
	return out;
})();

export type PatternStat = {
	name: string;
	symbol: string;
	count: number;
	score: number;
	examples: string[];
	rarity: number;
	rank: number;
};

export const PATTERN_STATS: PatternStat[] = (() => {
	const stats = PATTERNS.map((p) => {
		const matches = ALL_TIMES.filter((t) => p.match(t.digits));
		const count = matches.length;
		return {
			name: p.name,
			symbol: p.symbol,
			count,
			score: count === 0 ? 0 : Math.round((1440 / count) * 10) / 10,
			examples: matches.slice(0, 8).map((m) => m.time),
			rarity: count === 0 ? Infinity : 1440 / count,
		};
	});
	stats.sort((a, b) => {
		if (a.count !== b.count) return a.count - b.count;
		return b.score - a.score;
	});
	return stats.map((s, i) => ({ ...s, rank: i + 1 }));
})();

export type TimeAnalysis = {
	time: string;
	digits: Digits;
	matched: PatternStat[];
	best: PatternStat | null;
	score: number;
};

const PATTERN_BY_SYMBOL = new Map(PATTERNS.map((p) => [p.symbol, p]));

export function analyzeDigits(d: Digits): TimeAnalysis {
	const time = `${d[0]}${d[1]}:${d[2]}${d[3]}`;
	const matched = PATTERN_STATS.filter((p) => PATTERN_BY_SYMBOL.get(p.symbol)!.match(d));
	const best = matched.length > 0 ? matched[0] : null;
	const score = best ? (best.count === 0 ? 0 : 1440 / best.count) : 0;
	return { time, digits: d, matched, best, score: Math.round(score * 10) / 10 };
}

export function analyzeTime(h: number, m: number): TimeAnalysis {
	const d: Digits = [Math.floor(h / 10), h % 10, Math.floor(m / 10), m % 10];
	return analyzeDigits(d);
}

export function parseTime(input: string): Digits | null {
	const clean = input.replace(/[^\d]/g, "");
	if (clean.length !== 4) return null;
	const d: Digits = [Number(clean[0]), Number(clean[1]), Number(clean[2]), Number(clean[3])];
	if (d[0] > 2) return null;
	if (d[0] === 2 && d[1] > 3) return null;
	if (d[2] > 5) return null;
	return d;
}

export const TIER_DEFS = [
	{ label: "Not Skumfidus", max: 50, tone: "text-muted", color: "rgba(107, 114, 128, 0.45)" },
	{ label: "Skumfidus", max: 100, tone: "text-foreground/80", color: "rgba(56, 142, 142, 0.6)" },
	{ label: "Rare Skumfidus!", max: Infinity, tone: "text-accent", color: "rgba(11, 107, 203, 0.85)" },
] as const;

export function scoreTier(score: number): { label: string; tone: string } {
	const t = TIER_DEFS.find((d) => score < d.max) ?? TIER_DEFS[TIER_DEFS.length - 1];
	return { label: t.label, tone: t.tone };
}

export function tierIndex(score: number): number {
	const i = TIER_DEFS.findIndex((t) => score < t.max);
	return i < 0 ? TIER_DEFS.length - 1 : i;
}

export const ANALYSIS_GRID: TimeAnalysis[][] = Array.from({ length: 24 }, (_, h) =>
	Array.from({ length: 60 }, (_, m) => analyzeTime(h, m)),
);

export const TIER_GRID: number[][] = Array.from({ length: 24 }, (_, h) =>
	Array.from({ length: 60 }, (_, m) => tierIndex(ANALYSIS_GRID[h][m].score)),
);

export type NextRare = { time: string; pattern: string; inMin: number };

export function findNextRare(startMin: number): NextRare | null {
	for (let offset = 1; offset <= 1440; offset++) {
		const totalMin = (startMin + offset) % 1440;
		const h = Math.floor(totalMin / 60);
		const m = totalMin % 60;
		const a = ANALYSIS_GRID[h][m];
		if (a.score >= 100) {
			return { time: `${pad2(h)}:${pad2(m)}`, pattern: a.best?.symbol ?? "", inMin: offset };
		}
	}
	return null;
}

export type UpcomingRare = {
	time: string;
	patterns: string[];
	counts: number[];
	inMin: number;
	score: number;
};

export function findUpcomingRare(startMin: number, limit = 5, minScore = 50): UpcomingRare[] {
	const out: UpcomingRare[] = [];
	for (let offset = 1; offset <= 1440 && out.length < limit; offset++) {
		const totalMin = (startMin + offset) % 1440;
		const h = Math.floor(totalMin / 60);
		const m = totalMin % 60;
		const a = ANALYSIS_GRID[h][m];
		if (a.score > minScore) {
			out.push({
				time: `${pad2(h)}:${pad2(m)}`,
				patterns: a.matched.map((p) => p.symbol),
				counts: a.matched.map((p) => p.count),
				inMin: offset,
				score: a.score,
			});
		}
	}
	return out;
}

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}
