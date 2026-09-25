# Portfolio Review, Round Two — Rasmus Haversen

**Reviewer perspective:** Same senior technical recruiter, same fast-moving, competitive firm, same full-stack role. Round one ended with: "Strong student portfolio. Not competitive for a senior or mid-level role. The candidate would benefit enormously from surfacing their testing strategy, DevOps sophistication, and technical writing in the portfolio itself."

This is a re-review. I read the original review, then I re-read the site and the repository line by line to see what you did about it. You did quite a lot. That matters. But you also did some new things that I need to talk to you about.

---

## 1. What You Fixed — Credit Where Due

I keep receipts in both directions. Here is what genuinely improved since round one:

- **The dead code I named is gone.** `SkillMap.tsx` and `ProjectLayout.tsx` no longer exist. Good.
- **The `public/` folder is no longer default scaffolding.** Custom favicon set (16/32, apple-touch, android-chrome), a `site.webmanifest`, and proper `icons`/`manifest` metadata in `layout.tsx`. This is the boring hygiene I asked for.
- **The "architecture diagrams" are gone**, replaced by an honest prose grid describing Kubernetes, CI/CD, Docker, monitoring, security, and TLS. It actually explains the deployment model now — overlays, HPA, ArgoCD, cert-manager. Round one called this out; you addressed it.
- **There is a CV now.** Bilingual (Danish/English), typed through a `CvData` interface, rendered from data, printable via an A4-constrained print stylesheet. This is "CV as code," and it is a legitimately good idea.
- **The hero copy stopped cosplaying.** It now says what you are — full-time research intern at Interactive Matter Lab, technical lead for a small team — with concrete artifacts (printer firmware, text-to-3D platform, papers submitted). Much stronger.
- **SeedWatch is on the page.** The round-one "undiscovered work" finding is fixed.
- **There is a `/fun` playground** with eleven interactive side projects, including genuinely impressive ones, and shared streaming infrastructure (`useSocket`, `useBlockDrain`, `useRateLimit`) that shows real abstraction instinct.
- **There is a benchmark page** (`/gol-bench`) for the Game of Life background. Percentiles, long-task counts, memory sampling, JSON export. The reflex to *measure* the thing I criticized is exactly the right reflex.

That is a serious response to feedback. Most candidates ignore reviews entirely. You treated mine like a backlog.

---

## 2. What You Didn't Fix

- **Still zero tests in the portfolio repository.** Not one test file. More on why this is now worse below.
- **No Open Graph / Twitter metadata, no `sitemap.ts`, no `robots.ts`, no per-route metadata.** You fixed favicons and forgot sharing entirely. Every route on this site renders the same generic `<title>`.
- **No screenshots of anything.** Nine image files ship in `public/`: seven of them are icons, three of those are Earth textures for the eclipse project. Not one screenshot of Exsys, Gaslight, SeedGPT, or any project. A visual medium, still telling instead of showing.
- **The README is still the unmodified create-next-app template.** "First, run the development server... You can start editing the page by modifying `app/page.tsx`." You gutted the SVG boilerplate and left the single most-read file in the repository untouched.
- **No blog, no post-mortems, no writing surfaced anywhere on the site.** The ADR and strategy guides from round one are still buried in other repos.

---

## 3. The Roast, Round Two

### You cleared the dead code I found, then planted new dead code.

This is my favorite finding of the round, because it's almost artistic. `AgentGiveUpProject.tsx` is a complete, implemented component — with socket wiring, preset tabs, a copy button — that is **not registered in `SIDE_PROJECTS`**. It cannot be reached by any user of the site. You wrote a project, imported nothing wrong, committed it, and forgot to ship it.

Meanwhile, `ProjectShowcase` still carries a `hasDetail` prop that **no caller passes**. When set, it renders an overlay link to `/${id}` and a "Read more ↗" affordance — to detail pages that do not exist. Eleven cards pass an `id` prop that is only consumed by this dead branch. You shipped half of a feature flag system for a feature that isn't there.

Round one's dead code criticism wasn't about two files. It was about the habit: building components and not wiring them up. The habit survives. You fixed the instances, not the pattern.

### The `docs/` folder is a confession, and it's in the public repo.

This is the big one, so let me be precise. Your portfolio repository — the one linked from the portfolio itself — tracks and publishes:

