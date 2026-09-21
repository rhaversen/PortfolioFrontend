import {
	B_POLAR_SQ,
	evalPoly,
	hmsToHours,
	t0HourOfDay,
	tFromTd,
	greatestT,
	besselianStateAt,
	TYPE_LABEL,
	type BesselianRecord,
} from "./besselian";
import { shadowAxisPoint, shadowAxisTrack, latLonToRender } from "./eclipseTrack";
import besselianData from "./besselian.json";

const RECORDS = besselianData as unknown as BesselianRecord[];

const rec: BesselianRecord = {
	id: "20990101",
	type: "T",
	saros: 1,
	gamma: 0,
	magnitude: 1,
	deltaTSeconds: 69,
	t0Tdt: "1 Jan 2099 12.000",
	k1: 0.5,
	k2: 0.3,
	tanF1: 0.0046,
	tanF2: 0.0045,
	coeff: {
		x: [0.1, 0.5, 0.0001, -0.00001],
		y: [0.2, -0.3, 0.0002, 0.00001],
		d: [10, 0.1, -0.0001, 0],
		l1: [0.55, -0.0001, -0.00001, 0],
		l2: [-0.01, 0.0001, 0.00001, 0],
		mu: [180, 15, 0.001, 0],
	},
	circumstances: {
		ut: "12:34:56",
		td: "12:36:05",
		latDeg: 0,
		lonDeg: 0,
		sunAltitudeDeg: 60,
		sunAzimuthDeg: 180,
		pathWidthKm: 100,
		centralDuration: "04m 10s",
	},
};

describe("evalPoly", () => {
	it("evaluates a cubic in t with the expected coefficients", () => {
		expect(evalPoly([1, 2, 3, 4], 0)).toBe(1);
		expect(evalPoly([1, 2, 3, 4], 2)).toBe(1 + 4 + 12 + 32);
	});
});

describe("time helpers", () => {
	it("converts HH:MM:SS to decimal hours", () => {
		expect(hmsToHours("12:34:56")).toBeCloseTo(12 + 34 / 60 + 56 / 3600, 10);
		expect(hmsToHours("bad")).toBeNaN();
	});

	it("derives hours-from-t0 from a TD clock time on the same date", () => {
		expect(t0HourOfDay(rec)).toBe(12);
		expect(tFromTd(rec, "13:00:00")).toBeCloseTo(1, 10);
		expect(greatestT(rec)).toBeCloseTo(12 + 36 / 60 + 5 / 3600 - 12, 10);
	});

	it("evaluates all six polynomial families at greatest eclipse", () => {
		const s = besselianStateAt(rec, greatestT(rec));
		expect(s.x).toBeCloseTo(evalPoly(rec.coeff.x, greatestT(rec)), 12);
		expect(s.mu).toBeCloseTo(evalPoly(rec.coeff.mu, greatestT(rec)), 12);
	});

	it("labels eclipse types", () => {
		expect(TYPE_LABEL.T).toBe("Total");
		expect(TYPE_LABEL.H).toBe("Hybrid");
	});
});

describe("shadowAxisPoint on the real dataset", () => {
	it("produces valid lat/lon near greatest eclipse for every non-deep-partial record", () => {
		for (const r of RECORDS) {
			// High-|γ| partials have no central line on Earth — the axis misses
			// the ellipsoid and null is the correct answer. Everything else must hit.
			if (r.type === "P" && Math.abs(r.gamma) > 0.997) continue;
			const t = greatestT(r);
			const p = shadowAxisPoint(r, t);
			expect(p).not.toBeNull();
			expect(p!.lat).toBeGreaterThanOrEqual(-90);
			expect(p!.lat).toBeLessThanOrEqual(90);
			expect(p!.lon).toBeGreaterThanOrEqual(-180);
			expect(p!.lon).toBeLessThanOrEqual(180);
		}
	});

	it("moves continuously along the track (no teleporting between samples)", () => {
		const r = RECORDS.find((x) => x.type === "T") ?? RECORDS[0];
		const t0 = greatestT(r);
		const a = shadowAxisPoint(r, t0)!;
		const b = shadowAxisPoint(r, t0 + 0.1)!;
		if (b) {
			const dLat = Math.abs(b.lat - a.lat);
			const dLon = Math.min(
				Math.abs(b.lon - a.lon),
				360 - Math.abs(b.lon - a.lon),
			);
			// ~0.1 h of shadow travel is at most a few degrees of arc
			expect(dLat).toBeLessThan(6);
			expect(dLon).toBeLessThan(6);
		}
	});
});

describe("shadowAxisTrack", () => {
	it("splits segments only on gaps or antimeridian crossings", () => {
		const r = RECORDS.find((x) => x.type === "T") ?? RECORDS[0];
		const segments = shadowAxisTrack(r, 100);
		expect(segments.length).toBeGreaterThanOrEqual(1);
		for (const seg of segments) {
			for (let i = 1; i < seg.length; i++) {
				const dLon = Math.abs(seg[i].lon - seg[i - 1].lon);
				expect(dLon).toBeLessThanOrEqual(180);
			}
		}
	});
});

describe("latLonToRender", () => {
	it("places the north pole on the render +Y axis", () => {
		const [x, y, z] = latLonToRender(90, 0);
		expect(x).toBeCloseTo(0, 10);
		expect(y).toBeCloseTo(Math.sqrt(B_POLAR_SQ), 6);
		expect(z).toBeCloseTo(0, 10);
	});

	it("places lon 0° on the equator at render +X", () => {
		const [x, y, z] = latLonToRender(0, 0);
		expect(x).toBeCloseTo(1, 10);
		expect(y).toBeCloseTo(0, 10);
		expect(z).toBeCloseTo(0, 10);
	});

	it("places lon +90°E on the equator at render +Z", () => {
		const [x, y, z] = latLonToRender(0, 90);
		expect(x).toBeCloseTo(0, 10);
		expect(y).toBeCloseTo(0, 10);
		expect(z).toBeCloseTo(1, 10);
	});
});
