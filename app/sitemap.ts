import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
	const base = "https://rhaversen.com";
	return [
		{ url: base, changeFrequency: "monthly", priority: 1 },
		{ url: `${base}/cv`, changeFrequency: "monthly", priority: 0.8 },
		{ url: `${base}/cv/en`, changeFrequency: "monthly", priority: 0.8 },
		{ url: `${base}/cv/dk`, changeFrequency: "monthly", priority: 0.8 },
		{ url: `${base}/fun`, changeFrequency: "monthly", priority: 0.6 },
	];
}
