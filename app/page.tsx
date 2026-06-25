import ProjectShowcase from "./components/ProjectShowcase";
import GameOfLifeBg from "./components/GameOfLifeBg";
import ObfuscatedEmail from "./components/ObfuscatedEmail";

export default function Home() {
	return (
		<div className="relative min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums] [&_p]:text-[0.94rem] [&_p]:leading-7 [&_p]:text-foreground/90 [&_h1]:tracking-[-0.01em] [&_h2]:tracking-[0.01em] [&_h4]:tracking-[0.01em] [&_a]:decoration-transparent [&_a]:transition-colors [&_a]:duration-150 [&_a:hover]:decoration-current">
			<GameOfLifeBg />

			<section className="w-full border-y border-border bg-card/80 relative">
				<a
					href="/fun"
					className="fixed right-4 top-4 z-40 sm:right-6 sm:top-6 inline-flex items-center gap-1.5 rounded-full border border-border/90 bg-background/90 px-3 py-1 text-[0.7rem] font-mono uppercase tracking-[0.14em] text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent"
				>
					<span>Fun</span>
					<span aria-hidden="true" className="text-xs">↗</span>
				</a>
				<div className="max-w-4xl mx-auto px-6 py-16 sm:py-20">
					<p className="text-xs font-mono uppercase tracking-[0.24em] text-muted">Portfolio</p>
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight mt-4">
						Rasmus Haversen
					</h1>
					<div className="mt-5 h-px w-56 bg-border" />
					<h2 className="text-sm font-mono text-foreground mt-4">
						<ObfuscatedEmail />
					</h2>
					<p className="text-foreground mt-5 max-w-2xl text-sm leading-relaxed">
						Software engineering student at Aarhus University. I build full-stack web applications,
						write tests, set up CI/CD pipelines, and deploy everything to a self-managed
						Kubernetes cluster on a Raspberry Pi. Most of these projects are live and used by real people.
					</p>
					<p className="text-foreground mt-3 max-w-2xl text-sm leading-relaxed">
						I work mostly with TypeScript, Express, Next.js, and MongoDB, but I also write C++ and Java
						when the problem calls for it. I&apos;m interested in infrastructure, AI agents, and algorithm design.
					</p>
					<div className="mt-5">
						<a
							href="https://github.com/rhaversen"
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs font-mono text-foreground hover:text-muted transition-colors"
						>
							github.com/rhaversen ↗
						</a>
					</div>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 space-y-10 relative">
				<section>
					<h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-6">Infrastructure</h2>
					<article className="border border-border bg-card/80 p-5">
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
					</article>
				</section>

				<section>
				<h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-6">Projects</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-0">
					<ProjectShowcase
						id="exsys"
						title="Exsys"
						description="Ordering system for a Danish cantina. Touchscreen kiosks, kitchen display, and card payment."
						color="#3b82f6"
						url="kantine.nyskivehus.dk"
						github="https://github.com/rhaversen/ExsysBackend"
						stack={["TypeScript", "Express 5", "Next.js 16", "React 19", "MongoDB", "Mongoose 8", "Redis", "Socket.io", "Passport.js", "SumUp API", "Sentry", "Winston", "BetterStack", "Mocha", "Chai", "nyc", "Docker", "Kubernetes"]}
					/>

					<ProjectShowcase
						id="gaslight"
						title="Gaslight"
						description="Competitive programming platform where submitted JavaScript strategies play automated tournaments against each other."
						color="#f97316"
						github="https://github.com/rhaversen/GaslightBackend"
						stack={["TypeScript", "Express 5", "Next.js 16", "React 19", "MongoDB", "Redis", "Socket.io", "isolated-vm", "esbuild", "esprima", "Monaco Editor", "Shiki", "Three.js", "Mocha", "Chai", "nyc", "Docker", "Kubernetes"]}
					/>

					<ProjectShowcase
						id="seedgpt"
						title="SeedGPT"
						description="AI agent that modifies its own source code, opens PRs, waits for CI, and merges — changing itself each cycle."
						color="#eab308"
						github="https://github.com/rhaversen/SeedGPT"
						stack={["TypeScript", "Node.js", "Anthropic Claude", "MongoDB", "Mongoose 8", "simple-git", "Octokit", "Jest", "Docker", "Kubernetes", "ArgoCD"]}
					/>

					<ProjectShowcase
						id="seedwatch"
						title="SeedWatch"
						description="Observability dashboard for SeedGPT. Inspect every LLM call with token counts, costs, and cache statistics."
						color="#84cc16"
						github="https://github.com/rhaversen/seedwatch"
						stack={["TypeScript", "Next.js 16", "React 19", "MongoDB", "Mongoose 9", "Tailwind CSS"]}
					/>

					<ProjectShowcase
						id="life-tracker"
						title="Life Tracker"
						description="Event tracking service. Log events with a single HTTP request from any device, see patterns on a dashboard."
						color="#22c55e"
						url="life-stats.net"
						github="https://github.com/rhaversen/LifeTrackerBackend"
						stack={["TypeScript", "Express 5", "Next.js 16", "React 19", "MongoDB", "Mongoose 8", "Passport.js", "Nodemailer", "Chart.js", "date-fns", "Sentry", "Winston", "BetterStack", "Mocha", "Docker", "Kubernetes"]}
					/>

					<ProjectShowcase
						id="raindate"
						title="RainDate"
						description="Group scheduling app. Invite people, mark availability, and find the best time in real-time."
						color="#a855f7"
						url="raindate.net"
						github="https://github.com/rhaversen/GroupSchedulerBackend"
						stack={["TypeScript", "Express 5", "Next.js 16", "React 19", "MongoDB", "Mongoose 8", "Redis", "Socket.io", "Passport.js", "Nodemailer", "dayjs", "Sentry", "Winston", "BetterStack", "Mocha", "Docker", "Kubernetes"]}
					/>

					<ProjectShowcase
						id="gol"
						title="GOL"
						description="C++ tool that generates and classifies Conway's Game of Life patterns as still lifes, oscillators, or spaceships."
						color="#06b6d4"
						github="https://github.com/rhaversen/GOL"
						stack={["C++", "MSVC", "Python", "NumPy", "Matplotlib", "Multithreading", "Floyd's Algorithm", "Bit Manipulation"]}
					/>

					<ProjectShowcase
						id="diecup"
						title="Diecup-2"
						description="Genetic algorithm that evolves strategies for a Danish dice game across a population of 1000 variations."
						color="#ec4899"
						github="https://github.com/rhaversen/Diecup-2"
						stack={["Java", "Genetic Algorithm", "Common Random Numbers", "Multithreading", "Python", "Statistics", "Multi-Objective Optimization"]}
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

