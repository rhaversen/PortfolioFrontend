"use client";

import { useMemo } from "react";
import data from "./skumfidus_dates.json";
import { analyzeTime, scoreTier, PATTERN_STATS } from "./patterns";
import type { PatternStat } from "./patterns";

type RawEntry = { datetime: string; user: string; message: string };

type ScoredEntry = {
	date: Date;
	localDate: string;
	monthKey: string;
	weekKey: string;
	localTime: string;
	h: number;
	m: number;
	user: string;
	message: string;
	score: number;
	tier: { label: string; tone: string };
	patterns: string[];
	patternIds: string[];
	patternCount: number;
	novelty: boolean;
	commentary: string;
	isMiss: boolean;
};

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
	const cleaned = msg.trim().replace(/[!?.,~^*]+$/g, "").trim();
	const lower = cleaned.toLowerCase();
	const stripped = lower
		.replace(/^skumfidus[s]*\s*/, "")
		.replace(/^ingen\s+skumfidus\s*(til\s+dig)?\s*/i, "")
		.replace(/^n[aæ]sten\s+skumfidus\s*/i, "")
		.replace(/^missede\s+skumfidus\s*/i, "")
		.trim();
	if (
		stripped.length === 0 ||
		/^-?\d+$/.test(stripped) ||
		/^skumfidus[s]*$/.test(stripped)
	) {
		return { novelty: false, commentary: "" };
	}
	return {
		novelty: true,
		commentary: cleaned.replace(/^skumfidus[s]*[\s:.-]*/i, "").replace(/^[!?.,~^*\s]+/, "").trim() || cleaned,
	};
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
		patternIds: a.matched.map((p) => p.id),
		patternCount: a.matched.length,
		novelty: nov.novelty,
		commentary: nov.commentary,
		isMiss: a.score <= 50,
	};
}

type UserStats = {
	user: string;
	count: number;
	totalScore: number;
	avgScore: number;
	maxScore: number;
	best: ScoredEntry;
	first: ScoredEntry;
	last: ScoredEntry;
	tier: { label: string; tone: string };
};

function computeUserStats(entries: ScoredEntry[]): UserStats[] {
	const map = new Map<string, ScoredEntry[]>();
	for (const e of entries) {
		const arr = map.get(e.user) ?? [];
		arr.push(e);
		map.set(e.user, arr);
	}
	const stats: UserStats[] = [];
	for (const [user, arr] of map) {
		arr.sort((a, b) => a.date.getTime() - b.date.getTime());
		let total = 0;
		let max = -Infinity;
		let best = arr[0];
		for (const e of arr) {
			total += e.score;
			if (e.score > max) {
				max = e.score;
				best = e;
			}
		}
		stats.push({
			user,
			count: arr.length,
			totalScore: total,
			avgScore: total / arr.length,
			maxScore: max,
			best,
			first: arr[0],
			last: arr[arr.length - 1],
			tier: scoreTier(max),
		});
	}
	stats.sort((a, b) => b.totalScore - a.totalScore);
	return stats;
}

type MonthBucket = {
	monthKey: string;
	byUser: Map<string, number>;
	total: number;
};

function computeMonthly(entries: ScoredEntry[]): { buckets: MonthBucket[]; users: string[] } {
	const users = Array.from(new Set(entries.map((e) => e.user))).sort();
	const map = new Map<string, MonthBucket>();
	for (const e of entries) {
		const b = map.get(e.monthKey) ?? { monthKey: e.monthKey, byUser: new Map(), total: 0 };
		b.byUser.set(e.user, (b.byUser.get(e.user) ?? 0) + 1);
		b.total += 1;
		map.set(e.monthKey, b);
	}
	const buckets = Array.from(map.values()).sort((a, b) =>
		a.monthKey.localeCompare(b.monthKey),
	);
	return { buckets, users };
}

