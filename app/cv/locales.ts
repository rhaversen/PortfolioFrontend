export const CV_LOCALES = ["dk", "en"] as const;

export type CvLocale = (typeof CV_LOCALES)[number];

export const isCvLocale = (value: string): value is CvLocale =>
	(CV_LOCALES as readonly string[]).includes(value);
