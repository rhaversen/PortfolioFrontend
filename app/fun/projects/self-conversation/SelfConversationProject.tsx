'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SELF_CONVERSATION_PRESETS } from '../sampleData'
import { useSocket } from '../shared/hooks/useSocket'
import { useRateLimit } from '../shared/hooks/useRateLimit'
import { RateLimitBanner } from '../shared/components/RateLimitBanner'
import { PresetTabs } from '../shared/components/PresetTabs'

const MAX_MESSAGES = 60
const TYPE_MS = 18

interface ChatMessage {
	id: number
	text: string
	/** Which side of the chat this bubble sits on; flips every message. */
	side: 'left' | 'right'
	typing: boolean
}

interface ConversationState {
	messages: ChatMessage[]
	isWaiting: boolean
	running: boolean
}

const IDLE_STATE: ConversationState = {
	messages: [],
	isWaiting: false,
	running: false,
}

/**
 * A messenger-style chat where an AI talks to itself. The user seeds the first
 * message; every reply is typed into a new bubble on the opposite side from the
 * previous one — so the "sender" alternates, like two people trading places in
 * a normal chat. The full history stays in one scrolling conversation.
 *
 * The whole conversation lives in a single state object because the turn loop
 * (socket reply → typewriter → next request) is driven from timers and socket
 * handlers that would otherwise race against split useState updates.
 */
export default function SelfConversationProject() {
	const [systemPrompt, setSystemPrompt] = useState(SELF_CONVERSATION_PRESETS[0].systemPrompt)
	const [selectedPreset, setSelectedPreset] = useState<number | null>(0)
	const [input, setInput] = useState('')
	const [state, setState] = useState<ConversationState>(IDLE_STATE)
	const [errorMessage, setErrorMessage] = useState('')
	const { rateLimitExpiresAt, retryCountdown, triggerRateLimit, clearRateLimit } = useRateLimit()

	const systemPromptRef = useRef(systemPrompt)
	const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const stateRef = useRef(state)
	const scrollRef = useRef<HTMLDivElement | null>(null)
	const inputRef = useRef<HTMLInputElement | null>(null)
	const handlersRef = useRef<{ onReply: (reply: string) => void }>({ onReply: () => {} })

	useEffect(() => {
		stateRef.current = state
	}, [state])

	const clearTypeTimer = useCallback(() => {
		if (typeTimerRef.current !== null) { clearInterval(typeTimerRef.current); typeTimerRef.current = null }
	}, [])

	useEffect(() => clearTypeTimer, [clearTypeTimer])

	const socketRef = useSocket((socket) => {
		socket.on('selfconvo:reply', ({ reply }: { reply: string }) => {
			handlersRef.current.onReply(reply)
		})

		socket.on('selfconvo:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
			clearTypeTimer()
			setState(prev => ({ ...prev, isWaiting: false, running: false }))
			if (retryAfterMs !== undefined && retryAfterMs > 0) {
				triggerRateLimit(retryAfterMs)
			} else {
				setErrorMessage('The conversation stalled. Press Continue to keep it going.')
			}
		})
	}, [clearTypeTimer, triggerRateLimit])

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
		requestReply(history)
	}, [requestReply])

	const beginReply = useCallback((reply: string) => {
		const id = Date.now()
		const side = stateRef.current.messages.length % 2 === 0 ? 'right' : 'left'
		setState(prev => ({
			...prev,
			isWaiting: false,
			messages: [...prev.messages, { id, text: '', side, typing: true }],
		}))
		let i = 0
		clearTypeTimer()
		typeTimerRef.current = setInterval(() => {
			i++
			const done = i >= reply.length
			setState(prev => ({
				...prev,
				messages: prev.messages.map(m => (m.id === id ? { ...m, text: reply.slice(0, i), typing: !done } : m)),
			}))
			if (done) {
				clearTypeTimer()
				const updated = [...stateRef.current.messages.map(m => (m.id === id ? { ...m, text: reply, typing: false } : m))]
				const keepGoing = stateRef.current.running
				setState(prev => ({ ...prev, messages: updated.map(m => (m.id === id ? { ...m, text: reply, typing: false } : m)) }))
				if (keepGoing) {
					nextTurn(updated.map(m => m.text))
				}
			}
		}, TYPE_MS)
	}, [clearTypeTimer, nextTurn, stateRef])

	const handlersEffectDeps = beginReply

	useEffect(() => {
		handlersRef.current.onReply = handlersEffectDeps
	}, [handlersEffectDeps])

	const start = useCallback(() => {
		const text = input.trim()
		if (text === '' || rateLimitExpiresAt !== null) return
		clearTypeTimer()
		setErrorMessage('')
		setState({ ...IDLE_STATE, messages: [{ id: Date.now(), text, side: 'right', typing: false }], running: true })
		nextTurn([text])
	}, [clearTypeTimer, input, nextTurn, rateLimitExpiresAt])

	const continueConversation = useCallback(() => {
		if (state.messages.length === 0 || state.running || state.isWaiting || rateLimitExpiresAt !== null) return
		clearTypeTimer()
		setErrorMessage('')
		setState(prev => ({ ...prev, running: true }))
		nextTurn(state.messages.map(m => m.text))
	}, [clearTypeTimer, nextTurn, rateLimitExpiresAt, state.isWaiting, state.messages, state.running])

	const handleReset = useCallback(() => {
		socketRef.current?.emit('selfconvo:cancel')
		clearTypeTimer()
		setState(IDLE_STATE)
		setErrorMessage('')
		clearRateLimit()
		setTimeout(() => inputRef.current?.focus(), 0)
	}, [clearRateLimit, clearTypeTimer, socketRef])

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

	const hasStarted = state.messages.length > 0
	const isRunning = state.running || state.isWaiting || state.messages.some(m => m.typing)
	const conversationOver = hasStarted && state.messages.length >= MAX_MESSAGES && !isRunning

	// The AI-only turn loop ignores scroll anchoring subtleties; the user is a spectator.
	useEffect(() => {
		const el = scrollRef.current
		if (el && isRunning) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
	}, [state.messages, isRunning])

	function renderBubble(message: ChatMessage) {
		const isRight = message.side === 'right'
		return (
			<div key={message.id} className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}>
				<div
					className={[
						'max-w-[75%] px-3 py-2 text-xs whitespace-pre-wrap wrap-break-word border transition-all duration-300',
						isRight
							? 'rounded-2xl rounded-br-sm border-blue-500/40 bg-blue-500/10'
							: 'rounded-2xl rounded-bl-sm border-border/60 bg-background/60',
					].join(' ')}
				>
					{message.text}
					{message.typing && <span className="ml-0.5 inline-block h-[0.9em] w-1 animate-pulse align-middle bg-foreground/30" />}
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

			<div ref={scrollRef} className="flex h-96 flex-col gap-2 overflow-y-auto px-3 py-3">
				{state.messages.map(renderBubble)}
				{state.isWaiting && (
					<div className="flex justify-start">
						<div className="flex gap-1 rounded-2xl rounded-bl-sm border border-border/60 bg-background/60 px-3 py-2.5">
							<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted/60 [animation-delay:0ms]" />
							<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted/60 [animation-delay:150ms]" />
							<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted/60 [animation-delay:300ms]" />
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
