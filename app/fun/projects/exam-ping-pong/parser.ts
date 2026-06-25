export type ParsedExamRecord = {
	courseName: string;
	date: string;
	grade: string;
	ectsGrade: string | null;
	ects: number;
	passed: boolean;
};

export type ParseExamResult = {
	records: ParsedExamRecord[];
	skippedSegments: number;
};

const DATE_REGEX = /\d{2}\.\d{2}\.\d{4}/g;
const ENTRY_HEAD_REGEX = /^(-3|00|02|4|7|10|12|U|F|Fx|A|B|C|D|E)\s*(Fx|[A-F])?\s*(\d+(?:[.,]\d+)?)/;

const normalizeName = (rawName: string) => {
	let value = rawName.replace(/\s+/g, " ").trim();

	if (!value) {
		return "";
	}

	const ectsLabelIndex = value.lastIndexOf("ECTS");
	if (ectsLabelIndex !== -1 && ectsLabelIndex + 4 < value.length) {
		const candidate = value.slice(ectsLabelIndex + 4).trim();
		if (candidate) {
			value = candidate;
		}
	}

	value = value.replace(/^NavnBedømtKarakterECTS-kar\.?ECTS/i, "").trim();
	value = value.replace(/^ResultaterHer vises.*?ECTS/i, "").trim();

	if (value.length > 90) {
		const chunks = value.split(/\t+| {2,}/).filter(Boolean);
		if (chunks.length > 1) {
			value = chunks[chunks.length - 1];
		}
	}

	return value;
};

const didPass = (grade: string, ectsGrade: string | null) => {
	if (grade === "-3" || grade === "00" || grade === "F" || grade === "Fx" || grade === "U") {
		return false;
	}

	if (ectsGrade === "F" || ectsGrade === "Fx") {
		return false;
	}

	return true;
};

const toSortKey = (date: string) => {
	const [day, month, year] = date.split(".");
	return `${year}-${month}-${day}`;
};

export const parseExamResults = (rawText: string): ParseExamResult => {
	const normalized = rawText
		.replace(/\r/g, "\n")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
		.replace(/\u00a0/g, " ");

	const dateMatches = Array.from(normalized.matchAll(DATE_REGEX));
	if (dateMatches.length === 0) {
		return { records: [], skippedSegments: 0 };
	}

	const records: ParsedExamRecord[] = [];
	let skippedSegments = 0;
	let previousRecordEnd = 0;

	for (let index = 0; index < dateMatches.length; index += 1) {
		const dateMatch = dateMatches[index];
		const dateIndex = dateMatch.index;

		if (dateIndex === undefined) {
			continue;
		}

		const date = dateMatch[0];
		const nextDateIndex =
			index + 1 < dateMatches.length && dateMatches[index + 1].index !== undefined
				? dateMatches[index + 1].index!
				: normalized.length;

		const nameRaw = normalized.slice(previousRecordEnd, dateIndex);
		const afterDateSegment = normalized.slice(dateIndex + date.length, nextDateIndex);
		const trimmedAfterDate = afterDateSegment.replace(/^\s+/, "");
		const leadingWhitespaceLength = afterDateSegment.length - trimmedAfterDate.length;

		const parsedHead = trimmedAfterDate.match(ENTRY_HEAD_REGEX);
		if (!parsedHead) {
			skippedSegments += 1;
			previousRecordEnd = dateIndex + date.length;
			continue;
		}

		const courseName = normalizeName(nameRaw);
		if (!courseName) {
			skippedSegments += 1;
			previousRecordEnd = dateIndex + date.length + leadingWhitespaceLength + parsedHead[0].length;
			continue;
		}

		const grade = parsedHead[1];
		const ectsGrade = parsedHead[2] ?? null;
		const ects = Number(parsedHead[3].replace(",", "."));

		if (!Number.isFinite(ects)) {
			skippedSegments += 1;
			previousRecordEnd = dateIndex + date.length + leadingWhitespaceLength + parsedHead[0].length;
			continue;
		}

		records.push({
			courseName,
			date,
			grade,
			ectsGrade,
			ects,
			passed: didPass(grade, ectsGrade),
		});

		previousRecordEnd = dateIndex + date.length + leadingWhitespaceLength + parsedHead[0].length;
	}

	records.sort((a, b) => toSortKey(b.date).localeCompare(toSortKey(a.date)));

	return { records, skippedSegments };
};
