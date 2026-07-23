import { strokeFor, firstName, formatTimes } from "../useSkumfidusData";
import type { ScoredEntry } from "../types";
import { Legend, YearMarks } from "./ui";

export function MonthlyAvgChart({
	data,
	users,
	entries,
}: {
	data: { monthKey: string; byUser: number[]; counts: number[] }[];
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

	return (
		<div className="border border-border bg-background/40 p-4">
			<svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Skumfidus count and average score by month">
				<YearMarks monthKeys={data.map((d) => d.monthKey)} PAD={PAD} W={W} H={H} />
				<line x1={PAD} y1={baselineTop} x2={W - PAD} y2={baselineTop} stroke="var(--border)" strokeWidth={0.5} />
				<line x1={PAD} y1={baselineBot} x2={W - PAD} y2={baselineBot} stroke="var(--border)" strokeWidth={0.5} />

				<text x={PAD} y={PAD - 14} textAnchor="start" className="font-mono" fontSize={7} fill="var(--muted)">count</text>
				<text x={PAD} y={baselineBot + 8} textAnchor="start" className="font-mono" fontSize={7} fill="var(--muted)">avg score</text>
				{[0, 0.5, 1].map((f) => {
					const gyCount = yCount(f * maxCount);
					const gyAvg = yAvg(f * maxAvg);
					return (
						<g key={f}>
							<line x1={PAD} y1={gyCount} x2={W - PAD} y2={gyCount} stroke="var(--border)" strokeWidth={0.25} strokeDasharray="2 2" />
							{f > 0 && (
								<text x={PAD - 4} y={gyCount + 3} textAnchor="end" className="font-mono" fontSize={8} fill="var(--muted)">
									{Math.round(f * maxCount)}
								</text>
							)}
							<line x1={PAD} y1={gyAvg} x2={W - PAD} y2={gyAvg} stroke="var(--border)" strokeWidth={0.25} strokeDasharray="2 2" />
							{f > 0 && (
								<text x={W - PAD + 4} y={gyAvg + 3} textAnchor="start" className="font-mono" fontSize={8} fill="var(--muted)">
									{Math.round(f * maxAvg)}
								</text>
							)}
						</g>
					);
				})}

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
			</svg>

			<Legend users={users} />
		</div>
	);
}
