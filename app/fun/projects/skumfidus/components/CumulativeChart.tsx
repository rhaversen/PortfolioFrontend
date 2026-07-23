import { strokeFor, firstName } from "../useSkumfidusData";
import { ChartFrame, Legend, GridLines, YearMarks, yearMarksFromTime } from "./charts";

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

	const yearMarks = yearMarksFromTime(tMin, tMax, tRange, PAD, W - PAD * 2);

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
		<div className="space-y-3">
			<ChartFrame W={W} H={H} ariaLabel="Cumulative skumfidus score over time">
				<GridLines
					fractions={[0, 0.25, 0.5, 0.75, 1]}
					x1={PAD}
					x2={W - PAD}
					y={(f) => y(f * sMax)}
					labelAt="left"
					labelFormatter={(f) => String(Math.round(f * sMax))}
				/>
				<YearMarks marks={yearMarks} topY={PAD} botY={H - PAD} />
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
			</ChartFrame>
			<Legend users={users} />
			<div>
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
