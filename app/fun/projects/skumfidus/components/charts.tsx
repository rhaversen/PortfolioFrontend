import { strokeFor, firstName } from "../useSkumfidusData";

export function ChartFrame({
	W,
	H,
	ariaLabel,
	children,
}: {
	W: number;
	H: number;
	ariaLabel: string;
	children: React.ReactNode;
}) {
	return (
		<div className="border border-border bg-background/40 p-4 overflow-x-auto">
			<svg viewBox={`0 0 ${W} ${H}`} className="h-auto block" style={{ width: "100%", minWidth: W }} role="img" aria-label={ariaLabel}>
				{children}
			</svg>
		</div>
	);
}

export function Legend({ users }: { users: string[] }) {
	return (
		<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
			{users.map((u) => (
				<span key={u} className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[0.6rem] text-muted">
					<span className="inline-block h-2 w-4" style={{ background: strokeFor(u) }} />
					{firstName(u)}
				</span>
			))}
		</div>
	);
}

export type YearMark = { midX: number; boundaryX: number | null; label: string };

export function yearMarksFromMonths(monthKeys: string[], PAD: number, W: number): YearMark[] {
	const yearStarts: number[] = [];
	let curYear: number | null = null;
	let startIdx = 0;
	for (let i = 0; i <= monthKeys.length; i++) {
		const yr = i < monthKeys.length ? Number(monthKeys[i].slice(0, 4)) : null;
		if (yr !== curYear) {
			if (curYear !== null) yearStarts.push(startIdx);
			curYear = yr;
			startIdx = i;
		}
	}

	const numYears = yearStarts.length;
	const chartW = W - PAD * 2;
	const yearW = numYears > 0 ? chartW / numYears : chartW;

	const out: YearMark[] = [];
	for (let yi = 0; yi < numYears; yi++) {
		const yr = Number(monthKeys[yearStarts[yi]].slice(0, 4));
		out.push({
			midX: PAD + yi * yearW + yearW / 2,
			boundaryX: yi > 0 ? PAD + yi * yearW : null,
			label: String(yr),
		});
	}
	return out;
}

export function yearMarksFromTime(t0: number, t1: number, span: number, PAD: number, plotW: number): YearMark[] {
	const out: YearMark[] = [];
	const startY = new Date(t0).getUTCFullYear();
	const endY = new Date(t1).getUTCFullYear();
	for (let yr = startY; yr <= endY; yr++) {
		const yStart = Date.UTC(yr, 0, 1);
		const yEnd = Date.UTC(yr + 1, 0, 1);
		const lo = Math.max(yStart, t0);
		const hi = Math.min(yEnd, t1);
		const midT = (lo + hi) / 2;
		out.push({
			midX: PAD + ((midT - t0) / span) * plotW,
			boundaryX: yr > startY ? PAD + ((yStart - t0) / span) * plotW : null,
			label: String(yr),
		});
	}
	return out;
}

export function YearMarks({
	marks,
	topY,
	botY,
}: {
	marks: YearMark[];
	topY: number;
	botY: number;
}) {
	return (
		<>
			{marks.map((y) => (
				<g key={y.label}>
					{y.boundaryX !== null && (
						<line x1={y.boundaryX} y1={topY} x2={y.boundaryX} y2={botY} stroke="var(--foreground)" strokeWidth={0.5} opacity={0.3} />
					)}
					<text x={y.midX} y={topY - 4} textAnchor="middle" className="font-mono" fontSize={8} fill="var(--muted)">
						{y.label}
					</text>
				</g>
			))}
		</>
	);
}

export function GridLines({
	fractions,
	x1,
	x2,
	y,
	dash = false,
	labelAt,
	labelFormatter,
}: {
	fractions: number[];
	x1: number;
	x2: number;
	y: (f: number) => number;
	dash?: boolean;
	labelAt?: "left" | "right";
	labelFormatter?: (f: number) => string;
}) {
	return (
		<>
			{fractions.map((f) => {
				const gy = y(f);
				return (
					<g key={f}>
						<line
							x1={x1}
							y1={gy}
							x2={x2}
							y2={gy}
							stroke="var(--border)"
							strokeWidth={0.5}
							{...(dash ? { strokeDasharray: "2 2" } : {})}
						/>
						{labelAt && labelFormatter && (
							<text
								x={labelAt === "left" ? x1 - 4 : x2 + 4}
								y={gy + 3}
								textAnchor={labelAt === "left" ? "end" : "start"}
								className="font-mono"
								fontSize={8}
								fill="var(--muted)"
							>
								{labelFormatter(f)}
							</text>
						)}
					</g>
				);
			})}
		</>
	);
}

