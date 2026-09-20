'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SELF_CONVERSATION_PRESETS } from '../sampleData'
import { useSocket } from '../shared/hooks/useSocket'
import { useRateLimit } from '../shared/hooks/useRateLimit'
import { RateLimitBanner } from '../shared/components/RateLimitBanner'
import { PresetTabs } from '../shared/components/PresetTabs'

const MAX_MESSAGES = 60
const SWAP_MS = 700
const TYPE_MS = 18

type Voice = 'a' | 'b'

interface ConversationState {
	history: string[]
	voiceText: Record<Voice, string>
	swapCount: number
	typingVoice: Voice | null
	isWaiting: boolean
	running: boolean
}

const IDLE_STATE: ConversationState = {
	history: [],
	voiceText: { a: '', b: '' },
	swapCount: 0,
	typingVoice: null,
	isWaiting: false,
	running: false,
}

/**
 * Two chat boxes take turns continuing a conversation. After each reply the boxes
 * glide to the opposite side (CSS transform transition) and the next reply streams
 * into whichever box just moved into the responder spot — the model effectively
 * talks to itself while the user only seeds the first message.
 *
 * The whole conversation lives in a single state object because the turn loop
 * (socket reply → swap → typewriter → next request) is driven from timers and
 * socket handlers that would otherwise race against split useState updates.
 */
