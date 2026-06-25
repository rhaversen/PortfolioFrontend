"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const CELL_SIZE_PX = 50;           // Grid cell size in pixels (width and height of each tile)
const CELL_INSET_PX = 5;           // Padding inside each cell before the rounded rectangle begins
const INITIAL_LIVE_DENSITY = 0.5;  // Initial probability that a cell starts alive
const FADE_GENERATION_STEPS = 2;   // How many generations a fade-in or fade-out spans
const CANVAS_BLUR_PX = 10;         // CSS blur applied to the whole canvas (softens the grid)
const MAX_CELL_OPACITY = 0.8;      // Maximum opacity of a fully visible cell
const RGB_CHANNEL_MAX = 255;       // Maximum value for each RGB channel
const PALETTE_START_RGB = { r: 170, g: 178, b: 198 }; // Left side of the gradient palette
const PALETTE_END_RGB = { r: 194, g: 176, b: 188 };   // Right side of the gradient palette
const FADE_GAMMA = 1.5;            // Easing curve exponent for fade transitions (higher = snappier)
const COLOR_GRADIENT_STEPS = 5;   // Number of color stops in the horizontal left-to-right gradient
const MIN_CELL_SCALE = 0.8;        // Scale of a cell at the start of fade-in / end of fade-out
const OPACITY_CULL_THRESHOLD = 0.001; // Skip drawing cells below this opacity
const GLIDER_PATTERNS: ReadonlyArray<ReadonlyArray<[number, number]>> = [
	// Diagonal gliders (3×3 bounding box)
	[[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]], // SE
	[[1, 0], [0, 1], [0, 2], [1, 2], [2, 2]], // SW
	[[0, 0], [1, 0], [2, 0], [2, 1], [1, 2]], // NE
	[[0, 0], [1, 0], [2, 0], [0, 1], [1, 2]], // NW
];
const LWSS_PATTERNS: ReadonlyArray<ReadonlyArray<[number, number]>> = [
	// Lightweight Spaceships (LWSS, 5×4 or 4×5 bounding box)
	[[1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [4, 1], [4, 2], [0, 3], [3, 3]], // E
	[[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [4, 1], [0, 2], [1, 3], [4, 3]], // W
	[[0, 0], [2, 0], [3, 1], [3, 2], [0, 3], [3, 3], [1, 4], [2, 4], [3, 4]], // S
	[[0, 0], [1, 0], [2, 0], [0, 1], [3, 1], [0, 2], [0, 3], [1, 4], [3, 4]], // N
];
const LWSS_CHANCE = 0.05;

// Derived constants
const CELL_RENDER_SIZE_PX = CELL_SIZE_PX - CELL_INSET_PX * 2; // Rendered square size within the cell
const CELL_CORNER_RADIUS_PX = CELL_RENDER_SIZE_PX / 2; // Corner radius of the rounded rectangle (fully circular)

const DEFAULT_INTERVAL_MS = 1000;      // Default milliseconds between Game of Life generations
const DEFAULT_SPEED_MULTIPLIER = 1.0;

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
	interval: number; // last-applied interval, used to detect speed changes and rescale timestamps
}

export default function GameOfLifeBg() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const spritesRef = useRef<HTMLCanvasElement[]>([]);
	const stateRef = useRef<State | null>(null);

	// Applied settings used by the draw/init loops
	const intervalRef = useRef(DEFAULT_INTERVAL_MS);

	// UI state
	const [speedMultiplier, setSpeedMultiplier] = useState(DEFAULT_SPEED_MULTIPLIER);
	const [showControls, setShowControls] = useState(false);
	const controlsRef = useRef<HTMLDivElement>(null);

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
			t0: now - intervalRef.current,
			t1: now,
			cols, rows,
			interval: intervalRef.current,
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
			const interval = intervalRef.current;

			if (interval !== s.interval) {
				const scale = interval / s.interval;
				s.t0 = now - (now - s.t0) * scale;
				s.t1 = now - (now - s.t1) * scale;
				s.interval = interval;
			}

			const fadeDuration = FADE_GENERATION_STEPS * interval;

			if (now - s.t1 >= interval) {
				s.g0 = s.g1;
				s.g1 = s.g2;
				s.g2 = stepGrid(s.g2, s.rows, s.cols);
				s.t0 = s.t1;
				s.t1 = now;
			}

			const olderT = Math.pow(Math.min((now - s.t0) / fadeDuration, 1), FADE_GAMMA);
			const newerT = Math.pow(Math.min((now - s.t1) / fadeDuration, 1), FADE_GAMMA);
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

	const handleSpeedChange = (val: number) => {
		intervalRef.current = DEFAULT_INTERVAL_MS / val;
		setSpeedMultiplier(val);
	};

	const handleNewGame = () => {
		init();
	};

	const spawnGlider = useCallback((pixelX: number, pixelY: number) => {
		const s = stateRef.current;
		if (!s) return;
		const originX = Math.floor(pixelX / CELL_SIZE_PX) - 1;
		const originY = Math.floor(pixelY / CELL_SIZE_PX) - 1;
		const pool = Math.random() < LWSS_CHANCE ? LWSS_PATTERNS : GLIDER_PATTERNS;
		const pattern = pool[Math.floor(Math.random() * pool.length)];
		for (const [dx, dy] of pattern) {
			const cx = ((originX + dx) % s.cols + s.cols) % s.cols;
			const cy = ((originY + dy) % s.rows + s.rows) % s.rows;
			const idx = cy * s.cols + cx;
			s.g0[idx] = 1;
			s.g1[idx] = 1;
			s.g2[idx] = 1;
		}
	}, []);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (controlsRef.current?.contains(e.target as Node)) return;
			spawnGlider(e.clientX, e.clientY + window.scrollY);
		}
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, [spawnGlider]);

	useEffect(() => {
		if (!showControls) return;
		function handleOutside(e: MouseEvent | TouchEvent) {
			if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
				setShowControls(false);
			}
		}
		document.addEventListener("mousedown", handleOutside);
		document.addEventListener("touchstart", handleOutside);
		return () => {
			document.removeEventListener("mousedown", handleOutside);
			document.removeEventListener("touchstart", handleOutside);
		};
	}, [showControls]);

	return (
		<>
			<canvas
				ref={canvasRef}
				aria-hidden
				className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
				style={{ filter: `blur(${CANVAS_BLUR_PX}px)` }}
			/>
			<div ref={controlsRef} className="fixed bottom-4 right-4 z-30">
				<div className="relative flex flex-col items-end">
					{showControls && (
						<div className="absolute bottom-full mb-2 right-0 w-44 border border-border/20 bg-background/60 backdrop-blur-md p-3 space-y-3 text-[0.65rem] font-mono">
							<span className="block text-muted text-[0.55rem] leading-relaxed">Conway&apos;s Game of Life background. Runs about as efficiently as scrolling Google search.</span>
							<div className="space-y-1">
								<div className="flex justify-between text-muted uppercase tracking-widest">
									<span>Speed</span>
									<span>{speedMultiplier.toFixed(1)}×</span>
								</div>
								<input
									type="range"
									min={1}
									max={10}
									step={0.1}
									value={speedMultiplier}
									onChange={e => handleSpeedChange(Number(e.target.value))}
									className="w-full cursor-pointer accent-current text-foreground"
									aria-label="Speed"
								/>
							</div>
							<button
								onClick={handleNewGame}
								className="w-full border border-border/20 text-muted py-0.5 uppercase tracking-widest text-[0.6rem] cursor-pointer hover:text-foreground/70 hover:border-border/40 transition-colors"
							>
								New Game
							</button>
						</div>
					)}
					<button
						onClick={() => setShowControls(v => !v)}
						className={`text-[0.65rem] font-mono transition-colors select-none leading-none px-2 py-1 -mr-1 -mb-1 cursor-pointer rounded-sm bg-foreground/10 ${showControls ? "text-foreground/70" : "text-foreground/40 hover:text-foreground/60"}`}
						aria-label="Toggle GOL controls"
					>
						gol
					</button>
				</div>
			</div>
		</>
	);
}
