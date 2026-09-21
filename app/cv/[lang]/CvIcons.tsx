import { type ReactElement } from "react";

interface CvIconProps {
	children: ReactElement;
}

const base = "w-[3.6mm] h-[3.6mm]";

function CvIcon({ children }: CvIconProps) {
	return (
		<span className="inline-flex items-center justify-center w-[6.5mm] h-[6.5mm] border-[1.4pt] border-neutral-900 rounded-full shrink-0" aria-hidden="true">
			{children}
		</span>
	);
}

export function PhoneIcon(): ReactElement {
	return (
		<CvIcon>
			<svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
			</svg>
		</CvIcon>
	);
}

export function CvMailIcon(): ReactElement {
	return (
		<CvIcon>
			<svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
			</svg>
		</CvIcon>
	);
}

export function GlobeIcon(): ReactElement {
	return (
		<CvIcon>
			<svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<circle cx="12" cy="12" r="9" />
				<path strokeLinecap="round" d="M3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z" />
			</svg>
		</CvIcon>
	);
}

export function LinkIcon(): ReactElement {
	return (
		<CvIcon>
			<svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
			</svg>
		</CvIcon>
	);
}

export function GithubIcon(): ReactElement {
	return (
		<CvIcon>
			<svg className={base} viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
			</svg>
		</CvIcon>
	);
}

export function FlaskIcon(): ReactElement {
	return (
		<CvIcon>
			<svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
				<path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6M10 3v6.5L4.8 18.2A2 2 0 006.5 21h11a2 2 0 001.7-2.8L14 9.5V3" />
				<path strokeLinecap="round" d="M7.5 15h9" />
			</svg>
		</CvIcon>
	);
}
