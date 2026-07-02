'use client'

import { useCallback, useRef, useState } from 'react'
import { ONE_WORD_STORY_PRESETS } from '../sampleData'
import { useSocket } from '../shared/hooks/useSocket'
import { useRateLimit } from '../shared/hooks/useRateLimit'
import { RateLimitBanner } from '../shared/components/RateLimitBanner'
import { PresetTabs } from '../shared/components/PresetTabs'

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
	const { rateLimitExpiresAt, retryCountdown, triggerRateLimit, clearRateLimit } = useRateLimit()

	const storyRef = useRef<StoryWord[]>([])
	const systemPromptRef = useRef(systemPrompt)
	const containerRef = useRef<HTMLDivElement | null>(null)

	const isGameOver = storyWords.length >= MAX_STORY_WORDS
	const inputDisabled = isWaiting || isGameOver || rateLimitExpiresAt !== null

	const socketRef = useSocket((socket) => {
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
				triggerRateLimit(retryAfterMs)
			} else {
				setErrorMessage('The AI failed to respond. Try adding another word.')
			}
		})
	}, [])

	const requestAiWord = useCallback((words: StoryWord[]) => {
		setIsWaiting(true)
		setErrorMessage('')
		clearRateLimit()
		const story = words.map((w) => w.word).join(' ')
		socketRef.current?.emit('oneword:request', {
			systemPrompt: systemPromptRef.current.trim() || undefined,
			story,
		})
	}, [clearRateLimit, socketRef])

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
		clearRateLimit()
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

	return (
		<div className="flex flex-col gap-0 border border-border">
			<PresetTabs
				label="Tone:"
				presets={ONE_WORD_STORY_PRESETS}
				getLabel={(preset) => preset.label}
				selectedIndex={selectedPreset}
				onSelect={applyPreset}
			/>

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
				<RateLimitBanner retryCountdown={retryCountdown} className="border-t border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-[0.7rem] font-mono text-amber-400" />
			)}
		</div>
	)
}
