"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameOfLifeBg from "../components/GameOfLifeBg";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LongTask {
    startTime: number;
    duration: number;
}

interface MemorySample {
    timestamp: number;
    usedMB: number;
    totalMB: number;
}

type BenchmarkStatus = "idle" | "warmup" | "running" | "done";
type ActiveTab = "bench" | "compare";

interface PercentileStats {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    stddev: number;
}

interface BenchmarkReport {
    label?: string;
    metadata: {
        capturedAt: string;
        warmupMs: number;
        durationMs: number;
        totalFrames: number;
        viewportWidth: number;
        viewportHeight: number;
        gridCols: number;
        gridRows: number;
        totalCells: number;
        userAgent: string;
        hardwareConcurrency: number;
        devicePixelRatio: number;
    };
    fps: PercentileStats;
    frameTimeMs: PercentileStats;
    budget: {
        framesUnder8ms: number;
        framesUnder8msPercent: number;
        framesUnder16ms: number;
        framesUnder16msPercent: number;
        jankFrames: number;
        jankPercent: number;
        droppedFrames: number;
        droppedPercent: number;
    };
    longTasks: {
        count: number;
        totalDurationMs: number;
        avgDurationMs: number | null;
        maxDurationMs: number | null;
        tasksPerSecond: number;
    };
    memory: {
        available: boolean;
        startUsedMB: number | null;
        endUsedMB: number | null;
        deltaMB: number | null;
        peakUsedMB: number | null;
        avgUsedMB: number | null;
    };
    paintEntries: Array<{ name: string; startTime: number }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CELL_SIZE_PX = 50; // must match GameOfLifeBg

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return sorted[idx];
}

