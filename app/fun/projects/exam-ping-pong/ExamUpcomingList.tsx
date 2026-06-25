"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { type ExamNode, type SimState } from "./useExamSim";

type ExitType = "pop" | "bounce-away" | "bounce-stay";

interface EntryState {
	node: ExamNode;
	exiting: ExitType | null;
	entering: boolean;
	isGhost: boolean;
	travelY: number | null;
	expanding: boolean;
}

interface Props {
	nodes: ExamNode[];
	simRef: { current: SimState };
}

function isVisible(node: ExamNode, fired: Set<string>): boolean {
	return !fired.has(node.id) && (node.prevFailedId === null || fired.has(node.prevFailedId));
}

function formatDate(ms: number): string {
	return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

function buildEntries(nodes: ExamNode[], fired: Set<string>): EntryState[] {
	return nodes
		.filter(n => isVisible(n, fired))
		.sort((a, b) => a.dateMs - b.dateMs)
		.map(n => ({ node: n, exiting: null, entering: false, isGhost: false, travelY: null, expanding: false }));
}

export default function ExamUpcomingList({ nodes, simRef }: Props) {
	const [entries, setEntries] = useState<EntryState[]>(() =>
		buildEntries(nodes, new Set()),
	);
	const prevFiredRef = useRef<Set<string>>(new Set());
	const outerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	useEffect(() => {
		setEntries(buildEntries(nodes, simRef.current.fired));
		prevFiredRef.current = new Set(simRef.current.fired);
	}, [nodes, simRef]);

	// After the ghost is in the DOM: measure the distance from the exam to the ghost,
	// then simultaneously start the exam's translateY and the ghost's max-height expansion.
	useLayoutEffect(() => {
		const bounceEntry = entries.find(e => !e.isGhost && e.exiting === "bounce-away" && e.travelY === null);
		if (!bounceEntry) return;

		const ghostEntry = entries.find(e => e.isGhost && e.node.prevFailedId === bounceEntry.node.id);
		if (!ghostEntry) return;

		const examEl = outerRefs.current.get(bounceEntry.node.id);
		const ghostEl = outerRefs.current.get(ghostEntry.node.id);
		if (!examEl || !ghostEl) return;

		const slotHeight = examEl.getBoundingClientRect().height + 4; // 4 = marginBottom
		const travel = ghostEl.getBoundingClientRect().top - examEl.getBoundingClientRect().top - slotHeight;

		setEntries(prev => prev.map(e => {
			if (!e.isGhost && e.node.id === bounceEntry.node.id) return { ...e, travelY: travel };
			if (e.isGhost && e.node.prevFailedId === bounceEntry.node.id) return { ...e, expanding: true };
			return e;
		}));
	}, [entries]);

	useEffect(() => {
		let raf: number;

		const loop = () => {
			const sim = simRef.current;

			if (sim.fired.size < prevFiredRef.current.size) {
				setEntries(buildEntries(nodes, sim.fired));
				prevFiredRef.current = new Set();
				raf = requestAnimationFrame(loop);
				return;
			}

			const newlyFired: Array<{ id: string; passed: boolean }> = [];
			for (const id of sim.fired) {
				if (!prevFiredRef.current.has(id)) {
					const node = nodes.find(n => n.id === id);
					if (node) newlyFired.push({ id, passed: node.passed });
					prevFiredRef.current.add(id);
				}
			}

			if (newlyFired.length > 0) {
				const exitIds = newlyFired.map(f => f.id);

				setEntries(prev => {
					let updated = [...prev];

					for (const fired of newlyFired) {
						if (fired.passed) {
							updated = updated.map(e =>
								(!e.isGhost && e.node.id === fired.id) ? { ...e, exiting: "pop" } : e,
							);
							continue;
						}

						const retryNode = nodes.find(n => n.prevFailedId === fired.id && !sim.fired.has(n.id));
						// bounce-away only when the retry lands after at least one currently visible exam
						const otherVisible = updated.filter(e => !e.isGhost && e.node.id !== fired.id && e.exiting === null);
						const isBounceAway = retryNode !== undefined && otherVisible.some(e => e.node.dateMs < retryNode.dateMs);

						if (isBounceAway && retryNode) {
							// Keep exam at full height; insert a 0-height ghost at the retry's sorted position
							updated = updated.map(e =>
								(!e.isGhost && e.node.id === fired.id)
									? { ...e, exiting: "bounce-away", travelY: null }
									: e,
							);
							const ghost: EntryState = {
								node: retryNode,
								exiting: null,
								entering: false,
								isGhost: true,
								travelY: null,
								expanding: false,
							};
							updated = [...updated, ghost].sort((a, b) => a.node.dateMs - b.node.dateMs);
						} else {
							// Retry ends up at top: old collapse + slide behavior
							updated = updated.map(e =>
								(!e.isGhost && e.node.id === fired.id) ? { ...e, exiting: "bounce-stay" } : e,
							);
							if (retryNode) {
								updated = [...updated, {
									node: retryNode,
									exiting: null,
									entering: true,
									isGhost: false,
									travelY: null,
									expanding: false,
								}].sort((a, b) => a.node.dateMs - b.node.dateMs);
							}
						}
					}

					return updated;
				});

				// Remove exiting exams; convert bounce-away ghosts to real entries (same key = no DOM remount)
				setTimeout(() => {
					setEntries(prev =>
						prev
							.filter(e => !exitIds.includes(e.node.id) || e.isGhost)
							.map(e =>
								e.isGhost && exitIds.includes(e.node.prevFailedId ?? "")
									? { ...e, isGhost: false, expanding: false, entering: false }
									: e,
							),
					);
				}, 520);
			}

			raf = requestAnimationFrame(loop);
		};

		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, [nodes, simRef]);

	return (
		<>
			<style>{`
				@keyframes examPop {
					0%   { transform: scale(1);    opacity: 1; }
					35%  { transform: scale(1.12); opacity: 1; }
					100% { transform: scale(0.2);  opacity: 0; }
				}
				@keyframes examBounceStay {
					0%   { transform: translateY(0);      opacity: 1; }
					100% { transform: translateY(100px);  opacity: 0; }
				}
				@keyframes examBounceAway {
					0%   { transform: translateY(0);             opacity: 1; }
					85%  { transform: translateY(var(--travel-y)); opacity: 1; }
					100% { transform: translateY(var(--travel-y)); opacity: 0; }
				}
				@keyframes examFadeIn {
					from { transform: translateY(-6px); opacity: 0; }
					to   { transform: translateY(0);    opacity: 1; }
				}
				@keyframes ghostExpand {
					from { max-height: 0px;  margin-bottom: 0px; }
					to   { max-height: 72px; margin-bottom: 4px; }
				}
				@keyframes ghostCardReveal {
					from { opacity: 0; }
					to   { opacity: 1; }
				}
			`}</style>
			<div className="flex flex-col gap-2 w-44 shrink-0">
				<p className="text-[0.65rem] font-mono uppercase tracking-widest text-muted">Upcoming</p>
				<div className="flex flex-col overflow-hidden h-122.5 [overflow-anchor:none]">
					{entries.map(({ node, exiting, entering, isGhost, travelY, expanding }) => (
						<div
							key={node.id}
							className="shrink-0"
							ref={el => {
								if (el) outerRefs.current.set(node.id, el);
								else outerRefs.current.delete(node.id);
							}}
							style={isGhost ? {
								overflow: "hidden",
								maxHeight: expanding ? undefined : "0px",
								marginBottom: expanding ? undefined : "0px",
								animation: expanding ? "ghostExpand 0.5s ease forwards" : undefined,
							} : exiting === "bounce-away" ? {
								overflow: "visible",
								position: "relative",
								zIndex: 10,
							maxHeight: travelY !== null ? "0px" : "72px",
							marginBottom: travelY !== null ? "0px" : "4px",
							transition: travelY !== null ? "max-height 0.5s ease, margin-bottom 0.5s ease" : undefined,
							} : {
								overflow: exiting === "bounce-stay" ? "visible" : "hidden",
								position: exiting === "bounce-stay" ? "relative" : undefined,
								zIndex: exiting === "bounce-stay" ? 10 : undefined,
								maxHeight: exiting ? "0px" : "72px",
								marginBottom: exiting ? "0px" : "4px",
								transition: exiting === "bounce-stay"
									? "max-height 0.38s ease 0.14s, margin-bottom 0.38s ease 0.14s"
									: "max-height 0.48s ease, margin-bottom 0.48s ease",
							}}
						>
							{isGhost ? (
							<div style={{ opacity: 0, animation: expanding ? "ghostCardReveal 0.095s ease 0.425s forwards" : undefined }} className="px-2 py-1.5 border border-border/60 flex flex-col gap-0.5">
									<span className="text-xs font-mono leading-tight truncate">{node.name}</span>
									<span className="text-[0.6rem] font-mono text-muted">{formatDate(node.dateMs)}</span>
								</div>
							) : (
								<div
									style={exiting === "bounce-away" ? {
										"--travel-y": travelY !== null ? `${travelY}px` : "0px",
										animation: travelY !== null ? "examBounceAway 0.5s ease forwards" : undefined,
									} as React.CSSProperties : {
										animation: exiting === "pop"
											? "examPop 0.45s ease forwards"
											: exiting === "bounce-stay"
											? "examBounceStay 0.48s ease-in forwards"
											: entering
											? "examFadeIn 0.3s ease forwards"
											: undefined,
									}}
									onAnimationEnd={entering ? () => {
										setEntries(prev =>
											prev.map(e => e.node.id === node.id && !e.isGhost ? { ...e, entering: false } : e),
										);
									} : undefined}
									className="px-2 py-1.5 border border-border/60 flex flex-col gap-0.5"
								>
									<span className="text-xs font-mono leading-tight truncate">{node.name}</span>
									<span className="text-[0.6rem] font-mono text-muted">{formatDate(node.dateMs)}</span>
								</div>
							)}
						</div>
					))}
					{entries.length === 0 && (
						<span className="text-[0.65rem] font-mono text-muted/60 italic">—</span>
					)}
				</div>
			</div>
		</>
	);
}
