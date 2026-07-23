import type { PatternStat } from "./patterns";

export type RawEntry = { datetime: string; user: string; message: string };

export type ScoredEntry = {
	date: Date;
	localDate: string;
	monthKey: string;
	weekKey: string;
	localTime: string;
	h: number;
	m: number;
	user: string;
	message: string;
	score: number;
	tier: { label: string; tone: string };
	patterns: string[];
	patternCount: number;
	novelty: boolean;
	commentary: string;
	isMiss: boolean;
};

export type UserStats = {
	user: string;
	count: number;
	totalScore: number;
	avgScore: number;
};

export type MonthBucket = {
	monthKey: string;
	byUser: Map<string, number>;
	total: number;
};

export type PatternDominance = {
	pattern: PatternStat;
	byUser: { user: string; count: number }[];
	leader: string | null;
	total: number;
};

export type NoveltyStats = {
	user: string;
	total: number;
	novelCount: number;
	novelRate: number;
	topComments: { text: string; count: number }[];
	messages: ScoredEntry[];
};

export type MissRateStats = {
	user: string;
	total: number;
	missCount: number;
	missRate: number;
	misses: ScoredEntry[];
};

export type OneMinuteLate = {
	miss: ScoredEntry;
	user: string;
	missTime: string;
	prevTime: string;
	missScore: number;
	prevScore: number;
};

export type MonthlyAvgPoint = {
	monthKey: string;
	byUser: number[];
	counts: number[];
};

export type TierDistPoint = {
	label: string;
	count: number;
	byUser: number[];
};

export type TierDistributionData = {
	combined: TierDistPoint[];
};

export type CumulativePoint = {
	t: number;
	scores: number[];
};

export type SkumfidusData = {
	entries: ScoredEntry[];
	users: string[];
	userStats: UserStats[];
	tierDist: TierDistributionData;
	cumulative: CumulativePoint[];
	patternDominance: PatternDominance[];
	monthlyAvg: MonthlyAvgPoint[];
	months: MonthBucket[];
	heatmap: number[][];
	noveltyStats: NoveltyStats[];
	missRate: MissRateStats[];
	oneMinuteLate: OneMinuteLate[];
	missByMonth: { monthKey: string; total: number; misses: number[]; missTotal: number }[];
	total: number;
	totalScore: number;
	missTotal: number;
	noveltyTotal: number;
	maxHeat: number;
	heatmaps: number[][][];
	maxHeats: number[];
	underutilized: UnderutilizedTime[];
	imbalance: UserImbalanceTime[];
};

export type UnderutilizedTime = {
	h: number;
	m: number;
	time: string;
	score: number;
	tier: number;
	count: number;
	patterns: string[];
	userCounts: number[];
};

export type UserImbalanceTime = {
	h: number;
	m: number;
	time: string;
	total: number;
	userCounts: number[];
	dominantUser: string;
	dominantCount: number;
	otherCount: number;
	ratio: number;
};
