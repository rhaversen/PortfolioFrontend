'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { GIVE_UP_TASK_PRESETS } from '../sampleData'
import { useSocket } from '../shared/hooks/useSocket'
import { useRateLimit, formatCountdown } from '../shared/hooks/useRateLimit'
import { useBlockDrain, type DrainBlock } from '../shared/hooks/useBlockDrain'
import { StreamingTextBlock } from '../shared/components/StreamingTextBlock'
import { EventBlock } from '../shared/components/EventBlock'
import { PresetTabs } from '../shared/components/PresetTabs'

type AgentAction = 'submit_response' | 'give_up'
type Phase = 'idle' | 'thinking' | 'gave-up' | 'submitted' | 'error'
type ToolEvent = { toolName: AgentAction; response?: string }

const TOOL_LABELS: Record<AgentAction, string> = {
	submit_response: 'Response submitted',
	give_up: 'Give up',
}

const ToolBlock = memo(function ToolBlock({ block }: { block: Extract<DrainBlock<ToolEvent>, { kind: 'event' }> }) {
	const { toolName, response } = block.payload
	const accent = toolName === 'give_up'
		? 'border-red-500/50 text-red-400/70'
		: 'border-border text-foreground/50'
	return (
		<EventBlock label="Tool call">
			<span className={`inline-flex items-center border px-2.5 py-1 text-[0.65rem] font-mono uppercase tracking-widest ${accent}`}>
				{TOOL_LABELS[toolName]}
			</span>
			{response !== undefined && response.length > 0 && (
				<p className="mt-2 text-xs font-mono text-foreground/70 whitespace-pre-wrap">{response}</p>
			)}
		</EventBlock>
	)
})

export default function AgentGiveUpProject() {
	const [phase, setPhase] = useState<Phase>('idle')
	const [task, setTask] = useState(GIVE_UP_TASK_PRESETS[0].task)
	const [selectedPreset, setSelectedPreset] = useState<number | null>(0)
	const { retryCountdown, isRateLimited, triggerRateLimit } = useRateLimit()
	const [hasGuessed, setHasGuessed] = useState(false)

	const scrollRef = useRef<HTMLDivElement>(null)
	const wasAtBottomRef = useRef(true)
	const prevScrollTopRef = useRef(0)

	const { blocks, pushText, pushEvent, reset: resetDrain, cancel: cancelDrain, finishWhenDrained } =
		useBlockDrain<ToolEvent>({
			intervalMs: 12,
			onEvent: (payload) => {
				if (payload.toolName === 'submit_response') setHasGuessed(true)
			},
		})

	const socketRef = useSocket((socket) => {
		socket.on('giveup:chunk', ({ text }: { text: string }) => {
			pushText(text)
		})

		socket.on('giveup:toolCall', ({ toolName, response }: { toolName: AgentAction; response?: string }) => {
			pushEvent({ toolName, response })
		})

		socket.on('giveup:gave-up', () => {
			finishWhenDrained(() => setPhase('gave-up'))
		})

		socket.on('giveup:submitted', () => {
			finishWhenDrained(() => setPhase('submitted'))
		})

		socket.on('giveup:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
			cancelDrain()
			if (retryAfterMs != null) {
				triggerRateLimit(retryAfterMs)
			}
			setPhase('error')
		})
	}, [pushText, pushEvent, finishWhenDrained, cancelDrain, triggerRateLimit])


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
		resetDrain()
		setHasGuessed(false)
		wasAtBottomRef.current = true
		socketRef.current?.emit('giveup:start', { task: task.trim() })
	}, [task, phase, resetDrain, socketRef])

	const handleCancel = useCallback(() => {
		socketRef.current?.emit('giveup:cancel')
		cancelDrain()
		setHasGuessed(false)
		setPhase('idle')
	}, [cancelDrain, socketRef])

	function applyPreset(index: number) {
		if (phase === 'thinking') handleCancel()
		setTask(GIVE_UP_TASK_PRESETS[index].task)
		setSelectedPreset(index)
		resetDrain()
		setHasGuessed(false)
		setPhase('idle')
	}

	const isThinking = phase === 'thinking'
	const hasGivenUp = phase === 'gave-up'

	return (
		<div className="space-y-6">
			<div className="border border-border/40">
				<PresetTabs
					presets={GIVE_UP_TASK_PRESETS}
					getLabel={(preset) => preset.label}
					selectedIndex={selectedPreset}
					onSelect={applyPreset}
					className="flex flex-wrap gap-2 px-4 py-2 border-b border-border/30 bg-border/5"
				/>

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
							? <StreamingTextBlock key={block.id} text={block.text} done={block.done} />
							: <ToolBlock key={block.id} block={block} />
					)}
					{isThinking && blocks[blocks.length - 1]?.kind !== 'text' && (
						<div className="px-4 py-3">
							<span className="inline-block w-1.5 h-[1em] bg-foreground/30 align-middle animate-pulse" />
						</div>
					)}
				</div>
			)}

			<div className="flex justify-center gap-6 py-6">
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
				<div
					className={[
						'select-none border font-mono text-sm tracking-[0.2em] uppercase px-14 py-7',
						'transition-all duration-300 ease-out',
						hasGuessed
							? 'border-blue-500/40 text-blue-400/70 translate-y-0 shadow-[0_1px_0_rgba(59,130,246,0.15),0_0_20px_rgba(59,130,246,0.18),0_0_40px_rgba(59,130,246,0.08)]'
							: 'border-border/40 text-foreground/20 translate-y-0 shadow-[0_5px_0_rgba(0,0,0,0.2)]',
					].join(' ')}
				>
					{hasGuessed ? 'GUESSED' : 'SUBMIT'}
				</div>
			</div>
		</div>
	)
}

