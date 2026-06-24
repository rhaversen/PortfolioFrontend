import { hexToRgba } from "./useExamSim";

export function drawGlowAt(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	color: string,
	alpha: number,
	gr: number,
): void {
	const a = Math.max(0, Math.min(1, alpha));
	const haloR = gr * 2.5;
	const grad = ctx.createRadialGradient(x, y, 0, x, y, haloR);
	grad.addColorStop(0, hexToRgba(color, a * 0.5));
	grad.addColorStop(1, hexToRgba(color, 0));
	ctx.fillStyle = grad;
	ctx.beginPath();
	ctx.arc(x, y, haloR, 0, Math.PI * 2);
	ctx.fill();
	ctx.globalAlpha = a;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(x, y, gr, 0, Math.PI * 2);
	ctx.fill();
	ctx.globalAlpha = 1;
}
