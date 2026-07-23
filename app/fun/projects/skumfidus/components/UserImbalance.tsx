import { useMemo } from "react";
import { pad2, firstName, strokeFor } from "../useSkumfidusData";

type Imbalance = {
	h: number;
	m: number;
	time: string;
	total: number;
	userCounts: number[];
	dominantUser: string;
	dominantCount: number;
	otherCount: number;
	ratio: number;
};

export function UserImbalance({
	heatmaps,
	users,
}: {
	heatmaps: number[][][];
	users: string[];
}) {
	const items = useMemo(() => {
		if (users.length < 2) return [];
		const out: Imbalance[] = [];
		for (let h = 0; h < 24; h++) {
			for (let m = 0; m < 60; m++) {
				const counts = users.map((_, ui) => heatmaps[ui]?.[h]?.[m] ?? 0);
				const total = counts.reduce((s, c) => s + c, 0);
				if (total < 3) continue;
				const maxCount = Math.max(...counts);
				const dominantIdx = counts.indexOf(maxCount);
				const otherCount = total - maxCount;
				if (otherCount >= maxCount) continue;
				const ratio = total > 0 ? maxCount / total : 0;
				if (ratio < 0.75) continue;
				out.push({
					h,
					m,
					time: `${pad2(h)}:${pad2(m)}`,
					total,
					userCounts: counts,
					dominantUser: users[dominantIdx],
					dominantCount: maxCount,
					otherCount,
					ratio,
				});
			}
		}
		out.sort((a, b) => {
			if (a.ratio !== b.ratio) return b.ratio - a.ratio;
			if (a.dominantCount !== b.dominantCount) return b.dominantCount - a.dominantCount;
			return a.time.localeCompare(b.time);
		});
		return out;
	}, [heatmaps, users]);

	const top = items.slice(0, 60);

	if (top.length === 0) return null;

	return (
		<div className="space-y-2">
			<div
				className="grid w-fit mx-auto gap-x-3 gap-y-0.5 font-mono text-[0.65rem] tabular-nums"
				style={{ gridTemplateColumns: "max-content max-content max-content max-content" }}
			>
				<span className="text-muted">time</span>
				<span className="text-muted">total</span>
				<span className="text-muted">split</span>
				<span className="text-muted">dominance</span>
				{top.map((t) => (
					<Row key={t.time} t={t} users={users} />
				))}
			</div>
		</div>
	);
}

function Row({ t, users }: { t: Imbalance; users: string[] }) {
	return (
		<>
			<span className="text-foreground/80">{t.time}</span>
			<span className="text-foreground/80">{t.total}</span>
			<span className="flex items-center gap-1.5">
				{users.map((u, ui) => (
					<span key={u} style={{ color: strokeFor(u) }}>
						{firstName(u)}:{t.userCounts[ui]}
					</span>
				))}
			</span>
			<span className="flex items-center gap-1.5">
				<span style={{ color: strokeFor(t.dominantUser) }}>
					{firstName(t.dominantUser)} {Math.round(t.ratio * 100)}%
				</span>
				<span
					className="inline-block h-2"
					style={{
						width: `${Math.round(t.ratio * 60)}px`,
						background: strokeFor(t.dominantUser),
					}}
				/>
			</span>
		</>
	);
}
