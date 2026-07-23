import { TIER_DEFS } from "../patterns";
import { firstName, strokeFor } from "../useSkumfidusData";
import type { UnderutilizedTime, SkumfidusData } from "../types";

export function UnderutilizedTimes({
	items,
	users,
}: {
	items: SkumfidusData["underutilized"];
	users: string[];
}) {
	const top = items.slice(0, 60);

	if (top.length === 0) return null;

	const maxCount = Math.max(...top.map((t) => t.count), 1);

	return (
		<div className="space-y-2">
			<div
				className="grid w-fit mx-auto gap-x-6 gap-y-0.5 font-mono text-[0.65rem] tabular-nums"
			style={{ gridTemplateColumns: "max-content max-content max-content max-content max-content max-content max-content" }}
		>
			<span className="text-muted">time</span>
			<span className="text-muted">score</span>
			<span className="text-muted">tier</span>
			<span className="text-muted">msgs</span>
			<span className="text-muted">bar</span>
				<span className="text-muted">who</span>
				<span className="text-muted">patterns</span>
				{top.map((t) => (
					<Row key={t.time} t={t} maxCount={maxCount} users={users} />
				))}
			</div>
		</div>
	);
}

function Row({ t, maxCount, users }: { t: UnderutilizedTime; maxCount: number; users: string[] }) {
	const tierColor = TIER_DEFS[t.tier]?.color ?? "var(--muted)";
	const barW = maxCount > 0 ? Math.max(2, Math.round((t.count / maxCount) * 60)) : 0;
	return (
		<>
			<span className="text-foreground/80">{t.time}</span>
			<span style={{ color: tierColor }}>{t.score}</span>
			<span className="text-muted">{TIER_DEFS[t.tier]?.label ?? ""}</span>
			<span className="text-foreground/80">{t.count}</span>
			<span className="flex items-center">
				<span className="inline-block h-2 bg-border" style={{ width: `${barW}px` }} />
			</span>
			<span className="flex items-center gap-1.5">
				{users.map((u, ui) => (
					t.userCounts[ui] > 0 ? (
						<span key={u} className="flex items-center gap-0.5" style={{ color: strokeFor(u) }}>
							{firstName(u)}:{t.userCounts[ui]}
						</span>
					) : null
				))}
				{t.count === 0 && <span className="text-muted">—</span>}
			</span>
			<span className="text-muted truncate max-w-xs">{t.patterns.join(", ")}</span>
		</>
	);
}
