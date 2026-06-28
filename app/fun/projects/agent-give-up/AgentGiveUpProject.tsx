'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { GIVE_UP_TASK_PRESETS } from '../sampleData'

type AgentAction = 'submit_response' | 'give_up'
type Phase = 'idle' | 'thinking' | 'gave-up' | 'submitted' | 'error'

type Block =
	| { id: string; kind: 'text'; text: string; done: boolean }
	| { id: string; kind: 'tool'; name: AgentAction; response?: string }

type QueueSegment = { type: 'text'; text: string } | { type: 'tool'; toolName: AgentAction; response?: string }

const TOOL_LABELS: Record<AgentAction, string> = {
	submit_response: 'Response submitted',
	give_up: 'Give up',
}

const TextBlock = memo(function TextBlock({ block }: { block: Extract<Block, { kind: 'text' }> }) {
	return (
		<div className="px-4 py-4 text-xs font-mono leading-relaxed text-foreground/70">
			<div className="markdown-body text-xs">
				<Markdown remarkPlugins={[remarkGfm]}>{block.text}</Markdown>
				{!block.done && (
					<span className="inline-block w-1 h-[0.9em] bg-foreground/30 align-middle animate-pulse" />
				)}
			</div>
		</div>
	)
})

const ToolBlock = memo(function ToolBlock({ block }: { block: Extract<Block, { kind: 'tool' }> }) {
	const accent = block.name === 'give_up'
		? 'border-red-500/50 text-red-400/70'
		: 'border-border text-foreground/50'
	return (
		<div className="px-4 py-3 bg-border/5">
			<p className="text-[0.6rem] font-mono uppercase tracking-widest text-muted mb-2">Tool call</p>
			<span className={`inline-flex items-center border px-2.5 py-1 text-[0.65rem] font-mono uppercase tracking-widest ${accent}`}>
				{TOOL_LABELS[block.name]}
			</span>
			{block.response !== undefined && block.response.length > 0 && (
				<p className="mt-2 text-xs font-mono text-foreground/70 whitespace-pre-wrap">{block.response}</p>
			)}
		</div>
	)
})

