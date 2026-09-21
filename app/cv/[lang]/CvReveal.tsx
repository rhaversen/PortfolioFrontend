"use client";

import { useEffect, useState } from "react";
import { type ReactElement } from "react";
import Image from "next/image";
import type { CvData } from "./CvData";
import CvTemplate from "./CvTemplate";

const WIPE_MS = 900;

export default function CvReveal({ data }: { data: CvData }): ReactElement {
	const [revealed, setRevealed] = useState(false);
	const [wipeDone, setWipeDone] = useState(false);

	useEffect(() => {
		// One frame delay so the initial clip state paints before the transition.
		const raf = requestAnimationFrame(() => setRevealed(true));
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
		<div className="grid grid-cols-[32%_1fr] gap-[10mm] items-start">
			{/* ============ LEFT COLUMN — photo in flow, overlays below it ============ */}
			<div className="relative">
				<div className="relative z-20">
					<Image
						src={data.photo.src}
						alt={data.photo.alt}
						width={2003}
						height={2003}
						priority
						sizes="(max-width: 210mm) 100vw, 67mm"
						className="w-full aspect-square object-cover rounded-[10px] grayscale mb-[6mm]"
					/>
				</div>

				<div className="relative">
					{!wipeDone && (
						<div className={jsonLayerClass} style={{ clipPath: jsonClip }} aria-hidden="true">
							<CvJsonView data={data} section="left" />
						</div>
					)}

					<div className={revealed ? "" : "invisible print:visible"}>
						<CvTemplate data={data} section="left" />
					</div>
				</div>
			</div>

			{/* ============ RIGHT COLUMN ============ */}
			<div className="relative">
				{!wipeDone && (
					<div className={jsonLayerClass} style={{ clipPath: jsonClip }} aria-hidden="true">
						<CvJsonView data={data} section="right" />
					</div>
				)}

				<div className={revealed ? "" : "invisible print:visible"}>
					<CvTemplate data={data} section="right" />
				</div>
			</div>
		</div>
	);
}

const JSON_KEY = "text-[9pt] font-mono text-accent/70";
const JSON_PUNCT = "text-[9pt] font-mono text-neutral-300";
const JSON_VALUE = "text-[7.5pt] font-mono text-neutral-500 whitespace-pre-wrap";

function Field({ label, value }: { label: string; value: unknown }): ReactElement {
	return (
		<div>
			<span className={JSON_KEY}>&quot;{label}&quot;</span>
			<span className={JSON_PUNCT}>: </span>
			<pre className={`${JSON_VALUE} m-0`}>{JSON.stringify(value, null, 2)}</pre>
		</div>
	);
}

function CvJsonView({ data, section }: { data: CvData; section: "left" | "right" }): ReactElement {
	if (section === "left") {
		return (
			<article lang={data.lang}>
				<Field label="contacts" value={data.contacts} />
				<div className="mt-[6mm]">
					<Field label="skills" value={data.skills} />
				</div>
			</article>
		);
	}

	return (
		<article lang={data.lang}>
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
				<Field label="references" value={data.references} />
			</section>
		</article>
	);
}
