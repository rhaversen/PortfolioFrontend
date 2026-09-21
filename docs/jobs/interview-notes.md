# Interview Notes — Round 1 + Research (2026-09-19)

## Job

Aarhus Universitet, AU IT / Administrative Applikationer — timelønnet IT-medarbejder, 8 t/uge, ERDA/SiF (forskningsdata-platform, udviklet på KU). Starter 1. nov. 2026. Frist 11-10-2026. Kontakt: Klaus Dam. Fokus: kodeforbedringer, dokumentation, automatisering af statistikudtræk, backend-adgange/storage, support & drift. Krav: Linux, Python, Git. Fordele: Ansible, open source, code review.

## Format beslutninger

- Ansøgning på **dansk**, CV — sprog? (valgt: Danish for application; CV likely also Danish — confirm)
- **Cover letter + CV** ("Ansøgning + CV")

## Uddannelse

- Studerer datalogi (AU), startet 2022, **midlertidig pause/hiatus** fordi research intern-arbejdet blev full time.
- Har gået compiler-kurset (dovs-assignments).
- PI: Michal Wessely, Interactive Matter Lab (HCI), Aarhus Universitet — er ved at stifte startup hvor brugeren bliver **founding member**. Det pågår ved siden af — brugeren er god til at jonglere flere projekter (flere papers samtidig).

## Arbejdserfaring

1. **Research intern, Interactive Matter Lab, AU (januar 2026 – nu, full time, pt. unpaid mens PI søger funding)** — det er grunden til at han søger et timelønnet bijob. Teknisk lead: koordinerer udvikling, delegerer opgaver til andre udviklere, stramme deadlines. Arbejdet som solo og i teams (3 udviklere på manufacturerai). Ekstremt hårdtarbejdende: 15-timers dage i uger inkl. weekender, startede gratis. Flere projekter parallelt + flere papers.
    - **ManufacturerAI** — AI-assisteret manufacturing til silver printer (team på 3, han var lead).
    - **Quickjet** — low-level printer firmware: buffer management, streaming, synkronisering af printer GCode og Xaar printhead UART-kommunikation. Videreførte eksisterende arbejde solo til fuldt brugervenligt terminal-UI, fik det til at virke.
    - **Forge suite** — AI-assisteret model-generering, user-facing agent design system, text-to-3D, fuld RepairCAD interface (forge + flow integration).
    - **Næste opgave**: integrere printer-software i forge suite — registrere/send jobs via websitet, monitor/manage printeren, pipeline fra model-generering online → send job til printer, printer auto-update fra nye builds.
2. **Exsys (konsulentjob)** — digital madbestilling (kantine.nyskivehus.dk) til ældre, iPad-kiosker i en bygning, ekstremt tilgængeligt UI.
    - Admin interface: katalog/setup-modifikation, statistikudtræk, adfærdsanalyse.
    - Køkken-interface: ordre-kollationering, stabling per rum/aktivitet, "seen/delivered" så køkkenpersonalet altid har overblik, rullende levering gennem dagen.
    - SumUp payment terminal integration: backend sender checkout-requests, registrering og håndtering af terminals via UI (third-party API).
    - 3D-printede custom dele til setup.
    - Sprang ud af et skoleprojekt — kunden (Ny Skivehus) var så begejstrede at de skrev kontrakt på færdiggørelse + hosting. Ualmindeligt for projektet.
3. **Dupontdoku** — under udvikling, kunde-projekt, kører i production med rigtige brugere (ikke færdigt — nævnes IKKE som ufærdigt).

## Projektstatus

- Production med rigtige brugere: **Exsys, Forge, Dupontdoku, LifeTracker, Gaslight**.
- Klient-projekter: Exsys, Facture/Forge, Dupontdoku.
- Resten: hobby/portfolio — **fremhæv ikke ufærdighed**.

## Ansible/Linux/Git

