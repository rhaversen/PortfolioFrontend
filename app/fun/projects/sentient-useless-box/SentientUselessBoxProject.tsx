'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BOX_SYSTEM_PRESETS } from '../sampleData'

type BoxAction = 'turn_off' | 'turn_on'

type MessageParam = { role: 'user' | 'assistant'; content: unknown }

type Block =
	| { id: string; kind: 'user'; text: string; timestamp: string }
	| { id: string; kind: 'text'; text: string; done: boolean }
	| { id: string; kind: 'tool'; name: BoxAction; timestamp: string }

type PendingAction = { type: 'done'; history: MessageParam[] }
type QueueSegment = { type: 'text'; text: string } | { type: 'tool'; toolName: BoxAction; ts: string }

const BOX_TOOL_LABELS: Record<BoxAction, string> = {
	turn_off: 'Turn off',
	turn_on: 'Turn on',
}

const UserBlock = memo(function UserBlock({ block }: { block: Extract<Block, { kind: 'user' }> }) {
	return (
		<div className="px-4 py-3 bg-border/10">
			<div className="flex items-center justify-between mb-1.5">
				<p className="text-[0.6rem] font-mono uppercase tracking-widest text-muted">Event</p>
				<p className="text-[0.6rem] font-mono text-muted">{block.timestamp}</p>
			</div>
			<p className="text-xs font-mono text-foreground/70">{block.text}</p>
		</div>
	)
})

