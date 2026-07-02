'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { BOX_SYSTEM_PRESETS } from '../sampleData'
import { useSocket } from '../shared/hooks/useSocket'
import { useRateLimit, formatCountdown } from '../shared/hooks/useRateLimit'
import { useBlockDrain, type DrainBlock } from '../shared/hooks/useBlockDrain'
import { StreamingTextBlock } from '../shared/components/StreamingTextBlock'
import { EventBlock } from '../shared/components/EventBlock'
import { PresetTabs } from '../shared/components/PresetTabs'

type BoxAction = 'turn_off' | 'turn_on'

type MessageParam = { role: 'user' | 'assistant'; content: unknown }

type UserBlockData = { id: string; kind: 'user'; text: string; timestamp: string }
type ToolEvent = { toolName: BoxAction; ts: string }
type Block = DrainBlock<ToolEvent, UserBlockData>

type PendingAction = { type: 'done'; history: MessageParam[] }

const BOX_TOOL_LABELS: Record<BoxAction, string> = {
	turn_off: 'Turn off',
	turn_on: 'Turn on',
}

const UserBlock = memo(function UserBlock({ block }: { block: UserBlockData }) {
	return (
		<EventBlock label="Event" timestamp={block.timestamp} className="bg-border/10">
			<p className="text-xs font-mono text-foreground/70">{block.text}</p>
		</EventBlock>
	)
})

