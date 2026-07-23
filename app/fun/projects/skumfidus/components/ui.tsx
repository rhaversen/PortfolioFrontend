import { colorFor } from "../useSkumfidusData";

export function Section({ title, children, subtitle }: { title: string; children: React.ReactNode; subtitle?: string }) {
	return (
		<div className="space-y-3">
			<h3 className="font-mono text-sm uppercase tracking-widest text-muted">{title}</h3>
			{subtitle && <p className="text-xs text-muted">{subtitle}</p>}
			{children}
		</div>
	);
}

export function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="px-3 py-2">
			<div className="font-mono text-[0.6rem] uppercase tracking-widest text-muted">{label}</div>
			<div className="mt-1 font-mono text-sm tabular-nums">{value}</div>
		</div>
	);
}

export function UserDot({ user }: { user: string }) {
	return <span className={`inline-block h-2.5 w-2.5 ${colorFor(user)}`} />;
}