const ToolBlock = memo(function ToolBlock({ block }: { block: Extract<Block, { kind: 'tool' }> }) {
	const accent =
		block.name === 'turn_off'
			? 'border-foreground text-foreground'
			: 'border-foreground/60 text-foreground/70'
	return (
		<div className="px-4 py-3 bg-background/60">
			<div className="flex items-center justify-between mb-2">
				<p className="text-[0.6rem] font-mono uppercase tracking-widest text-muted">Tool call</p>
				<p className="text-[0.6rem] font-mono text-muted">{block.timestamp}</p>
			</div>
			<span className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[0.65rem] font-mono uppercase tracking-widest ${accent}`}>
				{BOX_TOOL_LABELS[block.name]}
			</span>
		</div>
	)
})

const TextBlock = memo(function TextBlock({ block }: { block: Extract<Block, { kind: 'text' }> }) {
	return (
		<div className="px-4 py-4 text-sm leading-relaxed text-foreground/90">
			<div className={`markdown-body${!block.done ? ' is-streaming' : ''}`}>
				<Markdown remarkPlugins={[remarkGfm]}>{block.text}</Markdown>
			</div>
		</div>
	)
})

export default function SentientUselessBoxProject() {
	const [switchOn, setSwitchOn] = useState(false)
	const [blocks, setBlocks] = useState<Block[]>([])
	const [isProcessing, setIsProcessing] = useState(false)
	const [systemPrompt, setSystemPrompt] = useState(BOX_SYSTEM_PRESETS[0].systemPrompt)
	const [selectedBoxPreset, setSelectedBoxPreset] = useState<number | null>(0)
	const [rateLimitExpiresAt, setRateLimitExpiresAt] = useState<number | null>(null)
	const [retryCountdown, setRetryCountdown] = useState(0)
	const systemPromptRef = useRef(BOX_SYSTEM_PRESETS[0].systemPrompt)
	const socketRef = useRef<Socket | null>(null)
	const historyRef = useRef<MessageParam[]>([])
	const scrollRef = useRef<HTMLDivElement>(null)
	const idRef = useRef(0)
	const initialSentRef = useRef(false)
	const sessionStartRef = useRef<number>(0)
	const userScrolledUpRef = useRef(false)
	const prevScrollTopRef = useRef(0)
	const segQueueRef = useRef<QueueSegment[]>([])
	const drainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const pendingActionsRef = useRef<PendingAction[]>([])
	const revealedToolCallsRef = useRef(0)
	const getId = () => String(idRef.current++)

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

	const flushQueue = useCallback(() => {
		const actions = pendingActionsRef.current.splice(0)
		for (const action of actions) {
			if (action.type === 'done') {
				historyRef.current = action.history
				lastTimestampRef.current = Date.now()
				revealedToolCallsRef.current = 0
				setBlocks((prev) => {
					const last = prev[prev.length - 1]
					if (last?.kind === 'text' && !last.done) {
						return [...prev.slice(0, -1), { ...last, done: true }]
					}
					return prev
				})
				setIsProcessing(false)
			}
		}
	}, [])

	const startDrain = useCallback(() => {
		if (drainIntervalRef.current !== null) { return }
		drainIntervalRef.current = setInterval(() => {
			const seg = segQueueRef.current[0]
			if (!seg) {
				clearInterval(drainIntervalRef.current!)
				drainIntervalRef.current = null
				flushQueue()
				return
			}
			if (seg.type === 'tool') {
				segQueueRef.current.shift()
				revealedToolCallsRef.current++
				if (seg.toolName === 'turn_off') { setSwitchOn(false) }
				if (seg.toolName === 'turn_on') { setSwitchOn(true) }
				setBlocks((prev) => {
					const last = prev[prev.length - 1]
					const closed = last?.kind === 'text' && !last.done
						? [...prev.slice(0, -1), { ...last, done: true }]
						: prev
					return [...closed, { id: String(idRef.current++), kind: 'tool' as const, name: seg.toolName, timestamp: seg.ts }]
				})
			} else {
				const char = seg.text[0]
				seg.text = seg.text.slice(1)
				if (seg.text.length === 0) { segQueueRef.current.shift() }
				setBlocks((prev) => {
					const last = prev[prev.length - 1]
					if (last?.kind === 'text' && !last.done) {
						return [...prev.slice(0, -1), { ...last, text: last.text + char }]
					}
					return [...prev, { id: String(idRef.current++), kind: 'text' as const, text: char, done: false }]
				})
			}
		}, 15)
	}, [flushQueue])

	useEffect(() => {
		if (rateLimitExpiresAt === null) return
		const id = setInterval(() => {
			const remaining = rateLimitExpiresAt - Date.now()
			if (remaining <= 0) {
				setRateLimitExpiresAt(null)
				setRetryCountdown(0)
			} else {
				setRetryCountdown(Math.ceil(remaining / 1000))
			}
		}, 1000)
		return () => clearInterval(id)
	}, [rateLimitExpiresAt])

	useEffect(() => {
		const apiUrl = process.env.NEXT_PUBLIC_WS_URL ?? '/'
		const socket = io(apiUrl)
		socketRef.current = socket

		socket.on('connect', () => {
			if (initialSentRef.current) return
			initialSentRef.current = true
			sessionStartRef.current = Date.now()
			lastTimestampRef.current = Date.now()
			userScrolledUpRef.current = false
			prevScrollTopRef.current = 0
			setIsProcessing(true)
			setBlocks([{ id: String(idRef.current++), kind: 'user', text: 'The switch is currently OFF.', timestamp: 'start' }])
			socket.emit('box:trigger', { toggleState: false, systemPrompt: systemPromptRef.current })
		})

		socket.on('box:chunk', ({ text }: { text: string }) => {
			const last = segQueueRef.current[segQueueRef.current.length - 1]
			if (last?.type === 'text') {
				last.text += text
			} else {
				segQueueRef.current.push({ type: 'text', text })
			}
			startDrain()
		})

		socket.on('box:toolCall', ({ toolName }: { toolName: BoxAction }) => {
			const ts = getTimestamp()
			segQueueRef.current.push({ type: 'tool', toolName, ts })
		})

		socket.on('box:done', ({ history }: { toolCall: BoxAction | null; history: MessageParam[] }) => {
			pendingActionsRef.current.push({ type: 'done', history })
			startDrain()
		})

		socket.on('box:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
			segQueueRef.current = []
			pendingActionsRef.current = []
			if (drainIntervalRef.current !== null) {
				clearInterval(drainIntervalRef.current)
				drainIntervalRef.current = null
			}
			setIsProcessing(false)
			if (retryAfterMs !== undefined && retryAfterMs > 0) {
				setRateLimitExpiresAt(Date.now() + retryAfterMs)
				setRetryCountdown(Math.ceil(retryAfterMs / 1000))
			}
		})

		return () => {
			if (drainIntervalRef.current !== null) {
				clearInterval(drainIntervalRef.current)
				drainIntervalRef.current = null
			}
			socket.disconnect()
		}
	}, [startDrain])

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
		segQueueRef.current = []
		pendingActionsRef.current = []
		revealedToolCallsRef.current = 0
		if (drainIntervalRef.current !== null) {
			clearInterval(drainIntervalRef.current)
			drainIntervalRef.current = null
		}
		setSwitchOn(false)
		setIsProcessing(true)
		historyRef.current = []
		// eslint-disable-next-line react-hooks/purity
		const now = Date.now()
		sessionStartRef.current = now
		lastTimestampRef.current = now
		userScrolledUpRef.current = false	
		prevScrollTopRef.current = 0		
		setBlocks([{ id: String(idRef.current++), kind: 'user', text: 'The switch is currently OFF.', timestamp: 'start' }])
		socketRef.current?.emit('box:reset')
		socketRef.current?.emit('box:trigger', { toggleState: false, systemPrompt: preset.systemPrompt })
	}

	function formatCountdown(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60
		if (hours > 0) return `${hours}h ${minutes}m`
		if (minutes > 0) return `${minutes}m ${seconds}s`
		return `${seconds}s`
	}

	function handleStop() {
		segQueueRef.current = []
		pendingActionsRef.current = []
		if (drainIntervalRef.current !== null) {
			clearInterval(drainIntervalRef.current)
			drainIntervalRef.current = null
		}
		setBlocks((prev) => prev.map((b) => b.kind === 'text' && !b.done ? { ...b, done: true } : b))
		setIsProcessing(false)
		socketRef.current?.emit('box:cancel')
	}

	function handleReset() {
		setSwitchOn(false)
		setIsProcessing(true)
		historyRef.current = []
		segQueueRef.current = []
		pendingActionsRef.current = []
		revealedToolCallsRef.current = 0
		if (drainIntervalRef.current !== null) {
			clearInterval(drainIntervalRef.current)
			drainIntervalRef.current = null
		}
		sessionStartRef.current = Date.now()
		lastTimestampRef.current = Date.now()
		userScrolledUpRef.current = false
		prevScrollTopRef.current = 0
		setBlocks([{ id: String(idRef.current++), kind: 'user', text: 'The switch is currently OFF.', timestamp: 'start' }])
		socketRef.current?.emit('box:reset')
		socketRef.current?.emit('box:trigger', { toggleState: false, systemPrompt })
	}

	function handleToggle() {
		const newState = !switchOn
		setSwitchOn(newState)
		setIsProcessing(true)
		const elapsedMs = Date.now() - (lastTimestampRef.current || sessionStartRef.current)
		const ts = getTimestamp()

		const remaining = segQueueRef.current.splice(0)
		const pendingDone = pendingActionsRef.current.find(a => a.type === 'done')
		pendingActionsRef.current = []
		if (drainIntervalRef.current !== null) {
			clearInterval(drainIntervalRef.current)
			drainIntervalRef.current = null
		}

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
		setBlocks((prev) => {
			const closed = prev.map((b) =>
				b.kind === 'text' && !b.done ? { ...b, done: true } : b,
			)
			return [...closed, { id: getId(), kind: 'user' as const, text: newState ? 'The switch has been turned on.' : 'The switch has been turned off.', timestamp: ts }]
		})

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
					<div className="flex flex-wrap gap-2 px-4 py-2 border-b border-border/30">
						<span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted/60 self-center">Presets:</span>
						{BOX_SYSTEM_PRESETS.map((preset, i) => (
							<button
								key={preset.label}
								onClick={() => applyBoxPreset(i)}
							className={`cursor-pointer border px-2 py-0.5 text-[0.65rem] font-mono transition-colors ${selectedBoxPreset === i ? 'border-blue-500 text-blue-400' : 'border-border text-foreground/70 hover:border-foreground/40 hover:text-foreground'}`}
							>
								{preset.label}
							</button>
						))}
					</div>
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
						if (block.kind === 'text') return <TextBlock key={block.id} block={block} />
						if (block.kind === 'tool') return <ToolBlock key={block.id} block={block} />
						return null
					})}
					</>
				)}
			</div>
		</div>
	)
}

