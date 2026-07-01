'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { ONE_WORD_STORY_PRESETS } from '../sampleData'

type StoryWord = { word: string; source: 'user' | 'ai' }

const MAX_WORD_LENGTH = 30
const MAX_STORY_WORDS = 80

function sanitizeWord(raw: string): string {
	return raw.replace(/\s/g, '').slice(0, MAX_WORD_LENGTH)
}

export default function OneWordStoryProject() {
	const [systemPrompt, setSystemPrompt] = useState(ONE_WORD_STORY_PRESETS[0].systemPrompt)
	const [selectedPreset, setSelectedPreset] = useState<number | null>(0)
	const [storyWords, setStoryWords] = useState<StoryWord[]>([])
	const [currentInput, setCurrentInput] = useState('')
	const [isWaiting, setIsWaiting] = useState(false)
	const [focused, setFocused] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [rateLimitExpiresAt, setRateLimitExpiresAt] = useState<number | null>(null)
	const [retryCountdown, setRetryCountdown] = useState(0)

	const socketRef = useRef<Socket | null>(null)
	const storyRef = useRef<StoryWord[]>([])
	const systemPromptRef = useRef(systemPrompt)
	const containerRef = useRef<HTMLDivElement | null>(null)

	const isGameOver = storyWords.length >= MAX_STORY_WORDS
	const inputDisabled = isWaiting || isGameOver || rateLimitExpiresAt !== null

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

	useEffect(() => {
		const apiUrl = process.env.NEXT_PUBLIC_WS_URL ?? '/'
		const socket = io(apiUrl)
		socketRef.current = socket

		socket.on('oneword:word', ({ word }: { word: string }) => {
			const updated = [...storyRef.current, { word, source: 'ai' as const }]
			storyRef.current = updated
			setStoryWords(updated)
			setIsWaiting(false)
			setTimeout(() => containerRef.current?.focus(), 0)
		})

		socket.on('oneword:error', ({ retryAfterMs }: { error?: string; retryAfterMs?: number }) => {
			setIsWaiting(false)
			if (retryAfterMs !== undefined && retryAfterMs > 0) {
				setRateLimitExpiresAt(Date.now() + retryAfterMs)
			} else {
				setErrorMessage('The AI failed to respond. Try adding another word.')
			}
		})

		return () => { socket.disconnect() }
	}, [])

	const requestAiWord = useCallback((words: StoryWord[]) => {
		setIsWaiting(true)
		setErrorMessage('')
		setRateLimitExpiresAt(null)
		const story = words.map((w) => w.word).join(' ')
		socketRef.current?.emit('oneword:request', {
			systemPrompt: systemPromptRef.current.trim() || undefined,
			story,
		})
	}, [])

	const submitWord = useCallback(() => {
		const word = currentInput.trim()
		if (word === '' || inputDisabled) return
		const updated = [...storyRef.current, { word, source: 'user' as const }]
		storyRef.current = updated
		setStoryWords(updated)
		setCurrentInput('')
		requestAiWord(updated)
	}, [currentInput, inputDisabled, requestAiWord])

	function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
		if (inputDisabled) { e.preventDefault(); return }

		if (e.key === 'Backspace') {
			e.preventDefault()
			setCurrentInput((prev) => prev.slice(0, -1))
			return
		}
		if (e.key === ' ' || e.code === 'Space') {
			e.preventDefault()
			return
		}
		if (e.key === 'Enter') {
			e.preventDefault()
			submitWord()
			return
		}
		if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault()
			setCurrentInput((prev) => sanitizeWord(prev + e.key))
		}
	}

	function handleReset() {
		socketRef.current?.emit('oneword:cancel')
		storyRef.current = []
		setStoryWords([])
		setCurrentInput('')
		setIsWaiting(false)
		setErrorMessage('')
		setRateLimitExpiresAt(null)
		setTimeout(() => containerRef.current?.focus(), 0)
	}

	function applyPreset(index: number) {
		const preset = ONE_WORD_STORY_PRESETS[index]
		systemPromptRef.current = preset.systemPrompt
		setSystemPrompt(preset.systemPrompt)
		setSelectedPreset(index)
	}

	function handleSystemPromptChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		systemPromptRef.current = e.target.value
		setSystemPrompt(e.target.value)
		setSelectedPreset(null)
	}

	function formatCountdown(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600)
		const minutes = Math.floor((totalSeconds % 3600) / 60)
		const seconds = totalSeconds % 60
		if (hours > 0) return `${hours}h ${minutes}m`
		if (minutes > 0) return `${minutes}m ${seconds}s`
		return `${seconds}s`
	}

	return (
		<div className="flex flex-col gap-0 border border-border">
			<div className="flex flex-wrap gap-2 px-3 py-2 border-b border-border">
				<span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted/60 self-center">Tone:</span>
				{ONE_WORD_STORY_PRESETS.map((preset, i) => (
					<button
						key={preset.label}
						onClick={() => applyPreset(i)}
						className={`cursor-pointer border px-2 py-0.5 text-[0.65rem] font-mono transition-colors ${selectedPreset === i ? 'border-blue-500 text-blue-400' : 'border-border text-foreground/70 hover:border-foreground/40 hover:text-foreground'}`}
					>
						{preset.label}
					</button>
				))}
			</div>

			<div className="border-b border-border">
				<label htmlFor="system-prompt" className="block px-3 pt-2 pb-1 text-[0.65rem] font-mono uppercase tracking-widest text-muted/60">System Prompt</label>
				<textarea
					id="system-prompt"
					value={systemPrompt}
					onChange={handleSystemPromptChange}
					rows={3}
					className="w-full resize-y bg-background/40 px-3 pb-3 text-xs font-mono text-foreground/80 outline-none"
				/>
			</div>

			<div className="flex items-center justify-end gap-2 px-3 py-2 border-b border-border">
				<button
					onClick={submitWord}
					disabled={currentInput.trim() === '' || inputDisabled}
					className="cursor-pointer border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-foreground/70 hover:border-foreground/50 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				>
					Send
				</button>
				<button
					onClick={handleReset}
					disabled={storyWords.length === 0 && currentInput === ''}
					className="cursor-pointer border border-border px-3 py-1.5 text-[0.65rem] font-mono uppercase tracking-widest text-foreground/70 hover:border-foreground/50 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
				>
					New Story
				</button>
			</div>

			<div
				ref={containerRef}
				tabIndex={inputDisabled ? -1 : 0}
				onKeyDown={handleKeyDown}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onClick={() => containerRef.current?.focus()}
				aria-label="Story — click to focus, type your word, then press Enter"
				className={`px-4 py-6 min-h-32 outline-none transition-colors ${inputDisabled ? 'cursor-default' : 'cursor-text focus:bg-black/2'}`}
			>
				<p className="text-sm sm:text-base leading-relaxed font-mono">
					{storyWords.length === 0 && currentInput === '' && !focused && (
						<span className="text-muted/40 italic">
							Click here and type the first word to begin the story…
						</span>
					)}
					{storyWords.map((w, i) => (
						<span key={i} className={w.source === 'ai' ? 'text-blue-400' : 'text-foreground/90'}>
							{w.word}{' '}
						</span>
					))}
					{!isGameOver && (
						<span className="text-foreground/90">
							{currentInput}
							{focused && !isWaiting && (
								<span className="inline-block w-px h-[1em] bg-foreground/60 animate-pulse translate-y-0.5 ml-0.5" />
							)}
						</span>
					)}
					{isWaiting && (
						<span className="inline-block w-1.5 h-[1em] bg-blue-400 ml-1 align-middle animate-pulse" />
					)}
				</p>
				{isGameOver && (
					<p className="mt-3 text-[0.65rem] font-mono uppercase tracking-widest text-muted/60">The story has reached its end.</p>
				)}
			</div>

			{errorMessage !== '' && (
				<div className="border-t border-red-500/30 bg-red-500/5 px-4 py-2.5 text-[0.7rem] font-mono text-red-400">
					{errorMessage}
				</div>
			)}
			{rateLimitExpiresAt !== null && retryCountdown > 0 && (
				<div className="border-t border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-[0.7rem] font-mono text-amber-400">
					Rate limit reached — try again in {formatCountdown(retryCountdown)}
				</div>
			)}
		</div>
	)
}
