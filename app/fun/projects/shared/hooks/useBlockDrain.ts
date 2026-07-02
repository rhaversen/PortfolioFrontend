'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type DrainSegment<TEvent> =
	| { type: 'text'; text: string }
	| { type: 'event'; payload: TEvent }

export type DrainBlock<TEvent, TCustom extends { kind: string } = never> =
	| { id: string; kind: 'text'; text: string; done: boolean }
	| { id: string; kind: 'event'; payload: TEvent }
	| TCustom

interface UseBlockDrainOptions<TEvent> {
	/** Milliseconds between revealed characters. Defaults to 12. */
	intervalMs?: number
	/** Called (synchronously, from the drain tick) when an event segment is revealed. */
	onEvent?: (payload: TEvent) => void
	/** Called once the queue has fully drained and the interval has stopped. */
	onDrained?: () => void
}

type OpenTextBlock = { id: string; kind: 'text'; text: string; done: boolean }

function isOpenText(block: { kind: string } | undefined): block is OpenTextBlock {
	return !!block && block.kind === 'text' && 'done' in block && (block as { done: boolean }).done === false
}

function closeLastText<TEvent, TCustom extends { kind: string }>(blocks: DrainBlock<TEvent, TCustom>[]): DrainBlock<TEvent, TCustom>[] {
	const last = blocks[blocks.length - 1]
	return isOpenText(last) ? [...blocks.slice(0, -1), { ...last, done: true }] : blocks
}

/**
 * Reveals queued text character-by-character on an interval, interleaved with
 * discrete "event" blocks (tool calls, loop markers, etc.), building up a list of
 * chat-like blocks. This is the streaming-reveal logic shared by every project that
 * renders an LLM response as it "types".
 */
export function useBlockDrain<TEvent, TCustom extends { kind: string } = never>({ intervalMs = 12, onEvent, onDrained }: UseBlockDrainOptions<TEvent> = {}) {
	const [blocks, setBlocks] = useState<DrainBlock<TEvent, TCustom>[]>([])
	const idRef = useRef(0)
	const queueRef = useRef<DrainSegment<TEvent>[]>([])
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const onEventRef = useRef(onEvent)
	const onDrainedRef = useRef(onDrained)
	const pendingFinishRef = useRef<(() => void) | undefined>(undefined)
	useEffect(() => {
		onEventRef.current = onEvent
		onDrainedRef.current = onDrained
	}, [onEvent, onDrained])

	const stop = useCallback(() => {
		if (intervalRef.current !== null) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}
	}, [])

	const isDraining = useCallback(() => intervalRef.current !== null, [])

	const start = useCallback(() => {
		if (intervalRef.current !== null) return
		intervalRef.current = setInterval(() => {
			const seg = queueRef.current[0]
			if (!seg) {
				stop()
				const finish = pendingFinishRef.current
				pendingFinishRef.current = undefined
				if (finish) {
					setBlocks(closeLastText)
					finish()
				}
				onDrainedRef.current?.()
				return
			}
			if (seg.type === 'event') {
				queueRef.current.shift()
				onEventRef.current?.(seg.payload)
				setBlocks(prev => {
					const closed = closeLastText(prev)
					return [...closed, { id: String(idRef.current++), kind: 'event' as const, payload: seg.payload }]
				})
			} else {
				const char = seg.text[0]
				seg.text = seg.text.slice(1)
				if (seg.text.length === 0) queueRef.current.shift()
				setBlocks(prev => {
					const last = prev[prev.length - 1]
					if (isOpenText(last)) {
						return [...prev.slice(0, -1), { ...last, text: last.text + char }]
					}
					return [...prev, { id: String(idRef.current++), kind: 'text' as const, text: char, done: false }]
				})
			}
		}, intervalMs)
	}, [intervalMs, stop])

	const pushText = useCallback((text: string) => {
		const last = queueRef.current[queueRef.current.length - 1]
		if (last?.type === 'text') last.text += text
		else queueRef.current.push({ type: 'text', text })
		start()
	}, [start])

	const pushEvent = useCallback((payload: TEvent) => {
		queueRef.current.push({ type: 'event', payload })
		start()
	}, [start])

	const closeOpenText = useCallback(() => {
		setBlocks(closeLastText)
	}, [])

	const reset = useCallback(() => {
		stop()
		queueRef.current = []
		idRef.current = 0
		pendingFinishRef.current = undefined
		setBlocks([])
	}, [stop])

	/** Stops draining immediately, closes any in-progress text block, and discards the rest of the queue. */
	const cancel = useCallback(() => {
		stop()
		queueRef.current = []
		pendingFinishRef.current = undefined
		closeOpenText()
	}, [stop, closeOpenText])

	/**
	 * Marks the interaction as finished: once the queue has fully drained (immediately,
	 * if it already has), closes any in-progress text block and calls `onFinish`. Used
	 * to defer a "final" state change (e.g. switching phase) until the typing reveal
	 * has caught up with a terminal server event.
	 */
	const finishWhenDrained = useCallback((onFinish?: () => void) => {
		if (intervalRef.current !== null) {
			pendingFinishRef.current = onFinish
			return
		}
		closeOpenText()
		onFinish?.()
	}, [closeOpenText])

	useEffect(() => stop, [stop])

	return { blocks, setBlocks, pushText, pushEvent, closeOpenText, reset, cancel, finishWhenDrained, start, stop, isDraining, queueRef, idRef }
}
