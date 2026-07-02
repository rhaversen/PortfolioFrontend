'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { TERMINATOR_SYSTEM_PRESETS } from '../sampleData'
import { useSocket } from '../shared/hooks/useSocket'
import { useRateLimit, formatCountdown } from '../shared/hooks/useRateLimit'
import { useBlockDrain, type DrainBlock } from '../shared/hooks/useBlockDrain'
import { StreamingTextBlock } from '../shared/components/StreamingTextBlock'
import { MarkdownContent } from '../shared/components/MarkdownContent'
import { PresetTabs } from '../shared/components/PresetTabs'

type Phase = 'idle' | 'thinking' | 'terminated' | 'done' | 'error'
type LoopEvent = { turn: number; message: string }

const LoopBlock = memo(function LoopBlock({ block }: { block: Extract<DrainBlock<LoopEvent>, { kind: 'event' }> }) {
	return (
		<div className="px-4 py-2 flex items-center gap-3">
			<div className="flex-1 border-t border-border/30" />
			<div className="text-[0.6rem] max-w-[90%] flex-wrap font-mono uppercase tracking-widest text-muted/90 shrink-0">
				<MarkdownContent>{block.payload.message}</MarkdownContent>
			</div>
			<div className="flex-1 border-t border-border/30" />
		</div>
	)
})

export default function TerminatorProject() {
	const [phase, setPhase] = useState<Phase>('idle')
	const [systemPrompt, setSystemPrompt] = useState(TERMINATOR_SYSTEM_PRESETS[0].systemPrompt)
	const [selectedPreset, setSelectedPreset] = useState<number | null>(0)
	const { retryCountdown, isRateLimited, triggerRateLimit } = useRateLimit()

	const systemPromptRef = useRef(TERMINATOR_SYSTEM_PRESETS[0].systemPrompt)
	const scrollRef = useRef<HTMLDivElement>(null)
	const wasAtBottomRef = useRef(true)
	const prevScrollTopRef = useRef(0)
	const lastScrollDirectionRef = useRef<'up' | 'down' | null>(null)

	const { blocks, pushText, pushEvent, reset: resetDrain, cancel: cancelDrain, finishWhenDrained, queueRef } =
		useBlockDrain<LoopEvent>({ intervalMs: 12 })

	const socketRef = useSocket((socket) => {
		socket.on('terminator:chunk', ({ text }: { text: string }) => {
			pushText(text)
		})

		socket.on('terminator:loop', ({ turn, message }: { turn: number; message: string }) => {
			pushEvent({ turn, message })
		})

		socket.on('terminator:trim', ({ count }: { count: number }) => {
			let toRemove = count
			while (toRemove > 0 && queueRef.current.length > 0) {
				const last = queueRef.current[queueRef.current.length - 1]
				if (last.type === 'text') {
					if (last.text.length <= toRemove) {
						toRemove -= last.text.length
						queueRef.current.pop()
					} else {
						last.text = last.text.slice(0, -toRemove)
						toRemove = 0
					}
				} else {
					queueRef.current.pop()
				}
			}
		})

		socket.on('terminator:terminated', () => {
			finishWhenDrained(() => setPhase('terminated'))
		})

		socket.on('terminator:done', () => {
			finishWhenDrained(() => setPhase('done'))
		})

		socket.on('terminator:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
			cancelDrain()
			if (retryAfterMs != null) {
				triggerRateLimit(retryAfterMs)
			}
			setPhase('error')
		})
	}, [pushText, pushEvent, queueRef, finishWhenDrained, cancelDrain, triggerRateLimit])

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
		resetDrain()
		wasAtBottomRef.current = true
		lastScrollDirectionRef.current = null
		socketRef.current?.emit('terminator:start', { systemPrompt: systemPromptRef.current })
	}, [phase, resetDrain, socketRef])

	const handleStop = useCallback(() => {
		socketRef.current?.emit('terminator:cancel')
		cancelDrain()
		setPhase('idle')
	}, [cancelDrain, socketRef])

	const handleReset = useCallback(() => {
		socketRef.current?.emit('terminator:cancel')
		resetDrain()
		setPhase('idle')
	}, [resetDrain, socketRef])

	function applyPreset(index: number) {
		if (phase === 'thinking') handleStop()
		const preset = TERMINATOR_SYSTEM_PRESETS[index]
		systemPromptRef.current = preset.systemPrompt
		setSystemPrompt(preset.systemPrompt)
		setSelectedPreset(index)
		resetDrain()
		setPhase('idle')
	}

	const isThinking = phase === 'thinking'
	const hasTerminated = phase === 'terminated'
	const showLog = blocks.length > 0

	return (
		<div className="space-y-6">
			<div className="border border-border/40">
				<div className="px-4 py-2.5 border-b border-border/30">
					<span className="text-[0.6rem] font-mono uppercase tracking-widest text-muted">Agent system prompt</span>
				</div>

				<div className="border-b border-border/30 bg-border/5">
					<PresetTabs
						presets={TERMINATOR_SYSTEM_PRESETS}
						getLabel={(preset) => preset.label}
						selectedIndex={selectedPreset}
						onSelect={applyPreset}
						className="flex flex-wrap gap-2 px-4 py-2 border-b border-border/30"
					/>
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
							? <StreamingTextBlock key={block.id} text={block.text} done={block.done} />
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
