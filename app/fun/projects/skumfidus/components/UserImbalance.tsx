import { firstName, strokeFor } from "../useSkumfidusData";
import type { UserImbalanceTime, SkumfidusData } from "../types";

export function UserImbalance({
	items,
	users,
}: {
	items: SkumfidusData["imbalance"];
	users: string[];
}) {
	const top = items.slice(0, 60);

	if (top.length === 0) return null;

	return (
		<div className="space-y-2">
			<div
				className="grid w-fit mx-auto gap-x-6 gap-y-0.5 font-mono text-[0.65rem] tabular-nums"
				style={{ gridTemplateColumns: "max-content max-content max-content max-content max-content" }}
			>
				<span className="text-muted">time</span>
				<span className="text-muted">total</span>
				<span className="text-muted">split</span>
				<span className="text-muted">dominance</span>
				<span className="text-muted">bar</span>
				{top.map((t) => (
					<Row key={t.time} t={t} users={users} />
				))}
			</div>
		</div>
	);
}

function Row({ t, users }: { t: UserImbalanceTime; users: string[] }) {
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
			<span style={{ color: strokeFor(t.dominantUser) }}>
				{firstName(t.dominantUser)} {Math.round(t.ratio * 100)}%
			</span>
			<span className="flex items-center">
				<span
					className="inline-block h-2"
					style={{
						width: `${Math.max(2, Math.round(t.ratio * 60))}px`,
						background: strokeFor(t.dominantUser),
					}}
				/>
			</span>
		</>
	);
}
