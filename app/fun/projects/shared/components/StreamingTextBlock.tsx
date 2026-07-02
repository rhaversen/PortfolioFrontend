'use client'

import { memo } from 'react'
import { MarkdownContent } from './MarkdownContent'

interface StreamingTextBlockProps {
	text: string
	/** Whether this block has finished revealing — hides the blinking cursor once true. */
	done: boolean
	className?: string
	markdownClassName?: string
}

/**
 * Renders a single revealed text block from `useBlockDrain`, with a blinking cursor
 * while it's still streaming. Shared by every chat-log style project so the streaming
 * cursor behaves identically everywhere.
 */
export const StreamingTextBlock = memo(function StreamingTextBlock({
	text,
	done,
	className = 'px-4 py-4 text-xs font-mono leading-relaxed text-foreground/70',
	markdownClassName,
}: StreamingTextBlockProps) {
	return (
		<div className={className}>
			<MarkdownContent className={markdownClassName} streaming={!done}>
				{text}
			</MarkdownContent>
		</div>
	)
})
