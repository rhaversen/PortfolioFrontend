import type { ScoredEntry } from "./types";
import { tierIndex } from "./patterns";

export function groupTimesByMonthUser(
	entries: ScoredEntry[],
	filter?: (e: ScoredEntry) => boolean,
): Map<string, Map<string, string[]>> {
	const map = new Map<string, Map<string, string[]>>();
	for (const e of entries) {
		if (filter && !filter(e)) continue;
		const m = map.get(e.monthKey) ?? new Map();
		const arr = m.get(e.user) ?? [];
		arr.push(e.localTime);
		m.set(e.user, arr);
		map.set(e.monthKey, m);
	}
	return map;
}

export function groupTimesByTierUser(
	entries: ScoredEntry[],
): Map<number, Map<string, string[]>> {
	const map = new Map<number, Map<string, string[]>>();
	for (const e of entries) {
		const ti = tierIndex(e.score);
		const m = map.get(ti) ?? new Map();
		const arr = m.get(e.user) ?? [];
		arr.push(e.localTime);
		m.set(e.user, arr);
		map.set(ti, m);
	}
	return map;
}
