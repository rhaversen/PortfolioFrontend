'use client'

import { useRef, useState } from 'react'
import { LLM_BRAINWASHING_PRESETS } from '../sampleData'
import { useSocket } from '../shared/hooks/useSocket'
import { useRateLimit } from '../shared/hooks/useRateLimit'
import { useBlockDrain } from '../shared/hooks/useBlockDrain'
import { RateLimitBanner } from '../shared/components/RateLimitBanner'
import { PresetTabs } from '../shared/components/PresetTabs'
import { MarkdownContent } from '../shared/components/MarkdownContent'

export default function LlmBrainwashingProject() {
	const firstPreset = LLM_BRAINWASHING_PRESETS[0]
	const [systemPrompt, setSystemPrompt] = useState(firstPreset.systemPrompt)
	const [userInput, setUserInput] = useState(firstPreset.userMessage)
	const [prefillInput, setPrefillInput] = useState(firstPreset.assistantPrefill)
	const [isStreaming, setIsStreaming] = useState(false)
	const [selectedPreset, setSelectedPreset] = useState<number | null>(0)
	const [copied, setCopied] = useState(false)
	const { rateLimitExpiresAt, retryCountdown, triggerRateLimit, clearRateLimit } = useRateLimit()
	const prefillRef = useRef<HTMLTextAreaElement | null>(null)

	const { blocks, pushText, reset: resetDrain, cancel: cancelDrain, closeOpenText, finishWhenDrained } = useBlockDrain<never>({ intervalMs: 12 })

	const textBlock = blocks[0]
	const generated = textBlock?.kind === 'text' ? textBlock.text : ''
	const stillTyping = textBlock?.kind === 'text' ? !textBlock.done : false

	const socketRef = useSocket((socket) => {
		socket.on('brainwash:chunk', ({ text }: { text: string }) => {
			pushText(text)
		})

		socket.on('brainwash:done', () => {
			setIsStreaming(false)
			finishWhenDrained()
		})

		socket.on('brainwash:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
			if (retryAfterMs !== undefined && retryAfterMs > 0) {
				triggerRateLimit(retryAfterMs)
			} else {
				resetDrain()
				pushText('(error)')
				closeOpenText()
			}
			setIsStreaming(false)
		})
	}, [pushText, resetDrain, closeOpenText, finishWhenDrained, triggerRateLimit])

	function send() {
		if (!userInput.trim() || isStreaming) return
		resetDrain()
		clearRateLimit()
		setIsStreaming(true)
		socketRef.current?.emit('brainwash:request', {
			systemPrompt: systemPrompt.trim() || undefined,
			userMessage: userInput,
			assistantPrefill: prefillInput.trimEnd(),
		})
	}

	function cancel() {
		socketRef.current?.emit('brainwash:cancel')
		cancelDrain()
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
			resetDrain()
		}
		if (isStreaming || generated) {
			setTimeout(() => prefillRef.current?.focus(), 0)
		}
	}

	const showOverlay = isStreaming || generated !== ''

	function applyPreset(index: number) {
		if (isStreaming) cancel()
		const preset = LLM_BRAINWASHING_PRESETS[index]
		setSystemPrompt(preset.systemPrompt)
		setUserInput(preset.userMessage)
		setPrefillInput(preset.assistantPrefill)
		resetDrain()
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

			<PresetTabs
				presets={LLM_BRAINWASHING_PRESETS}
				getLabel={(preset) => preset.label}
				selectedIndex={selectedPreset}
				onSelect={applyPreset}
			/>

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
							<span className="text-foreground/60 whitespace-pre-wrap">{prefillInput.trimEnd()}{prefillInput.trimEnd() ? ' ' : ''}</span>
							<MarkdownContent
								as="span"
								className="text-blue-400"
								streaming={isStreaming || stillTyping}
								cursorClassName="w-1.5 h-[1em] bg-blue-400 ml-0.5"
							>
								{generated}
							</MarkdownContent>
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
				<RateLimitBanner retryCountdown={retryCountdown} className="border-t border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-[0.7rem] font-mono text-amber-400" />
			)}
		</div>
	)
}
