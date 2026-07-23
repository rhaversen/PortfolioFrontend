import { strokeFor, firstName } from "../useSkumfidusData";
import { Legend } from "./ui";

type Lead = {
	user: string;
	startIdx: number;
	endIdx: number;
};

export function CumulativeChart({
	points,
	users,
}: {
	points: { t: number; scores: number[] }[];
	users: string[];
}) {
	const W = 600;
	const H = 220;
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

	const yearMarks = (() => {
		const startYear = new Date(tMin).getFullYear();
		const endYear = new Date(tMax).getFullYear();
		const years: { midX: number; boundaryX: number | null; label: string }[] = [];
		for (let yr = startYear; yr <= endYear; yr++) {
			const yearStart = new Date(yr, 0, 1).getTime();
			const yearEnd = new Date(yr + 1, 0, 1).getTime();
			const clampedStart = Math.max(yearStart, tMin);
			const clampedEnd = Math.min(yearEnd, tMax);
			years.push({
				midX: x((clampedStart + clampedEnd) / 2),
				boundaryX: yearStart > tMin ? x(yearStart) : null,
				label: String(yr),
			});
		}
		return years;
	})();

	const leads = (() => {
		const out: Lead[] = [];
		let curLeader: string | null = null;
		let startIdx = 0;
		for (let i = 0; i < points.length; i++) {
			const p = points[i];
			let leader: string | null = null;
			let best = -1;
			for (let ui = 0; ui < users.length; ui++) {
				if (p.scores[ui] > best) {
					best = p.scores[ui];
					leader = users[ui];
				}
			}
			if (leader !== curLeader) {
				if (curLeader !== null) {
					out.push({ user: curLeader, startIdx, endIdx: i - 1 });
				}
				curLeader = leader;
				startIdx = i;
			}
		}
		if (curLeader !== null) {
			out.push({ user: curLeader, startIdx, endIdx: points.length - 1 });
		}
		return out;
	})();

	return (
		<div className="border border-border bg-background/40 p-4">
			<svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Cumulative skumfidus score over time">
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
				{yearMarks.map((y) => (
					<g key={y.label}>
						{y.boundaryX !== null && (
							<line x1={y.boundaryX} y1={PAD} x2={y.boundaryX} y2={H - PAD} stroke="var(--foreground)" strokeWidth={0.5} opacity={0.3} />
						)}
						<text x={y.midX} y={PAD - 4} textAnchor="middle" className="font-mono" fontSize={8} fill="var(--muted)">
							{y.label}
						</text>
					</g>
				))}
				{leads.map((lead, i) => {
					const x1 = x(points[lead.startIdx].t);
					const x2 = i < leads.length - 1 ? x(points[leads[i + 1].startIdx].t) : x(points[lead.endIdx].t);
					const durMs = points[lead.endIdx].t - points[lead.startIdx].t;
					const durDays = Math.round(durMs / 86400000);
					return (
						<rect
							key={`ll-${i}`}
							x={x1}
							y={H - PAD + 16}
							width={Math.max(0.5, x2 - x1)}
							height={1.5}
							fill={strokeFor(lead.user)}
						>
							<title>{`${firstName(lead.user)} led for ${durDays}d (${new Date(points[lead.startIdx].t).toISOString().slice(0, 10)} → ${new Date(points[lead.endIdx].t).toISOString().slice(0, 10)})`}</title>
						</rect>
					);
				})}
				<text x={PAD} y={H - PAD + 12} textAnchor="start" className="font-mono" fontSize={6} fill="var(--muted)">Leader</text>
				{paths.map((p) => (
					<path key={p.user} d={p.d} fill="none" stroke={strokeFor(p.user)} strokeWidth={1.5} />
				))}
			</svg>
			<Legend users={users} />
			<div className="mt-3">
				<div className="font-mono text-[0.6rem] uppercase tracking-widest text-muted">Lead history</div>
				<div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.6rem] text-muted">
					{leads.map((lead, i) => {
						const durMs = points[lead.endIdx].t - points[lead.startIdx].t;
						const durDays = Math.round(durMs / 86400000);
						const startDate = new Date(points[lead.startIdx].t).toISOString().slice(0, 10);
						const endDate = new Date(points[lead.endIdx].t).toISOString().slice(0, 10);
						return (
							<span key={i} className="flex items-center gap-1.5">
								<span className="inline-block h-2.5 w-2.5" style={{ background: strokeFor(lead.user) }} />
								{firstName(lead.user)} — {durDays}d ({startDate} → {endDate})
							</span>
						);
					})}
				</div>
			</div>
		</div>
	);
}