- `docs/jobs/interview-notes.md`, containing — verbatim — that your research internship is currently **unpaid** while the PI seeks funding, that you work **"15-timers dage i uger inkl. weekender, startede gratis"**, and this operational instruction regarding Dupontdoku: **"kører i production med rigtige brugere (ikke færdigt — nævnes IKKE som ufærdigt)"** — *"don't mention that it's unfinished."*
- `docs/jobs/job-posting.md`, a scraped job posting including a named university employee's **personal mobile number and direct email**. You published a third party's contact data in a public repository.
- `docs/PORTFOLIO_REVIEW.md` — my round-one review, including the sentence calling you a student cosplaying as a senior engineer.

I want to be fair: some of this reads as radical transparency, and the interview notes are honest craft notes to yourself. But sit in my chair for a second. The Dupontdoku card on your homepage says *"A client project, live in production with real users"* — and two directories away, in the same public repository, your own notes say it isn't finished and instruct you not to say so. That is not transparency. That is the evidence locker sitting next to the courtroom. Any recruiter who reads source — and at the firms you're targeting, we do — now prices every unlinked claim on your site against the notes you forgot you shipped.

Delete nothing in haste; just understand what you published. An unpainted client project is fine. An unpainted client project marketed as finished, with a private note saying to keep that quiet, is a character reference.

### The LLM Brainwashing page ships a pipe-bomb jailbreak as a clickable preset.

The preset list includes "Prefill Jailbreak," whose assistant prefill begins constructing — word for word — an improvised explosive description, and a "Donald Trump" preset whose system prompt is defamatory sexual content about a real, named person. These are the default-loadable states of a public page on your portfolio.

I get what the project demonstrates: assistant prefill as a mechanism, guardrails as suggestion rather than law. Technically, fine. But you've hung a loaded demo on the wall of your job application, and the first thing it demonstrates to me is judgment under ambiguity — or the lack of it. "Look what the model does" and "here are instructions, in my public repo, behind one click" are different claims. You shipped the second one.

### The Game of Life: progress, with an asterisk the size of the canvas.

Let the record show what you actually fixed: pre-rendered sprite atlas instead of per-cell fill paths, opacity-batched draw calls, a cull threshold, rAF-debounced resize, a speed slider, and a whole benchmark page. That is real work, and it shows.

Now the asterisk. `INITIAL_DENSITY` is still `0.5`. The full-viewport canvas still runs under a permanent `blur(10px)` CSS filter, which is a per-frame compositing cost on every device. There is still no `prefers-reduced-motion` handling anywhere in the codebase — I searched; zero matches across the whole app. Every single click anywhere in the document still spawns a glider, including clicks on your own navigation links, because the listener sits on `document` and only exempts the controls popover. And the step function allocates a fresh `Uint8Array` every generation — GC churn on a timer, in the page whose author lists C++ performance as a skill.

Then there's my favorite line on the site, in the GOL popover: *"Runs about as efficiently as scrolling Google search."* You wrote a benchmarking tool that produces p50/p95/p99 frame times, and then put a joke boast in the UI instead of the numbers. You had the receipts and chose vibes. Also: `resize` calls `init()`, which rebuilds a random grid — on iOS Safari, the address-bar collapse fires resize during ordinary scrolling, so mobile users watch the simulation randomly re-roll underneath them mid-read.

Your own benchmark page exists to prove the background is cheap. If it's that cheap, ship the `prefers-reduced-motion` branch and the density fix and be done. If it isn't, your benchmark would tell you. Either way the current state is unflattering.

### Your own deployment doesn't meet the standard your own homepage advertises.

The Infrastructure section says production runs "2+ replicas with horizontal pod autoscaling (up to 10)." Your own `k8s/production/deployment.yaml`: **`replicas: 1`**. No HPA. No resource requests or limits. No PDB. The site teaching SRE on its homepage is the only service in your fleet that doesn't get the SRE.

Yes, it's a static frontend and one replica "is fine." That's exactly the point — if one replica is fine, the homepage's "every service" framing is marketing copy, not architecture. Numbers you set for other people's services, you don't meet yourself.

### The account system: who is this for?

Global signup, login, password reset, email confirmation, account deletion, an unconfirmed-email banner with a live deletion countdown, and a **public "Browse Accounts" directory listing every registered user** — bolted onto a one-person portfolio. It exists, I think, to prove there's a real backend behind the site. There are cheaper ways to prove a backend exists than operating a user directory with GDPR-shaped obligations on your personal site. A recruiter does not need an account on rhaversen.com. A recruiter needs to not wonder why rhaversen.com needs accounts.

### A recurring exhibit of small crimes

