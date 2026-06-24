"use client";

import { useEffect, useRef, useCallback } from "react";

// Modifiable constants for the Game of Life background effect
const CELL_SIZE_PX = 100;          // Grid cell size in pixels (width and height of each tile)
const CELL_INSET_PX = 5;           // Padding inside each cell before the rounded rectangle begins
const INITIAL_LIVE_DENSITY = 0.5;  // Initial probability that a cell starts alive
const GENERATION_INTERVAL_MS = 1000; // Milliseconds between Game of Life generations
const FADE_GENERATION_STEPS = 2;   // How many generations a fade-in or fade-out spans
const CANVAS_BLUR_PX = 10;          // CSS blur applied to the whole canvas (softens the grid)
const MAX_CELL_OPACITY = 0.8;      // Maximum opacity of a fully visible cell
const RGB_CHANNEL_MAX = 255;       // Maximum value for each RGB channel
const PALETTE_START_RGB = { r: 170, g: 178, b: 198 }; // Left side of the gradient palette
const PALETTE_END_RGB = { r: 194, g: 176, b: 188 };   // Right side of the gradient palette
const FADE_GAMMA = 1.5;              // Easing curve exponent for fade transitions (higher = snappier)
const COLOR_GRADIENT_STEPS = 5;   // Number of color stops in the horizontal left-to-right gradient
const MIN_CELL_SCALE = 0.8;        // Scale of a cell at the start of fade-in / end of fade-out
const OPACITY_CULL_THRESHOLD = 0.001; // Skip drawing cells below this opacity

// Derived constants
const CELL_RENDER_SIZE_PX = CELL_SIZE_PX - CELL_INSET_PX * 2; // Rendered square size within the cell
const CELL_CORNER_RADIUS_PX = CELL_RENDER_SIZE_PX / 2; // Corner radius of the rounded rectangle (fully circular)
const FADE_DURATION_MS = FADE_GENERATION_STEPS * GENERATION_INTERVAL_MS; // Fade duration in milliseconds

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}

function createGrid(cols: number, rows: number) {
	const grid = new Uint8Array(cols * rows);
	for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < INITIAL_LIVE_DENSITY ? 1 : 0;
	return grid;
}

function stepGrid(grid: Uint8Array, rows: number, cols: number) {
	const next = new Uint8Array(cols * rows);
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			let n = 0;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (dy === 0 && dx === 0) continue;
					n += grid[((y + dy + rows) % rows) * cols + (x + dx + cols) % cols];
				}
			}
			const i = y * cols + x;
			next[i] = grid[i] ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
		}
	}
	return next;
}

interface State {
	g0: Uint8Array;
	g1: Uint8Array;
	g2: Uint8Array;
	t0: number;
	t1: number;
	cols: number;
	rows: number;
}

