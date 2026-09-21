import {
	buildNodes,
	cwDist,
	circleAngle,
	msToAngle,
	gradeToNumber,
	tickParticle,
	hexToRgba,
	type Particle,
} from "./useExamSim";
import type { ParsedExamRecord } from "./parser";

const record = (name: string, date: string, grade: string, passed: boolean): ParsedExamRecord => ({
	courseName: name,
	date,
	grade,
	ectsGrade: passed ? "A" : "F",
	ects: 10,
	passed,
});

describe("gradeToNumber", () => {
	it("maps the Danish 7-step scale", () => {
		expect(gradeToNumber("12")).toBe(12);
		expect(gradeToNumber("02")).toBe(2);
		expect(gradeToNumber("-3")).toBe(-3);
	});

	it("maps ECTS letters and defaults unknown grades to 0", () => {
		expect(gradeToNumber("A")).toBe(12);
		expect(gradeToNumber("F")).toBe(-3);
		expect(gradeToNumber("N/A")).toBe(0);
	});
});

describe("angle math", () => {
	it("places June 21 at angle zero (summer day anchor)", () => {
		const june21 = new Date(2025, 5, 21).getTime();
		const day = Math.ceil((june21 - new Date(2025, 0, 1).getTime()) / 86_400_000) + 1;
		expect(circleAngle(day)).toBeCloseTo(0, 6);
	});

	it("cwDist is always in (0, 2π] and equals 2π only for equal angles", () => {
		const quarter = Math.PI / 2;
		expect(cwDist(0, quarter)).toBeCloseTo(quarter, 10);
		expect(cwDist(quarter, 0)).toBeCloseTo(3 * quarter, 10);
		expect(cwDist(1, 1)).toBeCloseTo(Math.PI * 2, 10);
	});

	it("msToAngle agrees with circleAngle on the same date", () => {
		const ms = new Date(2025, 2, 15).getTime();
		const d = new Date(ms);
		const day = Math.ceil((ms - new Date(d.getFullYear(), 0, 1).getTime()) / 86_400_000) + 1;
		expect(msToAngle(ms)).toBeCloseTo(circleAngle(day), 6);
	});
});

describe("buildNodes", () => {
	it("chains failed courses to their next retake and marks it", () => {
		const records = [
			record("Algorithms", "01.01.2024", "00", false),
			record("Algorithms", "01.06.2024", "10", true),
			record("Databases", "02.02.2024", "12", true),
		];
		const nodes = buildNodes(records);

		expect(nodes).toHaveLength(3);
		const failed = nodes.find((n) => !n.passed)!;
		const retake = nodes.find((n) => n.id === failed.nextId)!;
		expect(retake.name).toBe("Algorithms");
		expect(retake.passed).toBe(true);
		expect(retake.prevFailedId).toBe(failed.id);

		const passedOnce = nodes.find((n) => n.name === "Databases")!;
		expect(passedOnce.nextId).toBeNull();
	});

	it("sorts nodes chronologically regardless of input order", () => {
		const nodes = buildNodes([
			record("Later", "01.06.2024", "10", true),
			record("Earlier", "01.01.2024", "10", true),
		]);
		expect(nodes[0].name).toBe("Earlier");
	});
});

describe("tickParticle", () => {
	const base: Particle = {
		uid: 0,
		phase: "arc",
		color: "#000",
		alpha: 1,
		t: 0,
		duration: 100,
		angle: 0,
		startAngle: 0,
		travelDist: Math.PI,
		targetAngle: Math.PI,
		targetId: "x",
		gx: 0,
		gy: 0,
		gr: 0,
		startMs: 0,
		targetMs: 0,
	};

	it("moves an arc particle monotonically and finishes after duration", () => {
		const p = { ...base };
		expect(tickParticle(p, 50)).toBe(false);
		const mid = p.angle;
		expect(tickParticle(p, 50)).toBe(true);
		expect(p.angle).toBeCloseTo(Math.PI, 6);
		expect(p.angle).toBeGreaterThan(mid);
	});

	it("keeps alpha at 1 for targeted arcs, fades untargeted ones", () => {
		const targeted = { ...base };
		tickParticle(targeted, 50);
		expect(targeted.alpha).toBe(1);

		const untargeted = { ...base, targetAngle: null, targetId: null };
		tickParticle(untargeted, 25);
		expect(untargeted.alpha).toBeLessThan(1);
	});

	it("completes the glow phase with radius growth and alpha decay", () => {
		const p = { ...base, phase: "glow" as const };
		expect(tickParticle(p, 100)).toBe(true);
		expect(p.gr).toBeCloseTo(17, 6);
		expect(p.alpha).toBe(0);
	});
});

describe("hexToRgba", () => {
	it("converts hex channels to an rgba string", () => {
		expect(hexToRgba("#4ade80", 0.5)).toBe("rgba(74,222,128,0.500)");
	});
});