function computeStats(values: number[]): PercentileStats {
    if (values.length === 0) {
        return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, stddev: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
    return {
        avg,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        stddev: Math.sqrt(variance),
    };
}

function fmt(n: number, decimals = 2): string {
    return n.toFixed(decimals);
}
function fmtMs(n: number): string {
    return `${fmt(n)} ms`;
}
function fmtFps(n: number): string {
    return `${fmt(n)} fps`;
}
function scoreClass(value: number, good: number, ok: number): string {
    if (value >= good) return "text-green-400";
    if (value >= ok) return "text-yellow-400";
    return "text-red-400";
}
function scoreClassInverse(value: number, good: number, ok: number): string {
    if (value <= good) return "text-green-400";
    if (value <= ok) return "text-yellow-400";
    return "text-red-400";
}

function isValidReport(obj: unknown): obj is BenchmarkReport {
    if (typeof obj !== "object" || obj === null) return false;
    const r = obj as Record<string, unknown>;
    return (
        typeof r.metadata === "object" &&
        r.metadata !== null &&
        typeof (r.metadata as Record<string, unknown>).capturedAt === "string"
    );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_WARMUP_MS = 2000;
const DEFAULT_DURATION_MS = 10000;
const MEMORY_POLL_INTERVAL_MS = 500;

// ─── Main component ───────────────────────────────────────────────────────────

export default function GolBenchPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>("bench");

    // Benchmark state
    const [status, setStatus] = useState<BenchmarkStatus>("idle");
    const [report, setReport] = useState<BenchmarkReport | null>(null);
    const [warmupMs, setWarmupMs] = useState(DEFAULT_WARMUP_MS);
    const [durationMs, setDurationMs] = useState(DEFAULT_DURATION_MS);
    const [countdown, setCountdown] = useState(0);
    const [progress, setProgress] = useState(0);

    // Compare state
    const [savedRuns, setSavedRuns] = useState<BenchmarkReport[]>([]);
    const [compareError, setCompareError] = useState<string | null>(null);

    // Live recording counts
    const [liveFrameCount, setLiveFrameCount] = useState(0);
    const [liveLongTaskCount, setLiveLongTaskCount] = useState(0);

    // Shared refs
    const statusRef = useRef<BenchmarkStatus>("idle");

    const frameDeltasRef = useRef<number[]>([]);
    const longTasksRef = useRef<LongTask[]>([]);
    const memorySamplesRef = useRef<MemorySample[]>([]);
    const paintEntriesRef = useRef<Array<{ name: string; startTime: number }>>([]);

    const rafIdRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(0);
    const benchStartRef = useRef<number>(0);
    const observerRef = useRef<PerformanceObserver | null>(null);
    const memTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRafRef = useRef<number>(0);
    const measureFrameRef = useRef<FrameRequestCallback | null>(null);
    const configRef = useRef({ warmupMs, durationMs });

    useEffect(() => { configRef.current = { warmupMs, durationMs }; }, [warmupMs, durationMs]);

    // ─── Memory sampling ────────────────────────────────────────────────────

    const sampleMemory = useCallback(() => {
        // @ts-expect-error performance.memory is non-standard (Chrome only)
        const mem = performance.memory as
            | { usedJSHeapSize: number; totalJSHeapSize: number }
            | undefined;
        if (!mem) return;
        memorySamplesRef.current.push({
            timestamp: performance.now(),
            usedMB: mem.usedJSHeapSize / 1024 / 1024,
            totalMB: mem.totalJSHeapSize / 1024 / 1024,
        });
    }, []);

    // ─── Build report ────────────────────────────────────────────────────────

    const buildReport = useCallback((
        cfg: { warmupMs: number; durationMs: number },
    ): BenchmarkReport => {
        const deltas = frameDeltasRef.current;
        const fpsSamples = deltas.map((d) => 1000 / d);
        const total = deltas.length;

        const framesUnder8 = deltas.filter((d) => d < 8).length;
        const framesUnder16 = deltas.filter((d) => d < 16.667).length;
        const jankFrames = deltas.filter((d) => d >= 33.333).length;
        const droppedFrames = deltas.filter((d) => d >= 50).length;

        const longTasks = longTasksRef.current;
        const ltTotal = longTasks.reduce((s, t) => s + t.duration, 0);
        const ltMax = longTasks.length > 0 ? Math.max(...longTasks.map((t) => t.duration)) : null;
        const ltAvg = longTasks.length > 0 ? ltTotal / longTasks.length : null;

        const memSamples = memorySamplesRef.current;
        // @ts-expect-error performance.memory is non-standard
        const memAvailable = typeof performance.memory !== "undefined";
        const peakMem = memSamples.length > 0 ? Math.max(...memSamples.map((s) => s.usedMB)) : null;
        const avgMem = memSamples.length > 0 ? memSamples.reduce((s, m) => s + m.usedMB, 0) / memSamples.length : null;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const gridCols = Math.ceil(vw / CELL_SIZE_PX);
        const gridRows = Math.ceil(
            Math.max(document.documentElement.scrollHeight, vh) / CELL_SIZE_PX
        );

        const base: BenchmarkReport = {
            metadata: {
                capturedAt: new Date().toISOString(),
                warmupMs: cfg.warmupMs,
                durationMs: cfg.durationMs,
                totalFrames: total,
                viewportWidth: vw,
                viewportHeight: vh,
                gridCols,
                gridRows,
                totalCells: gridCols * gridRows,
                userAgent: navigator.userAgent,
                hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
                devicePixelRatio: window.devicePixelRatio ?? 1,
            },
            fps: computeStats(fpsSamples),
            frameTimeMs: computeStats(deltas),
            budget: {
                framesUnder8ms: framesUnder8,
                framesUnder8msPercent: total > 0 ? (framesUnder8 / total) * 100 : 0,
                framesUnder16ms: framesUnder16,
                framesUnder16msPercent: total > 0 ? (framesUnder16 / total) * 100 : 0,
                jankFrames,
                jankPercent: total > 0 ? (jankFrames / total) * 100 : 0,
                droppedFrames,
                droppedPercent: total > 0 ? (droppedFrames / total) * 100 : 0,
            },
            longTasks: {
                count: longTasks.length,
                totalDurationMs: ltTotal,
                avgDurationMs: ltAvg,
                maxDurationMs: ltMax,
                tasksPerSecond: longTasks.length / (cfg.durationMs / 1000),
            },
            memory: {
                available: memAvailable,
                startUsedMB: memSamples[0]?.usedMB ?? null,
                endUsedMB: memSamples[memSamples.length - 1]?.usedMB ?? null,
                deltaMB: memSamples.length > 1
                    ? memSamples[memSamples.length - 1].usedMB - memSamples[0].usedMB
                    : null,
                peakUsedMB: peakMem,
                avgUsedMB: avgMem,
            },
            paintEntries: paintEntriesRef.current,
        };

        return base;
    }, []);

    // ─── Shared observer setup / teardown ────────────────────────────────────

    const startObservers = useCallback((activeStatusRef: React.MutableRefObject<BenchmarkStatus>) => {
        try {
            const obs = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === "longtask" && activeStatusRef.current === "running") {
                        longTasksRef.current.push({ startTime: entry.startTime, duration: entry.duration });
                    } else if (entry.entryType === "paint") {
                        paintEntriesRef.current.push({ name: entry.name, startTime: entry.startTime });
                    }
                }
            });
            obs.observe({ entryTypes: ["longtask", "paint"] });
            observerRef.current = obs;
        } catch {
            // longtask not supported in all browsers
        }
    }, []);

    const stopObservers = useCallback(() => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        if (memTimerRef.current !== null) {
            clearInterval(memTimerRef.current);
            memTimerRef.current = null;
        }
        cancelAnimationFrame(rafIdRef.current);
        cancelAnimationFrame(countdownRafRef.current);
    }, []);

    // ─── Static benchmark ─────────────────────────────────────────────────────

    const measureFrame = useCallback((now: number) => {
        if (statusRef.current === "idle" || statusRef.current === "done") return;
        if (lastFrameTimeRef.current !== 0 && statusRef.current === "running") {
            const delta = now - lastFrameTimeRef.current;
            if (delta < 1000) frameDeltasRef.current.push(delta);
        }
        lastFrameTimeRef.current = now;
        rafIdRef.current = requestAnimationFrame(measureFrameRef.current!);
    }, []);
    useEffect(() => {
        measureFrameRef.current = measureFrame;
    }, [measureFrame]);

    const startBenchmark = useCallback(() => {
        if (statusRef.current !== "idle") return;

        frameDeltasRef.current = [];
        longTasksRef.current = [];
        memorySamplesRef.current = [];
        paintEntriesRef.current = [];
        lastFrameTimeRef.current = 0;
        setReport(null);
        setLiveFrameCount(0);
        setLiveLongTaskCount(0);

        startObservers(statusRef);

        statusRef.current = "warmup";
        setStatus("warmup");
        setCountdown(Math.ceil(configRef.current.warmupMs / 1000));

        const warmupStart = performance.now();
        const tickCountdown = () => {
            const elapsed = performance.now() - warmupStart;
            setCountdown(Math.ceil(Math.max(0, configRef.current.warmupMs - elapsed) / 1000));
            if (elapsed < configRef.current.warmupMs) countdownRafRef.current = requestAnimationFrame(tickCountdown);
        };
        countdownRafRef.current = requestAnimationFrame(tickCountdown);

        const warmupTimeout = setTimeout(() => {
            statusRef.current = "running";
            setStatus("running");
            benchStartRef.current = performance.now();
            sampleMemory();
            memTimerRef.current = setInterval(sampleMemory, MEMORY_POLL_INTERVAL_MS);

            const tickProgress = () => {
                const pct = Math.min((performance.now() - benchStartRef.current) / configRef.current.durationMs, 1);
                setProgress(pct);
                setLiveFrameCount(frameDeltasRef.current.length);
                setLiveLongTaskCount(longTasksRef.current.length);
                if (pct < 1) countdownRafRef.current = requestAnimationFrame(tickProgress);
            };
            countdownRafRef.current = requestAnimationFrame(tickProgress);

            const endTimeout = setTimeout(() => {
                sampleMemory();
                statusRef.current = "done";
                setStatus("done");
                setProgress(1);
                stopObservers();
                cancelAnimationFrame(rafIdRef.current);
                setReport(buildReport(configRef.current));
            }, configRef.current.durationMs);

            return () => clearTimeout(endTimeout);
        }, configRef.current.warmupMs);

        rafIdRef.current = requestAnimationFrame(measureFrame);
        return () => clearTimeout(warmupTimeout);
    }, [measureFrame, sampleMemory, stopObservers, buildReport, startObservers]);

    const resetBenchmark = useCallback(() => {
        stopObservers();
        statusRef.current = "idle";
        setStatus("idle");
        setProgress(0);
        setCountdown(0);
    }, [stopObservers]);


    // ─── Download / save ──────────────────────────────────────────────────────

    const downloadReport = useCallback((r: BenchmarkReport) => {
        const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gol-bench-${r.metadata.capturedAt.replace(/[:.]/g, "-")}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    const saveToComparison = useCallback((r: BenchmarkReport) => {
        setSavedRuns((prev) =>
            [...prev, r].sort(
                (a, b) => new Date(a.metadata.capturedAt).getTime() - new Date(b.metadata.capturedAt).getTime()
            )
        );
    }, []);

    // ─── File upload for compare ──────────────────────────────────────────────

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;
        setCompareError(null);

        Promise.all(
            files.map(
                (file) =>
                    new Promise<BenchmarkReport | null>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            try {
                                const parsed = JSON.parse(ev.target?.result as string);
                                if (!isValidReport(parsed)) { resolve(null); return; }
                                if (!parsed.label) parsed.label = file.name.replace(/\.json$/, "");
                                resolve(parsed as BenchmarkReport);
                            } catch {
                                resolve(null);
                            }
                        };
                        reader.readAsText(file);
                    })
            )
        ).then((results) => {
            const valid = results.filter((r): r is BenchmarkReport => r !== null);
            const invalid = results.length - valid.length;
            if (invalid > 0) setCompareError(`${invalid} file(s) could not be parsed as valid reports.`);
            if (valid.length > 0) {
                setSavedRuns((prev) =>
                    [...prev, ...valid].sort(
                        (a, b) => new Date(a.metadata.capturedAt).getTime() - new Date(b.metadata.capturedAt).getTime()
                    )
                );
            }
        });

        e.target.value = "";
    }, []);

    // ─── Cleanup ──────────────────────────────────────────────────────────────

    useEffect(() => {
        return () => { stopObservers(); };
    }, [stopObservers]);

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="relative text-foreground antialiased font-mono">
            <GameOfLifeBg />

            <div className="relative z-10 max-w-3xl mx-auto px-6 py-12 space-y-8">
                {/* Header */}
                <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted">Performance Lab</p>
                    <h1 className="text-3xl font-semibold tracking-tight mt-2">GOL Background Benchmark</h1>
                    <p className="text-sm text-foreground/60 mt-2 leading-relaxed">
                        Measures the rendering cost of <code className="text-foreground/80">GameOfLifeBg</code> without
                        modifying the component. A separate RAF probe captures inter-frame deltas, long tasks, and
                        heap pressure alongside the component&apos;s own loop.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex border border-border/30">
                    {(["bench", "compare"] as ActiveTab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-xs uppercase tracking-widest transition-colors cursor-pointer ${activeTab === tab
                                    ? "bg-foreground/10 text-foreground"
                                    : "text-foreground/40 hover:text-foreground/60"
                                }`}
                        >
                            {tab === "bench" ? "Benchmark" : "Compare"}
                        </button>
                    ))}
                </div>

                {/* ── Static benchmark tab ── */}
                {activeTab === "bench" && (
                    <div className="space-y-6">
                        {status === "idle" && (
                            <ConfigPanel
                                warmupMs={warmupMs}
                                durationMs={durationMs}
                                onWarmupChange={setWarmupMs}
                                onDurationChange={setDurationMs}
                                onStart={startBenchmark}
                            />
                        )}
                        {status === "warmup" && <WarmupCard countdown={countdown} />}
                        {status === "running" && (
                            <RunningCard
                                progress={progress}
                                frameCount={liveFrameCount}
                                longTaskCount={liveLongTaskCount}
                            />
                        )}
                        {status === "done" && report && (
                            <Report
                                report={report}
                                onReset={resetBenchmark}
                                onDownload={() => downloadReport(report)}
                                onSaveToCompare={() => saveToComparison(report)}
                            />
                        )}
                    </div>
                )}

                {/* ── Compare tab ── */}
                {activeTab === "compare" && (
                    <ComparePanel
                        runs={savedRuns}
                        onUpload={handleFileUpload}
                        onRemove={(i) => setSavedRuns((prev) => prev.filter((_, idx) => idx !== i))}
                        onClear={() => setSavedRuns([])}
                        error={compareError}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ConfigPanel({
    warmupMs,
    durationMs,
    onWarmupChange,
    onDurationChange,
    onStart,
}: {
    warmupMs: number;
    durationMs: number;
    onWarmupChange: (v: number) => void;
    onDurationChange: (v: number) => void;
    onStart: () => void;
}) {
    return (
        <section className="border border-border/30 bg-background/60 backdrop-blur-sm p-5 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-muted">Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1">
                    <span className="text-xs text-muted uppercase tracking-widest">Warmup</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="range" min={1000} max={10000} step={500} value={warmupMs}
                            onChange={(e) => onWarmupChange(Number(e.target.value))}
                            className="flex-1 accent-current"
                        />
                        <span className="text-xs w-14 text-right">{(warmupMs / 1000).toFixed(1)} s</span>
                    </div>
                </label>
                <label className="space-y-1">
                    <span className="text-xs text-muted uppercase tracking-widest">Duration</span>
                    <div className="flex items-center gap-2">
                        <input
                            type="range" min={5000} max={60000} step={1000} value={durationMs}
                            onChange={(e) => onDurationChange(Number(e.target.value))}
                            className="flex-1 accent-current"
                        />
                        <span className="text-xs w-14 text-right">{(durationMs / 1000).toFixed(0)} s</span>
                    </div>
                </label>
            </div>
            <button
                onClick={onStart}
                className="w-full border border-border/30 py-2 text-xs uppercase tracking-widest hover:bg-foreground/5 transition-colors cursor-pointer"
            >
                Start Benchmark
            </button>
        </section>
    );
}

function WarmupCard({ countdown }: { countdown: number }) {
    return (
        <section className="border border-border/30 bg-background/60 backdrop-blur-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-muted">Warmup</span>
                <span className="text-2xl tabular-nums">{countdown}s</span>
            </div>
            <p className="text-xs text-foreground/50">Letting the simulation stabilize before sampling begins…</p>
        </section>
    );
}

function RunningCard({
    progress,
    frameCount,
    longTaskCount,
}: {
    progress: number;
    frameCount: number;
    longTaskCount: number;
}) {
    return (
        <section className="border border-border/30 bg-background/60 backdrop-blur-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-muted">Recording</span>
                <span className="text-xs tabular-nums">{(progress * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
                <div className="h-full bg-foreground/60 transition-none" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                <span className="text-xs text-foreground/50">{frameCount} frames</span>
                <span className="text-xs text-foreground/30">·</span>
                <span className="text-xs text-foreground/50">{longTaskCount} long tasks</span>
            </div>
        </section>
    );
}

// ─── Report display ───────────────────────────────────────────────────────────

function StatRow({
    label,
    value,
    colorClass,
    note,
}: {
    label: string;
    value: string;
    colorClass?: string;
    note?: string;
}) {
    return (
        <div className="flex items-baseline justify-between gap-4 py-1 border-b border-border/10 last:border-0">
            <span className="text-xs text-foreground/50 shrink-0">{label}</span>
            <div className="text-right">
                <span className={`text-xs tabular-nums ${colorClass ?? ""}`}>{value}</span>
                {note && <span className="ml-2 text-[0.6rem] text-foreground/30">{note}</span>}
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <h3 className="text-[0.6rem] uppercase tracking-widest text-muted mb-2">{title}</h3>
            {children}
        </div>
    );
}

function Report({
    report,
    onReset,
    onDownload,
    onSaveToCompare,
}: {
    report: BenchmarkReport;
    onReset: () => void;
    onDownload: () => void;
    onSaveToCompare: () => void;
}) {
    const r = report;
    const btnClass = "flex-1 border border-border/30 py-2 text-xs uppercase tracking-widest hover:bg-foreground/5 transition-colors cursor-pointer bg-background/60 backdrop-blur-sm";
    const sectionClass = "border border-border/30 bg-background/60 backdrop-blur-sm p-5 space-y-4";
    return (
        <div className="space-y-6">
            <div className="flex gap-3 flex-wrap">
                <button onClick={onReset} className={btnClass}>
                    Run Again
                </button>
                <button onClick={onDownload} className={btnClass}>
                    Download JSON
                </button>
                <button onClick={onSaveToCompare} className={btnClass}>
                    Save to Compare
                </button>
            </div>

            <div className={sectionClass}>
                <Section title="Benchmark Metadata">
                    <StatRow label="Captured at" value={new Date(r.metadata.capturedAt).toLocaleString()} />
                    <StatRow label="Warmup / Duration" value={`${r.metadata.warmupMs / 1000} s / ${r.metadata.durationMs / 1000} s`} />
                    <StatRow label="Total frames sampled" value={r.metadata.totalFrames.toString()} />
                    <StatRow label="Viewport" value={`${r.metadata.viewportWidth} x ${r.metadata.viewportHeight} px`} />
                    <StatRow label="Grid" value={`${r.metadata.gridCols} x ${r.metadata.gridRows} = ${r.metadata.totalCells} cells`} />
                    <StatRow label="Device pixel ratio" value={r.metadata.devicePixelRatio.toString()} />
                    <StatRow label="CPU cores" value={r.metadata.hardwareConcurrency.toString()} />
                </Section>
            </div>

            <div className={sectionClass}>
                <Section title="Frames per Second">
                    <StatRow label="Average" value={fmtFps(r.fps.avg)} colorClass={scoreClass(r.fps.avg, 55, 45)} />
                    <StatRow label="Min" value={fmtFps(r.fps.min)} colorClass={scoreClass(r.fps.min, 30, 20)} />
                    <StatRow label="Max" value={fmtFps(r.fps.max)} />
                    <StatRow label="p50" value={fmtFps(r.fps.p50)} colorClass={scoreClass(r.fps.p50, 55, 45)} />
                    <StatRow label="p95" value={fmtFps(r.fps.p95)} colorClass={scoreClass(r.fps.p95, 40, 25)} />
                    <StatRow label="p99" value={fmtFps(r.fps.p99)} colorClass={scoreClass(r.fps.p99, 30, 20)} />
                    <StatRow label="Std dev" value={fmtFps(r.fps.stddev)} note="lower = more stable" />
                </Section>
            </div>

            <div className={sectionClass}>
                <Section title="Frame Time">
                    <StatRow label="Average" value={fmtMs(r.frameTimeMs.avg)} colorClass={scoreClassInverse(r.frameTimeMs.avg, 16.667, 33)} />
                    <StatRow label="Min" value={fmtMs(r.frameTimeMs.min)} />
                    <StatRow label="Max" value={fmtMs(r.frameTimeMs.max)} colorClass={scoreClassInverse(r.frameTimeMs.max, 33, 100)} />
                    <StatRow label="p50" value={fmtMs(r.frameTimeMs.p50)} colorClass={scoreClassInverse(r.frameTimeMs.p50, 16.667, 33)} />
                    <StatRow label="p95" value={fmtMs(r.frameTimeMs.p95)} colorClass={scoreClassInverse(r.frameTimeMs.p95, 33, 50)} />
                    <StatRow label="p99" value={fmtMs(r.frameTimeMs.p99)} colorClass={scoreClassInverse(r.frameTimeMs.p99, 50, 100)} />
                    <StatRow label="Std dev" value={fmtMs(r.frameTimeMs.stddev)} note="lower = more stable" />
                </Section>
            </div>

            <div className={sectionClass}>
                <Section title="Frame Budget Compliance">
                    <StatRow label="Frames < 8 ms (120 fps budget)" value={`${r.budget.framesUnder8ms} (${fmt(r.budget.framesUnder8msPercent)}%)`} colorClass={scoreClass(r.budget.framesUnder8msPercent, 60, 30)} />
                    <StatRow label="Frames < 16.67 ms (60 fps budget)" value={`${r.budget.framesUnder16ms} (${fmt(r.budget.framesUnder16msPercent)}%)`} colorClass={scoreClass(r.budget.framesUnder16msPercent, 80, 60)} />
                    <StatRow label="Jank frames >= 33 ms" value={`${r.budget.jankFrames} (${fmt(r.budget.jankPercent)}%)`} colorClass={scoreClassInverse(r.budget.jankPercent, 2, 10)} note=">= 1 dropped frame" />
                    <StatRow label="Dropped frames >= 50 ms" value={`${r.budget.droppedFrames} (${fmt(r.budget.droppedPercent)}%)`} colorClass={scoreClassInverse(r.budget.droppedPercent, 0.5, 5)} note=">= 2 dropped frames" />
                </Section>
            </div>

            <div className={sectionClass}>
                <Section title="Long Tasks (> 50 ms, main thread)">
                    <StatRow label="Count" value={r.longTasks.count.toString()} colorClass={scoreClassInverse(r.longTasks.count, 0, 5)} />
                    <StatRow label="Total blocked time" value={fmtMs(r.longTasks.totalDurationMs)} colorClass={scoreClassInverse(r.longTasks.totalDurationMs, 50, 300)} />
                    <StatRow label="Avg duration" value={r.longTasks.avgDurationMs !== null ? fmtMs(r.longTasks.avgDurationMs) : "n/a"} />
                    <StatRow label="Max duration" value={r.longTasks.maxDurationMs !== null ? fmtMs(r.longTasks.maxDurationMs) : "n/a"} colorClass={r.longTasks.maxDurationMs !== null ? scoreClassInverse(r.longTasks.maxDurationMs, 50, 200) : undefined} />
                    <StatRow label="Tasks per second" value={fmt(r.longTasks.tasksPerSecond)} colorClass={scoreClassInverse(r.longTasks.tasksPerSecond, 0, 0.5)} />
                </Section>
            </div>

            <div className={sectionClass}>
                <Section title="JS Heap Memory">
                    {r.memory.available ? (
                        <>
                            <StatRow label="Start" value={`${fmt(r.memory.startUsedMB!)} MB`} />
                            <StatRow label="End" value={`${fmt(r.memory.endUsedMB!)} MB`} />
                            <StatRow label="Delta" value={`${r.memory.deltaMB! >= 0 ? "+" : ""}${fmt(r.memory.deltaMB!)} MB`} colorClass={scoreClassInverse(Math.abs(r.memory.deltaMB!), 5, 20)} note="heap growth during test" />
                            <StatRow label="Peak" value={`${fmt(r.memory.peakUsedMB!)} MB`} />
                            <StatRow label="Average" value={`${fmt(r.memory.avgUsedMB!)} MB`} />
                        </>
                    ) : (
                        <p className="text-xs text-foreground/40">
                            Not available — <code>performance.memory</code> requires Chrome without cross-origin isolation restrictions.
                        </p>
                    )}
                </Section>
            </div>

            <details className="border border-border/30 bg-background/60 backdrop-blur-sm">
                <summary className="px-5 py-3 text-xs uppercase tracking-widest text-muted cursor-pointer select-none hover:text-foreground/60 transition-colors">
                    Raw JSON
                </summary>
                <pre className="px-5 pb-5 text-[0.6rem] leading-relaxed text-foreground/50 overflow-x-auto max-h-96">
                    {JSON.stringify(report, null, 2)}
                </pre>
            </details>
        </div>
    );
}

// ─── Compare panel ────────────────────────────────────────────────────────────

const COMPARE_METRICS: Array<{
    label: string;
    get: (r: BenchmarkReport) => string;
    colorFn?: (r: BenchmarkReport) => string;
}> = [
        { label: "Captured at", get: (r) => new Date(r.metadata.capturedAt).toLocaleString() },
        { label: "Duration", get: (r) => `${r.metadata.durationMs / 1000} s` },
        { label: "Frames", get: (r) => r.metadata.totalFrames.toString() },
        { label: "Grid cells", get: (r) => r.metadata.totalCells.toString() },
        { label: "Avg FPS", get: (r) => fmtFps(r.fps.avg), colorFn: (r) => scoreClass(r.fps.avg, 55, 45) },
        { label: "p50 FPS", get: (r) => fmtFps(r.fps.p50), colorFn: (r) => scoreClass(r.fps.p50, 55, 45) },
        { label: "p95 FPS", get: (r) => fmtFps(r.fps.p95), colorFn: (r) => scoreClass(r.fps.p95, 40, 25) },
        { label: "p99 FPS", get: (r) => fmtFps(r.fps.p99), colorFn: (r) => scoreClass(r.fps.p99, 30, 20) },
        { label: "FPS stddev", get: (r) => fmtFps(r.fps.stddev) },
        { label: "Avg frame", get: (r) => fmtMs(r.frameTimeMs.avg), colorFn: (r) => scoreClassInverse(r.frameTimeMs.avg, 16.667, 33) },
        { label: "p95 frame", get: (r) => fmtMs(r.frameTimeMs.p95), colorFn: (r) => scoreClassInverse(r.frameTimeMs.p95, 33, 50) },
        { label: "p99 frame", get: (r) => fmtMs(r.frameTimeMs.p99), colorFn: (r) => scoreClassInverse(r.frameTimeMs.p99, 50, 100) },
        { label: "Max frame", get: (r) => fmtMs(r.frameTimeMs.max), colorFn: (r) => scoreClassInverse(r.frameTimeMs.max, 33, 100) },
        { label: "Frame stddev", get: (r) => fmtMs(r.frameTimeMs.stddev) },
        { label: "< 16.67 ms %", get: (r) => `${fmt(r.budget.framesUnder16msPercent)}%`, colorFn: (r) => scoreClass(r.budget.framesUnder16msPercent, 80, 60) },
        { label: "Jank %", get: (r) => `${fmt(r.budget.jankPercent)}%`, colorFn: (r) => scoreClassInverse(r.budget.jankPercent, 2, 10) },
        { label: "Dropped %", get: (r) => `${fmt(r.budget.droppedPercent)}%`, colorFn: (r) => scoreClassInverse(r.budget.droppedPercent, 0.5, 5) },
        { label: "Long tasks", get: (r) => r.longTasks.count.toString(), colorFn: (r) => scoreClassInverse(r.longTasks.count, 0, 5) },
        { label: "Blocked time", get: (r) => fmtMs(r.longTasks.totalDurationMs), colorFn: (r) => scoreClassInverse(r.longTasks.totalDurationMs, 50, 300) },
        {
            label: "Heap delta",
            get: (r) => r.memory.deltaMB !== null ? `${r.memory.deltaMB >= 0 ? "+" : ""}${fmt(r.memory.deltaMB)} MB` : "n/a",
            colorFn: (r) => r.memory.deltaMB !== null ? scoreClassInverse(Math.abs(r.memory.deltaMB), 5, 20) : "",
        },
    ];

function ComparePanel({
    runs,
    onUpload,
    onRemove,
    onClear,
    error,
}: {
    runs: BenchmarkReport[];
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (i: number) => void;
    onClear: () => void;
    error: string | null;
}) {
    return (
        <div className="space-y-6">
            <div className="border border-border/30 bg-background/60 backdrop-blur-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs uppercase tracking-widest text-muted">Upload Runs</h2>
                    {runs.length > 0 && (
                        <button onClick={onClear} className="text-[0.6rem] text-foreground/30 hover:text-foreground/60 uppercase tracking-widest cursor-pointer transition-colors">
                            Clear all
                        </button>
                    )}
                </div>
                <p className="text-xs text-foreground/40 leading-relaxed">
                    Upload one or more <code>.json</code> files exported from this page. Runs are sorted oldest to newest. Use &quot;Save to Compare&quot; on any completed run to add it without downloading.
                </p>
                <label className="block w-full border border-dashed border-border/30 py-4 text-center text-xs text-foreground/40 hover:text-foreground/60 hover:border-border/50 transition-colors cursor-pointer">
                    Click to select JSON files (multi-select supported)
                    <input type="file" accept=".json" multiple className="sr-only" onChange={onUpload} />
                </label>
                {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

            {runs.length === 0 ? (
                <div className="border border-border/30 bg-background/60 backdrop-blur-sm p-8 text-center">
                    <p className="text-xs text-foreground/30">No runs loaded. Upload JSON reports or use &ldquo;Save to Compare&rdquo; after a run.</p>
                </div>
            ) : (
                <div className="border border-border/30 bg-background/60 backdrop-blur-sm overflow-x-auto">
                    <div className="flex border-b border-border/20 min-w-max">
                        <div className="w-40 shrink-0 px-4 py-2 text-[0.6rem] uppercase tracking-widest text-muted border-r border-border/20">
                            Metric
                        </div>
                        {runs.map((r, i) => (
                            <div key={i} className="min-w-36 flex-1 px-3 py-2 border-r border-border/10 last:border-0">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[0.6rem] text-foreground/50 truncate">
                                        {r.label ?? `Run ${i + 1}`}
                                    </span>
                                    <button
                                        onClick={() => onRemove(i)}
                                        className="text-[0.6rem] text-foreground/20 hover:text-red-400 cursor-pointer transition-colors shrink-0"
                                        aria-label="Remove run"
                                    >
                                        x
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {COMPARE_METRICS.map((metric, mi) => (
                        <div
                            key={mi}
                            className={`flex min-w-max border-b border-border/10 last:border-0 ${mi % 2 === 0 ? "" : "bg-foreground/2"}`}
                        >
                            <div className="w-40 shrink-0 px-4 py-1.5 text-[0.6rem] text-foreground/40 border-r border-border/20 flex items-center">
                                {metric.label}
                            </div>
                            {runs.map((r, i) => (
                                <div
                                    key={i}
                                    className={`min-w-36 flex-1 px-3 py-1.5 text-[0.6rem] tabular-nums border-r border-border/10 last:border-0 flex items-center ${metric.colorFn ? metric.colorFn(r) : "text-foreground/60"}`}
                                >
                                    {metric.get(r)}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
