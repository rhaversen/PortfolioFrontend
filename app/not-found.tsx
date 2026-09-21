import Link from "next/link";
import type { ReactElement } from "react";
import CardBlob from "./components/CardBlob";

export default function NotFound(): ReactElement {
	return (
		<div className="relative min-h-screen flex items-center justify-center px-4 overflow-x-clip">
			<CardBlob />
			<div className="relative z-10 text-center">
				<p className="text-xs font-mono uppercase tracking-[0.24em] text-muted">404</p>
				<h1 className="text-4xl font-semibold tracking-tight mt-4">Page not found</h1>
				<p className="mt-3 text-sm text-muted">
					The page you are looking for does not exist or has moved.
				</p>
				<Link
					href="/"
					className="mt-6 inline-flex border border-black px-3 py-1.5 text-xs font-mono uppercase tracking-[0.12em] text-foreground transition-colors hover:-translate-y-px hover:bg-foreground/5"
				>
					Back to portfolio
				</Link>
			</div>
		</div>
	);
}
