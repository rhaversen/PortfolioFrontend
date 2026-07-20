'use client'

import { AxiosError } from 'axios'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import React, { type ReactElement, useEffect, useState, use } from 'react'

import { useUser } from '@/app/contexts/UserProvider'
import { useLogout } from '@/app/hooks/useLogout'
import api from '@/app/lib/api'

export default function Page (props: { params: Promise<{ code: string }> }): ReactElement {
	const params = use(props.params)
	const router = useRouter()
	const { refetchUser } = useUser()
	const { logout } = useLogout()
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
	const [message, setMessage] = useState('')

	useEffect(() => {
		void (async () => {
			const { code } = await params
			try {
				await api.post('/v1/auth/confirm-deletion/' + code)
				setStatus('success')
				setMessage('Your account has been permanently deleted.')
				await refetchUser()
				void logout()
			} catch (error) {
				const axiosError = error as AxiosError<{ error: string }>
				setStatus('error')
				setMessage(axiosError.response?.data?.error ?? 'Invalid or expired deletion code')
			}
		})()
	}, [params, refetchUser, logout])

	return (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums]">
			<section className="w-full border-y border-border bg-card/80">
				<div className="max-w-4xl mx-auto px-6 py-5 sm:py-8">
					<Link
						href="/"
						className="text-[0.94rem] leading-7 font-mono uppercase tracking-[0.24em] text-foreground/90 decoration-transparent transition-colors duration-150 hover:decoration-current"
					>
						← Back To Portfolio
					</Link>
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.01em] leading-tight mt-4">Delete Account</h1>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 relative">
				<div className="border border-border bg-card/80 p-5 sm:p-6 max-w-md">
					{status === 'loading' && (
						<p className="text-sm text-muted text-center">Deleting your account...</p>
					)}
					{status === 'success' && (
						<div className="space-y-4">
							<p className="text-sm text-foreground text-center">{message}</p>
							<button
								type="button"
								onClick={() => { router.push('/') }}
								className="w-full px-4 py-2 font-mono text-sm uppercase tracking-widest bg-accent text-white decoration-transparent hover:opacity-90 hover:decoration-current transition-opacity"
							>
								Back to Portfolio
							</button>
						</div>
					)}
					{status === 'error' && (
						<div className="space-y-4">
							<p className="text-sm text-accent text-center">{message}</p>
							<button
								type="button"
								onClick={() => { router.push('/') }}
								className="w-full px-4 py-2 font-mono text-sm uppercase tracking-widest bg-surface text-foreground decoration-transparent hover:opacity-90 hover:decoration-current transition-opacity"
							>
								Back to Portfolio
							</button>
						</div>
					)}
				</div>
			</main>
		</div>
	)
}
