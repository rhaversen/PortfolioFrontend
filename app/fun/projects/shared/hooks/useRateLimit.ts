'use client'

import { useCallback, useEffect, useState } from 'react'

export function formatCountdown(totalSeconds: number): string {
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	if (hours > 0) return `${hours}h ${minutes}m`
	if (minutes > 0) return `${minutes}m ${seconds}s`
	return `${seconds}s`
}

/**
 * Tracks a rate-limit expiry timestamp and exposes a live countdown (in whole seconds)
 * until it elapses. Shared by every project that talks to a rate-limited LLM socket.
 */
export function useRateLimit() {
	const [rateLimitExpiresAt, setRateLimitExpiresAt] = useState<number | null>(null)
	const [retryCountdown, setRetryCountdown] = useState(0)

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

	const triggerRateLimit = useCallback((retryAfterMs: number) => {
		setRateLimitExpiresAt(Date.now() + retryAfterMs)
		setRetryCountdown(Math.ceil(retryAfterMs / 1000))
	}, [])

	const clearRateLimit = useCallback(() => {
		setRateLimitExpiresAt(null)
		setRetryCountdown(0)
	}, [])

	return {
		rateLimitExpiresAt,
		retryCountdown,
		isRateLimited: rateLimitExpiresAt !== null,
		triggerRateLimit,
		clearRateLimit,
	}
}
