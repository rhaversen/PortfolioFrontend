"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SIDE_PROJECTS } from "./projects/data";

const DEFAULT_PROJECT_ID = SIDE_PROJECTS[0].id;

const isValidProjectId = (id: string) => SIDE_PROJECTS.some((project) => project.id === id);

export default function FunPage() {
	const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

	useEffect(() => {
		const syncWithHash = () => {
			const hashId = window.location.hash.replace("#", "");

			if (isValidProjectId(hashId)) {
				setActiveProjectId(hashId);
				return;
			}

			const fallbackHash = `#${DEFAULT_PROJECT_ID}`;
			history.replaceState(null, "", `/fun${fallbackHash}`);
			setActiveProjectId(DEFAULT_PROJECT_ID);
		};

		syncWithHash();
	}, []);

	const selectProject = (projectId: string) => {
		setActiveProjectId(projectId);
		history.replaceState(null, "", `/fun#${projectId}`);
	};

	const hasResolvedInitialProject = activeProjectId !== null;
	const activeProject = SIDE_PROJECTS.find((project) => project.id === activeProjectId) ?? SIDE_PROJECTS[0];
	const ActiveProjectComponent = activeProject.Component;
	const renderProjectLinks = () =>
		SIDE_PROJECTS.map((project) => {
			const isActive = project.id === activeProjectId;

			return (
				<li key={project.id}>
					<button
						type="button"
						onClick={() => selectProject(project.id)}
						className={`inline-flex w-fit cursor-pointer border px-3 py-1.5 text-xs font-mono uppercase tracking-[0.12em] transition-colors duration-150 hover:-translate-y-px ${
							isActive
								? "border-accent text-accent bg-background/60 hover:bg-accent/10"
								: "border-border text-foreground hover:border-accent/60 hover:text-accent hover:bg-background/70"
						}`}
					>
						{project.title}
					</button>
				</li>
			);
		});

	return (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums]">
			<section className="w-full bg-card/80">
			<div className="max-w-4xl mx-auto px-6 py-5 sm:py-8">
					<Link
						href="/"
						className="text-[0.94rem] leading-7 font-mono uppercase tracking-[0.24em] text-foreground/90 decoration-transparent transition-colors duration-150 hover:decoration-current"
					>
						← Back To Portfolio
					</Link>
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.01em] leading-tight mt-4">Side Projects Fun</h1>
					<p className="text-foreground/90 mt-5 max-w-3xl text-sm leading-relaxed">
						Interactive side projects that sit outside the main portfolio work. Pick a project to open it here.
					</p>
				</div>
			</section>

			<div className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-sm">
				<div className="max-w-4xl mx-auto px-6 py-3">
					<ul className="flex flex-wrap gap-2 sm:gap-2.5">{renderProjectLinks()}</ul>
				</div>
			</div>

			<main className="max-w-4xl mx-auto sm:px-6 py-10 relative">
				<div className="w-full border-y sm:border border-border bg-card/80 p-5 sm:p-6">
					{hasResolvedInitialProject ? (
						<article>
							<div className="flex items-start justify-between gap-4">
								<h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">{activeProject.title}</h2>
							</div>
							<p className="mt-4 max-w-3xl text-sm leading-relaxed text-foreground/90">{activeProject.summary}</p>
							<p className="mt-5 text-xs font-mono uppercase tracking-[0.14em] text-muted">Stack</p>
							<div className="mt-2 flex flex-wrap gap-2">
								{activeProject.stack.map((item) => (
									<span
										key={item}
										className="text-[0.68rem] font-mono uppercase tracking-widest border border-border px-2 py-1 text-foreground/90"
									>
										{item}
									</span>
								))}
							</div>
						<div className="mt-6">
								<ActiveProjectComponent />
							</div>
						</article>
					) : (
						<div className="h-72 sm:h-80 border border-border bg-background/30" />
					)}
				</div>
			</main>
		</div>
	);
}