export default function SelfConversationProject() {
	const [systemPrompt, setSystemPrompt] = useState(SELF_CONVERSATION_PRESETS[0].systemPrompt)
	const [selectedPreset, setSelectedPreset] = useState<number | null>(0)
	const [input, setInput] = useState('')
	const [state, setState] = useState<ConversationState>(IDLE_STATE)
	const [errorMessage, setErrorMessage] = useState('')
	const { rateLimitExpiresAt, retryCountdown, triggerRateLimit, clearRateLimit } = useRateLimit()

	const systemPromptRef = useRef(systemPrompt)
	const responderRef = useRef<Voice>('b')
	const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const stateRef = useRef(state)
	const inputRef = useRef<HTMLInputElement | null>(null)

	useEffect(() => {
		stateRef.current = state
	}, [state])

	const clearTimers = useCallback(() => {
		if (swapTimerRef.current !== null) { clearTimeout(swapTimerRef.current); swapTimerRef.current = null }
		if (typeTimerRef.current !== null) { clearInterval(typeTimerRef.current); typeTimerRef.current = null }
	}, [])

	useEffect(() => clearTimers, [clearTimers])

	const socketRef = useSocket((socket) => {
		socket.on('selfconvo:reply', ({ reply }: { reply: string }) => {
			handlersRef.current.onReply(reply)
		})

		socket.on('selfconvo:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
			clearTimers()
			setState(prev => ({ ...prev, running: false, isWaiting: false, typingVoice: null }))
			if (retryAfterMs !== undefined && retryAfterMs > 0) {
				triggerRateLimit(retryAfterMs)
			} else {
				setErrorMessage('The conversation stalled. Press Continue to keep it going.')
			}
		})
	}, [clearTimers, triggerRateLimit])

	const handlersRef = useRef<{ onReply: (reply: string) => void }>({ onReply: () => {} })

	const requestReply = useCallback((history: string[]) => {
		setState(prev => ({ ...prev, isWaiting: true }))
		socketRef.current?.emit('selfconvo:request', {
			systemPrompt: systemPromptRef.current.trim() || undefined,
			messages: history,
		})
	}, [socketRef])

	const nextTurn = useCallback((history: string[]) => {
		if (history.length >= MAX_MESSAGES) {
			setState(prev => ({ ...prev, running: false, isWaiting: false }))
			return
		}
		// The responder is whichever voice did not write the previous message.
		responderRef.current = history.length % 2 === 1 ? 'b' : 'a'
		requestReply(history)
	}, [requestReply])

	const beginReply = useCallback((reply: string) => {
		setState(prev => ({ ...prev, isWaiting: false, swapCount: prev.swapCount + 1 }))
		// Let the slide animation read before the responder starts typing.
		swapTimerRef.current = setTimeout(() => {
			const responder = responderRef.current
			if (typeTimerRef.current !== null) clearInterval(typeTimerRef.current)
			setState(prev => ({ ...prev, typingVoice: responder }))
			let i = 0
			typeTimerRef.current = setInterval(() => {
				i++
				setState(prev => ({ ...prev, voiceText: { ...prev.voiceText, [responder]: reply.slice(0, i) } }))
				if (i >= reply.length) {
					if (typeTimerRef.current !== null) clearInterval(typeTimerRef.current)
					typeTimerRef.current = null
					const updated = [...stateRef.current.history, reply]
					const keepGoing = stateRef.current.running
					setState(prev => ({ ...prev, history: updated, typingVoice: null }))
					if (keepGoing) {
						nextTurn(updated)
					}
				}
			}, TYPE_MS)
		}, SWAP_MS)
	}, [nextTurn, stateRef])

	useEffect(() => {
		handlersRef.current.onReply = beginReply
	}, [beginReply])

	const start = useCallback(() => {
		const text = input.trim()
		if (text === '' || rateLimitExpiresAt !== null) return
		clearTimers()
		setErrorMessage('')
		responderRef.current = 'b'
		setState({ ...IDLE_STATE, history: [text], voiceText: { a: text, b: '' }, running: true })
		nextTurn([text])
	}, [clearTimers, input, nextTurn, rateLimitExpiresAt])

	const continueConversation = useCallback(() => {
		if (state.history.length === 0 || state.running || state.isWaiting || state.typingVoice !== null || rateLimitExpiresAt !== null) return
		clearTimers()
		setErrorMessage('')
		setState(prev => ({ ...prev, running: true }))
		nextTurn(state.history)
	}, [clearTimers, nextTurn, rateLimitExpiresAt, state.history, state.isWaiting, state.running, state.typingVoice])

	const handleReset = useCallback(() => {
		socketRef.current?.emit('selfconvo:cancel')
		clearTimers()
		setState(IDLE_STATE)
		setErrorMessage('')
		clearRateLimit()
		setTimeout(() => inputRef.current?.focus(), 0)
	}, [clearRateLimit, clearTimers, socketRef])

	function applyPreset(index: number) {
		const preset = SELF_CONVERSATION_PRESETS[index]
		systemPromptRef.current = preset.systemPrompt
		setSystemPrompt(preset.systemPrompt)
		setSelectedPreset(index)
	}

	function handleSystemPromptChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		systemPromptRef.current = e.target.value
		setSystemPrompt(e.target.value)
		setSelectedPreset(null)
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			e.preventDefault()
			start()
		}
	}

	const hasStarted = state.history.length > 0
	const isRunning = state.running || state.isWaiting || state.typingVoice !== null
	const conversationOver = hasStarted && state.history.length >= MAX_MESSAGES && !isRunning

	function renderBox(voice: Voice, label: string) {
		const onLeft = voice === 'a' ? state.swapCount % 2 === 0 : state.swapCount % 2 === 1
		return (
			<div
				key={voice}
				className="absolute top-0 bottom-0 w-[calc(50%-0.375rem)] transition-transform duration-700 ease-in-out"
				style={{ transform: onLeft ? 'translateX(0)' : 'translateX(calc(100% + 0.75rem))' }}
			>
				<div className="flex h-full flex-col border border-border/60 bg-background/40">
					<span className="border-b border-border/40 px-3 py-1.5 text-[0.6rem] font-mono uppercase tracking-widest text-muted/50">{label}</span>
					<div className="flex-1 overflow-y-auto whitespace-pre-wrap wrap-break-word px-3 py-2 text-xs">
						{state.voiceText[voice]}
						{state.typingVoice === voice && <span className="ml-0.5 inline-block h-[0.9em] w-1 animate-pulse align-middle bg-foreground/30" />}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-0 border border-border">
			<PresetTabs
				label="Tone:"
				presets={SELF_CONVERSATION_PRESETS}
				getLabel={(preset) => preset.label}
				selectedIndex={selectedPreset}
				onSelect={applyPreset}
			/>

			<div className="border-b border-border">
				<label htmlFor="selfconvo-system-prompt" className="block px-3 pt-2 pb-1 text-[0.65rem] font-mono uppercase tracking-widest text-muted/60">System Prompt</label>
				<textarea
					id="selfconvo-system-prompt"
					value={systemPrompt}
					onChange={handleSystemPromptChange}
					rows={3}
					className="w-full resize-y bg-background/40 px-3 pb-3 text-xs font-mono text-foreground/80 outline-none"
				/>
			</div>

			{!hasStarted ? (
				<div className="flex items-center gap-2 border-b border-border px-3 py-2">
					<input
						ref={inputRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={rateLimitExpiresAt !== null}
						placeholder="Say something to kick things off…"
						className="flex-1 border border-border/60 bg-background/40 px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-foreground/40 disabled:opacity-40"
					/>
					<button
						onClick={start}
						disabled={input.trim() === '' || rateLimitExpiresAt !== null}
						className="cursor-pointer border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-foreground transition-colors hover:border-foreground/50 disabled:cursor-not-allowed disabled:opacity-30"
					>
						Start
					</button>
				</div>
			) : (
				<div className="flex items-center justify-between border-b border-border px-3 py-2">
					{conversationOver
						? <span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted/50">Maximum length reached</span>
						: isRunning
							? <span className="animate-pulse font-mono text-[0.65rem] text-muted/60">Talking…</span>
							: (
								<button
									onClick={continueConversation}
									disabled={rateLimitExpiresAt !== null}
									className="cursor-pointer border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-foreground transition-colors hover:border-foreground/50 disabled:cursor-not-allowed disabled:opacity-30"
								>
									Continue
								</button>
							)}
					<button
						onClick={handleReset}
						className="cursor-pointer border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
					>
						Reset
					</button>
				</div>
			)}

			{rateLimitExpiresAt !== null && retryCountdown > 0 && <RateLimitBanner retryCountdown={retryCountdown} />}
			{errorMessage !== '' && (
				<div className="border-t border-red-500/30 bg-red-500/5 px-3 py-2 font-mono text-[0.7rem] text-red-400">{errorMessage}</div>
			)}

			<div className="relative h-72 overflow-hidden">
				{renderBox('a', 'Voice A')}
				{renderBox('b', 'Voice B')}
			</div>
		</div>
	)
}
