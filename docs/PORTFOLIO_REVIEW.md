# Portfolio Review — Rasmus Haversen

**Reviewer perspective:** Senior technical recruiter at a large, fast-moving, competitive tech firm, hiring for a full-stack developer role.

---

## 1. What We Look For

### Must-Haves
- Strong command of at least one backend and one frontend framework
- Database design and query proficiency
- API design (REST, GraphQL, or equivalent)
- Version control (Git) and collaboration workflows
- Testing strategy and quality assurance discipline
- CI/CD awareness and deployment experience
- Clear technical communication
- Evidence of shipping real products

### Strong Signals
- Systems thinking and architectural reasoning
- Experience with distributed systems
- Containerization (Docker, Kubernetes)
- Observability: logging, monitoring, alerting, error tracking
- Security fundamentals (auth, input validation, secrets management)
- Performance optimization and profiling
- Type-safe languages and sound engineering practices
- Evidence of working in teams: code reviews, PRs, collaboration

### Differentiators
- Open-source contributions to established projects
- CS fundamentals (algorithms, data structures, complexity analysis)
- Experience across multiple paradigms (OOP, functional, event-driven)
- Cloud-native architecture at meaningful scale
- Low-level programming demonstrating understanding of the machine
- Ability to articulate *why* specific technical decisions were made, not just *what* was used

---

## 2. Evaluation — Strengths & Weaknesses

### Strengths

- **Breadth of shipped projects.** Seven projects, several serving real users (Exsys has actual daily customers, Life Tracker and RainDate are live). This is rare for a student. Most applicants list todo apps and weather dashboards.

- **Self-hosted Kubernetes on a Raspberry Pi.** This signals genuine operations curiosity — not just "I followed a Vercel tutorial." Understanding K8s, ArgoCD, and Docker at a practical, self-managed level is a real differentiator at the student stage.

- **Language diversity.** TypeScript, C++, Java, Python — not a one-trick pony. The C++ Game of Life project with bit-packing and Floyd's cycle detection shows CS fundamentals beyond web development.

- **SeedGPT is genuinely interesting.** A self-modifying AI agent with CI-gated merges, batch API cost optimization, and persistent memory is a legitimately novel project. It demonstrates systems-level thinking about LLM agent orchestration that most candidates don't have.

- **Real payment integration.** SumUp webhooks, MobilePay — dealing with real money and physical hardware puts this candidate ahead of anyone who only knows Stripe test mode.

- **The portfolio codebase is clean.** Well-typed TypeScript, componentized architecture, minimal dependency footprint — just Next.js, React, Tailwind. No bloat.

### Weaknesses

- **No evidence of team collaboration.** Every project appears to be solo. At a large firm, 90% of the job is working within existing codebases, reviewing others' code, and navigating team dynamics. There is no mention of pair programming, code reviews, or contributing to others' projects.

- **No testing in the portfolio itself.** The portfolio frontend has zero tests — no Jest, no Playwright, no Cypress. Some backend projects mention Mocha/Jest, but there is no visible testing philosophy or coverage metrics.

- **No SQL database experience.** Every project uses MongoDB. At a competitive firm, you will be working with PostgreSQL, MySQL, or similar relational databases. No mention of schema design, migrations, joins, indexing, or query optimization.

- **No GraphQL, no gRPC, no message queues.** The entire API surface is REST + WebSockets. That is fine for what it is, but a top-tier candidate should show awareness of other communication paradigms (Kafka, RabbitMQ, GraphQL, gRPC).

- **Monitoring is shallow.** Sentry and Winston are mentioned, but there is no evidence of dashboards, alerting, SLOs, or actual incident response. "I added Sentry" is not the same as "I operate a production system."

---

## 3. The Roast

### You're a student cosplaying as a senior engineer.

The descriptions are dripping with resume-optimized jargon — "MongoDB Change Streams for live session monitoring," "V8 sandboxing via isolated-vm," "spiral binary encoding." These sound impressive until you realize every single project is a solo effort with an audience of approximately you and your mother. "Serves real customers daily" — how many? Five? Fifty? You've carefully avoided any actual numbers, which tells me the numbers aren't impressive.

### The portfolio website itself is the weakest project here.

It's a single-page static site with no routing, no dynamic data, no backend integration. You have a `ProjectLayout.tsx` component that is **never used** — it's dead code shipped in your portfolio repository. The `SkillMap.tsx` component is also never rendered. You built components and then didn't wire them up. That's sloppy. If I'm evaluating your attention to detail, you just failed.

