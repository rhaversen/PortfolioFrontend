"use client";

import { useEffect, useState } from "react";
import { SIDE_PROJECTS } from "./projects/data";

const DEFAULT_PROJECT_ID = SIDE_PROJECTS[0].id;

const isValidProjectId = (id: string) => SIDE_PROJECTS.some((project) => project.id === id);

const LLM_PROJECTS = SIDE_PROJECTS.filter((p) => p.category === "llm");
const STANDALONE_PROJECTS = SIDE_PROJECTS.filter((p) => p.category !== "llm");

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
	const isLlmActive = activeProject.category === "llm";

	const navButtonClass = (isActive: boolean) =>
		`inline-flex w-fit cursor-pointer border px-3 py-1.5 text-xs font-mono uppercase tracking-[0.12em] transition-colors duration-150 hover:-translate-y-px ${
			isActive
				? "border-accent text-accent bg-background/60 hover:bg-accent/10"
				: "border-border text-foreground hover:border-accent/60 hover:text-accent hover:bg-background/70"
		}`;

	return (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums]">
			<section className="w-full bg-card/80">
			<div className="max-w-4xl mx-auto px-6 pt-12 sm:pt-14 pb-4 sm:pb-6">
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.01em] leading-tight">Side Projects Fun</h1>
					<p className="text-foreground/90 mt-5 max-w-3xl text-sm leading-relaxed">
						Interactive side projects that sit outside the main portfolio work. Pick a project to open it here.
					</p>
				</div>
			</section>

			<div className="sticky top-0 z-30 w-full border-b border-border bg-card/95 backdrop-blur-sm">
				<div className="max-w-4xl mx-auto px-6 pt-10 pb-3 space-y-2">
					<ul className="flex flex-wrap gap-2 sm:gap-2.5">
						<li>
							<button
								type="button"
								onClick={() => { if (!isLlmActive) selectProject(LLM_PROJECTS[0].id); }}
								className={navButtonClass(isLlmActive)}
							>
								LLM Projects
							</button>
						</li>
						{STANDALONE_PROJECTS.map((project) => (
							<li key={project.id}>
								<button
									type="button"
									onClick={() => selectProject(project.id)}
									className={navButtonClass(project.id === activeProjectId)}
								>
									{project.title}
								</button>
							</li>
						))}
					</ul>
					{isLlmActive && (
						<div className="flex items-start gap-2 sm:gap-2.5 pt-1">
							<span className="text-[0.7rem] font-mono uppercase tracking-[0.14em] text-muted/70 pt-1.5 select-none">↳</span>
							<ul className="flex flex-wrap gap-2 sm:gap-2.5">
								{LLM_PROJECTS.map((project) => (
									<li key={project.id}>
										<button
											type="button"
											onClick={() => selectProject(project.id)}
											className={navButtonClass(project.id === activeProjectId)}
										>
											{project.title}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
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
