import { Fragment } from "react";
import type { NoveltyStats } from "../types";
import { colorFor, firstName } from "../useSkumfidusData";

export function NoveltyPanel({ noveltyStats }: { noveltyStats: NoveltyStats[] }) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			{noveltyStats.map((ns) => (
				<div key={ns.user} className="border border-border bg-background/40 p-3 space-y-2">
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-2 font-mono text-xs">
							<span className={`inline-block h-2.5 w-2.5 ${colorFor(ns.user)}`} />
							{firstName(ns.user)}
						</span>
						<span className="font-mono text-xs tabular-nums">
							{ns.novelCount} / {ns.total} ({(ns.novelRate * 100).toFixed(0)}%)
						</span>
					</div>
					{ns.messages.length > 0 && (
						<div className="max-h-96 overflow-y-auto grid gap-x-2 gap-y-0.5 font-mono text-[0.65rem]" style={{ gridTemplateColumns: "max-content max-content max-content 1fr" }}>
							{ns.messages.map((m, i) => (
								<Fragment key={i}>
									<span className="text-muted tabular-nums whitespace-nowrap">{m.localDate}</span>
									<span className="text-accent tabular-nums whitespace-nowrap">{m.localTime}</span>
									<span className="text-muted tabular-nums whitespace-nowrap">score {m.score}</span>
									<span className="truncate" title={m.message}>&ldquo;{m.message}&rdquo;</span>
								</Fragment>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}
