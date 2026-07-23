import { strokeFor, firstName, formatTimes } from "../useSkumfidusData";
import type { ScoredEntry } from "../types";
import { groupTimesByMonthUser } from "../utils";
import { ChartFrame, Legend, GridLines, YearMarks, yearMarksFromMonths } from "./charts";

export function MonthlyPaceChart({
	data,
	users,
	entries,
}: {
	data: { monthKey: string; counts: number[] }[];
	users: string[];
	entries: ScoredEntry[];
}) {
	const timesByMonthUser = groupTimesByMonthUser(entries);

	if (data.length === 0) {
		return <p className="font-mono text-xs text-muted">No data.</p>;
	}

	const W = 600;
	const H = 300;
	const PAD = 48;
	const halfH = (H - PAD * 2) / 2;
	const gap = 8;

	const totals = data.map((d) => d.counts.reduce((s, x) => s + x, 0));
	const maxCount = Math.max(1, ...totals);
	const groupW = (W - PAD * 2) / data.length;

	const baselineTop = PAD + halfH - gap / 2;
	const baselineBot = PAD + halfH + gap / 2;
	const yCount = (v: number) => baselineTop - (v / maxCount) * (halfH - gap);
	const yPct = (v: number) => baselineBot + (1 - v) * (halfH - gap);
	const yearMarks = yearMarksFromMonths(data.map((d) => d.monthKey), PAD, W);

	return (
		<div className="space-y-3">
			<ChartFrame W={W} H={H} ariaLabel="Monthly message counts and share percentages">
				<YearMarks marks={yearMarks} topY={PAD} botY={H - PAD} />
				<line x1={PAD} y1={baselineTop} x2={W - PAD} y2={baselineTop} stroke="var(--border)" strokeWidth={0.5} />
				<line x1={PAD} y1={baselineBot} x2={W - PAD} y2={baselineBot} stroke="var(--border)" strokeWidth={0.5} />

				<text x={PAD} y={PAD - 14} textAnchor="start" className="font-mono" fontSize={7} fill="var(--muted)">counts</text>
				<text x={PAD} y={baselineBot + 8} textAnchor="start" className="font-mono" fontSize={7} fill="var(--muted)">share %</text>
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
					y={(f) => yPct(f)}
					labelAt="right"
					labelFormatter={(f) => `${Math.round(f * 100)}%`}
				/>

				{data.map((d, i) => {
					const bx = PAD + i * groupW + 1;
					const total = totals[i];
					let accCount = 0;
					let accPct = 0;
					return (
						<g key={d.monthKey}>
							{users.map((u, ui) => {
								const v = d.counts[ui];
								if (v === 0) return null;
								const hCount = (v / maxCount) * (halfH - gap);
								const yCountTop = yCount(accCount + v);
								accCount += v;
								const pct = total > 0 ? v / total : 0;
								const hPct = pct * (halfH - gap);
								const yPctTop = yPct(accPct + pct);
								accPct += pct;
								return (
									<g key={u}>
										<rect x={bx} y={yCountTop} width={groupW - 2} height={hCount} fill={strokeFor(u)} opacity={0.85}>
											<title>{`${d.monthKey} — ${firstName(u)}: ${v}\n${formatTimes(timesByMonthUser.get(d.monthKey)?.get(u) ?? [])}`}</title>
										</rect>
										<rect x={bx} y={yPctTop} width={groupW - 2} height={hPct} fill={strokeFor(u)} opacity={0.85}>
											<title>{`${d.monthKey} — ${firstName(u)}: ${(pct * 100).toFixed(0)}%\n${formatTimes(timesByMonthUser.get(d.monthKey)?.get(u) ?? [])}`}</title>
										</rect>
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
