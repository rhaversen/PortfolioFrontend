import { parseExamResults } from "./parser";

const ENTRY = (name: string, date: string, grade: string, ectsGrade: string | null, ects: number | string) =>
	`${name}\t${date}\t${grade}\t${ectsGrade ?? ""}\t${ects}\n`;

describe("parseExamResults", () => {
	it("returns empty records for text without dates", () => {
		expect(parseExamResults("no dates here at all")).toEqual({ records: [], skippedSegments: 0 });
	});

	it("parses passed and failed courses with grades and ECTS", () => {
		const input =
			ENTRY("Distributed Systems", "12.06.2025", "12", "A", 10) +
			ENTRY("Algorithms", "03.01.2025", "00", "F", 10);
		const { records, skippedSegments } = parseExamResults(input);

		expect(skippedSegments).toBe(0);
		expect(records).toHaveLength(2);
		expect(records[0]).toMatchObject({
			courseName: "Distributed Systems",
			date: "12.06.2025",
			grade: "12",
			ectsGrade: "A",
			ects: 10,
			passed: true,
		});
		expect(records[1]).toMatchObject({
			courseName: "Algorithms",
			grade: "00",
			ectsGrade: "F",
			passed: false,
		});
	});

	it("sorts records newest-first", () => {
		const input =
			ENTRY("Old Course", "01.01.2024", "10", "B", 5) +
			ENTRY("New Course", "01.01.2025", "10", "B", 5);
		const { records } = parseExamResults(input);
		expect(records.map((r) => r.courseName)).toEqual(["New Course", "Old Course"]);
	});

	it("treats Danish failing grades as not passed", () => {
		for (const grade of ["-3", "00", "U"]) {
			const { records } = parseExamResults(ENTRY("X", "01.01.2025", grade, null, 5));
			expect(records[0].passed).toBe(false);
		}
	});

	it("treats ECTS F/Fx as not passed even with a passing Danish grade", () => {
		const { records } = parseExamResults(ENTRY("X", "01.01.2025", "02", "Fx", 5));
		expect(records[0].passed).toBe(false);
	});

	it("parses comma-decimal ECTS values", () => {
		const { records } = parseExamResults(ENTRY("X", "01.01.2025", "10", "B", "7,5"));
		expect(records[0].ects).toBe(7.5);
	});

	it("strips markdown links down to their label", () => {
		const input = ENTRY("[Course Name](https://example.com)", "01.01.2025", "10", "B", 5);
		const { records } = parseExamResults(input);
		expect(records[0].courseName).toBe("Course Name");
	});

	it("counts entries without a grade head as skipped segments", () => {
		const input = "01.01.2025\tgarbage without a grade\n";
		const { records, skippedSegments } = parseExamResults(input);
		expect(records).toHaveLength(0);
		expect(skippedSegments).toBe(1);
	});
});
