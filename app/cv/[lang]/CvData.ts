export type ContactIcon = "phone" | "mail" | "globe" | "link" | "github" | "flask";

export interface CvContact {
	icon: ContactIcon;
	text: string;
	href?: string;
}

export interface CvSkillGroup {
	heading: string;
	text: string;
}

export interface CvEntry {
	title: string;
	date: string;
	subtitle?: string;
	bullets: string[];
}

export interface CvSection {
	title: string;
}

export interface CvData {
	lang: string;
	photo: { src: string; alt: string };
	name: string;
	contacts: CvContact[];
	skills: CvSection & { groups: CvSkillGroup[] };
	intro: string[];
	education: CvSection & { entries: CvEntry[] };
	experience: CvSection & { entries: CvEntry[] };
	references: CvSection & { items: string[] };
}
