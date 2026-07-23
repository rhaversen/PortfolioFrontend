import { colorFor, strokeFor, firstName } from "../useSkumfidusData";

export function Section({ title, children, subtitle }: { title: string; children: React.ReactNode; subtitle?: string }) {
	return (
		<div className="space-y-3">
			<h3 className="font-mono text-sm uppercase tracking-widest text-muted">{title}</h3>
			{subtitle && <p className="text-xs text-muted">{subtitle}</p>}
			{children}
		</div>
	);
}

export function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="px-3 py-2">
			<div className="font-mono text-[0.6rem] uppercase tracking-widest text-muted">{label}</div>
			<div className="mt-1 font-mono text-sm tabular-nums">{value}</div>
		</div>
	);
}

export function Legend({ users }: { users: string[] }) {
	return (
		<div className="mt-3 flex items-center gap-4">
			{users.map((u) => (
				<span key={u} className="flex items-center gap-1.5 font-mono text-[0.6rem] text-muted">
					<span className="inline-block h-2 w-4" style={{ background: strokeFor(u) }} />
					{firstName(u)}
				</span>
			))}
		</div>
	);
}

export function UserDot({ user }: { user: string }) {
	return <span className={`inline-block h-2.5 w-2.5 ${colorFor(user)}`} />;
}

export function YearMarks({
	monthKeys,
	PAD,
	W,
	H,
}: {
	monthKeys: string[];
	PAD: number;
	W: number;
	H: number;
}) {
	const years: { midX: number; boundaryX: number | null; label: string }[] = [];
	let curYear: number | null = null;
	let startIdx = 0;
	const yearStarts: number[] = [];
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

	for (let yi = 0; yi < numYears; yi++) {
		const yr = Number(monthKeys[yearStarts[yi]].slice(0, 4));
		years.push({
			midX: PAD + yi * yearW + yearW / 2,
			boundaryX: yi > 0 ? PAD + yi * yearW : null,
			label: String(yr),
		});
	}

	return (
		<>
			{years.map((y) => (
				<g key={y.label}>
					{y.boundaryX !== null && (
						<line
							x1={y.boundaryX}
							y1={PAD}
							x2={y.boundaryX}
							y2={H - PAD}
							stroke="var(--foreground)"
							strokeWidth={0.5}
							opacity={0.3}
						/>
					)}
					<text x={y.midX} y={PAD - 4} textAnchor="middle" className="font-mono" fontSize={8} fill="var(--muted)">
						{y.label}
					</text>
				</g>
			))}
		</>
	);
}
