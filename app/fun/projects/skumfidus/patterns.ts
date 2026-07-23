export type Digits = [number, number, number, number];

export type PatternKind = "structure" | "special";

export type PatternDef = {
	id: string;
	name: string;
	symbol: string;
	description: string;
	kind: PatternKind;
	match: (d: Digits) => boolean;
};

export const PATTERNS: PatternDef[] = [
	{
		id: "all-same",
		name: "All Identical",
		symbol: "AA:AA",
		description: "All four digits are the same.",
		kind: "structure",
		match: (d) => d[0] === d[1] && d[1] === d[2] && d[2] === d[3],
	},
	{
		id: "both-doubled",
		name: "Both Halves Doubled",
		symbol: "AA:BB",
		description: "Both the hour and the minute are doubled pairs, using different digits.",
		kind: "structure",
		match: (d) => d[0] === d[1] && d[2] === d[3] && d[0] !== d[2],
	},
	{
		id: "hour-doubled",
		name: "Hour Doubled",
		symbol: "AA:BC",
		description: "The hour is a doubled pair; the minute has two different digits.",
		kind: "structure",
		match: (d) => d[0] === d[1] && d[2] !== d[3],
	},
	{
		id: "minute-doubled",
		name: "Minute Doubled",
		symbol: "AB:CC",
		description: "The minute is a doubled pair; the hour has two different digits.",
		kind: "structure",
		match: (d) => d[0] !== d[1] && d[2] === d[3],
	},
	{
		id: "neither-doubled",
		name: "All Distinct",
		symbol: "AB:CD",
		description: "All four digits are different.",
		kind: "structure",
		match: (d) => d[0] !== d[1] && d[0] !== d[2] && d[0] !== d[3] && d[1] !== d[2] && d[1] !== d[3] && d[2] !== d[3],
	},
	{
		id: "palindrome",
		name: "Palindrome",
		symbol: "AB:BA",
		description: "Reads the same forwards and backwards.",
		kind: "special",
		match: (d) => d[0] === d[3] && d[1] === d[2],
	},
	{
		id: "sequential-asc",
		name: "Ascending Run",
		symbol: "A,A+1:A+2,A+3",
		description: "Four consecutive digits counting up.",
		kind: "special",
		match: (d) => d[1] === d[0] + 1 && d[2] === d[1] + 1 && d[3] === d[2] + 1,
	},
	{
		id: "abab",
		name: "Hour = Minute",
		symbol: "AB:AB",
		description: "The minute digits repeat the hour digits exactly.",
		kind: "special",
		match: (d) => d[0] === d[2] && d[1] === d[3],
	},
	{
		id: "abac",
		name: "Shared Opening",
		symbol: "AB:AC",
		description: "The hour and minute begin with the same digit.",
		kind: "special",
		match: (d) => d[0] === d[2] && d[1] !== d[3],
	},
	{
		id: "abbc",
		name: "Inner Link",
		symbol: "AB:BC",
		description: "The hour's last digit equals the minute's first digit.",
		kind: "special",
		match: (d) => d[1] === d[2] && d[0] !== d[3],
	},
	{
		id: "abca",
		name: "Outer Frame",
		symbol: "AB:CA",
		description: "The hour's first digit equals the minute's last digit.",
		kind: "special",
		match: (d) => d[0] === d[3] && d[1] !== d[2],
	},
	{
		id: "abcb",
		name: "Shared Ending",
		symbol: "AB:CB",
		description: "The hour and minute end with the same digit.",
		kind: "special",
		match: (d) => d[1] === d[3] && d[0] !== d[2],
	},
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
	id: string;
	name: string;
	symbol: string;
	description: string;
	kind: PatternKind;
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
			id: p.id,
			name: p.name,
			symbol: p.symbol,
			description: p.description,
			kind: p.kind,
			count,
			score: count === 0 ? 0 : Math.round((1440 / count) * 10) / 10,
			examples: matches.slice(0, 6).map((m) => m.time),
			rarity: count === 0 ? Infinity : 1440 / count,
		};
	});
	stats.sort((a, b) => {
		if (a.count !== b.count) return a.count - b.count;
		return a.id.localeCompare(b.id);
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

const PATTERN_BY_ID = new Map(PATTERNS.map((p) => [p.id, p]));

export function analyzeDigits(d: Digits): TimeAnalysis {
	const time = `${d[0]}${d[1]}:${d[2]}${d[3]}`;
	const matched = PATTERN_STATS.filter((p) => PATTERN_BY_ID.get(p.id)!.match(d));
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

export function scoreTier(score: number): { label: string; tone: string } {
	if (score <= 50) return { label: "Not Skumfidus", tone: "text-muted" };
	if (score < 100) return { label: "Mildly skumfidus", tone: "text-foreground/80" };
	return { label: "Rare Skumfidus!", tone: "text-accent" };
}
