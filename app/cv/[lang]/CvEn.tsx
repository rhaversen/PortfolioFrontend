import type { CvData } from "./CvData";

const data: CvData = {
	lang: "en",
	photo: { src: "/cv/photo.png", alt: "Rasmus Haversen" },
	name: "Rasmus Haversen",
	contacts: [
		{ icon: "phone", text: "+45 42 42 47 70" },
		{ icon: "mail", text: "rhaversen@gmail.com", href: "mailto:rhaversen@gmail.com" },
		{ icon: "globe", text: "rhaversen.com", href: "https://rhaversen.com" },
		{ icon: "github", text: "github.com/rhaversen", href: "https://github.com/rhaversen" },
	],
	skills: {
		title: "Technical Skills",
		groups: [
			{ heading: "Programming languages", text: "TypeScript, Python, Java, C++, Bash" },
			{ heading: "Backend", text: "Node.js, Express, REST APIs, WebSockets, MongoDB, Redis, Microservices, Sandboxed Code Execution" },
			{ heading: "Frontend", text: "React, Next.js, TailwindCSS, Three.js" },
			{ heading: "Operations & DevOps", text: "Docker, Kubernetes, ArgoCD, GitHub Actions (CI/CD, GitOps), Sentry, Better Stack, SealedSecrets" },
			{ heading: "Linux", text: "Daily Debian server administration, automated setup scripts, router administration (OpenWRT: DMZ, firewall, VPN)" },
			{ heading: "Git", text: "Feature branches, pull requests, code review, clean history, branch protection" },
			{ heading: "AI/LLM", text: "LLM integration (provider catalogs, caching, agent architectures)" },
			{ heading: "CAD/FEA/3D", text: "OpenSCAD, Gmsh, CalculiX, Blender, 3D printing" },
			{ heading: "Video/media", text: "Premiere Pro, DaVinci Resolve" },
			{ heading: "Languages", text: "Danish (native), English (fluent)" },
		],
	},
	intro: [
		"I'm Rasmus, 26 years old, and I study Computer Science at Aarhus University. Today I'm the technical lead at the Interactive Matter Lab at AU, where I coordinate the development of several systems the lab depends on every day. On the side, I run several of my own systems in production with real users.",
		"I love programming and automating anything that can be automated, and that's why I chose computer science. I learn fast and meet new challenges with curiosity. My experience is that any task can be solved with dedication and the right decomposition; divide and conquer.",
		"But my curiosity doesn't stop at a working prototype. What drives me is carrying an idea all the way to a system that real people depend on. I'm a full-stack developer focused on the entire chain, and on-call for everything I build.",
	],
	education: {
		title: "Education",
		entries: [
			{
				title: "Computer Science (BSc), Aarhus University",
				date: "2022 – present",
				bullets: ["170/180 ECTS completed.§ Final course to be finished in 2027."],
			},
		],
	},
	experience: {
		title: "Experience",
		entries: [
			{
				title: "Research Intern",
				date: "Jan 2026 – present",
				subtitle: "Interactive Matter Lab, Aarhus University§",
				bullets: [
					"Technical lead§ for development in the HCI research group: I coordinate and delegate to other developers across several concurrent projects under tight deadlines.",
					"AI-assisted§ 3D model generation: a platform where users describe a design in plain text and get a printable 3D model out. Co-author on three scientific papers in progress.",
					"Software for an experimental silver printer: buffer management and synchronisation with the printer's hardware via G-code and UART communication.",
				],
			},
			{
				title: "Software Developer (Consultant)",
				date: "Apr – Jun 2024",
				subtitle: "Ny Skivehus Activity Center§",
				bullets: [
					"Digital food ordering§ for a canteen with elderly users: an ordering app for iPad kiosks designed for accessibility.",
					"Automated statistics extraction§ via MongoDB aggregation pipelines (order statistics, behavioural analysis).",
					"Card payment§ via SumUp terminals + live kitchen view (Socket.IO). Runs in production, still hosted and maintained by me.",
				],
			},
			{
				title: "COVID-19 Tester",
				date: "Aug 2021 – Jan 2022",
				bullets: [
					"Planned and carried out COVID-19 testing§ at schools and test sites: logistics, scheduling visits, and reporting positive cases.",
				],
			},
		],
	},
	references: {
		title: "References",
		items: ["Michael Wessely§, PI, Interactive Matter Lab, Aarhus University"],
	},
};

export default data;
