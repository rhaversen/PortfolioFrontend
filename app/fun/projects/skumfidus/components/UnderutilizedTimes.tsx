import { useMemo } from "react";
import { TIER_DEFS, analyzeTime } from "../patterns";
import { pad2, firstName, strokeFor } from "../useSkumfidusData";

const ANALYSIS_GRID = Array.from({ length: 24 }, (_, h) =>
	Array.from({ length: 60 }, (_, m) => analyzeTime(h, m)),
);
const TIER_GRID = Array.from({ length: 24 }, (_, h) =>
	Array.from({ length: 60 }, (_, m) => TIER_DEFS.findIndex((t) => ANALYSIS_GRID[h][m].score < t.max)),
);

type Underutilized = {
	h: number;
	m: number;
	time: string;
	score: number;
	tier: number;
	count: number;
	patterns: string[];
	userCounts: number[];
};

export function UnderutilizedTimes({
	grid,
	heatmaps,
	users,
}: {
	grid: number[][];
	heatmaps: number[][][];
	users: string[];
}) {
	const items = useMemo(() => {
		const out: Underutilized[] = [];
		for (let h = 0; h < 24; h++) {
			for (let m = 0; m < 60; m++) {
				const tier = TIER_GRID[h][m];
				if (tier < 1) continue;
				const count = grid[h][m];
				const a = ANALYSIS_GRID[h][m];
				if (a.matched.length === 0) continue;
				out.push({
					h,
					m,
					time: `${pad2(h)}:${pad2(m)}`,
					score: a.score,
					tier,
					count,
					patterns: a.matched.map((p) => p.symbol),
					userCounts: users.map((_, ui) => heatmaps[ui]?.[h]?.[m] ?? 0),
				});
			}
		}
		out.sort((a, b) => {
			const aRare = a.tier >= 2;
			const bRare = b.tier >= 2;
			if (aRare !== bRare) return aRare ? -1 : 1;
			if (aRare) {
				if (a.score !== b.score) return b.score - a.score;
				return a.count - b.count;
			}
			return a.time.localeCompare(b.time);
		});
		return out.filter((t) => t.tier >= 2 || t.count === 0);
	}, [grid, heatmaps, users]);

	const top = items.slice(0, 60);

	if (top.length === 0) return null;

	const maxCount = Math.max(...top.map((t) => t.count), 1);

	return (
		<div className="space-y-2">
			<div
				className="grid w-fit mx-auto gap-x-3 gap-y-0.5 font-mono text-[0.65rem] tabular-nums"
				style={{ gridTemplateColumns: "max-content max-content max-content max-content max-content max-content" }}
			>
				<span className="text-muted">time</span>
				<span className="text-muted">score</span>
				<span className="text-muted">tier</span>
				<span className="text-muted">msgs</span>
				<span className="text-muted">who</span>
				<span className="text-muted">patterns</span>
				{top.map((t) => (
					<Row key={t.time} t={t} maxCount={maxCount} users={users} />
				))}
			</div>
		</div>
	);
}

function Row({ t, maxCount, users }: { t: Underutilized; maxCount: number; users: string[] }) {
	const tierColor = TIER_DEFS[t.tier]?.color ?? "var(--muted)";
	const barW = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
	return (
		<>
			<span className="text-foreground/80">{t.time}</span>
			<span style={{ color: tierColor }}>{t.score}</span>
			<span className="text-muted">{TIER_DEFS[t.tier]?.label ?? ""}</span>
			<span className="flex items-center gap-1.5">
				<span className="text-foreground/80">{t.count}</span>
				<span className="inline-block h-2 bg-border" style={{ width: `${Math.max(1, barW)}%` }} />
			</span>
			<span className="flex items-center gap-1.5">
				{users.map((u, ui) => (
					t.userCounts[ui] > 0 ? (
						<span key={u} className="flex items-center gap-0.5" style={{ color: strokeFor(u) }}>
							{firstName(u)}:{t.userCounts[ui]}
						</span>
					) : null
				))}
				{t.count === 0 && <span className="text-muted">—</span>}
			</span>
			<span className="text-muted truncate max-w-xs">{t.patterns.join(", ")}</span>
		</>
	);
}
