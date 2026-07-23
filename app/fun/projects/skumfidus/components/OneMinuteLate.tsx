import type { OneMinuteLate as Item } from "../types";
import { colorFor, firstName, strokeFor } from "../useSkumfidusData";
import { ChartFrame, Legend, GridLines, YearMarks, yearMarksFromTime } from "./charts";

export function OneMinuteLatePanel({ items, users }: { items: Item[]; users: string[] }) {
	if (items.length === 0) {
		return (
			<p className="text-xs text-muted">None — nobody missed a skumfidus by one minute.</p>
		);
	}

	const byUser = users.map((u) => items.filter((it) => it.user === u).length);
	const maxScore = Math.max(...items.map((it) => it.prevScore), 1);

	const t0 = items[0].miss.date.getTime();
	const t1 = items[items.length - 1].miss.date.getTime();
	const span = Math.max(1, t1 - t0);

	const W = 600;
	const H = 140;
	const PAD = 32;
	const plotW = W - PAD * 2;
	const plotH = H - PAD - 12;
	const yearMarks = yearMarksFromTime(t0, t1, span, PAD, plotW);

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-3 border border-border divide-x divide-border">
				<div className="px-3 py-2">
					<div className="font-mono text-[0.6rem] uppercase tracking-widest text-muted">One min late</div>
					<div className="mt-1 font-mono text-sm tabular-nums">{items.length}</div>
				</div>
				{users.map((u, ui) => (
					<div key={u} className="px-3 py-2">
						<div className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted">
							<span className={`inline-block h-2 w-2 ${colorFor(u)}`} />
							{firstName(u)}
					</div>
					<div className="mt-1 font-mono text-sm tabular-nums">{byUser[ui]}</div>
					</div>
				)).slice(0, 2)}
			</div>

			<div className="space-y-3">
				<ChartFrame W={W} H={H} ariaLabel="One minute late events over time">
					<GridLines
						fractions={[0, 0.5, 1]}
						x1={PAD}
						x2={W - PAD}
						y={(f) => H - PAD - f * plotH}
						dash={false}
						labelAt="left"
						labelFormatter={(f) => String(Math.round(f * maxScore))}
					/>
					<text x={PAD - 4} y={H - PAD + 10} textAnchor="end" className="font-mono" fontSize={7} fill="var(--muted)">0</text>
					<line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth={0.5} />
					<YearMarks marks={yearMarks} topY={PAD} botY={H - PAD} />
					{items.map((it, i) => {
						const x = PAD + ((it.miss.date.getTime() - t0) / span) * plotW;
						const barH = (it.prevScore / maxScore) * plotH;
						const y = H - PAD - barH;
						return (
							<g key={i}>
								<rect x={x - 1.5} y={y} width={3} height={barH} fill={strokeFor(it.user)} opacity={0.85}>
									<title>{`${it.miss.localDate} ${it.missTime} — ${firstName(it.user)}\nmissed ${it.prevTime} (score ${it.prevScore})\ngot ${it.missTime} (score ${it.missScore})`}</title>
								</rect>
								<circle cx={x} cy={y} r={2} fill={strokeFor(it.user)} />
							</g>
					);
					})}

					<text x={W / 2} y={H - 2} textAnchor="middle" className="font-mono" fontSize={7} fill="var(--muted)">
						bar height = missed score
					</text>
				</ChartFrame>
				<Legend users={users} />
			</div>

			<div className="flex w-fit mx-auto gap-x-12 font-mono text-[0.65rem] tabular-nums">
				{[items.slice(0, Math.ceil(items.length / 2)), items.slice(Math.ceil(items.length / 2))].map((half, hi) => (
					<div
						key={hi}
						className="grid gap-x-6 gap-y-0.5"
						style={{ gridTemplateColumns: "max-content max-content max-content max-content" }}
					>
						<span className="text-muted">date</span>
						<span className="text-muted">who</span>
						<span className="text-muted">miss</span>
						<span className="text-muted">prev</span>
						{half.map((it, i) => (
							<Row key={i} it={it} />
						))}
					</div>
				))}
			</div>
		</div>
	);
}

function Row({ it }: { it: Item }) {
	return (
		<>
			<span className="text-foreground/80">{it.miss.localDate}</span>
			<span style={{ color: strokeFor(it.user) }}>{firstName(it.user)}</span>
			<span className="text-muted">{it.missTime}</span>
			<span className="text-accent">{it.prevTime}</span>
		</>
	);
}
