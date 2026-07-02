'use client'

import { formatCountdown } from '../hooks/useRateLimit'

interface RateLimitBannerProps {
	retryCountdown: number
	className?: string
}

/**
 * The amber "rate limit reached" banner shown while a project is waiting out a
 * server-side rate limit. Shared across every LLM-backed project.
 */
export function RateLimitBanner({
	retryCountdown,
	className = 'border-t border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[0.7rem] font-mono text-amber-400',
}: RateLimitBannerProps) {
	return (
		<div className={className}>
			Rate limit reached — try again in {formatCountdown(retryCountdown)}
		</div>
	)
}