- **Ingen Ansible-erfaring** — vil læse op inden interview. Til gengæld masser af automatisering: GitHub workflows, CI/CD.
- Meget aktiv på GitHub, men closed source (manufacturerai, quickjet).
- Git-nøgleord: code reviews, PR'er (lave/merge/review), feature branches, clean git hygiene, squash commits, hele uddannelsen på GitHub. **Fremhæv Git-kompetence kraftigt.**

## Motivation

- Elsker **store datasæt og visualisering af komplekse data** på intuitive/interessante måder.
- LifeTracker: bruger den selv i årevis, samler statistik om vaner, visualiserer/collater på pæne måder. Hosted med rigtige brugere. (Research: life-stats.net, ingest-first API — instantanære + relative tracks, webhook med personlig token, Python `requests`-eksempler i README, readyz health endpoint + Better Stack uptime badge + Codacy + fuzz-test workflow i det delte `.github` repo.)
- Gaslight: hosted med rigtige brugere. Relation-visualisering mellem Game/Tournament/Strategy/User — 4 collections med dokumenterede cross-projections ("hvilken ressource ejer data naturligt"), time-series per game ("tokens per standing over time"), Throne-side med Dominance/Momentum/Consistency/Activity/Peak-metrics, leaderboards, head-to-head, stream-graph koncept hvor linje-tykkelse koder en sekundær metrikk. Kører via Socket.IO + CodeRunner service til daglige tournaments.
- Exsys: big-data på ordredata — MongoDB **aggregation pipelines** (publicStatsController: `$match` på paymentStatus → `$group` per activityId → join med Activity → orders today/all-time/per-activity), SumUp reader checkouts via REST API + callback-flow, Socket.IO med **Redis adapter** + MongoDB change streams til live køkken-view grupperet per rum/aktivitet, Better Stack logging. Sprang ud af skoleprojekt — Ny Skivehus skrev kontrakt på færdiggørelse + hosting.
- ERDA/SiF matcher: statistikudtræk, visualisering, backend/storage-adgange.

## Infrastruktur (bekræftet i kode)

- **GitOps**: CI bygger Docker image → pusher til DockerHub/GHCR → CI patcher kun `image:`-feltet i DevOps-repoets `deployment.yaml` med `yq` → **ArgoCD auto-sync** (prune + selfHeal) fra privat DevOps-repo som single source of truth. DevOps-repo genereres automatisk — "Do NOT Modify Directly".
- **Genanvendelige GitHub workflows**: `rhaversen/.github/.github/workflows/ci-cd.yml@main` med inputs (project_name, dockerhub image, sentry sourcemaps, DEVOPS_REPO_TOKEN) — bruges af alle backends.
- **SealedSecrets** (kubeseal, controller i kube-system), fine-grained GitHub PATs (CI read/write, ArgoCD read-only), sikkerhedsanalyse ("image tag er attack surface").
- **MicroK8s på Raspberry Pi** som homelab: deploy.bash installerer ArgoCD, NodePort patch, firewall, Application-manifests, Secret-extraktion. SeedGPT kører som K8s Job via ArgoCD.
- Staging på samme hardware som production til QA, branch protection, TLS, DNS, offsite databases.

## Soft/other

- Full-stack at heart — hele kæden: klik → API → backend → microservices → databases → dev env matching production → staging QA → tests → branch protection → Docker builds → DockerHub → auto DevOps-repo update → ArgoCD/K8s → DNS → TLS → offsite DB.

## Interview Notes — Round 2 (2026-09-19)

### Kontakt

- Rasmus Haversen, Aarhus. Tlf: 42424770. GitHub: github.com/rhaversen. Hjemmeside: rhaversen.com. Alt med i CV.

### Uddannelse / hiatus-framing (HANS STØRSTE USIKKERHED)

