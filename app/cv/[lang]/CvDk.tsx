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
			{ heading: "Programmeringssprog", text: "TypeScript, Python, Java, C++, Bash" },
			{ heading: "Backend", text: "Node.js, Express, REST-API'er, WebSockets, MongoDB, Redis, Microservices, Sandboxed Code Execution" },
			{ heading: "Frontend", text: "React, Next.js, TailwindCSS, Three.js" },
			{ heading: "Drift & DevOps", text: "Docker, Kubernetes, ArgoCD, GitHub Actions (CI/CD, GitOps), Sentry, Better Stack, SealedSecrets" },
			{ heading: "Linux", text: "Daglig Debian-serverdrift, automatiserede setup-scripts, routeradministration (OpenWRT: DMZ, firewall, VPN)" },
			{ heading: "Git", text: "Feature branches, pull requests, code review, ren historik, branch protection" },
			{ heading: "AI/LLM", text: "LLM-integration (provider-kataloger, caching, agent-arkitekturer)" },
			{ heading: "CAD/FEA/3D", text: "OpenSCAD, Gmsh, CalculiX, Blender, 3D-printing" },
			{ heading: "Video/medie", text: "Premiere Pro, Davinci Resolve" },
			{ heading: "Sprog", text: "Dansk (modersmål), engelsk (flydende)" },
		],
	},
	intro: [
		"Jeg hedder Rasmus, er 26 år og læser datalogi på Aarhus Universitet. I dag er jeg teknisk lead ved Interactive Matter Lab på AU, hvor jeg koordinerer udviklingen af flere systemer, laboratoriet er afhængige af hver dag. Ved siden af driver jeg flere egne systemer i produktion med rigtige brugere.",
		"Jeg elsker at programmere og at automatisere alt, hvad der kan automatiseres, og det er derfor, jeg valgte datalogi. Jeg lærer hurtigt, og jeg møder nye udfordringer med nysgerrighed. Min erfaring er, at enhver opgave kan løses med dedikation og den rigtige opdeling; divide and conquer.",
		"Men nysgerrigheden stopper ikke ved en virkende prototype. Det, der driver mig, er at føre en idé hele vejen til et system, rigtige mennesker er afhængige af. Jeg er full stack udvikler med fokus på hele kæden, og on-call for alt, hvad jeg bygger.",
	],
	education: {
		title: "Uddannelse",
		entries: [
			{
				title: "Datalogi (BSc), Aarhus Universitet",
				date: "2022 – nu",
				bullets: ["170/180 ECTS gennemført.§ Sidste kursus færdiggøres i 2027."],
			},
		],
	},
	experience: {
		title: "Erhvervserfaring",
		entries: [
			{
				title: "Research Intern",
				date: "jan. 2026 – nu",
				subtitle: "Interactive Matter Lab, Aarhus Universitet§",
				bullets: [
					"Teknisk lead§ for udviklingsarbejdet i HCI-forskningsgruppen: jeg koordinerer og delegerer til andre udviklere på tværs af flere samtidige projekter under stramme deadlines.",
					"AI-assisteret§ generering af 3D-modeller: en platform, hvor brugere beskriver et design i almindelig tekst og får en printbar 3D-model ud. Medforfatter på tre videnskabelige artikler under udarbejdelse.",
					"Software til en eksperimentel sølv-printer: bufferhåndtering og synkronisering med printerens hardware via G-code og UART-kommunikation.",
				],
			},
			{
				title: "Softwareudvikler (konsulent)",
				date: "apr. – jun. 2024",
				subtitle: "Ny Skivehus Aktivitetscenter§",
				bullets: [
					"Digital madbestilling§ til en kantine med ældre brugere: en bestillings-app til iPad-kiosker med særligt tilgængeligt design.",
					"Automatiserede statistikudtræk§ via MongoDB-aggregation pipelines (ordrestatistik, brugeradfærdsanalyse).",
					"Kortbetaling§ via SumUp-terminaler + live køkken-visning (Socket.IO). Kører i produktion og hostes og vedligeholdes fortsat af mig.",
				],
			},
			{
				title: "Corona-tester",
				date: "aug. 2021 – jan. 2022",
				bullets: [
					"Tilrettelagde og udførte coronatests§ på skoler og teststeder: logistik, planlægning af besøg og rapportering af positive tests.",
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
