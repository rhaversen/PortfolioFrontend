import type { MissRateStats, ScoredEntry } from "../types";
import { colorFor, strokeFor, firstName, formatTimes } from "../useSkumfidusData";
import { groupTimesByMonthUser } from "../utils";
import { ChartFrame, Legend, GridLines, YearMarks, yearMarksFromMonths } from "./charts";

export function MissAnalysis({
	missRate,
	missByMonth,
	users,
	entries,
}: {
	missRate: MissRateStats[];
	missByMonth: { monthKey: string; total: number; misses: number[]; missTotal: number }[];
	users: string[];
	entries: ScoredEntry[];
}) {
	const missTimesByMonthUser = groupTimesByMonthUser(entries, (e) => e.isMiss);

	const W = 600;
	const H = 280;
	const PAD = 48;
	const sMax = missByMonth.length > 0 ? Math.max(1, ...missByMonth.flatMap((m) => m.misses)) : 1;
	const groupW = (W - PAD * 2) / Math.max(1, missByMonth.length);
	const groupGap = Math.max(1, groupW * 0.1);
	const barGap = 0;
	const barW = Math.max(1, (groupW - groupGap) / users.length);
	const y = (s: number) => H - PAD - (s / sMax) * (H - PAD * 2);
	const yearMarks = yearMarksFromMonths(missByMonth.map((m) => m.monthKey), PAD, W);

	return (
		<div className="space-y-4">
			<div className="space-y-3">
				<ChartFrame W={W} H={H} ariaLabel="Miss count by month">
					<YearMarks marks={yearMarks} topY={PAD} botY={H - PAD} />
					<GridLines
						fractions={[0, 0.5, 1]}
						x1={PAD}
						x2={W - PAD}
						y={(f) => y(f * sMax)}
						dash={false}
						labelAt="left"
						labelFormatter={(f) => String(Math.round(f * sMax))}
					/>
					{missByMonth.map((m, i) => {
						const gx = PAD + i * groupW + groupGap / 2;
						return (
							<g key={m.monthKey}>
								{users.map((u, ui) => {
									const v = m.misses[ui];
									if (v === 0) return null;
									const bx = gx + ui * (barW + barGap);
									const by = y(v);
									return (
										<rect key={u} x={bx} y={by} width={barW} height={H - PAD - by} fill={strokeFor(u)} opacity={0.85}>
											<title>{`${m.monthKey} — ${firstName(u)}: ${v} misses\n${formatTimes(missTimesByMonthUser.get(m.monthKey)?.get(u) ?? [])}`}</title>
										</rect>
									);
								})}

							</g>
						);
					})}
				</ChartFrame>
				<Legend users={users} />
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{missRate.map((mr) => (
					<div key={mr.user} className="border border-border bg-background/40 p-3 space-y-2">
						<div className="flex items-center justify-between">
							<span className="flex items-center gap-2 font-mono text-xs">
								<span className={`inline-block h-2.5 w-2.5 ${colorFor(mr.user)}`} />
								{firstName(mr.user)}
							</span>
							<span className="font-mono text-xs tabular-nums">
								{mr.missCount} misses / {mr.total} ({(mr.missRate * 100).toFixed(0)}%)
							</span>
						</div>
						{mr.misses.length > 0 && (
							<div className="max-h-96 overflow-y-auto font-mono text-[0.65rem] tabular-nums text-muted">
								{mr.misses.map((m, i) => (
									<span key={i}>
										{i > 0 && ", "}
										<span className="text-muted">{m.localDate}</span>{" "}
										<span className="text-accent">{m.localTime}</span>
									</span>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

