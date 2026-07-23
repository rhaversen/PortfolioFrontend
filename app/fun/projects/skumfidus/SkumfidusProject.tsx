"use client";

import { useEffect, useMemo, useState } from "react";
import { analyzeTime } from "./patterns";
import { useSkumfidusData } from "./useSkumfidusData";
import { Section } from "./components/ui";
import { LiveClock } from "./components/LiveClock";
import { NextRare } from "./components/NextRare";
import { UpcomingRare } from "./components/UpcomingRare";
import { SummaryGrid } from "./components/SummaryGrid";
import { UserRivalry } from "./components/UserRivalry";
import { CumulativeChart } from "./components/CumulativeChart";
import { PatternLeaderboard } from "./components/PatternLeaderboard";
import { MonthlyAvgChart } from "./components/MonthlyAvgChart";
import { TierDistribution } from "./components/TierDistribution";
import { MissAnalysis } from "./components/MissAnalysis";
import { OneMinuteLatePanel } from "./components/OneMinuteLate";
import { NoveltyPanel } from "./components/NoveltyPanel";
import { MonthlyPaceChart } from "./components/MonthlyPaceChart";
import { Heatmap } from "./components/Heatmap";
import { UnderutilizedTimes } from "./components/UnderutilizedTimes";
import { UserImbalance } from "./components/UserImbalance";

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

export default function SkumfidusProject() {
	const now = useNow();
	const d = useSkumfidusData();

	const nowAnalysis = useMemo(() => {
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
			if (a.score >= 100) {
				best = { time: `${pad2(h)}:${pad2(m)}`, pattern: a.best?.symbol ?? "", inMin: offset };
				break;
			}
		}
		return best;
	}, [now]);

	const upcomingRare = useMemo(() => {
		const start = now.getHours() * 60 + now.getMinutes();
		const out: { time: string; patterns: string[]; counts: number[]; inMin: number; score: number }[] = [];
		for (let offset = 1; offset <= 1440 && out.length < 5; offset++) {
			const totalMin = (start + offset) % 1440;
			const h = Math.floor(totalMin / 60);
			const m = totalMin % 60;
			const a = analyzeTime(h, m);
			if (a.score > 50) {
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
	}, [now]);

	return (
		<div className="space-y-6">
			<LiveClock now={now} analysis={nowAnalysis} />
			<NextRare next={nextRare} />
			<UpcomingRare items={upcomingRare} />

			<div>
				<h2 className="font-mono text-base uppercase tracking-widest text-muted">
					Skumfidus history
				</h2>
				<p className="mt-1 text-xs text-muted">
					{d.total} messages scored by the time-of-day pattern they were sent (Europe/Copenhagen).
					Each message&apos;s score comes from the rarity of the clock pattern at that minute.
				</p>
			</div>

			<SummaryGrid total={d.total} totalScore={d.totalScore} missTotal={d.missTotal} noveltyTotal={d.noveltyTotal} />

			<Section title="User rivalry">
				<UserRivalry userStats={d.userStats} />
			</Section>

			<Section title="Cumulative score over time">
				<CumulativeChart points={d.cumulative} users={d.users} />
			</Section>

			<Section title="Pattern leaderboard" subtitle="Who caught each clock pattern the most. Patterns ordered by rarity (rarest first).">
				<PatternLeaderboard patternDominance={d.patternDominance} users={d.users} />
			</Section>

			<Section title="Count &amp; average score by month" subtitle="Top: message count per month per person. Bottom: mean skumfidus score per month per person. Aligned so you can correlate volume and quality at a glance.">
				<MonthlyAvgChart data={d.monthlyAvg} users={d.users} entries={d.entries} />
			</Section>

			<Section title="Score tier distribution" subtitle="How often each tier was hit. A high &ldquo;Not Skumfidus&rdquo; bar means many messages were sent at times with no rare clock pattern.">
				<TierDistribution tierDist={d.tierDist} users={d.users} entries={d.entries} />
			</Section>

			<Section title="Miss rate — when it wasn&rsquo;t skumfidus" subtitle="A &ldquo;miss&rdquo; is a message sent at a time scoring &le;50 (no rare pattern matched).">
				<MissAnalysis missRate={d.missRate} missByMonth={d.missByMonth} users={d.users} entries={d.entries} />
			</Section>

			<Section title="Message novelty — when it wasn&rsquo;t just &ldquo;skumfidus&rdquo;" subtitle="Some messages had extra commentary beyond just the word. Who adds the most flavor, and what did they say?">
				<NoveltyPanel noveltyStats={d.noveltyStats} />
			</Section>
			<Section title="Monthly pace (count &amp; share %)" subtitle="Top: raw message counts per month. Bottom: each month normalized to 100% share.">
				<MonthlyPaceChart data={d.monthlyAvg} users={d.users} entries={d.entries} />
			</Section>

			<Section title="Time-of-day heatmap" subtitle="Every skumfidus message plotted by hour (rows) × minute (columns). Darker = more catches at that exact time. Combined view plus per-person breakdown.">
				<Heatmap grid={d.heatmap} maxHeat={d.maxHeat} heatmaps={d.heatmaps} maxHeats={d.maxHeats} users={d.users} />
			</Section>

			<Section title="Underutilized skumfidus times" subtitle="High-value clock patterns (score > 50) with few or zero catches. Sorted by fewest messages first, then highest score. These are the best opportunities to grab rare points.">
				<UnderutilizedTimes grid={d.heatmap} heatmaps={d.heatmaps} users={d.users} />
			</Section>

			<Section title="One-sided skumfidus times" subtitle="Times heavily dominated by one person (≥75% share, ≥3 total catches). Shows who owns a time slot and who's missing out.">
				<UserImbalance heatmaps={d.heatmaps} users={d.users} />
			</Section>

			<Section title="One minute late" subtitle="A miss sent one minute after a skumfidus window — so close, yet one minute too late.">
				<OneMinuteLatePanel items={d.oneMinuteLate} users={d.users} />
			</Section>
		</div>
	);
}