export default function GameOfLifeBg() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const spritesRef = useRef<HTMLCanvasElement[]>([]);
	const stateRef = useRef<State | null>(null);

	const createSprite = useCallback((color: string) => {
		const sprite = document.createElement("canvas");
		sprite.width = CELL_SIZE_PX;
		sprite.height = CELL_SIZE_PX;
		const sctx = sprite.getContext("2d");
		if (!sctx) return null;

		sctx.fillStyle = color;
		sctx.beginPath();
		sctx.roundRect(CELL_INSET_PX, CELL_INSET_PX, CELL_RENDER_SIZE_PX, CELL_RENDER_SIZE_PX, CELL_CORNER_RADIUS_PX);
		sctx.fill();

		return sprite;
	}, []);

	const init = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const palette = Array.from({ length: COLOR_GRADIENT_STEPS }, (_, i) => {
			const t = i / Math.max(COLOR_GRADIENT_STEPS - 1, 1);
			const r = Math.round(Math.min(RGB_CHANNEL_MAX, lerp(PALETTE_START_RGB.r, PALETTE_END_RGB.r, t)));
			const g = Math.round(Math.min(RGB_CHANNEL_MAX, lerp(PALETTE_START_RGB.g, PALETTE_END_RGB.g, t)));
			const b = Math.round(Math.min(RGB_CHANNEL_MAX, lerp(PALETTE_START_RGB.b, PALETTE_END_RGB.b, t)));
			return `rgba(${r},${g},${b},1)`;
		});
		spritesRef.current = palette
			.map((color) => createSprite(color))
			.filter((sprite): sprite is HTMLCanvasElement => sprite !== null);

		const w = window.innerWidth;
		const fullH = Math.max(document.documentElement.scrollHeight, window.innerHeight);

		canvas.width = w;
		canvas.height = fullH;

		const cols = Math.ceil(w / CELL_SIZE_PX);
		const rows = Math.ceil(fullH / CELL_SIZE_PX);
		const g0 = createGrid(cols, rows);
		const g1 = stepGrid(g0, rows, cols);
		const g2 = stepGrid(g1, rows, cols);
		const now = performance.now();

		stateRef.current = {
			g0, g1, g2,
			t0: now - GENERATION_INTERVAL_MS,
			t1: now,
			cols, rows,
		};
	}, [createSprite]);

	useEffect(() => {
		init();

		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let raf: number;

		function draw() {
			const s = stateRef.current;
			const sprites = spritesRef.current;
			if (!s || !ctx || !canvas || sprites.length === 0) return;

			const now = performance.now();

			if (now - s.t1 >= GENERATION_INTERVAL_MS) {
				s.g0 = s.g1;
				s.g1 = s.g2;
				s.g2 = stepGrid(s.g2, s.rows, s.cols);
				s.t0 = s.t1;
				s.t1 = now;
			}

			const olderT = Math.pow(Math.min((now - s.t0) / FADE_DURATION_MS, 1), FADE_GAMMA);
			const newerT = Math.pow(Math.min((now - s.t1) / FADE_DURATION_MS, 1), FADE_GAMMA);
			const opacities = new Float32Array(8);
			const scales = new Float32Array(8);
			for (let i = 0; i < 8; i++) {
				const a = (i >> 2) & 1;
				const b = (i >> 1) & 1;
				const c = i & 1;
				const t = a + (b - a) * olderT + (c - b) * newerT;
				opacities[i] = MAX_CELL_OPACITY * t;
				scales[i] = MIN_CELL_SCALE + (1 - MIN_CELL_SCALE) * t;
			}

			ctx.clearRect(0, 0, canvas.width, canvas.height);

			const { g0, g1, g2, cols, rows } = s;
			let i = 0;
			let alpha = -1;
			for (let y = 0; y < rows; y++) {
				const py = y * CELL_SIZE_PX;
				for (let x = 0; x < cols; x++, i++) {
					const idx = (g0[i] << 2) | (g1[i] << 1) | g2[i];
					const opacity = opacities[idx];
					if (opacity <= OPACITY_CULL_THRESHOLD) continue;
					const paletteIndex = Math.floor((x / Math.max(cols - 1, 1)) * (sprites.length - 1));
					if (alpha !== opacity) {
						alpha = opacity;
						ctx.globalAlpha = opacity;
					}
					const sc = scales[idx];
					const dSize = CELL_SIZE_PX * sc;
					const offset = (CELL_SIZE_PX - dSize) / 2;
					ctx.drawImage(sprites[paletteIndex], 0, 0, CELL_SIZE_PX, CELL_SIZE_PX, x * CELL_SIZE_PX + offset, py + offset, dSize, dSize);
				}
			}
			ctx.globalAlpha = 1;

			raf = requestAnimationFrame(draw);
		}

		raf = requestAnimationFrame(draw);

		let resizeRaf = 0;
		const onResize = () => {
			cancelAnimationFrame(resizeRaf);
			resizeRaf = requestAnimationFrame(init);
		};
		window.addEventListener("resize", onResize);

		return () => {
			cancelAnimationFrame(raf);
			cancelAnimationFrame(resizeRaf);
			window.removeEventListener("resize", onResize);
		};
	}, [init]);

	return (
		<canvas
			ref={canvasRef}
			aria-hidden
			className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
			style={{ filter: `blur(${CANVAS_BLUR_PX}px)` }}
		/>
	);
}
