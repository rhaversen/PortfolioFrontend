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
			{ heading: "Languages", text: "TypeScript, Python, Java, C++, Bash" },
			{ heading: "Backend", text: "Node.js, Express, REST, WebSockets, MongoDB, Redis, Swagger/OpenAPI, Microservices, Sandboxed Code Execution" },
			{ heading: "Frontend", text: "React, Next.js, TailwindCSS, Three.js / react-three-fiber" },
			{ heading: "Git", text: "Feature branches, pull requests, code review, clean history, branch protection" },
			{ heading: "DevOps", text: "Docker, Kubernetes (MicroK8s), ArgoCD, GitHub Actions (CI/CD, GitOps), Sentry, Better Stack, SealedSecrets" },
			{ heading: "Linux", text: "Debian server administration, self-written setup scripts (fresh install → full deployment), OpenWRT router administration (DMZ, VPN, firewall)" },
			{ heading: "AI/LLM", text: "LLM integration (provider catalogs, caching, agent architectures)" },
			{ heading: "CAD/FEA/3D", text: "OpenSCAD, Gmsh, CalculiX, Blender, 3D printing" },
			{ heading: "Video/Media", text: "Premiere Pro, DaVinci Resolve" },
		],
	},
	intro: [
		"I am technical lead in a research group at Aarhus University, coordinating the development of several systems in daily use at the lab. On the side, I run several production applications with real users on my own infrastructure. My strongest languages are TypeScript and Python, and Linux and Git are daily tools.",
		"I love programming, problem-solving, and anything that can be automated with code, and that's why I love computer science. I learn fast and meet new challenges with curiosity. I believe any problem can be solved with the right decomposition; divide and conquer.",
		"My curiosity doesn't stop at a working prototype. What drives me is carrying things all the way from the first idea to a system with real users. I'm a full-stack developer focused on the entire chain, and on-call for everything I build.",
		"That's why I thrive where software meets reality: operating, maintaining, and evolving systems that people depend on.",
	],
	education: {
		title: "Education",
		entries: [
			{
				title: "Computer Science (BSc), Aarhus University",
				date: "2022",
				bullets: ["170/180 ECTS completed. Final course to be finished in 2027."],
			},
		],
	},
	experience: {
		title: "Experience",
		entries: [
			{
				title: "Research Intern",
				date: "Jan 2026–present",
				subtitle: "Interactive Matter Lab, Aarhus University",
				bullets: [
					"Technical lead for development in the HCI research group. Coordinating and delegating to other developers across several concurrent projects. Co-author on 3 papers in progress.",
					"AI-assisted 3D model generation. In-house compiler from LLM-generated design documents to 3D mesh. User-facing agent design system and web interface.",
					"Low-level printer firmware. Buffer management and synchronization of G-code and Xaar printhead UART communication.",
				],
			},
			{
				title: "Software Developer (Consultant)",
				date: "Apr 2024– Jun 2024",
				subtitle: "Ny Skivehus Activity Center",
				bullets: [
					"Digital food ordering for a canteen with elderly users. Highly accessible design for iPad kiosks.",
					"Automated statistics extraction via MongoDB aggregation pipelines (order statistics, behavioral analysis).",
					"Card payment via SumUp terminals + live kitchen view (Socket.IO). Runs in production, still hosted and maintained by me.",
				],
			},
		],
	},
	references: {
		title: "References",
		items: ["Michael Wessely, PI, Interactive Matter Lab, Aarhus University"],
	},
};

export default data;
