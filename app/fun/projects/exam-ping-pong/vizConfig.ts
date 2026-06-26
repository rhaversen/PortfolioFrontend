// Circle canvas dimensions
export const CX = 220;
export const CY = 240;
export const R = 200;
export const W = 440;
export const H =470;

// Timeline canvas height
export const TL_H = 88;

// GPA graph canvas height
export const GPA_H = 220;

// How far ahead exam dots start fading in (11 months)
export const FADE_WINDOW_MS = 365.25 * 24 * 3600 * 1000 * 11 / 12;

// Month label data
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_DAY_1 = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

export function angToXY(a: number, r = R, cx = CX, cy = CY): [number, number] {
	return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}
