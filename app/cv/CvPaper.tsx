"use client";

import Link from "next/link";
import { type ReactElement } from "react";
import CardBlob from "../components/CardBlob";

interface CvPaperProps {
	lang: string;
	children: React.ReactNode;
}

export default function CvPaper({ lang, children }: CvPaperProps): ReactElement {
	const isDk = lang === "dk";

	return (
		<div className="min-h-screen py-8 px-4 print:min-h-0 print:p-0 print:bg-white print:overflow-hidden">
			<div className="max-w-[210mm] mx-auto print:max-w-none">
				<div className="relative flex justify-end items-center gap-3 mb-4 print:hidden">
					<div className="flex items-center gap-1 border border-black p-1 text-xs font-mono uppercase tracking-[0.12em]">
						<Link
							href="/cv/dk"
							className={`px-3 py-1 border transition-colors ${isDk ? "border-black bg-foreground/5" : "border-transparent text-muted hover:text-foreground"}`}
						>
							Dansk
						</Link>
						<Link
							href="/cv/en"
							className={`px-3 py-1 border transition-colors ${!isDk ? "border-black bg-foreground/5" : "border-transparent text-muted hover:text-foreground"}`}
						>
							English
						</Link>
					</div>
					<button
						type="button"
						onClick={() => window.print()}
						className="inline-flex items-center gap-2 border border-black px-4 py-1.5 text-xs font-mono uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-foreground/5 cursor-pointer"
					>
						Download PDF
					</button>
				</div>

				<div className="relative print:hidden">
					<CardBlob />
				</div>

				<div className="relative z-10 w-[210mm] min-h-[297mm] mx-auto bg-white text-neutral-900 border border-black px-[14mm] py-[14mm] print:shadow-none print:w-[209.5mm] print:h-[296.5mm] print:min-h-0 print:overflow-hidden print:border-0">
					{children}
				</div>
			</div>
		</div>
	);
}
