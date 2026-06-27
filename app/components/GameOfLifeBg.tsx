"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const CELL_SIZE = 100;
const CELL_INSET = 10;
const CELL_DRAW = CELL_SIZE - CELL_INSET * 2;
const CELL_RADIUS = CELL_DRAW / 2;

const INITIAL_DENSITY = 0.5;
const FADE_TURNS = 3;
const BLUR_PX = 20;
const MAX_OPACITY = 1.0;
const MIN_SCALE = 0.8;
const FADE_GAMMA =1.5;
const CULL = 0.001;
const PALETTE_STEPS = 5;
const PALETTE_START = { r: 170, g: 178, b: 198 };
const PALETTE_END = { r: 194, g: 176, b: 188 };

const DEFAULT_INTERVAL_MS = 1000;
const DEFAULT_SPEED = 1.0;
const LWSS_CHANCE = 0.05;

const GLIDER_PATTERNS: ReadonlyArray<ReadonlyArray<[number, number]>> = [
	// Diagonal gliders (3×3 bounding box)
	[[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
	[[1, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
	[[0, 0], [1, 0], [2, 0], [2, 1], [1, 2]],
	[[0, 0], [1, 0], [2, 0], [0, 1], [1, 2]],
];
const LWSS_PATTERNS: ReadonlyArray<ReadonlyArray<[number, number]>> = [
	// Lightweight Spaceships (LWSS, 5×4 or 4×5 bounding box)
	[[1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [4, 1], [4, 2], [0, 3], [3, 3]],
	[[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [4, 1], [0, 2], [1, 3], [4, 3]],
	[[0, 0], [2, 0], [3, 1], [3, 2], [0, 3], [3, 3], [1, 4], [2, 4], [3, 4]],
	[[0, 0], [1, 0], [2, 0], [0, 1], [3, 1], [0, 2], [0, 3], [1, 4], [3, 4]],
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function stepGrid(grid: Uint8Array, rows: number, cols: number) {
	const next = new Uint8Array(cols * rows);
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			let n = 0;
			for (let dy = -1; dy <= 1; dy++)
				for (let dx = -1; dx <= 1; dx++) {
					if (dy === 0 && dx === 0) continue;
					n += grid[((y + dy + rows) % rows) * cols + (x + dx + cols) % cols];
				}
			const i = y * cols + x;
			next[i] = grid[i] ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
		}
	}
	return next;
}

interface State {
	grid: Uint8Array;
	fade: Float32Array;
	cols: number;
	rows: number;
	lastStep: number;
}

export default function GameOfLifeBg() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const spritesRef = useRef<HTMLCanvasElement[]>([]);
	const stateRef = useRef<State | null>(null);
	const intervalRef = useRef(DEFAULT_INTERVAL_MS);
	const lastFrameRef = useRef(0);

	const [speed, setSpeed] = useState(DEFAULT_SPEED);
	const [showControls, setShowControls] = useState(false);
	const controlsRef = useRef<HTMLDivElement>(null);

	const buildSprites = useCallback(() => {
		spritesRef.current = Array.from({ length: PALETTE_STEPS }, (_, i) => {
			const t = i / Math.max(PALETTE_STEPS - 1, 1);
			const r = Math.round(lerp(PALETTE_START.r, PALETTE_END.r, t));
			const g = Math.round(lerp(PALETTE_START.g, PALETTE_END.g, t));
			const b = Math.round(lerp(PALETTE_START.b, PALETTE_END.b, t));
			const spr = document.createElement("canvas");
			spr.width = CELL_SIZE;
			spr.height = CELL_SIZE;
			const sc = spr.getContext("2d")!;
			sc.fillStyle = `rgb(${r},${g},${b})`;
			sc.beginPath();
			sc.roundRect(CELL_INSET, CELL_INSET, CELL_DRAW, CELL_DRAW, CELL_RADIUS);
			sc.fill();
			return spr;
		});
	}, []);

	const init = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		buildSprites();

		const w = window.innerWidth;
		const h = window.innerHeight;
		canvas.width = w;
		canvas.height = h;

		const cols = Math.ceil(w / CELL_SIZE);
		const rows = Math.ceil(h / CELL_SIZE);
		const grid = new Uint8Array(cols * rows);
		for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < INITIAL_DENSITY ? 1 : 0;
		const fade = new Float32Array(cols * rows);
		for (let i = 0; i < fade.length; i++) fade[i] = grid[i];

		const now = performance.now();
		stateRef.current = { grid, fade, cols, rows, lastStep: now };
		lastFrameRef.current = now;
	}, [buildSprites]);

	useEffect(() => {
		init();

		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		let raf: number;

		function draw() {
			const s = stateRef.current;
			const sprites = spritesRef.current;
			if (!s || !ctx || !canvas || sprites.length === 0) { raf = requestAnimationFrame(draw); return; }

			const now = performance.now();
			const dt = Math.min(now - lastFrameRef.current, 100);
			lastFrameRef.current = now;

			const interval = intervalRef.current;

			if (now - s.lastStep >= interval) {
				s.grid = stepGrid(s.grid, s.rows, s.cols);
				s.lastStep = now;
			}

			const fadeRate = dt / (FADE_TURNS * interval);
			for (let i = 0; i < s.fade.length; i++) {
				const target = s.grid[i];
				if (s.fade[i] < target) s.fade[i] = Math.min(s.fade[i] + fadeRate, target);
				else if (s.fade[i] > target) s.fade[i] = Math.max(s.fade[i] - fadeRate, target);
			}

			ctx.clearRect(0, 0, canvas.width, canvas.height);
			const { fade, cols, rows } = s;
			let curAlpha = -1;

			for (let y = 0; y < rows; y++) {
				const py = y * CELL_SIZE;
				for (let x = 0; x < cols; x++) {
					const t = fade[y * cols + x];
					if (t <= CULL) continue;

					const eased = Math.pow(t, FADE_GAMMA);
					const opacity = eased * MAX_OPACITY;
					const sc = MIN_SCALE + (1 - MIN_SCALE) * eased;
					const dSize = CELL_SIZE * sc;
					const offset = (CELL_SIZE - dSize) / 2;
					const pi = Math.round((x / Math.max(cols - 1, 1)) * (sprites.length - 1));

					if (curAlpha !== opacity) { ctx.globalAlpha = opacity; curAlpha = opacity; }
					ctx.drawImage(sprites[pi], 0, 0, CELL_SIZE, CELL_SIZE, x * CELL_SIZE + offset, py + offset, dSize, dSize);
				}
			}
			ctx.globalAlpha = 1;

			raf = requestAnimationFrame(draw);
		}

		raf = requestAnimationFrame(draw);

		let resizeRaf = 0;
		const onResize = () => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(init); };
		window.addEventListener("resize", onResize);

		return () => {
			cancelAnimationFrame(raf);
			cancelAnimationFrame(resizeRaf);
			window.removeEventListener("resize", onResize);
		};
	}, [init]);

	const spawnPattern = useCallback((pixelX: number, pixelY: number) => {
		const s = stateRef.current;
		if (!s) return;
		const ox = Math.floor(pixelX / CELL_SIZE) - 1;
		const oy = Math.floor(pixelY / CELL_SIZE) - 1;
		const pool = Math.random() < LWSS_CHANCE ? LWSS_PATTERNS : GLIDER_PATTERNS;
		const pattern = pool[Math.floor(Math.random() * pool.length)];
		for (const [dx, dy] of pattern) {
			const cx = ((ox + dx) % s.cols + s.cols) % s.cols;
			const cy = ((oy + dy) % s.rows + s.rows) % s.rows;
			const idx = cy * s.cols + cx;
			s.grid[idx] = 1;
			s.fade[idx] = 1;
		}
	}, []);

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (controlsRef.current?.contains(e.target as Node)) return;
			spawnPattern(e.clientX, e.clientY);
		};
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, [spawnPattern]);

	useEffect(() => {
		if (!showControls) return;
		const handleOutside = (e: MouseEvent | TouchEvent) => {
			if (controlsRef.current && !controlsRef.current.contains(e.target as Node))
				setShowControls(false);
		};
		document.addEventListener("mousedown", handleOutside);
		document.addEventListener("touchstart", handleOutside);
		return () => {
			document.removeEventListener("mousedown", handleOutside);
			document.removeEventListener("touchstart", handleOutside);
		};
	}, [showControls]);

	const handleSpeedChange = (val: number) => {
		intervalRef.current = DEFAULT_INTERVAL_MS / val;
		setSpeed(val);
	};

	return (
		<>
			<canvas
				ref={canvasRef}
				aria-hidden
				className="fixed inset-0 w-full h-full pointer-events-none select-none z-0"
				style={{ filter: `blur(${BLUR_PX}px)` }}
			/>
			<div ref={controlsRef} className="fixed bottom-4 right-4 z-30">
				<div className="relative flex flex-col items-end">
					{showControls && (
						<div className="absolute bottom-full mb-2 right-0 w-44 border border-border/20 bg-background/60 backdrop-blur-md p-3 space-y-3 text-[0.65rem] font-mono">
							<div className="flex justify-end mb-1">
								<button
									onClick={() => window.location.href = "/gol-bench"}
									className="text-muted py-0.5 px-1 text-s cursor-pointer hover:text-foreground/70 hover:border-border/40 transition-colors"
								>
									Benchmark
									<span aria-hidden="true" className="text-s">↗</span>
								</button>
							</div>
							<span className="block text-muted text-s leading-relaxed">Conway&apos;s Game of Life background. Runs about as efficiently as scrolling Google search.</span>
							<div className="space-y-1">
								<div className="flex justify-between text-muted uppercase tracking-widest">
									<span>Speed</span>
									<span>{speed.toFixed(1)}×</span>
								</div>
								<input
									type="range"
									min={1}
									max={100}
									step={0.1}
									value={speed}
									onChange={e => handleSpeedChange(Number(e.target.value))}
									className="w-full cursor-pointer accent-current text-foreground"
									aria-label="Speed"
								/>
							</div>
							<button
								onClick={init}
								className="w-full border border-border/20 text-muted py-0.5 uppercase tracking-widest text-s cursor-pointer hover:text-foreground/70 hover:border-border/40 transition-colors"
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
