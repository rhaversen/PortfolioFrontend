"use client";

import { useEffect, useState } from "react";
import { type ReactElement } from "react";
import type { CvData } from "./CvData";
import CvTemplate from "./CvTemplate";

const WIPE_MS = 1500;
const WIPE_DELAY_MS = 400;

export default function CvReveal({ data }: { data: CvData }): ReactElement {
	const [revealed, setRevealed] = useState(false);
	const [wipeDone, setWipeDone] = useState(false);

	useEffect(() => {
		// Brief pause before the sweep starts; one frame delay so the initial
		// clip state paints before the transition.
		const raf = requestAnimationFrame(() => setTimeout(() => setRevealed(true), WIPE_DELAY_MS));
		return () => cancelAnimationFrame(raf);
	}, []);

	useEffect(() => {
		if (!revealed) return;
		const timer = setTimeout(() => setWipeDone(true), WIPE_MS);
		return () => clearTimeout(timer);
	}, [revealed]);

	// Before reveal: JSON covers the CV; on reveal the clip sweeps it away.
	// wipeDone is just cleanup so the clipped-away layer is removed from the DOM.
	const jsonLayerClass = wipeDone
		? "hidden"
		: "cv-layer-wipe absolute inset-0 bg-white z-10 print:hidden";
	const jsonClip = revealed ? "inset(100% 0 0 0)" : "inset(0 0 0 0)";

	return (
		<div className="relative">
			{!wipeDone && (
				<div className={jsonLayerClass} style={{ clipPath: jsonClip }} aria-hidden="true">
					<CvJsonView data={data} />
				</div>
			)}

			{/* The photo (z-20 in CvTemplate) sits above this opaque overlay, so it is
			    visible from the start; the overlay alone hides the CV text pre-reveal. */}
			<CvTemplate data={data} />
		</div>
	);
}

// Light theme: brackets cycle dark colors by depth; keys/punctuation black, values near-black blue.
const DEPTH_COLORS = ["text-yellow-700", "text-purple-700", "text-blue-700"];
const KEY_CLASS = "text-black";
const PUNCT_CLASS = "text-black";
const VALUE_CLASS = "text-blue-950";

function isPrimitive(value: unknown): boolean {
	return value === null || typeof value !== "object";
}

function V({ value, depth }: { value: unknown; depth: number }): ReactElement {
	const bc = DEPTH_COLORS[depth % DEPTH_COLORS.length];
	const ind = "  ".repeat(depth);

	if (isPrimitive(value)) {
		return <span className={VALUE_CLASS}>{JSON.stringify(value)}</span>;
	}

	if (Array.isArray(value)) {
		return (
			<>
				<span className={bc}>[</span>
				{value.map((item, i) => (
					<span key={i}>
						{"\n"}{ind}
						<V value={item} depth={depth + 1} />
						{i < value.length - 1 && <span className={PUNCT_CLASS}>,</span>}
					</span>
				))}
				{"\n"}{"  ".repeat(depth - 1)}
				<span className={bc}>]</span>
			</>
		);
	}

	const entries = Object.entries(value as Record<string, unknown>);
	if (entries.every(([, v]) => isPrimitive(v))) {
		return (
			<>
				<span className={bc}>{"{ "}</span>
				{entries.map(([k, v], i) => (
					<span key={k}>
						<span className={KEY_CLASS}>{k}: </span>
						<V value={v} depth={depth + 1} />
						{i < entries.length - 1 && <span className={PUNCT_CLASS}>, </span>}
					</span>
				))}
				<span className={bc}>{" }"}</span>
			</>
		);
	}

	return (
		<>
			<span className={bc}>{"{"}</span>
			{entries.map(([k, v], i) => (
				<span key={k}>
					{"\n"}{ind}
					<span className={KEY_CLASS}>{k}: </span>
					<V value={v} depth={depth + 1} />
					{i < entries.length - 1 && <span className={PUNCT_CLASS}>,</span>}
				</span>
			))}
			{"\n"}{"  ".repeat(depth - 1)}
			<span className={bc}>{"}"}</span>
		</>
	);
}

function Field({ label, value, last = false }: { label: string; value: unknown; last?: boolean }): ReactElement {
	return (
		<pre className="text-[7.5pt] font-mono whitespace-pre-wrap m-0">
			<span className={KEY_CLASS}>&quot;{label}&quot;</span>
			<span className={PUNCT_CLASS}>: </span>
			<V value={value} depth={1} />
			{!last && <span className={PUNCT_CLASS}>,</span>}
		</pre>
	);
}

function CvJsonView({ data }: { data: CvData }): ReactElement {
	return (
		<article lang={data.lang} className="grid grid-cols-[32%_1fr] gap-[10mm] items-start">
			<div>
				{/* Reserve space for the photo, which sits above the overlay. */}
				<div className="aspect-square mb-[6mm]" />
				<Field label="contacts" value={data.contacts} />
				<div className="mt-[6mm]">
					<Field label="skills" value={data.skills} />
				</div>
			</div>
			<div>
				<header className="mb-[5mm]">
					<Field label="name" value={data.name} />
				</header>
				<section className="mb-[6mm]">
					<Field label="intro" value={data.intro} />
				</section>
				<section className="mb-[6mm]">
					<Field label="education" value={data.education} />
				</section>
				<section className="mb-[6mm]">
					<Field label="experience" value={data.experience} />
				</section>
				<section>
					<Field label="references" value={data.references} last />
				</section>
			</div>
		</article>
	);
}
