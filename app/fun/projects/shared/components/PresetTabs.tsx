'use client'

interface PresetTabsProps<T> {
	presets: T[]
	getLabel: (preset: T) => string
	selectedIndex: number | null
	onSelect: (index: number) => void
	label?: string
	className?: string
}

/**
 * A row of preset buttons ("Presets: A B C") with one highlighted as selected.
 * Shared by every project that lets the user pick a canned system prompt / scenario.
 */
export function PresetTabs<T>({
	presets,
	getLabel,
	selectedIndex,
	onSelect,
	label = 'Presets:',
	className = 'flex flex-wrap gap-2 px-3 py-2 border-b border-border',
}: PresetTabsProps<T>) {
	return (
		<div className={className}>
			<span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted/60 self-center">{label}</span>
			{presets.map((preset, i) => (
				<button
					key={getLabel(preset)}
					onClick={() => onSelect(i)}
					className={`cursor-pointer border px-2 py-0.5 text-[0.65rem] font-mono transition-colors ${
						selectedIndex === i
							? 'border-blue-500 text-blue-400'
							: 'border-border text-foreground/70 hover:border-foreground/40 hover:text-foreground'
					}`}
				>
					{getLabel(preset)}
				</button>
			))}
		</div>
	)
}
