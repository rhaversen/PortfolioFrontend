import type { PatternDominance } from "../types";
import { scoreTier } from "../patterns";
import { firstName } from "../useSkumfidusData";

export function PatternLeaderboard({
	patternDominance,
	users,
}: {
	patternDominance: PatternDominance[];
	users: string[];
}) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full table-fixed border-collapse text-sm">
				<thead>
					<tr className="text-left">
						<th className="w-6 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">#</th>
						<th className="w-32 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">Pattern</th>
						<th className="w-16 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">Score</th>
						<th className="w-20 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">Tier</th>
						<th className="w-20 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">Times/Day</th>
						<th className="hidden sm:table-cell w-20 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">1 every</th>
						{users.map((u) => (
							<th key={u} className="w-16 border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-right">{firstName(u)}</th>
						))}
						<th className="hidden md:table-cell border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">Examples</th>
					</tr>
				</thead>
				<tbody>
					{patternDominance.map((pd) => {
						const tier = scoreTier(pd.pattern.score);
						return (
							<tr key={pd.pattern.symbol}>
								<td className="border border-border px-2 py-1.5 font-mono text-[0.6rem] text-muted text-right tabular-nums">{pd.pattern.rank}</td>
								<td className="border border-border px-2 py-1.5">
									<div className="font-mono text-xs">{pd.pattern.symbol}</div>
									<div className="font-mono text-[0.6rem] text-muted">{pd.pattern.name}</div>
								</td>
								<td className={`border border-border px-2 py-1.5 font-mono text-xs text-right tabular-nums ${tier.tone}`}>{pd.pattern.score}</td>
								<td className={`border border-border px-2 py-1.5 font-mono text-[0.6rem] ${tier.tone}`}>{tier.label}</td>
								<td className="border border-border px-2 py-1.5 font-mono text-xs text-muted text-right tabular-nums">{pd.pattern.count}</td>
								<td className="hidden sm:table-cell border border-border px-2 py-1.5 font-mono text-xs text-right tabular-nums text-muted">
									{pd.pattern.count === 0 ? "—" : `${Math.round(1440 / pd.pattern.count)}m`}
								</td>
								{pd.byUser.map((bu) => (
									<td key={bu.user} className={`border border-border px-2 py-1.5 font-mono text-xs text-right tabular-nums ${pd.leader === bu.user && bu.count > 0 ? "font-bold" : "text-muted"}`}>
										{bu.count > 0 ? bu.count : "—"}
									</td>
								))}
								<td className="hidden md:table-cell border border-border px-2 py-1.5">
									<span className="font-mono text-xs text-muted tabular-nums">
										{pd.pattern.examples.join("  ")}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			<p className="mt-2 font-mono text-[0.6rem] text-muted">
				Count = occurrences per 24h (1440 total minutes). Score = 1440 / count. Lower count = rarer = higher score.
			</p>
		</div>
	);
}