### Your "architecture diagrams" are hardcoded SVG boxes with arrows.

They don't actually explain architecture — they're just labels connected by lines. "Kiosk → Express API → MongoDB" tells me nothing I couldn't infer from the tech stack list. A real architecture diagram would show data flow, failure modes, scaling boundaries, or at least something that required more thought than `<rect>` → `<line>` → `<rect>`.

### Every project is the same project.

TypeScript + Express + Next.js + MongoDB + Redis + Docker + Kubernetes. Seven times. You found a stack and you hammered it. Where's the learning curve? Where's the struggle? A candidate who built one project in Rust, one in Go, one with PostgreSQL, and one with event-driven architecture tells me they're adaptable. You tell me you can build a MERN app and Dockerize it. Repeatedly.

### No evidence you can read code, only write it.

There are zero open-source contributions on display. No PRs to established projects. No evidence you can navigate a 500k-line codebase, understand someone else's abstractions, and make a surgical fix. At our firm, you'll spend 80% of your time reading code you didn't write. Your portfolio only proves you can start greenfield projects from scratch — anyone can build a house on empty land.

### The Game of Life background is a performance liability you shipped anyway.

A full-page canvas running `requestAnimationFrame` at 60fps, iterating over every cell in the grid every frame, on a page that's supposed to convince me you care about performance. On mobile, this is a battery drain for visual decoration. There's no `IntersectionObserver`, no `prefers-reduced-motion` media query respect, no frame-rate throttling beyond the 1000ms step timer. `DENSITY = 0.5` means half the grid is alive on init — the most computationally expensive state for Game of Life. For someone who lists C++ performance optimization as a skill, shipping an unoptimized canvas animation as their portfolio background is ironic.

### Your contact information is an email address and two links.

No downloadable resume/CV, no blog posts demonstrating depth of thought, no talks, no technical writing. At a competitive firm, I need to see how you *think*, not just what you *built*. Anyone can list tech stacks. Show me a post-mortem of when Exsys went down at dinner rush. Show me the debugging session where SeedGPT's agent loop went infinite. Show me a blog post about the tradeoffs of self-hosting K8s on a Raspberry Pi. That's what separates a builder from a senior engineer.

### The public/ folder is default Next.js scaffolding.

`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`. You didn't even clean out the boilerplate. No custom favicon, no OG image for social sharing, no screenshots of your actual projects. I'm looking at a portfolio that doesn't *show* me anything — it only *tells* me. In a visual medium, that's a fundamental failure.

---

## Summary

| Category | Rating | Notes |
|---|---|---|
| Technical breadth | ★★★☆☆ | Diverse languages, but same architecture repeated |
| Project complexity | ★★★★☆ | SeedGPT and Gaslight are legitimately interesting |
| Production experience | ★★★☆☆ | Real users, but no scale evidence |
| Code quality | ★★★☆☆ | Clean but ships dead code and scaffolding |
| DevOps maturity | ★★★★☆ | Self-hosted K8s is impressive for a student |
| Testing discipline | ★★☆☆☆ | Mentioned in backends, absent in portfolio |
| Collaboration evidence | ★☆☆☆☆ | Entirely solo work |
| Communication & writing | ★★☆☆☆ | No blog, no post-mortems, no technical writing |
| Portfolio presentation | ★★☆☆☆ | Dead code, no screenshots, default boilerplate |

**Verdict:** Strong student portfolio. Not competitive for a senior or mid-level role at a top-tier firm. Would consider for a junior/intern position contingent on a strong technical interview demonstrating adaptability beyond the comfort-stack.

---

## 4. Deep Dive — Cross-Referencing Claims Against Actual Codebases

The roast above was based solely on what the portfolio *shows*. I then audited every project in the workspace to determine what the candidate has actually done but failed to represent. Below is the result, organized by each original criticism.

---

### Criticism: "No testing in the portfolio / weak testing evidence"

**VERDICT: PARTIALLY WRONG.** The candidate has significant testing work that the portfolio undersells.

