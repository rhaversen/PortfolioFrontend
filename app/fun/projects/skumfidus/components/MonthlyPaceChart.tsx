import { strokeFor, firstName, formatTimes } from "../useSkumfidusData";
import type { ScoredEntry } from "../types";
import { Legend, YearMarks } from "./ui";

export function MonthlyPaceChart({
	data,
	users,
	entries,
}: {
	data: { monthKey: string; counts: number[] }[];
	users: string[];
	entries: ScoredEntry[];
}) {
	const timesByMonthUser = new Map<string, Map<string, string[]>>();
	for (const e of entries) {
		const m = timesByMonthUser.get(e.monthKey) ?? new Map();
		const arr = m.get(e.user) ?? [];
		arr.push(e.localTime);
		m.set(e.user, arr);
		timesByMonthUser.set(e.monthKey, m);
	}

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

	return (
		<div className="border border-border bg-background/40 p-4">
			<svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Monthly message counts and share percentages">
				<YearMarks monthKeys={data.map((d) => d.monthKey)} PAD={PAD} W={W} H={H} />
				<line x1={PAD} y1={baselineTop} x2={W - PAD} y2={baselineTop} stroke="var(--border)" strokeWidth={0.5} />
				<line x1={PAD} y1={baselineBot} x2={W - PAD} y2={baselineBot} stroke="var(--border)" strokeWidth={0.5} />

				<text x={PAD} y={PAD - 14} textAnchor="start" className="font-mono" fontSize={7} fill="var(--muted)">counts</text>
				<text x={PAD} y={baselineBot + 8} textAnchor="start" className="font-mono" fontSize={7} fill="var(--muted)">share %</text>
				{[0, 0.5, 1].map((f) => {
					const gy = yCount(f * maxCount);
					return (
						<g key={`ct-${f}`}>
							<line x1={PAD} y1={gy} x2={W - PAD} y2={gy} stroke="var(--border)" strokeWidth={0.25} strokeDasharray="2 2" />
							{f > 0 && (
								<text x={PAD - 4} y={gy + 3} textAnchor="end" className="font-mono" fontSize={8} fill="var(--muted)">
									{Math.round(f * maxCount)}
								</text>
							)}
						</g>
					);
				})}
				{[0, 0.5, 1].map((f) => {
					const gy = yPct(f);
					return (
						<g key={`pc-${f}`}>
							{f > 0 && f < 1 && (
								<line x1={PAD} y1={gy} x2={W - PAD} y2={gy} stroke="var(--border)" strokeWidth={0.25} strokeDasharray="2 2" />
							)}
							<text x={W - PAD + 4} y={gy + 3} textAnchor="start" className="font-mono" fontSize={8} fill="var(--muted)">
								{Math.round(f * 100)}%
							</text>
						</g>
					);
				})}

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
			</svg>
			<Legend users={users} />
		</div>
	);
}
