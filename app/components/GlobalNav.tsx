'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactElement } from 'react'

import { useUser } from '@/app/contexts/UserProvider'
import { useLogout } from '@/app/hooks/useLogout'

const navLinkClass = 'inline-flex items-center gap-1.5 rounded-full border border-border/90 bg-background/90 px-3 py-1 text-[0.7rem] font-mono uppercase tracking-[0.14em] text-foreground shadow-sm transition-colors hover:border-accent hover:text-accent cursor-pointer'

export default function GlobalNav(): ReactElement {
	const pathname = usePathname()
	const { currentUser } = useUser()
	const { logout } = useLogout()

	const isOnFun = pathname === '/fun' || pathname.startsWith('/fun/')

	return (
		<div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40 flex items-center gap-2">
			{!isOnFun && (
				<Link href="/fun" className={navLinkClass}>
					<span>Fun</span>
					<span aria-hidden="true" className="text-xs">↗</span>
				</Link>
			)}

			{currentUser !== null
				? (
					<>
						<Link href={`/account/${currentUser._id}`} className={navLinkClass}>
							<span>Account</span>
						</Link>
						<button type="button" onClick={logout} className={navLinkClass}>
							<span>Logout</span>
						</button>
					</>
				)
				: (
					<>
						<Link href="/signup" className={navLinkClass}>
							<span>Signup</span>
							<span aria-hidden="true" className="text-xs">↗</span>
						</Link>
						<Link href="/login" className={navLinkClass}>
							<span>Login</span>
							<span aria-hidden="true" className="text-xs">↗</span>
						</Link>
					</>
				)}
		</div>
	)
}