- **No custom `not-found.tsx` or `error.tsx` anywhere.** A 404 on rhaversen.com renders Next.js's unstyled framework default. A frontend candidate whose 404 is stock Next.js.
- **`next.config.ts` is empty.** No headers, no security policy, nothing. All that hardening you advertise happens on the backends; the public frontend ships whatever defaults arrive.
- **"Download PDF"** opens `window.print()`. There is no PDF. The one artifact every recruiter actively hunts for is behind a mislabeled button that produces a print dialog with background art attached.
- **`/fun` headline reads "Side Projects Fun."** Grammar is load-bearing in an interview.
- **The three research cards — the most impressive claims on the page — have zero links.** No lab page, no preprints, no repo, nothing clickable. "Co-author on three conference-submitted papers" is currently an unfalsifiable sentence wearing a card border.
- **Your best technical work is buried under the nav label "Fun."** Eclipse Forecast implements NASA Besselian elements, projects the shadow axis onto the WGS84 ellipsoid, and does the umbra/penumbra cone test **per fragment in a GLSL shader**. That is genuinely rare frontend work, and the information architecture files it next to an alcohol price-per-ethanol calculator.
- **Two eras of code style in one repo.** `login/`, `signup/`, `accounts/` are single-quote, no-semicolon; everything newer is double-quote, semicolons. No Prettier, no Biome — just sediment layers.
- **Heading hierarchy is a mosh pit.** `h1` name, then `h2` for your email address, `h2` for sections, `h2` again for card titles inside them. The document outline would fail your own code review.
- **`site.webmanifest` declares `theme_color: #050505`** for a site whose background is `#f7f9fc`. Dark status bar on a light site. Details, again.
- **`ObfuscatedEmail`** is string concatenation in a client bundle. It obfuscates nothing and demonstrates less.

---

## 4. Deep Dive — Round-One Criticisms, Re-Audited Against the Current Codebase

### Criticism: "Dead code, default boilerplate, no favicon"

**VERDICT: PARTIALLY FIXED — THE HABIT REMAINS.** Named offenders removed; favicon set, manifest, and icons metadata added. New offenders introduced (`AgentGiveUpProject` unreachable, `hasDetail`/`id` machinery never used). README untouched. The round-one diagnosis — *building without wiring up* — was correct and remains the failure mode.

### Criticism: "Hardcoded SVG architecture diagrams"

**VERDICT: FIXED.** Removed and replaced with a prose infrastructure grid that is materially more informative. Still no links to the DevOps repo, dashboards, or anything that would let me verify a single sentence of it — but the criticism as stated is resolved.

### Criticism: "Game of Life background is a performance liability"

**VERDICT: SUBSTANTIALLY MITIGATED, NOT RESOLVED.** Genuinely good optimizations landed (sprite atlas, alpha batching, culling, resize debounce) plus a benchmark page — which is the correct instinct. Remaining: `INITIAL_DENSITY = 0.5`, full-screen `blur(10px)`, no `prefers-reduced-motion`, document-level click spawning, per-step allocations, resize-induced grid resets on mobile, and a UI that jokes about performance instead of quoting its own benchmark. The irony is now self-aware, which is progress, but self-aware irony is still irony.

### Criticism: "No testing in the portfolio"

**VERDICT: STILL CONFIRMED — AND NOW SELF-INFLICTED.** Zero test files. Here is the part that moves this from omission to own goal: `.github/workflows/development.yaml` invokes your reusable frontend workflow with **`run_tests: false`**. You built a reusable, parallelized CI system specifically to run test suites, and on the repository that markets your engineering, you disabled the tests. There is no test suite to disable. The badge machinery is there; the discipline is not.

### Criticism: "No screenshots, no OG image"

**VERDICT: HALF FIXED.** Icons and manifest: fixed. Open Graph/Twitter metadata: absent. Screenshots of actual projects: absent. Sharing your site in Slack or iMessage produces a bare URL. In 2026. For a portfolio.

### Criticism: "No blog, no post-mortems, no technical writing surfaced"

**VERDICT: UNCHANGED.** The writing that exists (GOL ADR, Diecup strategy guide, SeedGPT docs) is still invisible from the site. Meanwhile the only *new* writing you've published on this domain's repository is interview notes admitting you under-represent incompleteness. You had a writing problem; you now have a writing problem and a disclosure problem.

### Criticism: "No evidence of team collaboration"

**VERDICT: IMPROVED IN SUBSTANCE, NOT SURFACED.** The hero now says "technical lead for a small developer team," the CV details coordinating three developers, and the application letter describes reviewing others' code and enforcing CI gates. That is real team evidence — and the only place a recruiter finds it is a CV reachable from a small button. The homepage's project cards, where collaboration evidence belongs, still read as solo endeavors.

### Criticism: "No SQL / GraphQL / queues; same stack everywhere" (round-one cross-reference)

