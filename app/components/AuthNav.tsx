'use client'

import Link from 'next/link'
import { type ReactElement } from 'react'

import { useUser } from '@/app/contexts/UserProvider'

export default function AuthNav (): ReactElement {
	const { currentUser, isLoading } = useUser()

	if (isLoading) {
		return <span className="hidden" aria-hidden="true" />
	}

	if (currentUser !== null) {
		return (
			<Link
				href={`/account/${currentUser._id}`}
				className="fixed right-20 sm:right-28 top-4 sm:top-6 z-40 inline-flex items-center gap-1.5 rounded-full border border-border/90 bg-background/90 px-3 py-1 text-[0.7rem] font-mono uppercase tracking-[0.14em] text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent"
			>
				<span>Account</span>
				<span aria-hidden="true" className="text-xs">↗</span>
			</Link>
		)
	}

	return (
		<Link
			href="/login"
			className="fixed right-20 sm:right-28 top-4 sm:top-6 z-40 inline-flex items-center gap-1.5 rounded-full border border-border/90 bg-background/90 px-3 py-1 text-[0.7rem] font-mono uppercase tracking-[0.14em] text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent"
		>
			<span>Login</span>
			<span aria-hidden="true" className="text-xs">↗</span>
		</Link>
	)
}