- Bestod ikke sin ALLER SIDSTE eksamen til sommer; kan tage kurset igen næste sommer. Det faldt sammen med research intern-tilbudet i januar.
- **170/180 ECTS på datalogi-bachelor** — mangler kun én støttefag-kursus. "Overqualified ift. en frisk bachelor-studerende, men har ikke titlen endnu."
- Frame-det bedst muligt for en rekrutterer uden at lyve. Forslag: "BSc i datalogi, AU — 170/180 ECTS gennemført; i øjeblikket full-time research intern, færdiggør sidste kursus 2027." Vis styrke (næsten færdig + massiv praktisk erfaring) frem for hullet.

### Funding / betaling

- Fra december bliver intern-lønnen ~40.000 kr./md. Han kan sagtens holde 8 t/uge ved siden af — og gerne mere senere. Vil gerne blive længe hos labbet; ingen end-dato. Startup (founding member) pågår også ved siden af.
- Bekymring: 40k for deltid kan få rekruttereren til at frygte han hopper af. Frame: langsigtede, stabile forhold; jobbet er ved siden af et han allerede har + startup; pålidelig på tværs af flere projekter samtidig. IKKE nævne løntallet.

### Sprog

- Dansk (modersmål) + engelsk (flydende, bruger det dagligt på research-intern jobbet).

### Python/TS

- Foretrækker TS, men solidt Python: første ManufacturerAI-backend var fuldt Python (Swagger/OpenAPI, Express-ækvivalenter, Node, SDK'er). Bachelor: OCaml, Python, Java, JS, TS, C++, assembly. Præsenter TS + Python som de to stærkeste.

### Linux

- **Debian** på sin server (hoster alle sine apps), extensive selvskrevne setup-scripts der deployer fra fresh install.
- **OpenWRT** router-administration: DMZ, VPN'er til LAN-adgang udefra, port forwards, firewall-regler.

### Support/ops

- On-call for alle sine egne apps: aktive monitors → email-alerts når en service går ned; VPN gør at han kan fikse fra hvor som helst. "Defensible systems": revert-værktøjer der kan redde prod øjeblikkeligt + log/trafik-undersøgelse bagefter så samme fejl aldrig sker igen.
- Konkret war story: backend så sund ud i timer, så begyndte readyz at fejle → pod blev dræbt og genstartet og virkede igen. Root cause: rate limiters lå FØR route-definitionerne, så 10s healthcheck-intervallet ramte long-window rate limiters. (God til ansøgningen — viser debugging + forståelse.)

### Statistik-rapportering

- Ingen direkte erfaring med CSV/PDF-rapporter/cron-rapporter, men vurderer det som hurtigt lært; meget hurtig learner. Vi peger på aggregation pipelines + LifeTracker ingest som bevis på nærheden.

### Timeline (CV-datoer)

- **Corona-tester**: aug 2021 – jan 2022 (ca. ½ år), til stedet lukkede; 30 kolleger dag 1 → 5 tilbage til sidst — blev ved til sidste dag. Selvstændig: pakkede testkits, rengøring, planlagte skolebesøg, organiserede køer/papirarbejde, rapporterede positive tests. Har pæn anbefaling derfra.
- **Exsys**: april 2024 – juni (semesterprojekt, gruppe — men han var ENESTÅENDE udvikler; gruppen stod for user studies, cognitive walkthrough, akademisk del), + 1 måned kontraktarbejde i juni solo for at live-gå. Senere QOL-opdateringer mod lille betaling efter kundens ønske. Har kundekontrakt/hosting-erfaring.
- **Research intern**: jan 2026 – nu (ongoing). Anbefaling fra Michael Wessely. Meget selvstændig — egne timer, targets-baseret.

### Personlige egenskaber (bevidnede)

- Selvstændig i alle jobs; effektiv, hurtig, kløgtig, hurtig learner; ser det store billede mens medudviklere kun så den enkelte opgave — brugte det til tech-lead-delegering ind i et større økosystem.

### Papers (co-author, submitted, ikke endnu publicerede)

1. **ManufacturerAI** (AI-assisteret manufacturing, silver printer)
2. **Sindri** (silver printer)
3. **Write-to-Repair** (RepairCAD)
