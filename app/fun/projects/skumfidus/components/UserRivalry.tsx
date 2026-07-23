import type { UserStats } from "../types";
import { colorFor, firstName } from "../useSkumfidusData";

export function UserRivalry({ userStats }: { userStats: UserStats[] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full table-fixed border-collapse text-sm">
				<thead>
					<tr className="text-left">
						<th className="border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-center">User</th>
						<th className="border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-center">Skumfiduser</th>
						<th className="border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-center">Score / Skumfidus</th>
						<th className="border border-border px-2 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-muted text-center">Total Score</th>
					</tr>
				</thead>
				<tbody>
					{userStats.map((u) => (
						<tr key={u.user}>
							<td className="border border-border px-2 py-1.5">
								<span className="flex items-center gap-2">
									<span className={`inline-block h-2.5 w-2.5 ${colorFor(u.user)}`} />
									<span className="text-xs truncate">{firstName(u.user)}</span>
								</span>
							</td>
							<td className="border border-border px-2 py-1.5 font-mono text-xs text-center tabular-nums">{u.count}</td>
							<td className="border border-border px-2 py-1.5 font-mono text-xs text-center tabular-nums">{u.avgScore.toFixed(1)}</td>
							<td className="border border-border px-2 py-1.5 font-mono text-xs text-center tabular-nums">{u.totalScore.toFixed(0)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
