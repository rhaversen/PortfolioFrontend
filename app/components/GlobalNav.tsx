'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactElement } from 'react'

import { useUser } from '@/app/contexts/UserProvider'
import { useLogout } from '@/app/hooks/useLogout'
import { HomeIcon } from '@/app/components/icons'

const navLinkClass = 'inline-flex items-center gap-1.5 rounded-full border border-border/90 bg-background/90 px-3 py-1 text-[0.7rem] font-mono uppercase tracking-[0.14em] text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent cursor-pointer'

export default function GlobalNav(): ReactElement {
	const pathname = usePathname()
	const { currentUser } = useUser()
	const { logout } = useLogout()

	const isOnRoute = (route: string): boolean => pathname === route || pathname.startsWith(`${route}/`)

	return (
		<div className="fixed top-4 inset-x-4 sm:top-6 sm:inset-x-6 z-40 flex items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				{!isOnRoute('/') && (
					<Link href="/" className={navLinkClass}>
						<HomeIcon />
						<span>Portfolio</span>
					</Link>
				)}
			</div>
			<div className="flex items-center gap-2">
				{!isOnRoute('/fun') && (
					<Link href="/fun" className={navLinkClass}>
						<span>Fun</span>
						<span aria-hidden="true" className="text-xs">↗</span>
					</Link>
				)}

				{currentUser !== null
					? (
						<>
							{!isOnRoute('/accounts') && (
								<Link href={`/accounts/${currentUser._id}`} className={navLinkClass}>
									<span>Account</span>
								</Link>
							)}
							<button type="button" onClick={logout} className={navLinkClass}>
								<span>Logout</span>
							</button>
						</>
					)
					: (
						<>
							{!isOnRoute('/signup') && (
								<Link href="/signup" className={navLinkClass}>
									<span>Signup</span>
									<span aria-hidden="true" className="text-xs">↗</span>
								</Link>
							)}
							{!isOnRoute('/login') && (
								<Link href="/login" className={navLinkClass}>
									<span>Login</span>
									<span aria-hidden="true" className="text-xs">↗</span>
								</Link>
							)}
						</>
					)}
			</div>
		</div>
	)
}
