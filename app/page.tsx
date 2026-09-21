import ProjectShowcase from "./components/ProjectShowcase";
import GameOfLifeBg from "./components/GameOfLifeBg";
import ObfuscatedEmail from "./components/ObfuscatedEmail";
import CardBlob from "./components/CardBlob";
import { GithubIcon } from "./components/icons";
import Link from "next/link";

export default function Home() {
	return (
		<div className="relative min-h-screen overflow-x-clip text-foreground antialiased [font-variant-numeric:tabular-nums] [&_p]:text-[0.94rem] [&_p]:leading-7 [&_p]:text-foreground/90 [&_h1]:tracking-[-0.01em] [&_h2]:tracking-[0.01em] [&_h4]:tracking-[0.01em] [&_a]:decoration-transparent [&_a]:transition-colors [&_a]:duration-150 [&_a:hover]:decoration-current">
			<GameOfLifeBg />

			<section className="w-full relative">
				<CardBlob />
				<div aria-hidden className="pointer-events-none absolute inset-0 z-0 border-b border-black" />
				<div className="relative z-10 max-w-4xl mx-auto px-6 py-8 sm:py-10">
					<p className="text-xs font-mono uppercase tracking-[0.24em] text-muted">Portfolio</p>
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight mt-4">
						Rasmus Haversen
					</h1>
					<div className="mt-5 h-px w-56 bg-border" />
					<div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono">
						<span className="inline-flex items-center gap-1.5 text-foreground">
							<ObfuscatedEmail />
						</span>
						<a
							href="https://github.com/rhaversen"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 text-foreground hover:text-muted transition-colors"
						>
							<GithubIcon />
							github.com/rhaversen
						</a>
					</div>
					<p className="text-foreground mt-5 text-sm leading-relaxed">
						I study computer science at Aarhus University, and I&apos;m technical lead at the
						university&apos;s Interactive Matter Lab, where I coordinate a small developer team.
						Co-author on three papers in progress.
					</p>
					<p className="text-foreground mt-3 text-sm leading-relaxed">
						Outside the lab I run my own production systems with real users: A canteen ordering app
						for elderly residents with card payments and a live kitchen view; Gaslight, where JavaScript
						written by strangers battles in daily tournaments. All of it runs on my own Kubernetes cluster,
						and I&apos;m on-call for all of it.
					</p>
					<p className="text-foreground mt-3 text-sm leading-relaxed">
						I chose computer science because I love programming and automating anything that can be
						automated. Any problem can be cracked with dedication and the right decomposition; divide and conquer.,
						My curiosity doesn&apos;t stop at a working prototype: the fun part is carrying an idea to a system real
						people depend on.
					</p>
					<p className="text-foreground mt-3 text-sm leading-relaxed">
						Mostly I write TypeScript and Python, with C++ and Java when the problem calls for it, and
						Blender, Premiere Pro, or DaVinci Resolve when it&apos;s about visuals instead.
					</p>
					<div className="mt-6 flex flex-wrap items-center gap-3">
						<Link
							href="/cv/en"
							className="inline-flex w-fit items-center gap-2 border border-black px-3 py-1.5 text-xs font-mono uppercase tracking-[0.12em] text-foreground transition-colors duration-150 hover:-translate-y-px hover:bg-foreground/5"
						>
							View CV
						</Link>
					</div>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 space-y-10 relative z-10">
				<section>
					<div className="relative inline-block mb-6">
						<CardBlob />
						<div aria-hidden className="pointer-events-none absolute inset-0 z-0 border border-black" />
						<h2 className="relative z-10 text-xs font-mono uppercase tracking-widest text-muted px-3 py-1.5">
							Research — Interactive Matter Lab
						</h2>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-0">
						<ProjectShowcase
							id="forge"
							title="Facture"
							description="Researchers describe 3D models in plain text and get printable geometry back. An in-house compiler turns LLM-written design documents into OpenSCAD and meshes, with an agent interface for interactive design and repair."
							stack={["TypeScript", "Custom Compiler", "LLM Agents", "OpenSCAD", "Next.js"]}
						/>

						<ProjectShowcase
							id="manufacturerai"
							title="ManufacturerAI"
							description="Metal 3D printing is too specialized for off-the-shelf software. I led a three-developer team building the pipeline from AI-generated design to a physical silver print — and co-authored the resulting conference paper."
							stack={["Python", "Swagger/OpenAPI", "Team Coordination", "Manufacturing"]}
						/>

						<ProjectShowcase
							id="quickjet"
							title="Quickjet"
							description="Industrial printheads drop pixels if the data stream stutters. This firmware keeps G-code and Xaar printhead UART traffic in lockstep, with buffer management sized for real print jobs — rebuilt into a terminal UI the lab actually uses."
							stack={["C", "UART", "G-code Streaming", "Buffer Management", "Terminal UI"]}
						/>
					</div>
				</section>

				<section>
					<div className="relative inline-block mb-6">
						<CardBlob />
						<div aria-hidden className="pointer-events-none absolute inset-0 z-0 border border-black" />
						<h2 className="relative z-10 text-xs font-mono uppercase tracking-widest text-muted px-3 py-1.5">
							Projects
						</h2>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-0">
						<ProjectShowcase
							id="exsys"
							title="Exsys"
							description="A cantina for elderly residents replaced paper order slips with touchscreen kiosks — designed for users who find most apps hostile. Card payments run on SumUp terminals; kitchen staff see orders live, grouped by room and activity. In production since 2024."
							url="kantine.nyskivehus.dk"
							github="https://github.com/rhaversen/ExsysBackend"
							stack={["SumUp API", "Socket.io", "Redis", "MongoDB Aggregation", "Passport.js"]}
						/>

						<ProjectShowcase
							id="gaslight"
							title="Gaslight"
							description="Users submit JavaScript strategies that fight in daily automated tournaments — meaning the server runs untrusted code from strangers around the clock. Sandboxed execution, tournament orchestration, and live rankings make that safe and watchable."
							url="gaslight.fun"
							github="https://github.com/rhaversen/GaslightBackend"
							stack={["isolated-vm", "esbuild", "esprima", "Monaco Editor", "Three.js"]}
						/>

						<ProjectShowcase
							id="seedgpt"
							title="SeedGPT"
							description="An AI agent that improves its own codebase: it plans changes, opens PRs against itself, waits for CI to pass, and merges. The interesting problem isn't the LLM calls — it's giving an autonomous system the same safety rails a human team would demand."
							github="https://github.com/rhaversen/SeedGPT"
							stack={["Anthropic Claude", "Multi-Agent Pipeline", "Octokit", "GitHub Actions CI", "simple-git"]}
						/>

						<ProjectShowcase
							id="seedwatch"
							title="SeedWatch"
							description="When an agent rewrites itself, 'it broke' is not a debuggable statement. SeedWatch logs every LLM call with token counts, per-model costs, and cache hits, so each autonomous cycle can be traced, priced, and explained."
							url="seedwatch.net"
							github="https://github.com/rhaversen/seedwatch"
							stack={["Next.js", "MongoDB", "Cost Tracking", "Per-Phase Drill-Down"]}
						/>

						<ProjectShowcase
							id="life-tracker"
							title="Life Tracker"
							description="Habit trackers die when logging takes effort. This one accepts any event with a single HTTP request — no app, no UI — so years of personal data accumulate quietly and patterns surface on a dashboard. In daily use since 2024, by me and others."
							url="life-stats.net"
							github="https://github.com/rhaversen/LifeTrackerBackend"
							stack={["Express", "MongoDB", "Chart.js", "Passport.js", "Token Auth"]}
						/>

						<ProjectShowcase
							id="raindate"
							title="RainDate"
							description="The scheduling-poll problem: everyone answers, nobody converges. RainDate updates availability live across all participants and highlights the best times as they emerge — so the group decides while looking at the same data."
							url="raindate.net"
							github="https://github.com/rhaversen/GroupSchedulerBackend"
							stack={["Socket.io", "Redis", "Express", "MongoDB", "Passport.js"]}
						/>

						<ProjectShowcase
							id="dupontdoku"
							title="Dupontdoku"
							description="A client project, live in production with real users. Built and deployed end-to-end on the same infrastructure as everything else on this page."
							stack={["Next.js", "Express", "MongoDB", "Passport.js"]}
						/>

						<ProjectShowcase
							id="gol"
							title="GOL"
							description="Game of Life grids grow exponentially, so brute force dies fast. This classifier uses bit-packed grids, multithreading, and Floyd's cycle detection to find and prove which patterns are still lifes, oscillators, or spaceships — and when the search has entered a loop."
							github="https://github.com/rhaversen/GOL"
							stack={["C++", "std::thread", "Floyd's Cycle Detection", "Bit-Packed Grid", "Canonical Hashing"]}
						/>

						<ProjectShowcase
							id="diecup"
							title="Diecup"
							description="Nobody fully understands the strategy space of a dice game with this many decision points. So instead of guessing: a genetic algorithm evolves 1000 strategy variations in parallel, using common random numbers to compare fitness fairly and statistical testing to keep the winners honest."
							github="https://github.com/rhaversen/Diecup-2"
							stack={["Java", "java.util.concurrent", "Genetic Algorithm", "Common Random Numbers", "Multi-Objective Fitness"]}
						/>
					</div>
				</section>

				<section>
					<div className="relative inline-block mb-6">
						<CardBlob />
						<div aria-hidden className="pointer-events-none absolute inset-0 z-0 border border-black" />
						<h2 className="relative z-10 text-xs font-mono uppercase tracking-widest text-muted px-3 py-1.5">
							How all of this runs
						</h2>
					</div>
					<article className="relative">
						<CardBlob />
						<div aria-hidden className="pointer-events-none absolute inset-0 z-0 border border-black" />
						<div className="relative z-10 p-5">
							<p className="text-sm text-foreground leading-relaxed max-w-xl">
								Everything above deploys itself. CI builds the Docker image, patches the deployment
								manifest, and ArgoCD syncs it to a Kubernetes cluster running on a Raspberry Pi.
								Every project gets staging and production environments, health probes, TLS, and
								monitoring with alerting, all from one shared set of reusable CI workflows. There&apos;s
								no DevOps team to call: I&apos;m on-call, so the setup has to be boring, repeatable, and
								survive me sleeping.
							</p>
						</div>
					</article>
				</section>

			</main>

			<footer className="py-6 text-center">
				<a
					href="https://github.com/rhaversen"
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs font-mono text-foreground hover:text-muted transition-colors"
				>
					github.com/rhaversen ↗
				</a>
			</footer>
		</div>
	);
}

