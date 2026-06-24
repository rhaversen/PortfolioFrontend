"use client";

import { useMemo } from "react";

export default function ObfuscatedEmail() {
	const email = useMemo(() => {
		const local = ["rha", "versen"].join("");
		const domain = ["gmail", "com"].join(".");
		return `${local}@${domain}`;
	}, []);

	return (
		<a href={`mailto:${email}`} className="hover:text-foreground/80 transition-colors">
			{email}
		</a>
	);
}