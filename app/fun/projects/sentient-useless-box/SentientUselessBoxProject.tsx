'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type BoxAction = 'turn_off' | 'turn_on'

type MessageParam = { role: 'user' | 'assistant'; content: unknown }

type Block =
	| { id: string; kind: 'user'; text: string; timestamp: string }
	| { id: string; kind: 'text'; text: string; done: boolean }
	| { id: string; kind: 'tool'; name: BoxAction; timestamp: string }

export default function SentientUselessBoxProject() {
	const [switchOn, setSwitchOn] = useState(false)
	const [blocks, setBlocks] = useState<Block[]>([])
	const [isProcessing, setIsProcessing] = useState(false)
	const [systemPrompt, setSystemPrompt] = useState<string | null>(null)
	const socketRef = useRef<Socket | null>(null)
	const historyRef = useRef<MessageParam[]>([])
	const scrollRef = useRef<HTMLDivElement>(null)
	const idRef = useRef(0)
	const initialSentRef = useRef(false)
	const sessionStartRef = useRef<number>(0)

	const getId = () => String(idRef.current++)

	function getTimestamp() {
		const ms = Date.now() - sessionStartRef.current
		const totalSeconds = Math.floor(ms / 1000)
		const minutes = Math.floor(totalSeconds / 60)
		const seconds = totalSeconds % 60
		return minutes === 0 ? `T+${seconds}s` : `T+${minutes}m ${seconds}s`
	}

	useEffect(() => {
		const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
		fetch(`${apiUrl}/service/box/system-prompt`)
			.then((r) => r.json())
			.then((data) => setSystemPrompt(data.systemPrompt))
			.catch(() => {})
	}, [])

	useEffect(() => {
		const apiUrl = process.env.NEXT_PUBLIC_WS_URL ?? '/'
		const socket = io(apiUrl)
		socketRef.current = socket

		socket.on('connect', () => {
			if (initialSentRef.current) return
			initialSentRef.current = true
			sessionStartRef.current = Date.now()
			setIsProcessing(true)
			setBlocks([{ id: String(idRef.current++), kind: 'user', text: 'The switch is currently OFF.', timestamp: 'T+0s' }])
			socket.emit('box:trigger', { toggleState: false })
		})

		socket.on('box:chunk', ({ text }: { text: string }) => {
			const newId = getId()
			setBlocks((prev) => {
				const last = prev[prev.length - 1]
				if (last?.kind === 'text' && !last.done) {
					return [...prev.slice(0, -1), { ...last, text: last.text + text }]
				}
				return [...prev, { id: newId, kind: 'text', text, done: false }]
			})
		})

		socket.on('box:toolCall', ({ toolName }: { toolName: BoxAction }) => {
			if (toolName === 'turn_off') setSwitchOn(false)
			if (toolName === 'turn_on') setSwitchOn(true)
			const toolId = getId()
			const ts = getTimestamp()
			setBlocks((prev) => {
				const last = prev[prev.length - 1]
				const closed = last?.kind === 'text' && !last.done
					? [...prev.slice(0, -1), { ...last, done: true }]
					: prev
				return [...closed, { id: toolId, kind: 'tool', name: toolName, timestamp: ts }]
			})
		})

		socket.on('box:done', ({ history }: { toolCall: BoxAction | null; history: MessageParam[] }) => {
			historyRef.current = history
			setBlocks((prev) => {
				const last = prev[prev.length - 1]
				if (last?.kind === 'text' && !last.done) {
					return [...prev.slice(0, -1), { ...last, done: true }]
				}
				return prev
			})
			setIsProcessing(false)
		})

		socket.on('box:error', () => {
			setIsProcessing(false)
		})

		return () => {
			socket.disconnect()
		}
	}, [])

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
		}
	}, [blocks])

	function handleReset() {
		setSwitchOn(false)
		setIsProcessing(true)
		historyRef.current = []
		sessionStartRef.current = Date.now()
		setBlocks([{ id: String(idRef.current++), kind: 'user', text: 'The switch is currently OFF.', timestamp: 'T+0s' }])
		socketRef.current?.emit('box:reset')
		socketRef.current?.emit('box:trigger', { toggleState: false })
	}

	function handleToggle() {
		const newState = !switchOn
		setSwitchOn(newState)
		setIsProcessing(true)

		setBlocks((prev) => {
			const closed = prev.map((b) =>
				b.kind === 'text' && !b.done ? { ...b, done: true } : b,
			)
			return [
				...closed,
				{
					id: getId(),
					kind: 'user' as const,
					text: newState ? 'The switch has been turned on.' : 'The switch has been turned off.',
					timestamp: getTimestamp(),
				},
			]
		})

		socketRef.current?.emit('box:trigger', {
			toggleState: newState,
			history: historyRef.current,
		})
	}

	return (
		<div className="space-y-6">
			{systemPrompt !== null && (
				<details className="border border-border/40 group">
					<summary className="cursor-pointer px-4 py-2.5 flex items-center justify-between text-[0.6rem] font-mono uppercase tracking-widest text-muted select-none hover:text-foreground/60 transition-colors list-none">
						<span>Agent system prompt</span>
						<span className="text-muted group-open:rotate-180 transition-transform">▾</span>
					</summary>
					<div className="px-4 pb-4 pt-3 border-t border-border/30 bg-border/5">
						<p className="text-[0.6rem] font-mono text-muted italic mb-3">This is what the agent is told — not instructions for you.</p>
						<pre className="text-xs font-mono text-foreground/60 whitespace-pre-wrap leading-relaxed">{systemPrompt}</pre>
					</div>
				</details>
			)}

			<div className="flex items-center gap-6 py-4 border-y border-border justify-between">
				<button
					onClick={handleToggle}
					disabled={false}
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
					{isProcessing && (
						<p className="text-[0.6rem] font-mono uppercase tracking-widest text-muted animate-pulse mt-0.5">
							processing
						</p>
					)}
				</div>
				<button
					onClick={handleReset}
					disabled={isProcessing}
					className="border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-muted hover:text-foreground hover:border-foreground/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				>
					Reset
				</button>
			</div>

			<div
				ref={scrollRef}
				className="h-64 sm:h-96 overflow-y-auto border border-border divide-y divide-border/40"
			>
				{blocks.length === 0 ? (
					<div className="flex items-center justify-center h-full">
						<p className="text-xs font-mono text-muted">Connecting...</p>
					</div>
				) : (
					blocks.map((block) => {
						if (block.kind === 'user') {
							return (
								<div key={block.id} className="px-4 py-3 bg-border/10">
									<div className="flex items-center justify-between mb-1.5">
										<p className="text-[0.6rem] font-mono uppercase tracking-widest text-muted">Event</p>
										<p className="text-[0.6rem] font-mono text-muted">{block.timestamp}</p>
									</div>
									<p className="text-xs font-mono text-foreground/70">{block.text}</p>
								</div>
							)
						}
						if (block.kind === 'text') {
							return (
								<div key={block.id} className="px-4 py-4 text-sm leading-relaxed text-foreground/90">
									<div className="markdown-body">
										<Markdown remarkPlugins={[remarkGfm]}>{block.text}</Markdown>
									</div>
									{!block.done && (
										<span className="inline-block w-1.5 h-[1.1em] bg-foreground/50 ml-0.5 align-middle animate-pulse" />
									)}
								</div>
							)
						}
						if (block.kind === 'tool') {
							const labels: Record<BoxAction, string> = {
								turn_off: 'Turn off',
								turn_on: 'Turn on',
							}
							const accent =
								block.name === 'turn_off'
									? 'border-foreground text-foreground'
									: 'border-foreground/60 text-foreground/70'

							return (
								<div key={block.id} className="px-4 py-3 bg-background/60">
								<div className="flex items-center justify-between mb-2">
									<p className="text-[0.6rem] font-mono uppercase tracking-widest text-muted">Tool call</p>
									<p className="text-[0.6rem] font-mono text-muted">{block.timestamp}</p>
								</div>
									<span className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[0.65rem] font-mono uppercase tracking-widest ${accent}`}>
										{labels[block.name]}
									</span>
								</div>
							)
						}
						return null
					})
				)}
			</div>
		</div>
	)
}