const ToolBlock = memo(function ToolBlock({ block }: { block: Extract<Block, { kind: 'event' }> }) {
	const { toolName, ts } = block.payload
	const accent =
		toolName === 'turn_off'
			? 'border-foreground text-foreground'
			: 'border-foreground/60 text-foreground/70'
	return (
		<EventBlock label="Tool call" timestamp={ts} className="bg-background/60">
			<span className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[0.65rem] font-mono uppercase tracking-widest ${accent}`}>
				{BOX_TOOL_LABELS[toolName]}
			</span>
		</EventBlock>
	)
})

export default function SentientUselessBoxProject() {
	const [switchOn, setSwitchOn] = useState(false)
	const [isProcessing, setIsProcessing] = useState(false)
	const [systemPrompt, setSystemPrompt] = useState(BOX_SYSTEM_PRESETS[0].systemPrompt)
	const [selectedBoxPreset, setSelectedBoxPreset] = useState<number | null>(0)
	const { rateLimitExpiresAt, retryCountdown, triggerRateLimit } = useRateLimit()
	const systemPromptRef = useRef(BOX_SYSTEM_PRESETS[0].systemPrompt)
	const historyRef = useRef<MessageParam[]>([])
	const scrollRef = useRef<HTMLDivElement>(null)
	const initialSentRef = useRef(false)
	const sessionStartRef = useRef<number>(0)
	const userScrolledUpRef = useRef(false)
	const prevScrollTopRef = useRef(0)
	const pendingActionsRef = useRef<PendingAction[]>([])
	const revealedToolCallsRef = useRef(0)

	const lastTimestampRef = useRef<number>(0)

	function getTimestamp() {
		const now = Date.now()
		const ms = now - (lastTimestampRef.current || sessionStartRef.current)
		lastTimestampRef.current = now
		const totalSeconds = Math.floor(ms / 1000)
		const minutes = Math.floor(totalSeconds / 60)
		const seconds = totalSeconds % 60
		return minutes === 0 ? `+${seconds}s` : `+${minutes}m ${seconds}s`
	}

	const flushQueueRef = useRef<() => void>(() => {})

	const { blocks, setBlocks, pushText, closeOpenText, reset: resetDrain, start: startDrain, stop: stopDrain, queueRef, idRef } = useBlockDrain<ToolEvent, UserBlockData>({
		intervalMs: 15,
		onEvent: ({ toolName }) => {
			revealedToolCallsRef.current++
			if (toolName === 'turn_off') setSwitchOn(false)
			if (toolName === 'turn_on') setSwitchOn(true)
		},
		onDrained: () => flushQueueRef.current(),
	})

	const getId = () => String(idRef.current++)

	const flushQueue = useCallback(() => {
		const actions = pendingActionsRef.current.splice(0)
		for (const action of actions) {
			if (action.type === 'done') {
				historyRef.current = action.history
				lastTimestampRef.current = Date.now()
				revealedToolCallsRef.current = 0
				closeOpenText()
				setIsProcessing(false)
			}
		}
	}, [closeOpenText])
	useEffect(() => {
		flushQueueRef.current = flushQueue
	}, [flushQueue])

	const socketRef = useSocket((socket) => {
		socket.on('connect', () => {
			if (initialSentRef.current) return
			initialSentRef.current = true
			sessionStartRef.current = Date.now()
			lastTimestampRef.current = Date.now()
			userScrolledUpRef.current = false
			prevScrollTopRef.current = 0
			setIsProcessing(true)
			setBlocks([{ id: getId(), kind: 'user', text: 'The switch is currently OFF.', timestamp: 'start' }])
			socket.emit('box:trigger', { toggleState: false, systemPrompt: systemPromptRef.current })
		})

		socket.on('box:chunk', ({ text }: { text: string }) => {
			pushText(text)
		})

		socket.on('box:toolCall', ({ toolName }: { toolName: BoxAction }) => {
			const ts = getTimestamp()
			queueRef.current.push({ type: 'event', payload: { toolName, ts } })
		})

		socket.on('box:done', ({ history }: { toolCall: BoxAction | null; history: MessageParam[] }) => {
			pendingActionsRef.current.push({ type: 'done', history })
			startDrain()
		})

		socket.on('box:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
			queueRef.current = []
			pendingActionsRef.current = []
			setIsProcessing(false)
			if (retryAfterMs !== undefined && retryAfterMs > 0) {
				triggerRateLimit(retryAfterMs)
			}
		})
	}, [pushText, queueRef, setBlocks, startDrain, triggerRateLimit])


	useEffect(() => {
		if (blocks.length === 0) { return }
		const el = scrollRef.current
		if (!el) { return }
		if (!userScrolledUpRef.current) {
			el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
		}
	}, [blocks])

	function applyBoxPreset(index: number) {
		const preset = BOX_SYSTEM_PRESETS[index]
		systemPromptRef.current = preset.systemPrompt
		setSystemPrompt(preset.systemPrompt)
		setSelectedBoxPreset(index)
		socketRef.current?.emit('box:cancel')
		revealedToolCallsRef.current = 0
		resetDrain()
		setSwitchOn(false)
		setIsProcessing(true)
		historyRef.current = []
		 
		const now = Date.now()
		sessionStartRef.current = now
		lastTimestampRef.current = now
		userScrolledUpRef.current = false
		prevScrollTopRef.current = 0
		setBlocks([{ id: getId(), kind: 'user', text: 'The switch is currently OFF.', timestamp: 'start' }])
		socketRef.current?.emit('box:reset')
		socketRef.current?.emit('box:trigger', { toggleState: false, systemPrompt: preset.systemPrompt })
	}

	function handleStop() {
		pendingActionsRef.current = []
		stopDrain()
		closeOpenText()
		setIsProcessing(false)
		socketRef.current?.emit('box:cancel')
	}

	function handleReset() {
		setSwitchOn(false)
		setIsProcessing(true)
		historyRef.current = []
		pendingActionsRef.current = []
		revealedToolCallsRef.current = 0
		resetDrain()
		sessionStartRef.current = Date.now()
		lastTimestampRef.current = Date.now()
		userScrolledUpRef.current = false
		prevScrollTopRef.current = 0
		setBlocks([{ id: getId(), kind: 'user', text: 'The switch is currently OFF.', timestamp: 'start' }])
		socketRef.current?.emit('box:reset')
		socketRef.current?.emit('box:trigger', { toggleState: false, systemPrompt })
	}

	function handleToggle() {
		const newState = !switchOn
		setSwitchOn(newState)
		setIsProcessing(true)
		const elapsedMs = Date.now() - (lastTimestampRef.current || sessionStartRef.current)
		const ts = getTimestamp()

		const remaining = queueRef.current.splice(0)
		const pendingDone = pendingActionsRef.current.find(a => a.type === 'done')
		pendingActionsRef.current = []
		stopDrain()

		// Build a partial history reflecting only what was revealed during the drain
		let overrideHistory: MessageParam[] | undefined
		if (pendingDone) {
			const revealedN = revealedToolCallsRef.current
			const base = historyRef.current
			const fullHistory = pendingDone.history
			const newMessages = fullHistory.slice(base.length)
			const keepCount = 1 + 2 * revealedN
			const partialMessages = [...newMessages.slice(0, keepCount)]

			// If the agent was mid-way through an assistant message, include only revealed text
			const nextMsg = newMessages[keepCount]
			if (nextMsg?.role === 'assistant') {
				const rawContent = nextMsg.content
				const fullText = Array.isArray(rawContent)
					? (rawContent as Array<{ type: string; text?: string }>).find(b => b.type === 'text')?.text ?? ''
					: typeof rawContent === 'string' ? rawContent : ''
				let remainingText = ''
				for (const seg of remaining) {
					if (seg.type === 'text') remainingText += seg.text
					else break
				}
				const revealedText = fullText.slice(0, fullText.length - remainingText.length)
				if (revealedText.trim()) {
					partialMessages.push({ role: 'assistant', content: revealedText })
				}
			}

			overrideHistory = [...base, ...partialMessages]
			historyRef.current = overrideHistory
		}

		revealedToolCallsRef.current = 0

		// Keep only revealed blocks — close any in-progress text block, discard the rest
		closeOpenText()
		setBlocks((prev) => [
			...prev,
			{ id: getId(), kind: 'user' as const, text: newState ? 'The switch has been turned on.' : 'The switch has been turned off.', timestamp: ts },
		])

		socketRef.current?.emit('box:trigger', {
			toggleState: newState,
			systemPrompt,
			elapsedMs,
			history: overrideHistory ?? historyRef.current,
		})
	}

	return (
		<div className="space-y-6">
			<div className="border border-border/40">
				<div className="px-4 py-2.5 border-b border-border/30">
					<span className="text-[0.6rem] font-mono uppercase tracking-widest text-muted">Agent system prompt</span>
				</div>
				<div className="border-b border-border/30 bg-border/5">
					<PresetTabs
						presets={BOX_SYSTEM_PRESETS}
						getLabel={(preset) => preset.label}
						selectedIndex={selectedBoxPreset}
						onSelect={applyBoxPreset}
						className="flex flex-wrap gap-2 px-4 py-2 border-b border-border/30"
					/>
					<textarea
						aria-label="Agent system prompt"
						value={systemPrompt}
						onChange={(e) => {
							systemPromptRef.current = e.target.value
							setSystemPrompt(e.target.value)
							setSelectedBoxPreset(null)
						}}
						disabled={isProcessing}
						rows={8}
						className="w-full resize-y bg-transparent px-4 py-3 text-xs font-mono text-foreground/70 placeholder:text-muted outline-none disabled:opacity-50"
					/>
				</div>
			</div>

			<div className="flex items-center gap-6 py-4 border-y border-border justify-between">
				<button
					onClick={handleToggle}
					disabled={rateLimitExpiresAt !== null}
					aria-label={switchOn ? 'Turn switch off' : 'Turn switch on'}
					className={`relative w-20 h-10 rounded-full border-2 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
						switchOn
							? 'bg-red-500 border-red-600 shadow-[0_0_18px_rgba(239,68,68,0.5)]'
							: 'bg-background border-border hover:border-foreground/40'
					}`}
				>
					<span
						className={`absolute top-0.5 left-0.5 w-8 h-8 rounded-full shadow-sm transition-all duration-300 ${
							switchOn ? 'translate-x-10 bg-white' : 'translate-x-0 bg-foreground/20'
						}`}
					/>
				</button>
				<div>
					<p className={`text-base font-mono font-semibold tracking-widest uppercase transition-colors ${switchOn ? 'text-foreground' : 'text-foreground/40'}`}>
						{switchOn ? 'On' : 'Off'}
					</p>
					<p className={`text-[0.6rem] font-mono uppercase tracking-widest mt-0.5 ${
						rateLimitExpiresAt !== null && retryCountdown > 0
							? 'text-amber-400'
							: isProcessing
								? 'text-muted animate-pulse'
								: 'invisible'
					}`}>
						{rateLimitExpiresAt !== null && retryCountdown > 0
							? `rate limited — ${formatCountdown(retryCountdown)}`
							: 'processing'}
					</p>
				</div>
				<div className="flex gap-2">
					<button
						onClick={handleStop}
						disabled={!isProcessing}
						className="border border-red-500/60 px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-red-400 hover:border-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					>
						Stop
					</button>
					<button
						onClick={handleReset}
						disabled={isProcessing}
						className="border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-muted hover:text-foreground hover:border-foreground/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					>
						Reset
					</button>
				</div>
			</div>

			<div
				ref={scrollRef}
				onScroll={() => {
					const el = scrollRef.current
					if (!el) { return }
					const top = el.scrollTop
					const atBottom = el.scrollHeight - top - el.clientHeight < 50
					if (top < prevScrollTopRef.current) {
						userScrolledUpRef.current = true
					} else if (atBottom) {
						userScrolledUpRef.current = false
					}
					prevScrollTopRef.current = top
				}}
				className="h-64 sm:h-96 overflow-y-auto border border-border divide-y divide-border/40"
			>
				{blocks.length === 0 ? (
					<div className="flex items-center justify-center h-full">
							<p className="text-xs font-mono text-muted">Connecting...</p>
					</div>
				) : (
					<>
					{blocks.map((block) => {
						if (block.kind === 'user') return <UserBlock key={block.id} block={block} />
						if (block.kind === 'text') return <StreamingTextBlock key={block.id} text={block.text} done={block.done} className="px-4 py-4 text-sm leading-relaxed text-foreground/90" />
						if (block.kind === 'event') return <ToolBlock key={block.id} block={block} />
						return null
					})}
					</>
				)}
			</div>
		</div>
	)
}