| Project | Test Files | Framework | CI Integration |
|---|---|---|---|
| ExsysBackend | **~34 spec files** (11 unit, 13 integration routes, 8 WebSocket tests) | Mocha + Chai + Sinon + nyc + mongodb-memory-server | Unit + Integration + Dev tests in CI |
| ExsysFrontend | **~10 test files** (4 lib utils, 5 hook tests) | Jest + @testing-library/react + @testing-library/jest-dom | Yes, CI-gated |
| GaslightCodeRunner | **~10 spec files** (4 unit: sandboxing/bundling, 2 integration: scoring/performance) | Mocha + Chai + Sinon + nyc | Unit + Integration + Dev in CI |
| GroupSchedulerBackend | **~8 spec files** (2 model, 1 function, 3 route integration) | Mocha + Chai + Sinon + nyc + mongodb-memory-server | Unit + Integration + Dev in CI |
| LifeTrackerBackend | **~5 spec files** (2 model, 3 route integration) + `.nycrc.json` coverage config | Mocha + Chai + Sinon + nyc + mongodb-memory-server | Unit + Integration in CI |
| SeedGPT | **~21 test files** across agents, tools, models, LLM layer | Jest + mongodb-memory-server, coverage reporters (text, lcov, html) | CI + coverage with `--coverageProvider=v8` |
| GaslightBackend | 1 dev setup test only | Mocha + Chai (deps present, mostly unused) | Dev tests only |

**Total: ~88 test files across 6 projects.** The candidate tests backends seriously — unit tests, integration tests with in-memory databases, WebSocket tests, coverage measurement. The frontends are undertested (only ExsysFrontend has tests), and the portfolio itself has zero tests. But the blanket claim "no testing" is inaccurate. The portfolio utterly fails to communicate this testing effort.

Shared CI infrastructure uses **reusable GitHub Actions workflows** (`development-backend.yml`, `development-frontend.yml`) that run test suites as parallel jobs: build → [test-unit | test-integration | test-development | test-lint | spellcheck | test-image]. This is mature CI design.

**Note on fuzz testing:** The portfolio claims a "Fuzz Testing Pipeline" for LifeTracker. A CI badge referencing `workflows/fuzz.yaml` exists in the LifeTrackerBackend README, but **no fuzz test files or workflow exist in the workspace**. This claim is either hosted elsewhere or aspirational.

---

### Criticism: "No SQL database experience"

**VERDICT: CONFIRMED.** Every single project uses MongoDB via Mongoose. No SQL, no PostgreSQL, no MySQL, no SQLite, no Prisma, no TypeORM, no Sequelize, no Drizzle, no Knex. The only SQL-related packages in any `package-lock.json` are transitive dependencies from Sentry's OpenTelemetry auto-instrumentation — not application code. This criticism stands.

---

### Criticism: "No GraphQL, no gRPC, no message queues"

**VERDICT: CONFIRMED.** Zero GraphQL schemas, zero `.proto` files, zero Kafka/RabbitMQ/AMQP/BullMQ/NATS usage. All inter-service communication is REST + Socket.io. The `@octokit/graphql` package exists as a transitive dep in SeedGPT but is never used directly. This criticism stands in full.

---

### Criticism: "Monitoring is shallow"

**VERDICT: PARTIALLY WRONG.** The monitoring story is deeper than the portfolio suggests, though still incomplete.

**What actually exists:**

- **Sentry with tracing + profiling** — All 5 backends configure `tracesSampleRate: 1.0` and `profilesSampleRate: 1.0` with `@sentry/profiling-node`. This is beyond basic `Sentry.init()`. Express error handlers are integrated. However: no custom breadcrumbs, no user identification, no frontend SDK, no React error boundaries.

- **Winston logging is genuinely good** — Structured JSON format, 7 log levels, environment-aware level selection (silly in dev, info in prod), separate file transports (error.log, info.log, combined.log), service identification via `defaultMeta`, and — importantly — **BetterStack (Logtail) integration** for centralized log aggregation in production/staging across all backends. Missing: log rotation, correlation IDs, HTTP request logging.

- **Health checks are production-grade** — Every backend exposes `/api/service/livez` (liveness) and `/api/service/readyz` (readiness). Readiness checks actual dependencies (mongoose connection state, Socket.io readiness). All K8s deployments have properly configured `livenessProbe` and `readinessProbe` with appropriate `initialDelaySeconds` and `failureThreshold`.

- **Rate limiting exists** — LifeTrackerBackend and ExsysBackend implement a 5-tier rate limiting system (`veryLow` through `critical`) with environment-specific configs. Only applied in 2 of 5 backends.

**What's genuinely absent:** Prometheus metrics, Grafana dashboards, application-level alerting, SLOs, incident response documentation. No `/metrics` endpoint anywhere.

---

### Criticism: "Every project is the same project / same stack"