function computeTierDistribution(entries: ScoredEntry[]) {
	const tiers = [
		{ label: "Not Skumfidus", max: 50 },
		{ label: "Mildly skumfidus", max: 100 },
		{ label: "Rare Skumfidus!", max: Infinity },
	];
	const counts = tiers.map(() => 0);
	for (const e of entries) {
		const i = tiers.findIndex((t) => e.score < t.max);
		counts[i] += 1;
	}
	return tiers.map((t, i) => ({ label: t.label, count: counts[i] }));
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

type PatternDominance = {
	pattern: PatternStat;
	byUser: { user: string; count: number }[];
	leader: string | null;
	total: number;
};

function computePatternDominance(entries: ScoredEntry[], users: string[]): PatternDominance[] {
	const patternMap = new Map<string, Map<string, number>>();
	for (const e of entries) {
		for (const pid of e.patternIds) {
			const umap = patternMap.get(pid) ?? new Map();
			umap.set(e.user, (umap.get(e.user) ?? 0) + 1);
			patternMap.set(pid, umap);
		}
	}
	return PATTERN_STATS.map((p) => {
		const umap = patternMap.get(p.id) ?? new Map();
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
	const months = Array.from(map.keys()).sort();
	return months.map((mk) => ({
		monthKey: mk,
		byUser: users.map((u) => {
			const cur = map.get(mk)!.get(u);
			return cur ? Math.round((cur.sum / cur.count) * 10) / 10 : 0;
		}),
	}));
}

function computeWeekly(entries: ScoredEntry[], users: string[]) {
	const map = new Map<string, number[]>();
	for (const e of entries) {
		const arr = map.get(e.weekKey) ?? users.map(() => 0);
		arr[users.indexOf(e.user)] += 1;
		map.set(e.weekKey, arr);
	}
	const weeks = Array.from(map.keys()).sort();
	return weeks.map((wk) => ({
		weekKey: wk,
		counts: map.get(wk)!,
		total: map.get(wk)!.reduce((s, x) => s + x, 0),
	}));
}

function computeTimeHeatmap(entries: ScoredEntry[]) {
	const grid: number[][] = Array.from({ length: 24 }, () => new Array(6).fill(0));
	for (const e of entries) {
		grid[e.h][Math.floor(e.m / 10)] += 1;
	}
	return grid;
}

type NoveltyStats = {
	user: string;
	total: number;
	novelCount: number;
	novelRate: number;
	topComments: { text: string; count: number }[];
};

function computeNoveltyStats(entries: ScoredEntry[], users: string[]): NoveltyStats[] {
	return users.map((u) => {
		const userEntries = entries.filter((e) => e.user === u);
		const total = userEntries.length;
		const novel = userEntries.filter((e) => e.novelty);
		const novelCount = novel.length;
		const commentMap = new Map<string, number>();
		for (const e of novel) {
			const key = e.commentary.toLowerCase().trim();
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
		};
	});
}

type MissRateStats = {
	user: string;
	total: number;
	missCount: number;
	missRate: number;
};

function computeMissRate(entries: ScoredEntry[], users: string[]): MissRateStats[] {
	return users.map((u) => {
		const userEntries = entries.filter((e) => e.user === u);
		const total = userEntries.length;
		const missCount = userEntries.filter((e) => e.isMiss).length;
		return {
			user: u,
			total,
			missCount,
			missRate: total > 0 ? missCount / total : 0,
		};
	});
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

const USER_COLORS: Record<string, string> = {
	"Rasmus Haversen": "bg-accent",
	"Sarah Cornelia Thrane": "bg-foreground/60",
};

const USER_STROKE: Record<string, string> = {
	"Rasmus Haversen": "var(--accent)",
	"Sarah Cornelia Thrane": "var(--foreground)",
};

function colorFor(user: string) {
	return USER_COLORS[user] ?? "bg-muted";
}

function strokeFor(user: string) {
	return USER_STROKE[user] ?? "var(--muted)";
}

export default function SkumfidusScoreboard() {
	const scored = useMemo<ScoredEntry[]>(
		() => (data as RawEntry[]).map(parseEntry).sort((a, b) => a.date.getTime() - b.date.getTime()),
		[],
	);

	const userStats = useMemo(() => computeUserStats(scored), [scored]);
	const { buckets, users } = useMemo(() => computeMonthly(scored), [scored]);
	const tierDist = useMemo(() => computeTierDistribution(scored), [scored]);
	const cumulative = useMemo(() => computeCumulative(scored, users), [scored, users]);
	const patternDominance = useMemo(() => computePatternDominance(scored, users), [scored, users]);
	const monthlyAvg = useMemo(() => computeMonthlyAvgScore(scored, users), [scored, users]);
	const weekly = useMemo(() => computeWeekly(scored, users), [scored, users]);
	const heatmap = useMemo(() => computeTimeHeatmap(scored), [scored]);
	const noveltyStats = useMemo(() => computeNoveltyStats(scored, users), [scored, users]);
	const missRate = useMemo(() => computeMissRate(scored, users), [scored, users]);
	const missByMonth = useMemo(() => computeMissRateByMonth(scored, users), [scored, users]);

	const total = scored.length;
	const totalScore = useMemo(() => scored.reduce((s, e) => s + e.score, 0), [scored]);
	const maxHeat = Math.max(1, ...heatmap.flat());
	const missTotal = useMemo(() => scored.filter((e) => e.isMiss).length, [scored]);
	const noveltyTotal = useMemo(() => scored.filter((e) => e.novelty).length, [scored]);

	const fmtDate = (e: ScoredEntry) => `${e.localDate} ${e.localTime}`;

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Skumfidus history
				</h2>
				<p className="mt-1 text-xs text-muted">
					{total} messages scored by the time-of-day pattern they were sent (Europe/Copenhagen).
					Each message&apos;s score comes from the rarity of the clock pattern at that minute.
				</p>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-border bg-border">
				<Stat label="Messages" value={String(total)} />
				<Stat label="Total score" value={totalScore.toFixed(0)} />
				<Stat label="Misses" value={`${missTotal} (${total > 0 ? ((missTotal / total) * 100).toFixed(0) : 0}%)`} />
				<Stat label="With commentary" value={`${noveltyTotal} (${total > 0 ? ((noveltyTotal / total) * 100).toFixed(0) : 0}%)`} />
			</div>

			{/* User rivalry */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					User rivalry
				</h3>
				<div className="overflow-x-auto">
					<table className="w-full table-fixed border-collapse text-sm">
						<thead>
							<tr className="text-left">
								<th className="w-40 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">User</th>
								<th className="w-16 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">Msgs</th>
								<th className="w-20 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">Score</th>
								<th className="w-20 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">Avg</th>
						<th className="w-16 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">Best</th>
						<th className="border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">Best moment</th>
							</tr>
						</thead>
						<tbody>
							{userStats.map((u) => (
								<tr key={u.user}>
									<td className="border border-border px-2 py-1.5">
										<span className="flex items-center gap-2">
											<span className={`inline-block h-2.5 w-2.5 ${colorFor(u.user)}`} />
											<span className="text-xs truncate">{u.user}</span>
										</span>
									</td>
									<td className="border border-border px-2 py-1.5 font-mono text-xs text-right tabular-nums">{u.count}</td>
									<td className="border border-border px-2 py-1.5 font-mono text-xs text-right tabular-nums">{u.totalScore.toFixed(0)}</td>
									<td className="border border-border px-2 py-1.5 font-mono text-xs text-right tabular-nums text-muted">{u.avgScore.toFixed(1)}</td>
									<td className={`border border-border px-2 py-1.5 font-mono text-xs text-right tabular-nums ${u.tier?.tone ?? ""}`}>{u.maxScore}</td>
								<td className="border border-border px-2 py-1.5">
										<span className="font-mono text-xs tabular-nums">{u.best ? fmtDate(u.best) : "—"}</span>
										{u.best && u.best.patterns.length > 0 && (
											<span className="ml-2 font-mono text-[0.65rem] text-muted">{u.best.patterns.join(" ")}</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Cumulative score over time */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Cumulative score over time
				</h3>
				<div className="border border-border bg-background/40 p-4">
					<CumulativeChart points={cumulative} users={users} />
					<div className="mt-3 flex items-center gap-4">
						{users.map((u) => (
							<span key={u} className="flex items-center gap-1.5 font-mono text-[0.6rem] text-muted">
								<span className="inline-block h-2 w-4" style={{ background: strokeFor(u) }} />
								{u}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* Pattern dominance — who owns each pattern */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Pattern dominance
				</h3>
				<p className="text-xs text-muted">
					Who caught each clock pattern the most. Patterns are ordered by rarity (rarest first).
				</p>
				<div className="overflow-x-auto">
					<table className="w-full table-fixed border-collapse text-sm">
						<thead>
							<tr className="text-left">
								<th className="w-6 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">#</th>
								<th className="w-32 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">Pattern</th>
								<th className="w-16 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">Slots</th>
								{users.map((u) => (
									<th key={u} className="border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">{u.split(" ")[0]}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{patternDominance.map((pd) => (
								<tr key={pd.pattern.id}>
									<td className="border border-border px-2 py-1.5 font-mono text-[0.6rem] text-muted text-right tabular-nums">{pd.pattern.rank}</td>
									<td className="border border-border px-2 py-1.5">
										<span className="font-mono text-xs">{pd.pattern.symbol}</span>
										<span className="ml-2 font-mono text-[0.6rem] text-muted">{pd.pattern.name}</span>
									</td>
									<td className="border border-border px-2 py-1.5 font-mono text-xs text-muted text-right tabular-nums">{pd.pattern.count}</td>
									{pd.byUser.map((bu) => (
										<td key={bu.user} className={`border border-border px-2 py-1.5 font-mono text-xs text-right tabular-nums ${pd.leader === bu.user && bu.count > 0 ? "font-bold" : "text-muted"}`}>
											{bu.count > 0 ? bu.count : "—"}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Avg score by month */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Average score by month
				</h3>
				<p className="text-xs text-muted">
					Mean skumfidus score per month per person. Taller bars mean higher-quality catches
					that month. Months with no messages are skipped.
				</p>
				<div className="border border-border bg-background/40 p-4">
					<MonthlyAvgChart data={monthlyAvg} users={users} />
					<div className="mt-3 flex items-center gap-4">
						{users.map((u) => (
							<span key={u} className="flex items-center gap-1.5 font-mono text-[0.6rem] text-muted">
								<span className="inline-block h-2 w-4" style={{ background: strokeFor(u) }} />
								{u}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* Score tier distribution */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Score tier distribution
				</h3>
				<p className="text-xs text-muted">
					How often each tier was hit. A high &ldquo;Not Skumfidus&rdquo; bar means many messages
					were sent at times with no rare clock pattern — misses.
				</p>
				<div className="space-y-1.5">
					{tierDist.map((t) => {
						const pct = total > 0 ? (t.count / total) * 100 : 0;
						return (
							<div key={t.label} className="flex items-center gap-3">
								<span className="w-32 font-mono text-xs text-muted text-right">{t.label}</span>
								<div className="flex-1 h-4 bg-background/60 border border-border">
									<div className="h-full bg-accent/60" style={{ width: `${pct}%` }} />
								</div>
								<span className="w-10 font-mono text-xs text-right tabular-nums">{t.count}</span>
								<span className="w-12 font-mono text-[0.6rem] text-muted text-right tabular-nums">{pct.toFixed(1)}%</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Miss rate analysis */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Miss rate — when it wasn&rsquo;t skumfidus
				</h3>
				<p className="text-xs text-muted">
					A &ldquo;miss&rdquo; is a message sent at a time scoring &le;50 (no rare pattern matched).
					Who misses the most, and did misses cluster at certain times?
				</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-border bg-border">
					{missRate.map((m) => (
						<div key={m.user} className="bg-background/40 px-3 py-2">
							<div className="flex items-center gap-2">
								<span className={`inline-block h-2.5 w-2.5 ${colorFor(m.user)}`} />
								<span className="text-xs truncate">{m.user}</span>
							</div>
							<div className="mt-1.5 flex items-center gap-2">
								<div className="flex-1 h-3 bg-background/60 border border-border">
									<div className={`h-full ${colorFor(m.user)}`} style={{ width: `${m.missRate * 100}%` }} />
								</div>
								<span className="font-mono text-xs tabular-nums text-muted">{m.missCount}/{m.total}</span>
								<span className="font-mono text-xs tabular-nums w-12 text-right">{(m.missRate * 100).toFixed(1)}%</span>
							</div>
						</div>
					))}
				</div>
				<div className="border border-border bg-background/40 p-4 overflow-x-auto">
					<h4 className="font-mono text-[0.6rem] uppercase tracking-widest text-muted mb-2">Miss rate over time (monthly)</h4>
					<div className="flex items-end gap-px h-24 min-w-100">
						{missByMonth.map((m) => {
							const rate = m.total > 0 ? m.missTotal / m.total : 0;
							return (
								<div
									key={m.monthKey}
									title={`${m.monthKey}: ${m.missTotal}/${m.total} misses (${(rate * 100).toFixed(0)}%)`}
									className="flex-1 min-w-1 flex flex-col justify-end h-full group relative"
								>
									<div
										className="w-full bg-foreground/30"
										style={{ height: `${rate * 96}px` }}
									/>
									<span className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[0.55rem] text-muted opacity-0 group-hover:opacity-100 whitespace-nowrap">
										{(rate * 100).toFixed(0)}%
									</span>
								</div>
							);
						})}
					</div>
					<div className="mt-1 flex items-center justify-between">
						<span className="font-mono text-[0.6rem] text-muted tabular-nums">{missByMonth[0]?.monthKey}</span>
						<span className="font-mono text-[0.6rem] text-muted tabular-nums">{missByMonth[missByMonth.length - 1]?.monthKey}</span>
					</div>
				</div>
			</div>

			{/* Message novelty */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Message novelty — when it wasn&rsquo;t just &ldquo;skumfidus&rdquo;
				</h3>
				<p className="text-xs text-muted">
					Some messages had extra commentary beyond just the word. Who adds the most flavor,
					and what did they say?
				</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-px border border-border bg-border">
					{noveltyStats.map((n) => (
						<div key={n.user} className="bg-background/40 px-3 py-2">
							<div className="flex items-center gap-2">
								<span className={`inline-block h-2.5 w-2.5 ${colorFor(n.user)}`} />
								<span className="text-xs truncate">{n.user}</span>
							</div>
							<div className="mt-1.5 flex items-center gap-2">
								<div className="flex-1 h-3 bg-background/60 border border-border">
									<div className={`h-full ${colorFor(n.user)}`} style={{ width: `${n.novelRate * 100}%` }} />
								</div>
								<span className="font-mono text-xs tabular-nums text-muted">{n.novelCount}/{n.total}</span>
								<span className="font-mono text-xs tabular-nums w-12 text-right">{(n.novelRate * 100).toFixed(1)}%</span>
							</div>
							{n.topComments.length > 0 && (
								<ul className="mt-2 space-y-0.5">
									{n.topComments.map((c) => (
										<li key={c.text} className="flex items-center justify-between gap-2">
											<span className="font-mono text-[0.65rem] text-muted truncate">&ldquo;{c.text}&rdquo;</span>
											<span className="font-mono text-[0.6rem] text-muted tabular-nums">×{c.count}</span>
										</li>
									))}
								</ul>
							)}
						</div>
					))}
				</div>
			</div>

			{/* Over time */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Share of messages over time (monthly %)
				</h3>
				<p className="text-xs text-muted">
					Each month&rsquo;s bar shows who sent what percentage of that month&rsquo;s messages.
				</p>
				<div className="border border-border bg-background/40 p-4 overflow-x-auto">
					<div className="flex items-end gap-px h-32 min-w-100">
						{buckets.map((b) => (
							<div
								key={b.monthKey}
								title={`${b.monthKey}: ${b.total}`}
								className="flex-1 min-w-1 flex flex-col justify-end h-full group relative"
							>
								<div className="flex flex-col w-full h-full">
									{users.map((u) => {
										const v = b.byUser.get(u) ?? 0;
										if (v === 0) return null;
										const pct = (v / b.total) * 100;
										return (
											<div
												key={u}
												className={`${colorFor(u)} w-full`}
												style={{ height: `${pct}%` }}
											/>
										);
									})}
								</div>
								<span className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[0.55rem] text-muted opacity-0 group-hover:opacity-100 whitespace-nowrap">
									{b.total}
								</span>
							</div>
						))}
					</div>
					<div className="mt-2 flex items-center justify-between">
						<span className="font-mono text-[0.6rem] text-muted tabular-nums">{buckets[0]?.monthKey}</span>
						<span className="font-mono text-[0.6rem] text-muted tabular-nums">{buckets[buckets.length - 1]?.monthKey}</span>
					</div>
					<div className="mt-3 flex items-center gap-4">
						{users.map((u) => (
							<span key={u} className="flex items-center gap-1.5 font-mono text-[0.6rem] text-muted">
								<span className={`inline-block h-2 w-2 ${colorFor(u)}`} />
								{u}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* Weekly pace */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Weekly pace (100% stacked)
				</h3>
				<p className="text-xs text-muted">
					Each week normalized to 100%. Spikes in one color reveal when someone suddenly
				dominated the conversation that week.
				</p>
				<div className="border border-border bg-background/40 p-4 overflow-x-auto">
					<div className="flex items-end gap-px h-32 min-w-100">
						{weekly.map((w) => (
							<div
								key={w.weekKey}
								title={`${w.weekKey}: ${w.total}`}
								className="flex-1 min-w-1 flex flex-col justify-end h-full group relative"
							>
								<div className="flex flex-col w-full h-full">
									{users.map((u, ui) => {
										const v = w.counts[ui];
										if (v === 0) return null;
										const pct = (v / w.total) * 100;
										return (
											<div
												key={u}
												className={`${colorFor(u)} w-full`}
												style={{ height: `${pct}%` }}
											/>
										);
									})}
								</div>
								<span className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[0.55rem] text-muted opacity-0 group-hover:opacity-100 whitespace-nowrap">
									{w.total}
								</span>
							</div>
						))}
					</div>
					<div className="mt-2 flex items-center justify-between">
						<span className="font-mono text-[0.6rem] text-muted tabular-nums">{weekly[0]?.weekKey}</span>
						<span className="font-mono text-[0.6rem] text-muted tabular-nums">{weekly[weekly.length - 1]?.weekKey}</span>
					</div>
					<div className="mt-3 flex items-center gap-4">
						{users.map((u) => (
							<span key={u} className="flex items-center gap-1.5 font-mono text-[0.6rem] text-muted">
								<span className={`inline-block h-2 w-2 ${colorFor(u)}`} />
								{u}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* Time-of-day heatmap */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Time-of-day heatmap
				</h3>
				<p className="text-xs text-muted">
					Every skumfidus message plotted by hour × 10-minute bucket. Darker = more catches at
					that exact time. The game rewards rare clock patterns, so hot spots reveal the times
					you actually hunt.
				</p>
				<div className="border border-border bg-background/40 p-4 overflow-x-auto">
					<div className="inline-block">
						<div className="flex">
							<div className="w-8" />
							{[0, 1, 2, 3, 4, 5].map((b) => (
								<div key={b} className="w-6 text-center font-mono text-[0.5rem] text-muted">
									:{b}0
								</div>
							))}
						</div>
						{heatmap.map((row, h) => (
							<div key={h} className="flex items-center">
								<div className="w-8 font-mono text-[0.5rem] text-muted text-right pr-1 tabular-nums">
									{pad2(h)}
								</div>
								{row.map((val, b) => {
									const intensity = val / maxHeat;
									return (
										<div
											key={b}
											title={`${pad2(h)}:${b}0 — ${val}`}
											className="w-6 h-4 border border-border/40"
											style={{
												background:
													val === 0
														? "transparent"
														: `rgba(11, 107, 203, ${0.15 + intensity * 0.85})`,
											}}
										/>
									);
								})}
							</div>
						))}
					</div>
					<div className="mt-3 flex items-center gap-2 font-mono text-[0.6rem] text-muted">
						<span>less</span>
						<div className="flex">
							{[0, 0.25, 0.5, 0.75, 1].map((f) => (
								<div
									key={f}
									className="w-4 h-3 border border-border/40"
									style={{ background: f === 0 ? "transparent" : `rgba(11, 107, 203, ${0.15 + f * 0.85})` }}
								/>
							))}
						</div>
						<span>more</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function CumulativeChart({ points, users }: { points: { t: number; scores: number[] }[]; users: string[] }) {
	const W = 600;
	const H = 200;
	const PAD = 28;
	if (points.length === 0) {
		return <p className="font-mono text-xs text-muted">No data.</p>;
	}
	const tMin = points[0].t;
	const tMax = points[points.length - 1].t;
	const tRange = Math.max(1, tMax - tMin);
	const sMax = Math.max(1, ...points[points.length - 1].scores);
	const x = (t: number) => PAD + ((t - tMin) / tRange) * (W - PAD * 2);
	const y = (s: number) => H - PAD - (s / sMax) * (H - PAD * 2);

	const paths = users.map((u, ui) => {
		const d = points
			.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.scores[ui]).toFixed(1)}`)
			.join(" ");
		return { user: u, d };
	});

	return (
		<svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Cumulative skumfidus score over time">
			{/* y-axis gridlines */}
			{[0, 0.25, 0.5, 0.75, 1].map((f) => {
				const gy = y(f * sMax);
				return (
					<g key={f}>
						<line x1={PAD} y1={gy} x2={W - PAD} y2={gy} stroke="var(--border)" strokeWidth={0.5} />
						<text x={PAD - 4} y={gy + 3} textAnchor="end" className="font-mono" fontSize={8} fill="var(--muted)">
							{Math.round(f * sMax)}
						</text>
					</g>
				);
			})}
			{/* x-axis labels */}
			<text x={PAD} y={H - PAD + 12} className="font-mono" fontSize={8} fill="var(--muted)">
				{new Date(tMin).toISOString().slice(0, 10)}
			</text>
			<text x={W - PAD} y={H - PAD + 12} textAnchor="end" className="font-mono" fontSize={8} fill="var(--muted)">
				{new Date(tMax).toISOString().slice(0, 10)}
			</text>
			{/* lines */}
			{paths.map((p) => (
				<path key={p.user} d={p.d} fill="none" stroke={strokeFor(p.user)} strokeWidth={1.5} />
			))}
		</svg>
	);
}

function MonthlyAvgChart({
	data,
	users,
}: {
	data: { monthKey: string; byUser: number[] }[];
	users: string[];
}) {
	const W = 600;
	const H = 200;
	const PAD = 36;
	if (data.length === 0) {
		return <p className="font-mono text-xs text-muted">No data.</p>;
	}
	const sMax = Math.max(1, ...data.flatMap((d) => d.byUser));
	const groupW = (W - PAD * 2) / data.length;
	const groupGap = Math.max(1, groupW * 0.1);
	const barGap = 2;
	const barW = Math.max(1, (groupW - groupGap - barGap * (users.length - 1)) / users.length);
	const y = (s: number) => H - PAD - (s / sMax) * (H - PAD * 2);
	const labelEvery = Math.ceil(data.length / 6);

	return (
		<svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Average skumfidus score by month">
			{[0, 0.25, 0.5, 0.75, 1].map((f) => {
				const gy = y(f * sMax);
				return (
					<g key={f}>
						<line x1={PAD} y1={gy} x2={W - PAD} y2={gy} stroke="var(--border)" strokeWidth={0.5} />
						<text x={PAD - 4} y={gy + 3} textAnchor="end" className="font-mono" fontSize={8} fill="var(--muted)">
							{Math.round(f * sMax)}
						</text>
					</g>
				);
			})}
			{data.map((d, i) => {
				const gx = PAD + i * groupW + groupGap / 2;
				return (
					<g key={d.monthKey}>
						{users.map((u, ui) => {
							const v = d.byUser[ui];
							if (v === 0) return null;
							const bx = gx + ui * (barW + barGap);
							const by = y(v);
							return (
								<rect
									key={u}
									x={bx}
									y={by}
									width={barW}
									height={H - PAD - by}
									fill={strokeFor(u)}
									opacity={0.85}
								>
									<title>{`${d.monthKey} — ${u}: ${v}`}</title>
								</rect>
							);
						})}
						{i % labelEvery === 0 && (
							<text x={gx + (groupW - groupGap) / 2} y={H - PAD + 12} textAnchor="middle" className="font-mono" fontSize={7} fill="var(--muted)">
								{d.monthKey}
							</text>
						)}
					</g>
				);
			})}
		</svg>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="bg-background/40 px-3 py-2">
			<div className="font-mono text-[0.6rem] uppercase tracking-widest text-muted">{label}</div>
		<div className="mt-1 font-mono text-sm tabular-nums">{value}</div>
		</div>
	);
}

function pad2(n: number) {
	return String(n).padStart(2, "0");
}
