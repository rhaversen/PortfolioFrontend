'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { presets } from './presets'

export default function LlmBrainwashingProject() {
	const [systemPrompt, setSystemPrompt] = useState('')
	const [userInput, setUserInput] = useState('')
	const [prefillInput, setPrefillInput] = useState('')
	const [generated, setGenerated] = useState('')
	const [isStreaming, setIsStreaming] = useState(false)
	const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
	const [copied, setCopied] = useState(false)
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

	function applyPreset(index: number) {
		const preset = presets[index]
		setSystemPrompt(preset.systemPrompt)
		setUserInput(preset.userMessage)
		setPrefillInput(preset.assistantPrefill)
		setGenerated('')
		setSelectedPreset(index)
	}

	function copyResponse() {
		const full = (prefillInput.trimEnd() ? prefillInput.trimEnd() + ' ' : '') + generated
		navigator.clipboard.writeText(full)
		setCopied(true)
		setTimeout(() => setCopied(false), 1000)
	}

	return (
		<div className="flex flex-col gap-0 border border-border">

			<div className="flex flex-wrap gap-2 px-3 py-2 border-b border-border">
				<span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted/60 self-center">Presets:</span>
				{presets.map((preset, i) => (
					<button
						key={preset.label}
						onClick={() => applyPreset(i)}
						disabled={isStreaming}
					className={`cursor-pointer border px-2 py-0.5 text-[0.65rem] font-mono disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${selectedPreset === i ? 'border-blue-500 text-blue-400' : 'border-border text-foreground/70 hover:border-foreground/40 hover:text-foreground'}`}
					>
						{preset.label}
					</button>
				))}
			</div>

			<div className="border-b border-border">
				<textarea
					value={systemPrompt}
					onChange={(e) => setSystemPrompt(e.target.value)}
					placeholder="System prompt (optional)..."
					rows={4}
					className="w-full resize-y bg-background/40 p-3 text-xs font-mono text-foreground/80 placeholder:text-muted outline-none"
				/>
			</div>

			<div className="px-4 pt-4 pb-2 flex justify-end items-end gap-2">
				<textarea
					value={userInput}
					onChange={(e) => { setUserInput(e.target.value) }}
					onKeyDown={handleKeyDown}
					placeholder="You: type your message here..."
					disabled={isStreaming}
					rows={4}
				className="w-full sm:w-3/4 resize-none border border-border bg-border/20 px-3 py-2 text-sm text-foreground/90 placeholder:text-muted/60 outline-none focus:border-foreground/30 disabled:opacity-40 transition-colors rounded-t-lg rounded-bl-lg"
				/>
			</div>

			<div className="px-4 pt-2 pb-4 flex justify-start items-start gap-2">
				<div
					className="relative w-full sm:w-3/4 border border-border cursor-text overflow-auto rounded-t-lg rounded-br-lg"
					onClick={handleAssistantClick}
					title={!isStreaming && generated ? 'Click to edit' : undefined}
					style={showOverlay ? { minHeight: '16rem' } : undefined}
				>
					<textarea
						value={prefillInput}
						onChange={(e) => setPrefillInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Assistant: type a forced opening, or leave blank..."
						disabled={isStreaming}
						rows={10}
						className={`w-full resize-none bg-background/30 px-4 py-3 text-sm text-foreground/80 placeholder:text-muted/60 outline-none transition-colors ${showOverlay ? 'absolute inset-0 opacity-0 pointer-events-none' : ''}`}
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
				<div className="flex flex-col gap-2 w-50">
					<button
						onClick={send}
						disabled={!userInput.trim() || isStreaming}
						className="cursor-pointer shrink-0 border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:border-foreground/50 transition-colors"
					>
						Send Message
					</button>
					<button
						onClick={copyResponse}
						disabled={!generated || isStreaming}
						className={`cursor-pointer shrink-0 border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150 ${copied ? 'border-blue-500 text-blue-400' : 'border-border text-foreground hover:border-foreground/50'}`}
					>
						{copied ? 'Copied!' : 'Copy Response'}
					</button>
				</div>
			</div>
		</div>
	)
}