**VERDICT: PARTIALLY FAIR, BUT OVERSTATED.**

The web projects do share a common stack (TypeScript + Express 5 + Next.js + MongoDB + Redis + Docker + K8s). However, the workspace reveals more diversity than the portfolio communicates:

- **C++ (GOL):** Multithreaded analysis with `std::thread`, `std::mutex`, `std::atomic`. Bit-packed grids. Floyd's cycle detection. Compiled with MSVC `cl.exe /O2 /Oi /GL /LTCG`. No CMake — raw compiler invocation.
- **Java (Diecup-2):** Genetic algorithm optimizer with `java.util.concurrent` for parallelism. 694-line `GeneticOptimizer.java`. Common Random Numbers, multi-objective fitness, tournament selection, adaptive mutation.
- **Python:** Used as tooling across GOL (NumPy, Matplotlib for visualization/analysis) and Diecup-2 (log parsing, plotting).
- **V8 Sandboxing (GaslightCodeRunner):** `isolated-vm` with custom esbuild plugins, virtual filesystem bundling, AST token counting via esprima. This is genuinely specialized work.
- **LLM Agent Orchestration (SeedGPT):** 6 specialized agents, Anthropic batch API, persistent memory, autonomous git/GitHub operations via Octokit + simple-git. Not a typical web app.
- **seedwatch:** A monitoring dashboard for SeedGPT with cost tracking per Anthropic model, phase-level breakdowns, memory browsing. Not mentioned in the portfolio at all.

The criticism "every project is the same" is fair for the 4 web-app backends, but ignores the C++, Java, and specialized systems work. The portfolio fails to emphasize the architectural differences between projects.

---

### Criticism: "No evidence you can read code / no open-source contributions"

**VERDICT: CONFIRMED.** No evidence of contributions to external open-source projects anywhere in the workspace. All work is greenfield. This criticism stands.

---

### Criticism: "No evidence of team collaboration"

**VERDICT: CONFIRMED.** No CONTRIBUTING.md, no CODEOWNERS, no PR templates, no issue templates, no code review configurations anywhere. Single author across all repositories. The three-branch model (main/staging/development) and CI/CD maturity show individual production practices, but zero team workflow evidence. This criticism stands.

---

### Criticism: "No blog, no technical writing"

**VERDICT: PARTIALLY WRONG.** The portfolio doesn't surface it, but technical writing exists:

- **GOL/docs/DAG_IMPLEMENTATION.md** — A 266-line Architecture Decision Record covering a DAG-based caching optimization. Contains data structures, algorithm pseudocode, memory estimates, edge cases, testing strategy, and performance projections. This is genuine ADR-quality work.
- **Diecup-2/STRATEGY_GUIDE.md** — A 253-line strategic analysis of the dice game's decision-making principles with code snippets and formulas.
- **LifeTrackerBackend/README.md** — 191 lines with CI badges, full API documentation including curl/PowerShell/Python examples, user agreement, privacy policy, GDPR deletion instructions.
- **SeedGPT/README.md** — Detailed architectural documentation: 6 LLM agents, context compression, memory system, deployment model.
- **GOL/README.md** — 150 lines: project structure tree, build instructions, tool usage, pattern format spec, performance details.
- **.github/README.md** — Full usage documentation with YAML snippets for all 3 reusable workflows.

However: no blog, no public-facing post-mortems, no conference talks. The technical writing exists but is buried in READMEs and docs folders that nobody will find from the portfolio.

---

### Criticism: "Dead code, no screenshots, default boilerplate in public/"

**VERDICT: CONFIRMED.** `SkillMap.tsx` and `ProjectLayout.tsx` are unused components. The `public/` folder contains only default Next.js SVGs. No screenshots, no OG image, no custom favicon. This criticism stands in full.

---

### Undiscovered work: seedwatch

The portfolio has **no mention whatsoever** of `seedwatch`, a complete Next.js monitoring dashboard for SeedGPT. It features:
- Cycle history with cost tracking (per Anthropic model pricing: Opus, Sonnet, Haiku)
- Per-phase breakdowns (planner, builder, fixer, reflect, memory)
- Memory browser for AI agent notes/reflections
- Overall statistics and search
- Detailed cycle drill-down pages
- 1054 lines of data fetching/aggregation logic

This is a fully functional observability tool that goes unmentioned.

---

### DevOps & Security are deeper than portrayed

The portfolio says "deployed to a Kubernetes cluster on a Raspberry Pi." The reality is a production-grade operation that the portfolio reduces to a single sentence.