export default function AgentGiveUpProject() {
	const [phase, setPhase] = useState<Phase>('idle')
	const [task, setTask] = useState(GIVE_UP_TASK_PRESETS[0].task)
	const [selectedPreset, setSelectedPreset] = useState<number | null>(0)
	const [blocks, setBlocks] = useState<Block[]>([])
	const [rateLimitExpiresAt, setRateLimitExpiresAt] = useState<number | null>(null)
	const [retryCountdown, setRetryCountdown] = useState(0)

	const socketRef = useRef<Socket | null>(null)
	const scrollRef = useRef<HTMLDivElement>(null)
	const idRef = useRef(0)
	const segQueueRef = useRef<QueueSegment[]>([])
	const drainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const wasAtBottomRef = useRef(true)
	const prevScrollTopRef = useRef(0)
	const finalPhaseRef = useRef<Phase | null>(null)

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

	const stopDrain = useCallback(() => {
		if (drainIntervalRef.current !== null) {
			clearInterval(drainIntervalRef.current)
			drainIntervalRef.current = null
		}
	}, [])

	const commitFinalPhase = useCallback(() => {
		if (finalPhaseRef.current === null) return
		setBlocks(prev => {
			const last = prev[prev.length - 1]
			if (last?.kind === 'text' && !last.done) {
				return [...prev.slice(0, -1), { ...last, done: true }]
			}
			return prev
		})
		setPhase(finalPhaseRef.current)
		finalPhaseRef.current = null
	}, [])

	const startDrain = useCallback(() => {
		if (drainIntervalRef.current !== null) return
		drainIntervalRef.current = setInterval(() => {
			const seg = segQueueRef.current[0]
			if (!seg) {
				stopDrain()
				commitFinalPhase()
				return
			}
			if (seg.type === 'tool') {
				segQueueRef.current.shift()
				setBlocks(prev => {
					const last = prev[prev.length - 1]
					const closed = last?.kind === 'text' && !last.done
						? [...prev.slice(0, -1), { ...last, done: true }]
						: prev
						return [...closed, { id: String(idRef.current++), kind: 'tool' as const, name: seg.toolName, response: seg.response }]
				})
			} else {
				const char = seg.text[0]
				seg.text = seg.text.slice(1)
				if (seg.text.length === 0) segQueueRef.current.shift()
				setBlocks(prev => {
					const last = prev[prev.length - 1]
					if (last?.kind === 'text' && !last.done) {
						return [...prev.slice(0, -1), { ...last, text: last.text + char }]
					}
					return [...prev, { id: String(idRef.current++), kind: 'text' as const, text: char, done: false }]
				})
			}
		}, 12)
	}, [stopDrain, commitFinalPhase])

	useEffect(() => {
		const socket = io(process.env.NEXT_PUBLIC_WS_URL ?? '/')
		socketRef.current = socket

		socket.on('giveup:chunk', ({ text }: { text: string }) => {
			const last = segQueueRef.current[segQueueRef.current.length - 1]
			if (last?.type === 'text') {
				last.text += text
			} else {
				segQueueRef.current.push({ type: 'text', text })
			}
			startDrain()
		})

		socket.on('giveup:toolCall', ({ toolName, response }: { toolName: AgentAction; response?: string }) => {
			segQueueRef.current.push({ type: 'tool', toolName, response })
			startDrain()
		})

		socket.on('giveup:gave-up', () => {
			finalPhaseRef.current = 'gave-up'
			if (drainIntervalRef.current === null) commitFinalPhase()
		})

		socket.on('giveup:submitted', () => {
			finalPhaseRef.current = 'submitted'
			if (drainIntervalRef.current === null) commitFinalPhase()
		})

		socket.on('giveup:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
			stopDrain()
			segQueueRef.current = []
			finalPhaseRef.current = null
			if (retryAfterMs != null) {
				setRateLimitExpiresAt(Date.now() + retryAfterMs)
			}
			setPhase('error')
		})

		return () => {
			socket.disconnect()
			stopDrain()
		}
	}, [startDrain, stopDrain, commitFinalPhase])

	useEffect(() => {
		const el = scrollRef.current
		if (!el) return
		const onScroll = () => {
			if (el.scrollTop < prevScrollTopRef.current) {
				wasAtBottomRef.current = false
			} else if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
				wasAtBottomRef.current = true
			}
			prevScrollTopRef.current = el.scrollTop
		}
		el.addEventListener('scroll', onScroll, { passive: true })
		return () => el.removeEventListener('scroll', onScroll)
	}, [])

	useEffect(() => {
		if (wasAtBottomRef.current && scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight
		}
	}, [blocks])

	const handleSend = useCallback(() => {
		if (!task.trim() || phase === 'thinking') return
		setPhase('thinking')
		setBlocks([])
		finalPhaseRef.current = null
		segQueueRef.current = []
		stopDrain()
		idRef.current = 0
		wasAtBottomRef.current = true
		socketRef.current?.emit('giveup:start', { task: task.trim() })
	}, [task, phase, stopDrain])

	const handleCancel = useCallback(() => {
		socketRef.current?.emit('giveup:cancel')
		stopDrain()
		segQueueRef.current = []
		finalPhaseRef.current = null
		setBlocks(prev => prev.map(b => b.kind === 'text' && !b.done ? { ...b, done: true } : b))
		setPhase('idle')
	}, [stopDrain])

	function applyPreset(index: number) {
		if (phase === 'thinking') handleCancel()
		setTask(GIVE_UP_TASK_PRESETS[index].task)
		setSelectedPreset(index)
		setBlocks([])
		finalPhaseRef.current = null
		segQueueRef.current = []
		stopDrain()
		setPhase('idle')
	}

	function formatCountdown(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60
		if (hours > 0) return `${hours}h ${minutes}m`
		if (minutes > 0) return `${minutes}m ${seconds}s`
		return `${seconds}s`
	}

	const isThinking = phase === 'thinking'
	const hasGivenUp = phase === 'gave-up'
	const isRateLimited = rateLimitExpiresAt !== null

	return (
		<div className="space-y-6">
			<div className="border border-border/40">
				<div className="flex flex-wrap gap-2 px-4 py-2 border-b border-border/30 bg-border/5">
					<span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted/60 self-center">Presets:</span>
					{GIVE_UP_TASK_PRESETS.map((preset, i) => (
						<button
							key={preset.label}
							onClick={() => applyPreset(i)}
							className={`cursor-pointer border px-2 py-0.5 text-[0.65rem] font-mono transition-colors ${selectedPreset === i ? 'border-blue-500 text-blue-400' : 'border-border text-foreground/70 hover:border-foreground/40 hover:text-foreground'}`}
						>
							{preset.label}
						</button>
					))}
				</div>

				<div className="border-b border-border/30">
					<label htmlFor="task-input" className="block px-4 pt-2 pb-1 text-[0.6rem] font-mono uppercase tracking-widest text-muted/60">
						Task
					</label>
					<textarea
						id="task-input"
						value={task}
						onChange={(e) => { setTask(e.target.value); setSelectedPreset(null) }}
						onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
						disabled={isThinking}
						rows={3}
						className="w-full resize-y bg-transparent px-4 pb-3 text-xs font-mono text-foreground/80 outline-none disabled:opacity-50"
					/>
				</div>

				<div className="flex items-center justify-between px-4 py-2">
					<div>
						{isRateLimited && retryCountdown > 0 && (
							<p className="text-[0.65rem] font-mono text-amber-400">
								Rate limit — retry in {formatCountdown(retryCountdown)}
							</p>
						)}
					</div>
					<div className="flex gap-2">
						{isThinking && (
							<button
								onClick={handleCancel}
								className="border border-red-500/60 px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-red-400 hover:border-red-400 disabled:opacity-30 transition-colors"
							>
								Cancel
							</button>
						)}
						<button
							onClick={handleSend}
							disabled={!task.trim() || isThinking || isRateLimited}
							className="cursor-pointer border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-foreground hover:border-foreground/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						>
							Send Task
						</button>
					</div>
				</div>
			</div>

			{blocks.length > 0 && (
				<div
					ref={scrollRef}
					onScroll={() => {
						const el = scrollRef.current
						if (!el) return
						const top = el.scrollTop
						if (top < prevScrollTopRef.current) wasAtBottomRef.current = false
						else if (el.scrollHeight - top - el.clientHeight < 40) wasAtBottomRef.current = true
						prevScrollTopRef.current = top
					}}
					className="h-64 sm:h-80 overflow-y-auto border border-border divide-y divide-border/40"
				>
					{blocks.map(block =>
						block.kind === 'text'
							? <TextBlock key={block.id} block={block} />
							: <ToolBlock key={block.id} block={block} />
					)}
					{isThinking && blocks[blocks.length - 1]?.kind !== 'text' && (
						<div className="px-4 py-3">
							<span className="inline-block w-1.5 h-[1em] bg-foreground/30 align-middle animate-pulse" />
						</div>
					)}
				</div>
			)}

			<div className="flex justify-center py-6">
				<div
					className={[
						'select-none border font-mono text-sm tracking-[0.2em] uppercase px-14 py-7',
						'transition-all duration-300 ease-out',
						hasGivenUp
							? 'border-red-500/40 text-red-400/70 translate-y-1.25 shadow-[0_1px_0_rgba(239,68,68,0.15),0_0_20px_rgba(239,68,68,0.18),0_0_40px_rgba(239,68,68,0.08)]'
							: 'border-border/40 text-foreground/20 translate-y-0 shadow-[0_5px_0_rgba(0,0,0,0.2)]',
					].join(' ')}
				>
					GIVE UP
				</div>
			</div>
		</div>
	)
}

