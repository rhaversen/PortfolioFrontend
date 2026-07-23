import { pad2, firstName } from "../useSkumfidusData";
import { TIER_DEFS, ANALYSIS_GRID, TIER_GRID } from "../patterns";

const HEAT_HUES = ["rgba(255, 0, 0, ", "rgba(0, 255, 0, ", "rgba(0, 0, 255, "];

function heatmapTooltip(h: number, mi: number, v: number, users?: string[], perUser?: number[][][]): string {
	const a = ANALYSIS_GRID[h][mi];
	const lines = [`${pad2(h)}:${pad2(mi)} — score ${a.score}, ${v} messages`];
	if (users && perUser) {
		for (let i = 0; i < users.length; i++) {
			const c = perUser[i][h][mi];
			if (c > 0) lines.push(`  ${firstName(users[i])}: ${c}`);
		}
	}
	if (a.matched.length > 0) {
		for (const p of a.matched) {
			lines.push(`${p.name} (${p.symbol})`);
		}
	}
	return lines.join("\n");
}

function HeatmapGrid({
	grid,
	maxHeat,
	users,
	perUser,
}: {
	grid: number[][];
	maxHeat: number;
	users?: string[];
	perUser?: number[][][];
}) {
	const cellSize = 8;
	const cellGap = 0;
	const gridW = 60 * (cellSize + cellGap);
	const gridH = 24 * (cellSize + cellGap);

	const heatColor = (v: number, h: number, mi: number) => {
		if (v === 0) return "var(--background)";
		const opacity = Math.max(0.15, v / maxHeat);
		return `${HEAT_HUES[TIER_GRID[h][mi]]}${opacity})`;
	};

	const tierBorder = (h: number, mi: number) => {
		const tier = TIER_GRID[h][mi];
		if (tier <= 0) return "rgba(0, 0, 0, 0.1)";
		return `${HEAT_HUES[tier]}0.5)`;
	};

	const labelW = 24;
	const topPad = 10;
	const svgW = labelW + gridW;
	const svgH = topPad + gridH;

	return (
		<div className="overflow-x-auto">
			<svg
				viewBox={`0 0 ${svgW} ${svgH}`}
				className="block h-auto"
				style={{ width: svgW, minWidth: svgW }}
				role="img"
				aria-label="Time of day heatmap (hour vs minute)"
			>
				{/* minute labels */}
				{Array.from({ length: 60 }, (_, m) => m).map((m) =>
					m % 2 === 0 ? (
						<text
							key={m}
							x={labelW + m * (cellSize + cellGap) + cellSize / 2}
							y={topPad - 2}
							textAnchor="middle"
							className="font-mono"
							fontSize={6}
							fill="var(--muted)"
						>
							{pad2(m)}
						</text>
					) : null,
				)}
				{/* hour labels */}
				{Array.from({ length: 24 }, (_, h) => (
					<text
						key={h}
						x={labelW - 2}
						y={topPad + h * (cellSize + cellGap) + cellSize / 2 + 2}
						textAnchor="end"
						className="font-mono"
						fontSize={6}
						fill="var(--muted)"
					>
						{pad2(h)}
					</text>
				))}
				{/* cells */}
				{grid.map((row, h) =>
					row.map((v, mi) => (
						<rect
							key={`${h}-${mi}`}
							x={labelW + mi * (cellSize + cellGap)}
							y={topPad + h * (cellSize + cellGap)}
							width={cellSize}
							height={cellSize}
							fill={heatColor(v, h, mi)}
							stroke={tierBorder(h, mi)}
							strokeWidth={0.3}
						>
							<title>{heatmapTooltip(h, mi, v, users, perUser)}</title>
						</rect>
					)),
				)}
			</svg>
		</div>
	);
}

export function Heatmap({
	grid,
	maxHeat,
	heatmaps,
	maxHeats,
	users,
}: {
	grid: number[][];
	maxHeat: number;
	heatmaps: number[][][];
	maxHeats: number[];
	users: string[];
}) {
	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
				{TIER_DEFS.map((t, i) => (
					<span key={t.label} className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[0.6rem] text-muted">
						<span className="inline-block h-2.5 w-2.5" style={{ background: `${HEAT_HUES[i]}1)` }} />
						{t.label}
					</span>
				))}
				<span className="font-mono text-[0.6rem] text-muted">· brightness = message count</span>
			</div>
			<div>
				<p className="mb-1 font-mono text-[0.65rem] uppercase tracking-widest text-muted">Combined</p>
				<HeatmapGrid grid={grid} maxHeat={maxHeat} users={users} perUser={heatmaps} />
			</div>
			<div className="grid grid-cols-1 gap-4">
				{users.map((u, i) => (
					<div key={u}>
						<p className="mb-1 font-mono text-[0.65rem] uppercase tracking-widest text-muted">{firstName(u)}</p>
						<HeatmapGrid grid={heatmaps[i]} maxHeat={maxHeats[i]} />
					</div>
				))}
			</div>
		</div>
	);
}
