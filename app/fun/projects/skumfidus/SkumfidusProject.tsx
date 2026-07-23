"use client";

import { useEffect, useMemo, useState } from "react";
import {
	PATTERN_STATS,
	analyzeTime,
	parseTime,
	scoreTier,
	type TimeAnalysis,
} from "./patterns";
import SkumfidusScoreboard from "./SkumfidusScoreboard";

const NOW_UPDATE_MS = 1000;

function useNow() {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), NOW_UPDATE_MS);
		return () => clearInterval(id);
	}, []);
	return now;
}

function pad2(n: number) {
	return String(n).padStart(2, "0");
}

function formatHM(d: Date) {
	return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatSeconds(d: Date) {
	return pad2(d.getSeconds());
}

export default function SkumfidusProject() {
	const now = useNow();
	const [input, setInput] = useState("01:23");
	const [maxCount, setMaxCount] = useState(16);

	const inputAnalysis = useMemo<TimeAnalysis | null>(() => {
		const d = parseTime(input);
		if (!d) return null;
		return analyzeTime(d[0] * 10 + d[1], d[2] * 10 + d[3]);
	}, [input]);

	const nowAnalysis = useMemo<TimeAnalysis>(() => {
		return analyzeTime(now.getHours(), now.getMinutes());
	}, [now]);

	const nextRare = useMemo(() => {
		const start = now.getHours() * 60 + now.getMinutes();
		let best: { time: string; pattern: string; inMin: number } | null = null;
		for (let offset = 1; offset <= 1440; offset++) {
			const totalMin = (start + offset) % 1440;
			const h = Math.floor(totalMin / 60);
			const m = totalMin % 60;
			const a = analyzeTime(h, m);
			const rare = a.matched.find((p) => p.count > 0 && p.count <= 24);
			if (rare) {
				best = { time: `${pad2(h)}:${pad2(m)}`, pattern: rare.symbol, inMin: offset };
				break;
			}
		}
		return best;
	}, [now]);

	const upcomingRare = useMemo(() => {
		const start = now.getHours() * 60 + now.getMinutes();
			const out: { time: string; patterns: string[]; counts: number[]; inMin: number }[] = [];
		for (let offset = 1; offset <= 600 && out.length < 24; offset++) {
			const totalMin = (start + offset) % 1440;
			const h = Math.floor(totalMin / 60);
			const m = totalMin % 60;
			const a = analyzeTime(h, m);
			const rare = a.matched.filter((p) => p.count > 0 && p.count <= maxCount);
			if (rare.length > 0) {
				out.push({
					time: `${pad2(h)}:${pad2(m)}`,
					patterns: rare.map((p) => p.symbol),
					counts: rare.map((p) => p.count),
					inMin: offset,
				});
			}
		}
		return out;
	}, [now, maxCount]);

	const nowTier = scoreTier(nowAnalysis.score);
	const inputTier = inputAnalysis ? scoreTier(inputAnalysis.score) : null;

	return (
		<div className="space-y-6">
			{/* Live clock */}
			<div className="border border-border bg-background/40 p-4 sm:p-5">
				<div className="flex items-baseline justify-between gap-4">
					<span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">Live</span>
				</div>
				<div className="mt-2 flex items-baseline justify-between gap-4">
					<div className="flex-1 flex items-baseline gap-1.5">
						<span className="font-mono text-4xl sm:text-5xl tabular-nums tracking-tight">
							{formatHM(now)}
						</span>
						<span className="font-mono text-xl sm:text-2xl tabular-nums tracking-tight text-muted/50">
							:{formatSeconds(now)}
						</span>
					</div>
					<span className={`flex-1 text-right font-mono text-3xl sm:text-4xl tracking-tight ${nowTier.tone}`}>
						{nowTier.label}
					</span>
				</div>
				{nowAnalysis.matched.length > 0 ? (
					<div className="mt-3 flex flex-wrap gap-1.5">
						{nowAnalysis.matched.map((p) => (
							<span
								key={p.id}
								className="border border-border bg-card/60 px-2 py-0.5 font-mono text-xs"
							>
								{p.symbol}
							</span>
						))}
					</div>
				) : (
					<p className="mt-3 font-mono text-xs text-muted">No pattern — just a regular minute.</p>
				)}
			</div>

			{/* Next rare time */}
			{nextRare && (
				<div className="flex items-center justify-between border border-border bg-background/40 px-4 py-3">
					<div>
						<span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
							Next rare window
						</span>
						<div className="mt-1 flex items-baseline gap-2">
							<span className="font-mono text-2xl tabular-nums">{nextRare.time}</span>
							<span className="font-mono text-xs text-muted">{nextRare.pattern}</span>
						</div>
					</div>
					<div className="text-right">
						<span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">in</span>
						<div className="font-mono text-2xl tabular-nums">
							{Math.floor(nextRare.inMin / 60)}h {nextRare.inMin % 60}m
						</div>
					</div>
				</div>
			)}

			{/* Upcoming rare times */}
			<div className="space-y-3">
				<div className="flex items-center justify-between gap-4">
					<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
						Upcoming rare times
					</h3>
					<label className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-widest text-muted">
						Max occurrences per day
						<input
							type="number"
							min={1}
							max={1440}
							value={maxCount}
							onChange={(e) => setMaxCount(Math.max(1, Math.min(1440, Number(e.target.value) || 1)))}
							className="w-16 border border-border bg-background/60 px-2 py-1 font-mono text-xs tabular-nums outline-none focus:border-accent"
						/>
					</label>
				</div>
				{upcomingRare.length > 0 ? (
					<ul className="divide-y divide-border border border-border bg-background/40">
						{upcomingRare.map((item, i) => {
							const minCount = Math.min(...item.counts);
							const veryRare = minCount <= 4;
							return (
							<li key={i} className={`flex items-center justify-between px-4 py-2 ${veryRare ? "border border-accent bg-accent/8" : ""}`}>
								<span className="flex items-baseline gap-2">
									<span className={`font-mono text-base tabular-nums ${veryRare ? "text-accent" : ""}`}>{item.time}</span>
									{veryRare && <span className="font-mono text-[0.6rem] uppercase tracking-widest text-accent">Rare!</span>}
								</span>
								<div className="flex items-center gap-2">
									<span className="font-mono text-xs text-muted">
										{item.patterns.map((sym, j) => (
											<span key={j} className="inline-flex items-baseline gap-1">
												{j > 0 && <span className="text-muted/50"> · </span>}
												<span>{sym}</span>
												<span className="text-muted/60 text-[0.6rem]">{item.counts[j]}/day</span>
											</span>
										))}
									</span>
									<span className="font-mono text-xs text-muted tabular-nums w-16 pl-4 text-left">
										{Math.floor(item.inMin / 60)}h {item.inMin % 60}m
									</span>
								</div>
							</li>
							);
						})}
					</ul>
				) : (
					<p className="font-mono text-xs text-muted">
						No times match this threshold in the next 24h.
					</p>
				)}
			</div>

			{/* Time inspector */}
			<div className="space-y-3">
				<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Inspect a time
				</h3>
				<div className="flex items-center gap-3">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="HH:MM"
						maxLength={5}
						aria-label="Time to inspect"
						className="w-28 border border-border bg-background/60 px-3 py-2 font-mono text-lg tabular-nums outline-none focus:border-accent"
					/>
					{inputAnalysis && inputTier && (
						<span className={`font-mono text-sm ${inputTier.tone}`}>{inputTier.label}</span>
					)}
					{!inputAnalysis && input.length > 0 && (
						<span className="font-mono text-xs text-muted">Invalid time</span>
					)}
				</div>

				{inputAnalysis && (
					<div className="border border-border bg-background/40 p-4">
						<div className="flex items-baseline justify-between">
							<span className="font-mono text-2xl tabular-nums">{inputAnalysis.time}</span>
							<span className="font-mono text-xs text-muted">
								score {inputAnalysis.score}
							</span>
						</div>
						{inputAnalysis.matched.length > 0 ? (
							<ul className="mt-3 space-y-2">
								{inputAnalysis.matched.map((p) => (
									<li key={p.id} className="flex items-baseline justify-between gap-4">
										<div className="min-w-0">
											<span className="font-mono text-sm text-accent">{p.symbol}</span>
											<span className="ml-2 text-xs text-muted">{p.name}</span>
										</div>
										<span className="font-mono text-xs text-muted whitespace-nowrap">
											{p.count}/day · rank #{p.rank}
										</span>
									</li>
								))}
							</ul>
						) : (
							<p className="mt-3 font-mono text-xs text-muted">
								No special pattern at this time.
							</p>
						)}
					</div>
				)}
			</div>

			{/* Rarity leaderboard */}
			<div className="space-y-3">
<h3 className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
				Pattern rarity leaderboard
			</h3>

				<div className="overflow-x-auto">
					<table className="w-full table-fixed border-collapse text-sm">
						<thead>
							<tr className="text-left">
								<th className="w-10 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">#</th>
								<th className="w-32 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">Pattern</th>
								<th className="border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">Name</th>
								<th className="w-16 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">Count</th>
								<th className="hidden sm:table-cell w-20 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">1 every</th>
								<th className="hidden sm:table-cell border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">Examples</th>
							</tr>
						</thead>
						<tbody>
							{PATTERN_STATS.map((p) => {
								return (
									<tr key={p.id}>
										<td className="border border-border px-2 py-1.5 font-mono text-xs text-muted text-center">
											{p.rank}
										</td>
										<td className="border border-border px-2 py-1.5">
											<span className="font-mono text-sm">
												{p.symbol}
											</span>
										</td>
										<td className="border border-border px-2 py-1.5">
											<span className="text-xs">{p.name}</span>
											<span className="block text-[0.65rem] text-muted">{p.description}</span>
										</td>
										<td className="border border-border px-2 py-1.5 font-mono text-xs text-right tabular-nums">
											{p.count}
										</td>
										<td className="hidden sm:table-cell border border-border px-2 py-1.5 font-mono text-xs text-right tabular-nums text-muted">
											{p.count === 0 ? "—" : `${Math.round(1440 / p.count)}m`}
										</td>
										<td className="hidden sm:table-cell border border-border px-2 py-1.5">
											<span className="font-mono text-xs text-muted tabular-nums">
												{p.examples.join("  ")}
											</span>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				<p className="font-mono text-[0.65rem] text-muted">
					Count = occurrences per 24h (1440 total minutes). &ldquo;1 every&rdquo; = average minutes
					between occurrences. Lower count = rarer.
				</p>
			</div>

			{/* Historical skumfidus analysis */}
			<SkumfidusScoreboard />
		</div>
	);
}
