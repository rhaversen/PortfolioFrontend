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
					<h2 className="text-sm font-mono text-foreground mt-4">
						<ObfuscatedEmail />
					</h2>
					<p className="text-foreground mt-5 text-sm leading-relaxed">
						Full-time research intern at the Interactive Matter Lab, Aarhus University, where I&apos;m technical
						lead for a small developer team, building AI-assisted manufacturing pipelines, low-level printer
						firmware, and a text-to-3D design platform. Co-author on three conference-submitted papers.
					</p>
					<p className="text-foreground mt-3 text-sm leading-relaxed">
						Outside the lab I run several production systems with real users, deployed on my own
						infrastructure: a self-managed Kubernetes cluster with GitOps, CI/CD, monitoring, and alerting.
						I work mostly with TypeScript, Python, Express, Next.js, and MongoDB, with C++ and Java when
						the problem calls for it — and I&apos;m fluent in Blender, Premiere Pro, and DaVinci Resolve
						when it&apos;s about visuals instead.
					</p>
					<div className="mt-5">
						<a
							href="https://github.com/rhaversen"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="GitHub"
							className="inline-flex items-center space-x-2 text-foreground hover:text-muted transition-colors"
						>
							<GithubIcon />
							<div className="text-xs font-mono">
								github.com/rhaversen ↗
							</div>
						</a>
					</div>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 space-y-10 relative z-10">
				<section>
					<h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-6">Infrastructure</h2>
					<article className="relative">
						<CardBlob />
						<div aria-hidden className="pointer-events-none absolute inset-0 z-0 border border-black" />
						<div className="relative z-10 p-5">
						<p className="text-sm text-foreground mb-6 max-w-xl leading-relaxed">
							All web projects share a common deployment setup. This isn&apos;t a separate project, it&apos;s just how everything below gets built and run.
						</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
							<div>
								<h4 className="text-xs font-semibold text-foreground mb-1">Kubernetes</h4>
								<p className="text-xs text-foreground leading-relaxed">Every service has staging and production deployments with Kustomize overlays. Production runs 2+ replicas with horizontal pod autoscaling (up to 10). Liveness and readiness probes on all pods.</p>
							</div>
							<div>
								<h4 className="text-xs font-semibold text-foreground mb-1">CI/CD</h4>
								<p className="text-xs text-foreground leading-relaxed">Reusable GitHub Actions workflows run tests, lint, spellcheck, and build Docker images on every PR. On merge, images are built for ARM64 + AMD64 and pushed to DockerHub. ArgoCD syncs the cluster.</p>
							</div>
							<div>
								<h4 className="text-xs font-semibold text-foreground mb-1">Docker</h4>
								<p className="text-xs text-foreground leading-relaxed">All containers run as non-root users on Debian slim. Production dependencies only. Multi-platform builds (ARM64 for the Raspberry Pi, AMD64 for CI).</p>
							</div>
							<div>
								<h4 className="text-xs font-semibold text-foreground mb-1">Monitoring</h4>
								<p className="text-xs text-foreground leading-relaxed">Sentry with performance tracing and profiling on all backends. Structured JSON logging via Winston with separate error/info/combined files, forwarded to BetterStack for centralized aggregation.</p>
							</div>
							<div>
								<h4 className="text-xs font-semibold text-foreground mb-1">Security</h4>
								<p className="text-xs text-foreground leading-relaxed">Helmet, CORS restricted per domain, httpOnly/secure/SameSite session cookies, tiered rate limiting, environment secrets verified at startup, K8s secrets via secretRef.</p>
							</div>
							<div>
								<h4 className="text-xs font-semibold text-foreground mb-1">TLS</h4>
								<p className="text-xs text-foreground leading-relaxed">All public endpoints served over HTTPS via cert-manager with Let&apos;s Encrypt certificates, auto-renewed on the cluster.</p>
							</div>
						</div>
						</div>
					</article>
				</section>

				<section>
					<h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-6">Research — Interactive Matter Lab</h2>
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
							titleNote="Tech Lead"
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
					<h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-6">Projects</h2>
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