**Infrastructure:**

- **85 Kubernetes manifest files** across all projects — Deployments, Services, Ingress (nginx), HPA (autoscaling/v2), Kustomize overlays
- **Staging vs Production overlays** — Staging: 1 replica, no HPA. Production: 2+ replicas, HPA (min 2, max 10, 50% CPU target)
- **WebSocket-aware Ingress** — proxy-http-version, upgrade, connection, sticky session annotations
- **Multi-platform Docker builds** — `linux/arm64,linux/amd64` via `docker buildx` in CI
- **GitOps flow** — CI pushes image tags to DevOps repo → ArgoCD syncs to cluster
- **Reusable GitHub Actions** — 3 centralized reusable workflows + 4 composite actions. Per-project workflows are thin wrappers (~15 lines each)
- **Redis shared infrastructure** — Deployed centrally with password from Secret, ephemeral storage with size limit

**Security — not mentioned in the portfolio at all, but present in the code:**

- **K8s hardening** — `automountServiceAccountToken: false` on every pod, non-root users in all 11 Dockerfiles, secrets via `envFrom: secretRef`, no hardcoded credentials in manifests
- **TLS via cert-manager** — `cert-manager.io/cluster-issuer: letsencrypt-production` on Ingress resources
- **Helmet** on all 5 backends (default config)
- **CORS** with origin-restriction in production (e.g., `"origin": "https://kantine.nyskivehus.dk"`), per-route CORS on ExsysBackend for webhook callbacks (`origin: "*"` only on webhook routes)
- **Session security** — `httpOnly: true`, `secure: true` in prod, `SameSite: strict`, MongoStore with auto-removal
- **Passport.js auth** on 4 backends
- **Tiered rate limiting** (5 tiers, environment-specific) on 2 backends
- **Secrets verification** — `verifyEnvironmentSecrets.ts` checks required env vars at startup, failing fast if missing

Missing: CSRF protection, input validation libraries (no Joi/Zod/express-validator), security scanning, Prometheus metrics, Grafana dashboards.

---

## 5. Revised Summary

| Category | Original | Revised | What Changed |
|---|---|---|---|
| Technical breadth | ★★★☆☆ | ★★★☆☆ | No change. SQL/GraphQL/queues still absent. |
| Project complexity | ★★★★☆ | ★★★★☆ | No change. Already fair. |
| Production experience | ★★★☆☆ | ★★★☆☆ | No change. Still no scale evidence. |
| Code quality | ★★★☆☆ | ★★★☆☆ | No change. Dead code still ships. |
| DevOps maturity | ★★★★☆ | ★★★★★ | 85 K8s manifests, HPA, Kustomize overlays, multi-platform Docker, reusable CI, GitOps, cert-manager TLS. This is genuine production infrastructure. |
| Testing discipline | ★★☆☆☆ | ★★★★☆ | ~88 test files, 6 tested projects, reusable CI with parallel test jobs, coverage configs, in-memory DB testing. Backends are well-tested. Frontends are weak. |
| Collaboration evidence | ★☆☆☆☆ | ★☆☆☆☆ | No change. Confirmed solo across all repos. |
| Communication & writing | ★★☆☆☆ | ★★★☆☆ | 266-line ADR, 253-line strategy guide, substantial READMEs. No blog or public writing, but the docs exist. |
| Portfolio presentation | ★★☆☆☆ | ★★☆☆☆ | No change. The portfolio still fails to surface the real depth. |
| Monitoring & observability | (not rated) | ★★★☆☆ | BetterStack log aggregation, Sentry tracing+profiling, health probes, rate limiting. No metrics/alerting. |
| Security | (not rated) | ★★★☆☆ | Helmet, CORS, session hardening, K8s secrets, non-root containers. No input validation, no CSRF. |

**Revised Verdict:** The candidate's actual work is meaningfully stronger than their portfolio communicates. DevOps and testing are the biggest under-representations — the infrastructure is production-grade, and the test suite is substantial. The fundamental weaknesses remain: no SQL experience, no collaboration evidence, no open-source contributions, and a comfort-stack dependency on MongoDB + Express + Next.js. The portfolio itself is the weakest piece of the candidate's output — it actively harms their case by hiding real depth behind a minimalist single-page site with dead code and no screenshots. The candidate would benefit enormously from surfacing their testing strategy, DevOps sophistication, and technical writing in the portfolio itself.
