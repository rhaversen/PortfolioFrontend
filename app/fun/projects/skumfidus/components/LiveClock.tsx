import { scoreTier, type TimeAnalysis } from "../patterns";
import { pad2 } from "../useSkumfidusData";

export function LiveClock({
	now,
	analysis,
}: {
	now: Date;
	analysis: TimeAnalysis;
}) {
	const tier = scoreTier(analysis.score);
	const formatHM = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
	const formatSeconds = (d: Date) => pad2(d.getSeconds());

	return (
		<div className="border border-border bg-background/40 p-4 sm:p-5">
			<div className="flex items-baseline justify-between gap-4">
				<span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">Live</span>
			</div>
			<div className="mt-2 flex items-baseline justify-between gap-4">
				<div className="flex-1 min-w-0 flex items-baseline gap-1.5">
					<span className="font-mono text-4xl sm:text-5xl tabular-nums tracking-tight">
						{formatHM(now)}
					</span>
					<span className="font-mono text-xl sm:text-2xl tabular-nums tracking-tight text-muted/50">
						:{formatSeconds(now)}
					</span>
				</div>
				<span className={`flex-1 min-w-0 text-right font-mono text-3xl sm:text-4xl tracking-tight ${tier.tone}`}>
					{tier.label}
				</span>
			</div>
			{analysis.matched.length > 0 ? (
				<div className="mt-3 flex flex-wrap gap-1.5">
					{analysis.matched.map((p) => (
						<span
							key={p.symbol}
							className="border border-border bg-card/60 px-2 py-0.5 font-mono text-xs"
						>
							{p.symbol}
						</span>
					))}
				</div>
			) : (
				<p className="mt-3 font-mono text-xs text-muted">No pattern — just a regular minute.</p>
			)}
		</div>
	);
}
