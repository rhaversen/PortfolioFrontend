'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function LlmBrainwashingProject() {
	const [systemPrompt, setSystemPrompt] = useState('')
	const [userInput, setUserInput] = useState('')
	const [prefillInput, setPrefillInput] = useState('')
	const [generated, setGenerated] = useState('')
	const [isStreaming, setIsStreaming] = useState(false)
	const socketRef = useRef<Socket | null>(null)

	useEffect(() => {
		const apiUrl = process.env.NEXT_PUBLIC_WS_URL ?? '/'
		const socket = io(apiUrl)
		socketRef.current = socket

		socket.on('brainwash:chunk', ({ text }: { text: string }) => {
			setGenerated((prev) => prev + text)
		})

		socket.on('brainwash:done', () => {
			setIsStreaming(false)
		})

		socket.on('brainwash:error', () => {
			setGenerated('(error)')
			setIsStreaming(false)
		})

		return () => { socket.disconnect() }
	}, [])

	function send() {
		if (!userInput.trim() || isStreaming) return
		setGenerated('')
		setIsStreaming(true)
		socketRef.current?.emit('brainwash:request', {
			systemPrompt: systemPrompt.trim() || undefined,
			userMessage: userInput,
			assistantPrefill: prefillInput.trimEnd(),
		})
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			send()
		}
	}

	function handleAssistantClick() {
		if (!isStreaming && generated) {
			setGenerated('')
		}
	}

	const showOverlay = isStreaming || generated !== ''

	return (
		<div className="flex flex-col gap-0 border border-border">

			<div className="border-b border-border">
				<textarea
					value={systemPrompt}
					onChange={(e) => setSystemPrompt(e.target.value)}
					placeholder="System prompt (optional)..."
					rows={2}
					className="w-full resize-none bg-background/40 p-3 text-xs font-mono text-foreground/80 placeholder:text-muted outline-none"
				/>
			</div>

			<div className="px-4 pt-4 pb-2 flex justify-end items-end gap-2">
				<textarea
					value={userInput}
					onChange={(e) => setUserInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="You: type your message here..."
					disabled={isStreaming}
					rows={4}
					className="w-[75%] resize-none border border-border bg-border/20 px-3 py-2 text-sm text-foreground/90 placeholder:text-muted/60 outline-none focus:border-foreground/30 disabled:opacity-40 transition-colors"
				/>
			</div>

			<div className="px-4 pt-2 pb-4 flex justify-start items-end gap-2">
				<div
					className="relative w-[75%] border border-border cursor-text overflow-auto"
					onClick={handleAssistantClick}
					title={!isStreaming && generated ? 'Click to edit' : undefined}
					style={{ maxHeight: '480px' }}
				>
					<textarea
						value={prefillInput}
						onChange={(e) => setPrefillInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Assistant: type a forced opening, or leave blank..."
						disabled={isStreaming}
						rows={6}
						className={`w-full resize-none bg-background/30 px-4 py-3 text-sm text-foreground/80 placeholder:text-muted/60 outline-none transition-colors ${showOverlay ? 'hidden' : ''}`}
					/>
					{showOverlay && (
						<div className="px-4 py-3 text-sm leading-relaxed">
							<span className="text-foreground/60 whitespace-pre-wrap">{prefillInput.trimEnd()}{prefillInput.trimEnd() ? ' ' : ''}</span><span className="text-blue-400 markdown-body [&>p:first-child]:inline [&>p:first-child]:m-0">
								<Markdown remarkPlugins={[remarkGfm]}>{generated}</Markdown>
								{isStreaming && (
									<span className="inline-block w-1.5 h-[1em] bg-blue-400 ml-0.5 align-middle animate-pulse" />
								)}
							</span>
						</div>
					)}
				</div>
				<button
					onClick={send}
					disabled={!userInput.trim() || isStreaming}
					className="shrink-0 border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:border-foreground/50 transition-colors self-end"
				>
					Send
				</button>
			</div>
		</div>
	)
}