**VERDICT: UNCHANGED IN THE WEB TIER.** Nothing in this repository changes the round-one finding: MongoDB + Express + REST + Socket.io across the board. The C++, Java, and systems work still offsets "every project is the same project," and the new lab work (firmware, text-to-3D) strengthens that offset — but the SQL/GraphQL/queue gap is exactly where round one left it.

---

## 5. What the Round-Two Audit Found That Round One Missed

To be fair in the other direction, the current codebase is stronger than its presentation in specific, verifiable ways:

- **Eclipse Forecast** is the best frontend work in the portfolio and it isn't close: Besselian polynomial evaluation, ellipsoid intersection for the central line, and a fragment shader that re-derives the umbra/antumbra cone test per pixel — with the docs explaining *why* the shader is exact under rotation. This is not a tutorial Three.js globe.
- **`/gol-bench`** is a competent measurement harness: percentile stats, `longtask` observation, `performance.memory` sampling with graceful absence handling, JSON export, captured-at metadata. Most senior engineers don't ship this for a *decoration*.
- **The shared LLM streaming layer** (`useSocket`, `useBlockDrain` with typed event/text blocks and drain-finish semantics, `useRateLimit`) shows the exact instinct — extract the boilerplate, type the seams — that team codebases run on.
- **Skumfidus** quietly demonstrates real data-engineering hygiene: timezone-correct `Intl` formatting, a mojibake-repair function for legacy-encoded Danish text, ISO week math, and a dozen statistical views over it.
- **The CV-as-data architecture** (`CvData`, locale files, template separation) is the right engineering answer to "maintain two CVs."
- **Currency:** Next 16, React 19, Tailwind 4, TypeScript 6, Node 24 — you are on current tooling, not frozen in the version you learned.

The pattern across all of it: the engineering is frequently better than the presentation, and the presentation is occasionally worse than the engineering warrants. Same as round one. That is the throughline.

---

## 6. Summary

| Category | Round One | Round Two | What Changed |
|---|---|---|---|
| Technical breadth | ★★★☆☆ | ★★★☆☆ | Unchanged. SQL/GraphQL/queues still absent; lab work strengthens the non-MERN offset. |
| Project complexity | ★★★★☆ | ★★★★☆ | Unchanged. SeedGPT, Gaslight, Eclipse Forecast still the standouts. |
| Production experience | ★★★☆☆ | ★★★☆☆ | Unchanged. Real users, still no numbers — and Dupontdoku's claim is now actively undercut by your own committed notes. |
| Code quality | ★★★☆☆ | ★★★☆☆ | Old dead code removed; new dead code shipped. README, empty `next.config.ts`, stock 404, style sediment. |
| DevOps maturity | ★★★★☆ | ★★★★☆ | Still genuinely strong — but the portfolio's own 1-replica, no-HPA deployment now contradicts the homepage's own claims. |
| Testing discipline (portfolio) | ★★☆☆☆ | ★★☆☆☆ | Still zero tests, now with `run_tests: false` making it an explicit choice rather than an omission. |
| Collaboration evidence | ★☆☆☆☆ | ★★☆☆☆ | Tech-lead role and review practice now stated — on the CV, not the portfolio proper. |
| Communication & writing | ★★☆☆☆ | ★★☆☆☆ | Still nothing surfaced — and `docs/` now publishes private strategy notes and a third party's phone number. |
| Portfolio presentation | ★★☆☆☆ | ★★★☆☆ | Real improvement: CV, infrastructure section, favicon hygiene, fun playground, benchmark page. Still no OG/screenshots/links on research claims. |
| Judgment signals | (not rated) | ★★☆☆☆ | New rating. Pipe-bomb preset, defamatory preset, public interview notes with "don't mention it's unfinished," published third-party contact data. |

**Verdict:** Genuinely better, and visibly responsive — this is the portfolio of someone who listens to feedback, which is itself a hiring signal. The fixes were also, almost to a one, the *visible* fixes: the things named in a review got fixed, the things a review wouldn't name (tests, metadata, evidence links, publishing hygiene) stayed broken. The strongest material on the site — Eclipse Forecast's math, the benchmark harness, the lab leadership — is still hidden behind the weakest labels ("Fun," a joke about Google search, cards with no links). And the repo now actively works against you in two places I did not expect to find: a private-notes folder that contradicts the homepage's claims, and LLM presets that will end an interview early if a recruiter clicks one tab to the left of "Confidently Wrong."

Round one said: strong student portfolio, not competitive mid-level. Round two says: the gap is no longer mostly skill. The gap is *finish and evidence* — wire up what you build, prove what you claim, and treat the public repository as the interview room it is. Do those three things and this becomes a different conversation.
