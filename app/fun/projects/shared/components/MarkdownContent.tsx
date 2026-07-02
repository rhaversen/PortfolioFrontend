'use client'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ElementType } from 'react'

interface MarkdownContentProps {
	children: string
	className?: string
	/** Renders a blinking cursor after the content, for in-progress streamed text. */
	streaming?: boolean
	cursorClassName?: string
	as?: ElementType
}

/**
 * Renders markdown (with GFM support) inside a `markdown-body` wrapper, optionally
 * followed by a blinking streaming cursor. Shared by every project that renders LLM
 * output as formatted text.
 */
export function MarkdownContent({
	children,
	className = '',
	streaming = false,
	cursorClassName = 'w-1 h-[0.9em] bg-foreground/30',
	as: Wrapper = 'div',
}: MarkdownContentProps) {
	return (
		<Wrapper className={`markdown-body ${className}`.trim()}>
			<Markdown remarkPlugins={[remarkGfm]}>{children}</Markdown>
			{streaming && (
				<span className={`inline-block align-middle animate-pulse ${cursorClassName}`} />
			)}
		</Wrapper>
	)
}
