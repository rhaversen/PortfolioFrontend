import type { CvData } from "./CvData";

const data: CvData = {
	lang: "da",
	photo: { src: "/cv/photo.png", alt: "Rasmus Haversen" },
	name: "Rasmus Haversen",
	contacts: [
		{ icon: "phone", text: "+45 42 42 47 70" },
		{ icon: "mail", text: "rhaversen@gmail.com", href: "mailto:rhaversen@gmail.com" },
		{ icon: "globe", text: "rhaversen.com", href: "https://rhaversen.com" },
		{ icon: "github", text: "github.com/rhaversen", href: "https://github.com/rhaversen" },
	],
	skills: {
		title: "Tekniske kompetencer",
		groups: [
			{ heading: "Sprog", text: "TypeScript, Python, Java, C++, Bash" },
			{ heading: "Backend", text: "Node.js, Express, REST, WebSockets, MongoDB, Redis, Swagger/OpenAPI, Microservices, Sandboxed Code Execution" },
			{ heading: "Frontend", text: "React, Next.js, TailwindCSS, Three.js / react-three-fiber" },
			{ heading: "DevOps", text: "Docker, Kubernetes (MicroK8s), ArgoCD, GitHub Actions (CI/CD, GitOps), Sentry, Better Stack, SealedSecrets" },
			{ heading: "Linux", text: "Debian-serverdrift, selvskrevne setup scripts (fresh install → fuld deployment), OpenWRT-routeradministration (DMZ, VPN, firewall)" },
			{ heading: "Git", text: "Feature branches, pull requests, code review, ren historik, branch protection" },
			{ heading: "AI/LLM", text: "LLM-integration (provider-kataloger, caching, agent-arkitekturer)" },
			{ heading: "CAD/FEA/3D", text: "OpenSCAD, Gmsh, CalculiX, Blender, 3D-printing" },
			{ heading: "Video/medie", text: "Premiere Pro, Davinci Resolve" },
		],
	},
	intro: [
		"I dag er jeg teknisk lead i forskningsregi ved Aarhus Universitet, hvor jeg koordinerer udviklingen af flere systemer, der er i daglig brug på laboratoriet. Ved siden af driver jeg flere produktionsapplikationer med rigtige brugere på min egen infrastruktur. Jeg er stærkest i TypeScript og Python, og Linux og Git er daglige værktøjer.",
		"Jeg elsker programmering, problemløsning, og alt der kan automatiseres med kode, og det er derfor jeg elsker datalogi. Jeg lærer hurtigt, og jeg møder nye udfordringer med nysgerrighed. Enhver opgave kan løses med nok tid og den rigtige opdeling; divide and conquer.",
		"Men nysgerrigheden stopper ikke ved et virkende prototype. Det, der driver mig, er at føre ting hele vejen fra første idé, til et system med rigtige brugere. Jeg er full stack udvikler med fokus på hele kæden, og on-call for alt, hvad jeg bygger.",
		"Det er derfor, jeg trives dér, hvor software møder virkeligheden; i drift, vedligehold og videreudvikling af systemer, folk er afhængige af.",
	],
	education: {
		title: "Uddannelse",
		entries: [
			{
				title: "Datalogi (BSc), Aarhus Universitet",
				date: "2022",
				bullets: ["170/180 ECTS gennemført.§ Sidste kursus færdiggøres 2027."],
			},
		],
	},
	experience: {
		title: "Erhvervserfaring",
		entries: [
			{
				title: "Research Intern",
				date: "jan. 2026–nu",
				subtitle: "Interactive Matter Lab, Aarhus Universitet§",
				bullets: [
					"Teknisk lead§ for udviklingsarbejdet i HCI-forskningsgruppen. Koordinerer og delegerer til andre udviklere på tværs af flere samtidige projekter. Medforfatter på 3 artikler under udarbejdelse.",
					"AI-assisteret§ generering af 3D-modeller. In-house compiler fra LLM-genererede designdokumenter til 3D mesh. Brugervendt agent-designsystem og webinterface",
					"Low-level printer-firmware.§ Bufferhåndtering og synkronisering af G-code og Xaar printhead UART-kommunikation.",
				],
			},
			{
				title: "Softwareudvikler (konsulent)",
				date: "apr. 2024– juni 2024",
				subtitle: "Ny Skivehus Aktivitetscenter§",
				bullets: [
					"Digital madbestilling§ til en kantine med ældre brugere. Særligt tilgængeligt design til iPad kiosker.",
					"Automatiserede statistikudtræk§ via MongoDB-aggregation pipelines (ordrestatistik, brugeradfærdsanalyse).",
					"Kortbetaling§ via SumUp-terminaler + live køkken-visning (Socket.IO). Kører i produktion og hostes og vedligeholdes fortsat af mig.",
				],
			},
		],
	},
	references: {
		title: "Referencer",
		items: ["Michael Wessely§, PI, Interactive Matter Lab, Aarhus Universitet"],
	},
};

export default data;
