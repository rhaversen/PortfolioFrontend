export function NextRare({
	next,
}: {
	next: { time: string; pattern: string; inMin: number } | null;
}) {
	if (!next) return null;
	return (
		<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-border bg-background/40 px-4 py-3">
			<div className="min-w-0">
				<span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
					Next rare skumfidus
				</span>
				<div className="mt-1 flex items-baseline gap-2">
					<span className="font-mono text-2xl tabular-nums">{next.time}</span>
					<span className="font-mono text-xs text-muted">{next.pattern}</span>
				</div>
			</div>
			<div className="text-right">
				<span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">in</span>
				<div className="font-mono text-2xl tabular-nums">
					{Math.floor(next.inMin / 60)}h {next.inMin % 60}m
				</div>
			</div>
		</div>
	);
}
