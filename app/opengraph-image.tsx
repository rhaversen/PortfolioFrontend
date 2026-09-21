import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Rasmus Haversen — Portfolio";

export default function OpengraphImage() {
	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					padding: "80px",
					background: "linear-gradient(135deg, #f7f9fc 0%, #eef2f7 100%)",
					fontFamily: "monospace",
				}}
			>
				<div style={{ display: "flex", fontSize: 24, letterSpacing: "0.24em", color: "#6b7280", textTransform: "uppercase" }}>
					Portfolio
				</div>
				<div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "#1f2937", marginTop: 24 }}>
					Rasmus Haversen
				</div>
				<div style={{ display: "flex", width: 400, height: 2, background: "#cfd8e3", marginTop: 32 }} />
				<div style={{ display: "flex", fontSize: 32, color: "#374151", marginTop: 32, lineHeight: 1.4 }}>
					Full-stack systems, self-hosted on a Raspberry Pi.
				</div>
				<div style={{ display: "flex", fontSize: 24, color: "#6b7280", marginTop: 24 }}>
					rhaversen.com
				</div>
			</div>
		),
		size,
	);
}
