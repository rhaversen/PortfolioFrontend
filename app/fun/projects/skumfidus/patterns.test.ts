import {
	analyzeTime,
	parseTime,
	scoreTier,
	tierIndex,
	findNextRare,
	findUpcomingRare,
	PATTERN_STATS,
	ANALYSIS_GRID,
} from "./patterns";

describe("parseTime", () => {
	it("accepts valid clock times", () => {
		expect(parseTime("12:34")).toEqual([1, 2, 3, 4]);
		expect(parseTime("0000")).toEqual([0, 0, 0, 0]);
		expect(parseTime("23:59")).toEqual([2, 3, 5, 9]);
	});

	it("strips non-digit characters", () => {
		expect(parseTime("ab12:34cd")).toEqual([1, 2, 3, 4]);
	});

	it("rejects out-of-range times", () => {
		expect(parseTime("24:00")).toBeNull();
		expect(parseTime("12:60")).toBeNull();
		expect(parseTime("12:3")).toBeNull();
		expect(parseTime("")).toBeNull();
	});
});

describe("analyzeTime", () => {
	it("scores 00:00 via its rarest matching pattern (All Identical, 3 times a day)", () => {
		const a = analyzeTime(0, 0);
		expect(a.best?.name).toBe("All Identical");
		expect(a.score).toBeCloseTo(1440 / 3, 1);
	});

	it("gives personal-favorite times the maximum score of 1440", () => {
		expect(analyzeTime(20, 0).best?.name).toBe("Rasmus's favorite");
		expect(analyzeTime(20, 0).score).toBe(1440);
		expect(analyzeTime(20, 3).best?.name).toBe("Sarah's favorite");
		expect(analyzeTime(20, 3).score).toBe(1440);
	});

	it("scores times with no matching pattern as 0", () => {
		expect(analyzeTime(15, 47).score).toBe(0);
		expect(analyzeTime(15, 47).best).toBeNull();
	});

	it("matches palindrome times like 12:21", () => {
		const a = analyzeTime(12, 21);
		expect(a.matched.map((p) => p.symbol)).toContain("AB:BA");
	});

	it("matches hour=minute times like 12:12", () => {
		const a = analyzeTime(12, 12);
		expect(a.matched.map((p) => p.symbol)).toContain("AB:AB");
	});

	it("matches ascending runs like 12:34", () => {
		const a = analyzeTime(12, 34);
		expect(a.matched.map((p) => p.symbol)).toContain("A,A+1:A+2,A+3");
	});

	it("keeps digits consistent with the time string", () => {
		const a = analyzeTime(7, 5);
		expect(a.digits).toEqual([0, 7, 0, 5]);
		expect(a.time).toBe("07:05");
	});
});

describe("PATTERN_STATS invariants", () => {
	it("covers every pattern exactly once and ranks them by rarity", () => {
		expect(PATTERN_STATS).toHaveLength(8);
		PATTERN_STATS.forEach((p, i) => expect(p.rank).toBe(i + 1));
	});

	it("assigns every minute of the day an analysis entry", () => {
		expect(ANALYSIS_GRID).toHaveLength(24);
		ANALYSIS_GRID.forEach((row) => expect(row).toHaveLength(60));
	});
});

describe("scoreTier / tierIndex", () => {
	it("classifies by score boundaries (tiers are exclusive upper bounds)", () => {
		expect(scoreTier(0).label).toBe("Not Skumfidus");
		expect(scoreTier(49).label).toBe("Not Skumfidus");
		expect(scoreTier(50).label).toBe("Skumfidus");
		expect(scoreTier(99).label).toBe("Skumfidus");
		expect(scoreTier(100).label).toBe("Rare Skumfidus!");
	});

	it("tierIndex maps to the same boundaries", () => {
		expect(tierIndex(0)).toBe(0);
		expect(tierIndex(49)).toBe(0);
		expect(tierIndex(50)).toBe(1);
		expect(tierIndex(100)).toBe(2);
		expect(tierIndex(1440)).toBe(2);
	});
});

describe("findNextRare", () => {
	it("finds the next time scoring at least 100 after the start minute", () => {
		// 07:05 + 1 minute = 07:06, which matches both 00:0X-adjacent... verify
		// against the grid rather than hardcoding, to stay pattern-agnostic.
		const start = 7 * 60 + 5;
		const next = findNextRare(start);
		expect(next).not.toBeNull();
		expect(next!.inMin).toBeGreaterThanOrEqual(1);
		expect(next!.inMin).toBeLessThanOrEqual(1440);
		expect(ANALYSIS_GRID[Number(next!.time.slice(0, 2))][Number(next!.time.slice(3))].score).toBeGreaterThanOrEqual(100);
	});

	it("wraps around midnight", () => {
		const next = findNextRare(23 * 60 + 59);
		expect(next).not.toBeNull();
		expect(next!.inMin).toBeLessThanOrEqual(1440);
	});

	it("never returns an offset greater than a full day", () => {
		for (let m = 0; m < 1440; m += 97) {
			const next = findNextRare(m);
			expect(next!.inMin).toBeLessThanOrEqual(1440);
		}
	});
});

describe("findUpcomingRare", () => {
	it("returns at most `limit` results above the minScore, in time order", () => {
		const upcoming = findUpcomingRare(10 * 60, 3);
		expect(upcoming.length).toBeLessThanOrEqual(3);
		for (let i = 1; i < upcoming.length; i++) {
			expect(upcoming[i].inMin).toBeGreaterThan(upcoming[i - 1].inMin);
		}
		upcoming.forEach((u) => expect(u.score).toBeGreaterThan(50));
	});

	it("excludes results at or below minScore", () => {
		const upcoming = findUpcomingRare(15 * 60, 10);
		upcoming.forEach((u) => expect(u.score).toBeGreaterThan(50));
	});
});
