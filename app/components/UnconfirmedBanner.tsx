'use client'

import Link from 'next/link'
import { type ReactElement, useEffect, useState } from 'react'

import { useUser } from '@/app/contexts/UserProvider'

const formatTimeRemaining = (ms: number): string => {
	if (ms <= 0) return 'soon'
	const totalSeconds = Math.floor(ms / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	if (hours > 0) return `${hours}h ${minutes}m`
	if (minutes > 0) return `${minutes}m ${seconds}s`
	return `${seconds}s`
}

export default function UnconfirmedBanner (): ReactElement {
	const { currentUser, isLoading } = useUser()
	const [now, setNow] = useState(() => Date.now())

	useEffect(() => {
		if (currentUser === null || currentUser.confirmed !== false || !currentUser.expirationDate) {
			return
		}
		const interval = setInterval(() => { setNow(Date.now()) }, 1000)
		return () => clearInterval(interval)
	}, [currentUser])

	if (isLoading || currentUser === null || currentUser.confirmed !== false) {
		return <></>
	}

	const expiry = currentUser.expirationDate
		? new Date(currentUser.expirationDate).getTime() - now
		: null

	return (
		<div className="w-full border-b border-accent/40 bg-accent/10">
			<div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
				<p className="text-xs sm:text-sm text-accent">
					Your email is not confirmed. Your account will be deleted
					{expiry !== null
						? <> in <span className="font-mono tabular-nums">{formatTimeRemaining(expiry)}</span> if not confirmed.</>
						: <> if not confirmed.</>}
				</p>
				<Link
					href="/confirm"
					className="text-xs font-mono uppercase tracking-widest text-accent border border-accent/40 rounded-sm px-2 py-1 transition-colors hover:bg-accent/10"
				>
					Confirm
				</Link>
			</div>
		</div>
	)
}
