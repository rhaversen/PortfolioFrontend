'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { LLM_BRAINWASHING_PRESETS } from '../sampleData'

export default function LlmBrainwashingProject() {
	const firstPreset = LLM_BRAINWASHING_PRESETS[0]
	const [systemPrompt, setSystemPrompt] = useState(firstPreset.systemPrompt)
	const [userInput, setUserInput] = useState(firstPreset.userMessage)
	const [prefillInput, setPrefillInput] = useState(firstPreset.assistantPrefill)
	const [generated, setGenerated] = useState('')
	const [isStreaming, setIsStreaming] = useState(false)
	const [selectedPreset, setSelectedPreset] = useState<number | null>(0)
	const [copied, setCopied] = useState(false)
	const [rateLimitExpiresAt, setRateLimitExpiresAt] = useState<number | null>(null)
	const [retryCountdown, setRetryCountdown] = useState(0)
	const socketRef = useRef<Socket | null>(null)
	const prefillRef = useRef<HTMLTextAreaElement | null>(null)

	useEffect(() => {
		if (rateLimitExpiresAt === null) return
		const updateCountdown = () => {
			const remaining = rateLimitExpiresAt - Date.now()
			if (remaining <= 0) {
				setRateLimitExpiresAt(null)
				setRetryCountdown(0)
			} else {
				setRetryCountdown(Math.ceil(remaining / 1000))
			}
		}
		const initialId = setTimeout(updateCountdown, 0)
		const id = setInterval(updateCountdown, 1000)
		return () => {
			clearTimeout(initialId)
			clearInterval(id)
		}
	}, [rateLimitExpiresAt])

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

		socket.on('brainwash:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
			if (retryAfterMs !== undefined && retryAfterMs > 0) {
				setRateLimitExpiresAt(Date.now() + retryAfterMs)
			} else {
				setGenerated('(error)')
			}
			setIsStreaming(false)
		})

		return () => { socket.disconnect() }
	}, [])

	function send() {
		if (!userInput.trim() || isStreaming) return
		setGenerated('')
		setRateLimitExpiresAt(null)
		setIsStreaming(true)
		socketRef.current?.emit('brainwash:request', {
			systemPrompt: systemPrompt.trim() || undefined,
			userMessage: userInput,
			assistantPrefill: prefillInput.trimEnd(),
		})
	}

	function cancel() {
		socketRef.current?.emit('brainwash:cancel')
		setIsStreaming(false)
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			send()
		}
	}

	function handleAssistantClick() {
		if (isStreaming) {
			cancel()
		}
		if (generated) {
			setGenerated('')
		}
		if (isStreaming || generated) {
			setTimeout(() => prefillRef.current?.focus(), 0)
		}
	}

	const showOverlay = isStreaming || generated !== ''

	function formatCountdown(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60
		if (hours > 0) return `${hours}h ${minutes}m`
		if (minutes > 0) return `${minutes}m ${seconds}s`
		return `${seconds}s`
	}

	function applyPreset(index: number) {
		if (isStreaming) cancel()
		const preset = LLM_BRAINWASHING_PRESETS[index]
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
				{LLM_BRAINWASHING_PRESETS.map((preset, i) => (
					<button
						key={preset.label}
						onClick={() => applyPreset(i)}
				className={`cursor-pointer border px-2 py-0.5 text-[0.65rem] font-mono transition-colors ${selectedPreset === i ? 'border-blue-500 text-blue-400' : 'border-border text-foreground/70 hover:border-foreground/40 hover:text-foreground'}`}
					>
						{preset.label}
					</button>
				))}
			</div>

			<div className="border-b border-border">
				<label htmlFor="system-prompt" className="block px-3 pt-2 pb-1 text-[0.65rem] font-mono uppercase tracking-widest text-muted/60">System Prompt (optional)</label>
				<textarea
					id="system-prompt"
					value={systemPrompt}
					onChange={(e) => setSystemPrompt(e.target.value)}
					rows={4}
					className="w-full resize-y bg-background/40 px-3 pb-3 text-xs font-mono text-foreground/80 outline-none"
				/>
			</div>

			<div className="px-4 pt-4 pb-2 flex justify-end items-end gap-2">
				<div className="w-full sm:w-3/4 flex flex-col">
					<label htmlFor="user-message" className="pb-1 text-[0.65rem] font-mono uppercase tracking-widest text-muted/60">User Message</label>
					<textarea
						id="user-message"
						value={userInput}
						onChange={(e) => { setUserInput(e.target.value) }}
						onKeyDown={handleKeyDown}
						disabled={isStreaming}
						rows={4}
						className="w-full resize-none border border-border bg-border/20 px-3 py-2 text-sm text-foreground/90 outline-none focus:border-foreground/30 disabled:opacity-40 transition-colors rounded-t-lg rounded-bl-lg"
					/>
				</div>
			</div>

			<div className="px-4 pt-2 pb-4 flex justify-start items-start gap-2">
				<div className="w-full sm:w-3/4 flex flex-col">
					<label htmlFor="assistant-prefill" className="pb-1 text-[0.65rem] font-mono uppercase tracking-widest text-muted/60">Assistant Prefill <span className="normal-case tracking-normal text-muted/40">(forced opening)</span></label>
				<div
					className="relative w-full border border-border cursor-text overflow-auto rounded-t-lg rounded-br-lg"
					onClick={handleAssistantClick}
					title={!isStreaming && generated ? 'Click to edit' : undefined}
					style={showOverlay ? { minHeight: '16rem' } : undefined}
				>
					<textarea
						id="assistant-prefill"
						ref={prefillRef}
						value={prefillInput}
						onChange={(e) => setPrefillInput(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isStreaming}
						rows={10}
						className={`w-full resize-none bg-background/30 px-4 py-3 text-sm text-foreground/80 outline-none transition-colors ${showOverlay ? 'absolute inset-0 opacity-0 pointer-events-none' : ''}`}
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
				</div>
				<div className="flex flex-col gap-2 w-50">
					<button
						onClick={isStreaming ? cancel : send}
						disabled={(!isStreaming && !userInput.trim()) || rateLimitExpiresAt !== null}
						className={`cursor-pointer shrink-0 border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${isStreaming ? 'border-red-500/60 text-red-400 hover:border-red-400' : 'border-border text-foreground hover:border-foreground/50'}`}
					>
						{isStreaming ? 'Cancel' : 'Send Message'}
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
			{rateLimitExpiresAt !== null && retryCountdown > 0 && (
				<div className="border-t border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-[0.7rem] font-mono text-amber-400">
					Rate limit reached — try again in {formatCountdown(retryCountdown)}
				</div>
			)}
		</div>
	)
}
