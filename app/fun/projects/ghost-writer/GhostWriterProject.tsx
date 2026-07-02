'use client'

import { useRef, useState } from 'react'
import { useSocket } from '../shared/hooks/useSocket'
import { useRateLimit } from '../shared/hooks/useRateLimit'
import { RateLimitBanner } from '../shared/components/RateLimitBanner'

const MAX_TOKENS = 24
let nextId = 0

export default function GhostWriterProject() {
	const [chars, setChars] = useState('')
	const [ghosts, setGhosts] = useState<Record<number, string>>({})
	const [loadingRows, setLoadingRows] = useState<Set<number>>(new Set())
	const [focused, setFocused] = useState(false)
	const [debug, setDebug] = useState(false)
	const { rateLimitExpiresAt, retryCountdown, triggerRateLimit } = useRateLimit()

	const charsRef = useRef('')
	// Maps requestId → prefix length so chunks route to the right row
	const requestMapRef = useRef(new Map<string, number>())

	const socketRef = useSocket((socket) => {
		socket.on('predict:chunk', ({ requestId, text: chunk }: { requestId: string; text: string }) => {
			const idx = requestMapRef.current.get(requestId)
			if (idx === undefined) return
			setGhosts(prev => ({ ...prev, [idx]: (prev[idx] ?? '') + chunk.replace(/\n/g, ' ') }))
		})

		socket.on('predict:done', ({ requestId }: { requestId: string }) => {
			const idx = requestMapRef.current.get(requestId)
			requestMapRef.current.delete(requestId)
			if (idx !== undefined) setLoadingRows(prev => { const s = new Set(prev); s.delete(idx); return s })
		})

		socket.on('predict:error', ({ requestId, retryAfterMs }: { requestId: string; retryAfterMs?: number }) => {
			const idx = requestMapRef.current.get(requestId)
			requestMapRef.current.delete(requestId)
			if (idx !== undefined) setLoadingRows(prev => { const s = new Set(prev); s.delete(idx); return s })
			if (retryAfterMs !== undefined && retryAfterMs > 0) {
				triggerRateLimit(retryAfterMs)
			}
		})
	}, [])

	function predict(prefix: string) {
		const requestId = `r${nextId++}`
		requestMapRef.current.set(requestId, prefix.length)
		setLoadingRows(prev => new Set(prev).add(prefix.length))
		socketRef.current?.emit('predict:request', { requestId, text: prefix, maxTokens: MAX_TOKENS })
	}

	function cancelRow(len: number) {
		for (const [rid, idx] of requestMapRef.current) {
			if (idx === len) {
				socketRef.current?.emit('predict:cancel', { requestId: rid })
				requestMapRef.current.delete(rid)
			}
		}
		setLoadingRows(prev => { const s = new Set(prev); s.delete(len); return s })
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
		if (e.key === 'Backspace') {
			e.preventDefault()
			const current = charsRef.current
			if (!current.length) return
			cancelRow(current.length)
			const next = current.slice(0, -1)
			charsRef.current = next
			setChars(next)
			setGhosts(prev => { const c = { ...prev }; delete c[current.length]; return c })
		} else if (e.key === ' ') {
			e.preventDefault()
			const next = charsRef.current + ' '
			charsRef.current = next
			setChars(next)
			setGhosts(prev => { const c = { ...prev }; delete c[next.length]; return c })
			predict(next)
		} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault()
			const next = charsRef.current + e.key
			charsRef.current = next
			setChars(next)
		}
	}

	function handleClear() {
		for (const rid of requestMapRef.current.keys()) {
			socketRef.current?.emit('predict:cancel', { requestId: rid })
		}
		requestMapRef.current.clear()
		charsRef.current = ''
		setChars('')
		setGhosts({})
		setLoadingRows(new Set())
	}

	return (
		<div className="flex flex-col gap-0 border border-border">
			<div
				tabIndex={0}
				onKeyDown={handleKeyDown}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				className="font-mono text-sm leading-relaxed p-3 min-h-100 outline-none cursor-text focus:bg-black/2 transition-colors"
				aria-label="Ghost writer — click to focus and start typing"
			>
				<div className="flex whitespace-pre">
					{chars.length === 0 && !focused ? (
						<span className="text-foreground/30">Click here and start typing...</span>
					) : (
						<>
							<span className="text-foreground">{chars}</span>
							{focused && (
								<span className="inline-block w-px h-[1em] bg-foreground/60 animate-pulse translate-y-1" />
							)}
						</>
					)}
				</div>
				{(() => {
					const rows: { len: number; prefix: string; ghost: string; loading: boolean }[] = []
					for (let i = 0; i < chars.length; i++) {
						if (chars[i] === ' ') {
							const len = i + 1
							rows.push({
								len,
								prefix: chars.slice(0, len).trimEnd(),
								ghost: ((/[.!?,]$/.test(ghosts[len]) ? '' : ' ') + (ghosts[len]?.trimStart() ?? '')),
								loading: loadingRows.has(len),
							})
						}
					}

					return rows.reverse().map(({ len, prefix, ghost, loading }) => (
						<div key={len} className="flex whitespace-nowrap overflow-hidden">
							<span className="text-foreground shrink-0">{prefix}</span>
							{ghost && (
								<span
									className="text-foreground/40 overflow-hidden min-w-0 whitespace-pre"
									style={{
										maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
										WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
									}}
								>
									{ghost}
								</span>
							)}
							{loading && !ghost && (
								<span className="inline-flex pl-2 items-center gap-px align-middle ml-0.5">
									{[0, 1, 2].map(j => (
										<span
											key={j}
											className="inline-block w-1 h-1 rounded-full bg-foreground/15 animate-bounce"
											style={{ animationDelay: `${j * 160}ms` }}
										/>
									))}
								</span>
							)}
						</div>
					))
				})()}
			</div>

			<div className="flex justify-end gap-2 px-3 py-2 border-t border-border">
				<button
					onClick={() => setDebug(d => !d)}
					className="cursor-pointer border border-border px-2 py-0.5 text-[0.65rem] font-mono text-foreground/70 hover:border-foreground/40 hover:text-foreground transition-colors"
				>
					{debug ? 'Hide debug' : 'Debug'}
				</button>
				<button
					onClick={handleClear}
					className="cursor-pointer border border-border px-2 py-0.5 text-[0.65rem] font-mono text-foreground/70 hover:border-foreground/40 hover:text-foreground transition-colors"
				>
					Clear
				</button>
			</div>
			{rateLimitExpiresAt !== null && retryCountdown > 0 && (
				<RateLimitBanner retryCountdown={retryCountdown} />
			)}
			{debug && (
				<div className="border-t border-border p-3 font-mono text-[0.65rem] text-foreground/60 space-y-1">
					{Object.entries(ghosts)
						.sort(([a], [b]) => Number(b) - Number(a))
						.map(([len, raw]) => (
							<div key={len}>
								<span className="text-foreground/70">{JSON.stringify(chars.slice(0, Number(len)))}</span>
								<span className="text-foreground/40"> + </span>
								<span className="text-amber-500/80">{JSON.stringify(raw)}</span>
							</div>
						))}
				</div>
			)}
		</div>
	)
}
