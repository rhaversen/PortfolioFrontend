'use client'

import type { ReactNode } from 'react'

interface EventBlockProps {
	/** Small uppercase label shown top-left, e.g. "Tool call" or "Event". */
	label: string
	timestamp?: string
	className?: string
	children?: ReactNode
}

/**
 * Shared shell for a discrete "event" row in a chat-log (tool calls, box triggers,
 * etc.): a label + optional timestamp header, followed by whatever content the
 * caller supplies (a badge, a paragraph, ...). Keeps the header layout identical
 * across projects.
 */
export function EventBlock({ label, timestamp, className = 'bg-border/5', children }: EventBlockProps) {
	return (
		<div className={`px-4 py-3 ${className}`}>
			<div className="flex items-center justify-between mb-2">
				<p className="text-[0.6rem] font-mono uppercase tracking-widest text-muted">{label}</p>
				{timestamp !== undefined && (
					<p className="text-[0.6rem] font-mono text-muted">{timestamp}</p>
				)}
			</div>
			{children}
		</div>
	)
}
