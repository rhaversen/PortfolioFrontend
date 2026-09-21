"use client";

import { useEffect } from "react";
import type { ReactElement } from "react";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}): ReactElement {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="text-center">
				<p className="text-xs font-mono uppercase tracking-[0.24em] text-muted">Error</p>
				<h1 className="text-4xl font-semibold tracking-tight mt-4">Something went wrong</h1>
				<p className="mt-3 text-sm text-muted">
					An unexpected error occurred. The incident has been logged.
				</p>
				<button
					type="button"
					onClick={reset}
					className="mt-6 inline-flex border border-black px-3 py-1.5 text-xs font-mono uppercase tracking-[0.12em] text-foreground transition-colors hover:-translate-y-px hover:bg-foreground/5 cursor-pointer"
				>
					Try again
				</button>
			</div>
		</div>
	);
}
