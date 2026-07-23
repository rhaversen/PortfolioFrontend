import { Section } from "./ui";

export function UpcomingRare({
	items,
}: {
	items: { time: string; patterns: string[]; counts: number[]; inMin: number; score: number }[];
}) {
	return (
		<Section
			title="Upcoming skumfidus times"
			subtitle="The next 5 skumfidus windows. Higher score = rarer pattern."
		>
			{items.length > 0 ? (
				<ul className="divide-y divide-border border border-border bg-background/40">
					{items.map((item, i) => {
						const rare = item.score >= 100;
						return (
							<li key={i} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 ${rare ? "border border-accent bg-accent/8" : ""}`}>
								<span className="flex items-baseline gap-2">
									<span className={`font-mono text-base tabular-nums ${rare ? "text-accent" : ""}`}>{item.time}</span>
									{rare && <span className="font-mono text-[0.6rem] uppercase tracking-widest text-accent">Rare!</span>}
								</span>
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-mono text-xs text-muted">
										{item.patterns.map((sym, j) => (
											<span key={j} className="inline-flex items-baseline gap-1">
												{j > 0 && <span className="text-muted/50"> · </span>}
												<span>{sym}</span>
												<span className="text-muted/60 text-[0.6rem]">{item.counts[j]}/day</span>
											</span>
										))}
									</span>
									<span className="font-mono text-xs text-muted tabular-nums w-16 pl-4 text-left">
										{Math.floor(item.inMin / 60)}h {item.inMin % 60}m
									</span>
								</div>
							</li>
						);
					})}
				</ul>
			) : (
				<p className="font-mono text-xs text-muted">
					No skumfidus times in the next 24h.
				</p>
			)}
		</Section>
	);
}
