import { colorFor, firstName, formatTimes } from "../useSkumfidusData";
import { TIER_DEFS } from "../patterns";
import type { ScoredEntry, TierDistributionData } from "../types";
import { groupTimesByTierUser } from "../utils";
import { Legend } from "./charts";

export function TierDistribution({ tierDist, users, entries }: { tierDist: TierDistributionData; users: string[]; entries: ScoredEntry[] }) {
	const timesByTierUser = groupTimesByTierUser(entries);

	const maxCount = Math.max(...tierDist.combined.map((t) => t.count), 1);

	return (
		<div className="space-y-4">
			<div className="space-y-3">
				<div className="font-mono text-[0.6rem] uppercase tracking-widest text-muted">Count</div>
				{tierDist.combined.map((tier, ti) => {
					const pct = (tier.count / maxCount) * 100;

					return (
						<div key={tier.label} className="flex items-center gap-2 sm:gap-3">
							<div className={`w-20 sm:w-28 shrink-0 font-mono text-xs ${TIER_DEFS[ti].tone}`}>{tier.label}</div>
							<div className="relative h-6 flex-1 bg-background/40 min-w-0">
								<div className="flex h-full" style={{ width: `${pct}%` }}>
									{users.map((u, ui) => {
										const v = tier.byUser[ui];
										if (v === 0) return null;
										const segPct = (v / tier.count) * 100;
										return (
											<div
												key={u}
												className={colorFor(u)}
												style={{ width: `${segPct}%` }}
												title={`${firstName(u)}: ${v}\n${formatTimes(timesByTierUser.get(ti)?.get(u) ?? [])}`}
											/>
										);
									})}
								</div>
							</div>
							<div className="w-10 sm:w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted">{tier.count}</div>
						</div>
					);
				})}
			</div>
			<div className="space-y-3">
				<div className="font-mono text-[0.6rem] uppercase tracking-widest text-muted">Share %</div>
				{tierDist.combined.map((tier, ti) => (
					<div key={tier.label} className="flex items-center gap-2 sm:gap-3">
						<div className={`w-20 sm:w-28 shrink-0 font-mono text-xs ${TIER_DEFS[ti].tone}`}>{tier.label}</div>
						<div className="relative h-6 flex-1 bg-background/40 min-w-0">
							<div className="flex h-full">
								{users.map((u, ui) => {
									const v = tier.byUser[ui];
									if (v === 0) return null;
									const segPct = (v / tier.count) * 100;
									return (
										<div
											key={u}
											className={colorFor(u)}
											style={{ width: `${segPct}%` }}
											title={`${firstName(u)}: ${v} (${segPct.toFixed(0)}%)\n${formatTimes(timesByTierUser.get(ti)?.get(u) ?? [])}`}
										/>
									);
								})}
							</div>
						</div>
						<div className="w-12 sm:w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
							{tier.count > 0 ? `${Math.round((tier.byUser[0] / tier.count) * 100)}/${Math.round((tier.byUser[1] / tier.count) * 100)}` : "—"}
						</div>
					</div>
				))}
			</div>
			<Legend users={users} />
		</div>
	);
}
