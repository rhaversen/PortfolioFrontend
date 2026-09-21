import { notFound } from "next/navigation";
import { type ReactElement } from "react";
import CvPaper from "../CvPaper";
import CvReveal from "./CvReveal";
import cvDk from "./CvDk";
import cvEn from "./CvEn";
import { isCvLocale } from "../locales";

export const dynamicParams = false;

export function generateStaticParams() {
	return [{ lang: "dk" }, { lang: "en" }];
}

export default async function CvPage({ params }: { params: Promise<{ lang: string }> }): Promise<ReactElement> {
	const { lang } = await params;
	if (!isCvLocale(lang)) notFound();

	return (
		<CvPaper lang={lang}>
			<CvReveal data={lang === "dk" ? cvDk : cvEn} />
		</CvPaper>
	);
}
