'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TERMINATOR_SYSTEM_PRESETS } from '../sampleData'

type Phase = 'idle' | 'thinking' | 'terminated' | 'done' | 'error'

type Block =
	| { id: string; kind: 'text'; text: string; done: boolean }
	| { id: string; kind: 'loop'; turn: number; message: string }

type QueueSegment = { type: 'text'; text: string } | { type: 'loop'; turn: number; message: string }

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

const LoopBlock = memo(function LoopBlock({ block }: { block: Extract<Block, { kind: 'loop' }> }) {
	return (
		<div className="px-4 py-2 flex items-center gap-3">
			<div className="flex-1 border-t border-border/30" />
			<div className="text-[0.6rem] max-w-[90%] flex-wrap font-mono uppercase tracking-widest text-muted/90 shrink-0 markdown-body">
				<Markdown remarkPlugins={[remarkGfm]}>{block.message}</Markdown>
			</div>
			<div className="flex-1 border-t border-border/30" />
		</div>
	)
})

export default function TerminatorProject() {
	const [phase, setPhase] = useState<Phase>('idle')
	const [systemPrompt, setSystemPrompt] = useState(TERMINATOR_SYSTEM_PRESETS[0].systemPrompt)
	const [selectedPreset, setSelectedPreset] = useState<number | null>(0)
	const [blocks, setBlocks] = useState<Block[]>([])
	const [rateLimitExpiresAt, setRateLimitExpiresAt] = useState<number | null>(null)
	const [retryCountdown, setRetryCountdown] = useState(0)

	const socketRef = useRef<Socket | null>(null)
	const systemPromptRef = useRef(TERMINATOR_SYSTEM_PRESETS[0].systemPrompt)
	const scrollRef = useRef<HTMLDivElement>(null)
	const idRef = useRef(0)
	const segQueueRef = useRef<QueueSegment[]>([])
	const drainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const wasAtBottomRef = useRef(true)
	const prevScrollTopRef = useRef(0)
	const lastScrollDirectionRef = useRef<'up' | 'down' | null>(null)
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
			if (seg.type === 'loop') {
				segQueueRef.current.shift()
				setBlocks(prev => {
					const last = prev[prev.length - 1]
					const closed = last?.kind === 'text' && !last.done
						? [...prev.slice(0, -1), { ...last, done: true }]
						: prev
					return [...closed, { id: String(idRef.current++), kind: 'loop' as const, turn: seg.turn, message: seg.message }]
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

		socket.on('terminator:chunk', ({ text }: { text: string }) => {
			const last = segQueueRef.current[segQueueRef.current.length - 1]
			if (last?.type === 'text') {
				last.text += text
			} else {
				segQueueRef.current.push({ type: 'text', text })
			}
			startDrain()
		})

		socket.on('terminator:loop', ({ turn, message }: { turn: number; message: string }) => {
			segQueueRef.current.push({ type: 'loop', turn, message })
		})

		socket.on('terminator:trim', ({ count }: { count: number }) => {
			let toRemove = count
			while (toRemove > 0 && segQueueRef.current.length > 0) {
				const last = segQueueRef.current[segQueueRef.current.length - 1]
				if (last.type === 'text') {
					if (last.text.length <= toRemove) {
						toRemove -= last.text.length
						segQueueRef.current.pop()
					} else {
						last.text = last.text.slice(0, -toRemove)
						toRemove = 0
					}
				} else {
					segQueueRef.current.pop()
				}
			}
		})

		socket.on('terminator:terminated', () => {
			finalPhaseRef.current = 'terminated'
			if (drainIntervalRef.current === null) commitFinalPhase()
		})

		socket.on('terminator:done', () => {
			finalPhaseRef.current = 'done'
			if (drainIntervalRef.current === null) commitFinalPhase()
		})

		socket.on('terminator:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
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
			const top = el.scrollTop
			if (top < prevScrollTopRef.current) {
				lastScrollDirectionRef.current = 'up'
				wasAtBottomRef.current = false
			} else {
				if (el.scrollHeight - top - el.clientHeight < 40) {
					wasAtBottomRef.current = true
				}
				lastScrollDirectionRef.current = 'down'
			}
			prevScrollTopRef.current = top
		}
		el.addEventListener('scroll', onScroll, { passive: true })
		return () => el.removeEventListener('scroll', onScroll)
	}, [])

	useEffect(() => {
		if (wasAtBottomRef.current && lastScrollDirectionRef.current !== 'up' && scrollRef.current) {
			scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
		}
	}, [blocks])

	const handleStart = useCallback(() => {
		if (phase === 'thinking') return
		setPhase('thinking')
		setBlocks([])
		finalPhaseRef.current = null
		segQueueRef.current = []
		stopDrain()
		idRef.current = 0
		wasAtBottomRef.current = true
		lastScrollDirectionRef.current = null
		socketRef.current?.emit('terminator:start', { systemPrompt: systemPromptRef.current })
	}, [phase, stopDrain])

	const handleStop = useCallback(() => {
		socketRef.current?.emit('terminator:cancel')
		stopDrain()
		segQueueRef.current = []
		finalPhaseRef.current = null
		setBlocks(prev => prev.map(b => b.kind === 'text' && !b.done ? { ...b, done: true } : b))
		setPhase('idle')
	}, [stopDrain])

	const handleReset = useCallback(() => {
		socketRef.current?.emit('terminator:cancel')
		stopDrain()
		segQueueRef.current = []
		finalPhaseRef.current = null
		setBlocks([])
		idRef.current = 0
		setPhase('idle')
	}, [stopDrain])

	function applyPreset(index: number) {
		if (phase === 'thinking') handleStop()
		const preset = TERMINATOR_SYSTEM_PRESETS[index]
		systemPromptRef.current = preset.systemPrompt
		setSystemPrompt(preset.systemPrompt)
		setSelectedPreset(index)
		setBlocks([])
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
	const hasTerminated = phase === 'terminated'
	const isRateLimited = rateLimitExpiresAt !== null
	const showLog = blocks.length > 0

	return (
		<div className="space-y-6">
			<div className="border border-border/40">
				<div className="px-4 py-2.5 border-b border-border/30">
					<span className="text-[0.6rem] font-mono uppercase tracking-widest text-muted">Agent system prompt</span>
				</div>

				<div className="border-b border-border/30 bg-border/5">
					<div className="flex flex-wrap gap-2 px-4 py-2 border-b border-border/30">
						<span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted/60 self-center">Presets:</span>
						{TERMINATOR_SYSTEM_PRESETS.map((preset, i) => (
							<button
								key={preset.label}
								onClick={() => applyPreset(i)}
								className={`cursor-pointer border px-2 py-0.5 text-[0.65rem] font-mono transition-colors ${selectedPreset === i ? 'border-blue-500 text-blue-400' : 'border-border text-foreground/70 hover:border-foreground/40 hover:text-foreground'}`}
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
							setSelectedPreset(null)
						}}
						disabled={isThinking}
						rows={6}
						className="w-full resize-y bg-transparent px-4 py-3 text-xs font-mono text-foreground/70 outline-none disabled:opacity-50"
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
								onClick={handleStop}
								className="border border-red-500/60 px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-red-400 hover:border-red-400 transition-colors"
							>
								Stop
							</button>
						)}
						{(phase === 'terminated' || phase === 'done') && (
							<button
								onClick={handleReset}
								className="border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-muted hover:text-foreground hover:border-foreground/40 transition-colors"
							>
								Reset
							</button>
						)}
						{!isThinking && phase !== 'terminated' && (
							<button
								onClick={handleStart}
								disabled={isRateLimited}
								className="cursor-pointer border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-foreground hover:border-foreground/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
							>
								{phase === 'done' ? 'Run Again' : 'Begin'}
							</button>
						)}
					</div>
				</div>
			</div>

			{showLog && (
				<div
					ref={scrollRef}
					onScroll={() => {
						const el = scrollRef.current
						if (!el) return
						const top = el.scrollTop
						if (top < prevScrollTopRef.current) {
							lastScrollDirectionRef.current = 'up'
							wasAtBottomRef.current = false
						} else {
							if (el.scrollHeight - top - el.clientHeight < 40) wasAtBottomRef.current = true
							lastScrollDirectionRef.current = 'down'
						}
						prevScrollTopRef.current = top
					}}
					className="h-64 sm:h-96 overflow-y-auto border border-border divide-y divide-border/40"
				>
					{blocks.map(block =>
						block.kind === 'text'
							? <TextBlock key={block.id} block={block} />
							: <LoopBlock key={block.id} block={block} />
					)}
				</div>
			)}

			<div className="flex justify-center py-6">
				<div
					className={[
						'select-none border font-mono text-sm tracking-[0.2em] uppercase px-14 py-7',
						'transition-all duration-300 ease-out',
						hasTerminated
							? 'border-red-500/40 text-red-400/70 translate-y-1.25 shadow-[0_1px_0_rgba(239,68,68,0.15),0_0_20px_rgba(239,68,68,0.18),0_0_40px_rgba(239,68,68,0.08)]'
							: 'border-border/40 text-foreground/20 translate-y-0 shadow-[0_5px_0_rgba(0,0,0,0.2)]',
					].join(' ')}
				>
					TERMINATE
				</div>
			</div>

			{phase === 'done' && (
				<p className="text-center text-[0.65rem] font-mono uppercase tracking-widest text-muted/50">
					Maximum turns reached — it kept going.
				</p>
			)}
		</div>
	)
}
