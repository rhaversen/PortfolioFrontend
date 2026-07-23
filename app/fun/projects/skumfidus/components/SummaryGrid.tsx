import { Stat } from "./ui";

export function SummaryGrid({
	total,
	totalScore,
	missTotal,
	noveltyTotal,
}: {
	total: number;
	totalScore: number;
	missTotal: number;
	noveltyTotal: number;
}) {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 border border-border divide-x divide-border">
			<Stat label="Messages" value={String(total)} />
			<Stat label="Total score" value={totalScore.toFixed(0)} />
			<Stat label="Misses" value={`${missTotal} (${total > 0 ? ((missTotal / total) * 100).toFixed(0) : 0}%)`} />
			<Stat label="With commentary" value={`${noveltyTotal} (${total > 0 ? ((noveltyTotal / total) * 100).toFixed(0) : 0}%)`} />
		</div>
	);
}
