import type { ReactElement } from "react";

export default function CardBlob(): ReactElement {
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute z-0"
			style={{
				inset: "-8%",
				background: "#ffffff",
				borderRadius: "50%",
				filter: "blur(40px)",
			}}
		/>
	);
}
