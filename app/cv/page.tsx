import type { Metadata } from "next";
import Link from "next/link";
import { type ReactElement } from "react";
import CardBlob from "../components/CardBlob";

export const metadata: Metadata = {
	title: "CV — Rasmus Haversen",
	description: "Curriculum vitae. Available in Danish and English.",
};

const LOCALES = [
	{ code: "dk", label: "Dansk", sub: "Curriculum vitae — Dansk" },
	{ code: "en", label: "English", sub: "Curriculum vitae — English" },
];

export default function CvIndexPage(): ReactElement {
	return (
		<div className="relative min-h-screen flex items-center justify-center px-4 overflow-x-clip">
			<CardBlob />
			<div className="relative z-10 w-full max-w-md">
				<h1 className="text-2xl font-semibold tracking-tight text-center">CV</h1>
				<p className="mt-2 text-sm text-muted text-center">Vælg sprog / Choose language</p>

				<div className="mt-6 flex flex-col gap-3">
					{LOCALES.map(({ code, label, sub }) => (
						<Link
							key={code}
							href={`/cv/${code}`}
							className="group relative border border-black p-5 flex items-center justify-between gap-4 transition-colors hover:bg-foreground/5"
						>
							<div>
								<span className="text-base font-semibold text-foreground">{label}</span>
								<span className="block text-xs font-mono text-muted mt-0.5">{sub}</span>
							</div>
							<span aria-hidden="true" className="text-sm font-mono text-muted group-hover:text-foreground transition-colors">↗</span>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
