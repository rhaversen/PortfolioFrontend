import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Rasmus Haversen CV",
	description: "Curriculum vitae — Rasmus Haversen",
};

export default function CvLangLayout({ children }: { children: React.ReactNode }) {
	return children;
}
