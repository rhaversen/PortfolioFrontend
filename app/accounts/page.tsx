'use client'

import Link from 'next/link'
import { type ReactElement, useEffect, useState } from 'react'

import { useUser } from '@/app/contexts/UserProvider'
import api from '@/app/lib/api'
import { type UserType } from '@/app/types/backendDataTypes'

const formatDate = (date: string): string => {
	const d = new Date(date)
	return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

type PublicUser = Pick<UserType, '_id' | 'username' | 'createdAt' | 'updatedAt'>

export default function AccountsPage (): ReactElement {
	const { currentUser } = useUser()
	const [users, setUsers] = useState<PublicUser[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [fetchError, setFetchError] = useState(false)

	useEffect(() => {
		let cancelled = false
		const fetchUsers = async (): Promise<void> => {
			try {
				const response = await api.get<PublicUser[]>('/v1/users')
				if (!cancelled) {
					setUsers(response.data)
					setFetchError(false)
				}
			} catch (error) {
				console.error('Error fetching users:', error)
				if (!cancelled) { setFetchError(true) }
			} finally {
				if (!cancelled) { setIsLoading(false) }
			}
		}
		void fetchUsers()
		return () => { cancelled = true }
	}, [])

	return (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums] [&_a]:decoration-transparent [&_a]:transition-colors [&_a]:duration-150 [&_a:hover]:decoration-current">
			<section className="w-full border-y border-border bg-card/80">
				<div className="max-w-4xl mx-auto px-6 pt-14 sm:pt-16 pb-8 sm:pb-10">
					<p className="text-xs font-mono uppercase tracking-[0.24em] text-muted">Accounts</p>
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight mt-4">
						Browse Accounts
					</h1>
					<div className="mt-5 h-px w-56 bg-border" />
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 space-y-10 relative">
				{isLoading && <p className="text-sm text-muted">Loading...</p>}
				{fetchError && <p className="text-sm text-accent">Failed to load accounts.</p>}
				{!isLoading && !fetchError && users.length === 0 && (
					<p className="text-sm text-muted">No accounts found.</p>
				)}
				{!isLoading && !fetchError && users.length > 0 && (
					<section>
						<h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-6">All Users</h2>
						<div className="border border-border bg-card/80">
							<ul className="divide-y divide-border">
								{users.map((user) => (
									<li key={user._id}>
										<Link
											href={`/accounts/${user._id}`}
											className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-card"
										>
											<span className="flex items-center gap-3">
												{user.username === ''
													? <span className="text-sm italic text-muted">No display name</span>
													: <span className="text-sm text-foreground font-medium">{user.username}</span>}
												{currentUser?._id === user._id && (
													<span className="text-[0.65rem] font-mono uppercase tracking-widest text-muted border border-border rounded-sm px-1.5 py-0.5">
														This is you
													</span>
												)}
											</span>
											<span className="text-xs font-mono uppercase tracking-widest text-muted">
												{formatDate(user.createdAt)}
											</span>
										</Link>
									</li>
								))}
							</ul>
						</div>
					</section>
				)}
			</main>
		</div>
	)
}
