import { strokeFor, firstName, formatTimes } from "../useSkumfidusData";
import type { ScoredEntry } from "../types";
import { groupTimesByMonthUser } from "../utils";
import { ChartFrame, Legend, GridLines, YearMarks, yearMarksFromMonths } from "./charts";

export function MonthlyAvgChart({
	data,
	users,
	entries,
}: {
	data: { monthKey: string; byUser: number[]; counts: number[] }[];
	users: string[];
	entries: ScoredEntry[];
}) {
	const timesByMonthUser = groupTimesByMonthUser(entries);

	if (data.length === 0) {
		return <p className="font-mono text-xs text-muted">No data.</p>;
	}

	const W = 600;
	const H = 320;
	const PAD = 48;
	const halfH = (H - PAD * 2) / 2;
	const gap = 8;

	const maxCount = Math.max(1, ...data.flatMap((d) => d.counts));
	const maxAvg = Math.max(1, ...data.flatMap((d) => d.byUser));
	const groupW = (W - PAD * 2) / data.length;
	const groupGap = Math.max(1, groupW * 0.1);
	const barGap = 0;
	const barW = Math.max(1, (groupW - groupGap) / users.length);

	const baselineTop = PAD + halfH - gap / 2;
	const baselineBot = PAD + halfH + gap / 2;
	const yCount = (v: number) => baselineTop - (v / maxCount) * (halfH - gap);
	const yAvg = (v: number) => baselineBot + (1 - v / maxAvg) * (halfH - gap);

	const yearMarks = yearMarksFromMonths(data.map((d) => d.monthKey), PAD, W);

	return (
		<div className="space-y-3">
			<ChartFrame W={W} H={H} ariaLabel="Skumfidus count and average score by month">
				<YearMarks marks={yearMarks} topY={PAD} botY={H - PAD} />
				<line x1={PAD} y1={baselineTop} x2={W - PAD} y2={baselineTop} stroke="var(--border)" strokeWidth={0.5} />
				<line x1={PAD} y1={baselineBot} x2={W - PAD} y2={baselineBot} stroke="var(--border)" strokeWidth={0.5} />

				<text x={PAD} y={PAD - 14} textAnchor="start" className="font-mono" fontSize={7} fill="var(--muted)">count</text>
				<text x={PAD} y={baselineBot + 8} textAnchor="start" className="font-mono" fontSize={7} fill="var(--muted)">avg score</text>
				<GridLines
					fractions={[0, 0.5, 1]}
					x1={PAD}
					x2={W - PAD}
					y={(f) => yCount(f * maxCount)}
					dash
					labelAt="left"
					labelFormatter={(f) => (f > 0 ? String(Math.round(f * maxCount)) : "")}
				/>
				<GridLines
					fractions={[0, 0.5, 1]}
					x1={PAD}
					x2={W - PAD}
					y={(f) => yAvg(f * maxAvg)}
					dash
					labelAt="right"
					labelFormatter={(f) => (f > 0 ? String(Math.round(f * maxAvg)) : "")}
				/>

				{data.map((d, i) => {
					const gx = PAD + i * groupW + groupGap / 2;
					return (
						<g key={d.monthKey}>
							{users.map((u, ui) => {
								const c = d.counts[ui];
								const a = d.byUser[ui];
								return (
									<g key={u}>
										{c > 0 && (
											<rect
												x={gx + ui * (barW + barGap)}
												y={yCount(c)}
												width={barW}
												height={baselineTop - yCount(c)}
												fill={strokeFor(u)}
												opacity={0.85}
											>
												<title>{`${d.monthKey} — ${firstName(u)}: ${c} messages\n${formatTimes(timesByMonthUser.get(d.monthKey)?.get(u) ?? [])}`}</title>
											</rect>
										)}
										{a > 0 && (
											<rect
												x={gx + ui * (barW + barGap)}
												y={yAvg(a)}
												width={barW}
												height={baselineBot + (halfH - gap) - yAvg(a)}
												fill={strokeFor(u)}
												opacity={0.85}
											>
												<title>{`${d.monthKey} — ${firstName(u)}: avg ${a}\n${formatTimes(timesByMonthUser.get(d.monthKey)?.get(u) ?? [])}`}</title>
											</rect>
										)}
									</g>
								);
							})}

						</g>
					);
				})}
			</ChartFrame>
			<Legend users={users} />
		</div>
	);
}
