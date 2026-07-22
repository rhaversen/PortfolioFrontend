'use client'

import { AxiosError } from 'axios'
import { useRouter } from 'next/navigation'
import React, { type ReactElement, useState, use } from 'react'

import { useUser } from '@/app/contexts/UserProvider'
import api from '@/app/lib/api'

export default function Page (props: { params: Promise<{ code: string }> }): ReactElement {
	const params = use(props.params)
	const router = useRouter()
	const { refetchUser } = useUser()
	const [status, setStatus] = useState<'confirm' | 'deleting' | 'success' | 'error'>('confirm')
	const [message, setMessage] = useState('')

	const handleDelete = (): void => {
		setStatus('deleting')
		void (async () => {
			const { code } = await params
			try {
				await api.post('/v1/auth/confirm-deletion/' + code)
				await api.post('/v1/auth/logout-local', {})
				await refetchUser()
				setStatus('success')
				setMessage('Your account has been permanently deleted.')
			} catch (error) {
				const axiosError = error as AxiosError<{ error: string }>
				setStatus('error')
				setMessage(axiosError.response?.data?.error ?? 'Invalid or expired deletion code')
			}
		})()
	}

	return (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums]">
			<section className="w-full border-y border-border bg-card/80">
				<div className="max-w-4xl mx-auto px-6 py-4 sm:py-6">
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.01em] leading-tight">Delete Account</h1>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 relative">
				<div className="border border-border bg-card/80 p-5 sm:p-6 max-w-md">
					{status === 'confirm' && (
						<div className="space-y-4">
							<p className="text-sm text-foreground text-center">
								Are you sure you want to permanently delete your account? This action cannot be undone.
							</p>
							<button
								type="button"
								onClick={handleDelete}
								className="w-full px-4 py-2 font-mono text-sm uppercase tracking-widest bg-accent text-white decoration-transparent hover:opacity-90 hover:decoration-current transition-opacity cursor-pointer"
							>
								Yes, delete my account
							</button>
							<button
								type="button"
								onClick={() => { router.push('/') }}
								className="w-full px-4 py-2 font-mono text-sm uppercase tracking-widest bg-surface text-foreground decoration-transparent hover:opacity-90 hover:decoration-current transition-opacity cursor-pointer"
							>
								Cancel
							</button>
						</div>
					)}
					{status === 'deleting' && (
						<p className="text-sm text-muted text-center">Deleting your account...</p>
					)}
					{status === 'success' && (
						<div className="space-y-4">
							<p className="text-sm text-foreground text-center">{message}</p>
							<button
								type="button"
								onClick={() => { router.push('/') }}
								className="w-full px-4 py-2 font-mono text-sm uppercase tracking-widest bg-accent text-white decoration-transparent hover:opacity-90 hover:decoration-current transition-opacity cursor-pointer"
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
								className="w-full px-4 py-2 font-mono text-sm uppercase tracking-widest bg-surface text-foreground decoration-transparent hover:opacity-90 hover:decoration-current transition-opacity cursor-pointer"
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
