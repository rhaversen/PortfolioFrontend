'use client'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ElementType, ReactNode } from 'react'

interface MarkdownContentProps {
	children: string
	className?: string
	/** Renders a blinking cursor after the content, for in-progress streamed text. */
	streaming?: boolean
	cursorClassName?: string
	as?: ElementType
}

// Forces the trailing, still-being-typed paragraph to render inline (instead of as a
// block-level <p>) so the cursor span right after it lands on the same line as the last
// character, rather than dropping to a new line below it.
function InlineParagraph({ children }: { node?: unknown; children?: ReactNode }) {
	return <p className="inline m-0">{children}</p>
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
	// While streaming, don't render trailing whitespace/newlines yet — otherwise markdown
	// starts a new, empty block for it and the cursor ends up floating a line below the
	// last visible character until more text confirms that line break.
	const content = streaming ? children.replace(/\s+$/, '') : children

	// An inline wrapper (e.g. a <span> tucked into a line of surrounding text) needs every
	// paragraph to stay inline, or a block-level <p> nested inside it would break the flow.
	if (Wrapper === 'span') {
		return (
			<Wrapper className={`markdown-body ${className}`.trim()}>
				<Markdown remarkPlugins={[remarkGfm]} components={{ p: InlineParagraph }}>{content}</Markdown>
				{streaming && (
					<span className={`inline-block align-middle animate-pulse ${cursorClassName}`} />
				)}
			</Wrapper>
		)
	}

	// Otherwise, split off the last paragraph/section so just that trailing, still-being-typed
	// chunk can be rendered inline — everything before it is already finalized and keeps its
	// normal block-level paragraph spacing.
	const splitAt = streaming ? content.lastIndexOf('\n\n') : -1
	const priorContent = splitAt === -1 ? '' : content.slice(0, splitAt)
	const tailContent = splitAt === -1 ? content : content.slice(splitAt + 2)

	return (
		<Wrapper className={`markdown-body ${className}`.trim()}>
			{priorContent !== '' && <Markdown remarkPlugins={[remarkGfm]}>{priorContent}</Markdown>}
			<Markdown remarkPlugins={[remarkGfm]} components={streaming ? { p: InlineParagraph } : undefined}>
				{tailContent}
			</Markdown>
			{streaming && (
				<span className={`inline-block align-middle animate-pulse ${cursorClassName}`} />
			)}
		</Wrapper>
	)
}
