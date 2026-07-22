'use client'

import { AxiosError } from 'axios'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import React, { type ReactElement, useCallback, useState } from 'react'

import api from '@/app/lib/api'
import { useUser } from '@/app/contexts/UserProvider'

export default function Page (): ReactElement {
	const router = useRouter()
	const { currentUser, refetchUser } = useUser()
	const [code, setCode] = useState('')
	const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
	const [message, setMessage] = useState('')

	const [resendEmail, setResendEmail] = useState('')
	const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
	const [resendMessage, setResendMessage] = useState('')

	const isAlreadyConfirmed = currentUser !== null && currentUser.confirmed

	const confirmWithCode = useCallback(async (codeToConfirm: string): Promise<void> => {
		if (codeToConfirm.trim().length === 0) {
			setStatus('error')
			setMessage('Please enter a confirmation code.')
			return
		}

		setStatus('loading')
		setMessage('')
		try {
			await api.post('/v1/auth/confirm/' + codeToConfirm.trim())
			setStatus('success')
			setMessage('Your email has been confirmed. You can now log in.')
			await refetchUser()
		} catch (error) {
			const axiosError = error as AxiosError<{ error: string }>
			setStatus('error')
			setMessage(axiosError.response?.data?.error ?? 'Invalid or expired confirmation code')
		}
	}, [refetchUser])

	const requestNewConfirmation = useCallback(async (): Promise<void> => {
		const emailToUse = currentUser?.email ?? resendEmail
		if (emailToUse.trim().length === 0) {
			setResendStatus('error')
			setResendMessage('Enter a valid email address')
			return
		}

		setResendStatus('loading')
		setResendMessage('')
		try {
			await api.post('/v1/auth/request-confirmation', { email: emailToUse })
			setResendStatus('success')
			setResendMessage(currentUser !== null
				? 'A confirmation email has been sent.'
				: 'If that email exists and is unconfirmed, a confirmation email has been sent.')
		} catch (error) {
			const axiosError = error as AxiosError<{ error: string }>
			setResendStatus('error')
			setResendMessage(axiosError.response?.data?.error ?? 'Unable to send confirmation email. Please try again later.')
		}
	}, [currentUser, resendEmail])

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		e.preventDefault()
		void confirmWithCode(code)
	}

	const handleResendSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		e.preventDefault()
		void requestNewConfirmation()
	}

	const isAuthenticated = currentUser !== null && currentUser.confirmed

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
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.01em] leading-tight mt-4">Confirm Email</h1>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 relative">
				{isAlreadyConfirmed && status !== 'success' && (
					<div className="border border-border bg-card/80 p-5 sm:p-6 max-w-md">
						<p className="text-sm text-foreground text-center">Your email is already confirmed.</p>
					</div>
				)}

				{status === 'success' && (
					<div className="border border-border bg-card/80 p-5 sm:p-6 max-w-md space-y-4">
						<p className="text-sm text-foreground text-center">{message}</p>
						{isAuthenticated
							? (
								<button
									type="button"
									onClick={() => { router.push(`/accounts/${currentUser._id}`) }}
									className="w-full px-4 py-2 font-mono text-sm uppercase tracking-widest bg-accent text-white decoration-transparent hover:opacity-90 hover:decoration-current transition-opacity cursor-pointer"
								>
									Continue to account
								</button>
							)
							: (
								<button
									type="button"
									onClick={() => { router.push('/login') }}
									className="w-full px-4 py-2 font-mono text-sm uppercase tracking-widest bg-accent text-white decoration-transparent hover:opacity-90 hover:decoration-current transition-opacity cursor-pointer"
								>
									Go to login
								</button>
							)}
					</div>
				)}

				{!isAlreadyConfirmed && status !== 'success' && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="border border-border bg-card/80 p-5 sm:p-6 space-y-4">
							<div>
								<h2 className="text-xs font-mono uppercase tracking-widest text-muted">I have a code</h2>
								<p className="text-sm text-muted mt-1">Paste the confirmation code from your email.</p>
							</div>
							<form className="space-y-4" onSubmit={handleSubmit}>
								<div className="space-y-2">
									<label htmlFor="code" className="block text-xs font-mono uppercase tracking-widest text-muted">
										Confirmation code
									</label>
									<input
										type="text"
										id="code"
										name="code"
										value={code}
										onChange={(e) => { setCode(e.target.value) }}
										placeholder="Paste your code"
										autoComplete="one-time-code"
										className="block w-full px-3 py-2 text-foreground bg-card border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm"
									/>
								</div>
								<button
									type="submit"
									disabled={status === 'loading' || code.trim().length === 0}
									className={`w-full px-4 py-2 font-mono text-sm uppercase tracking-widest transition-opacity
										${(status === 'loading' || code.trim().length === 0) ? 'bg-surface text-muted cursor-not-allowed' : 'bg-accent text-white hover:opacity-90 cursor-pointer'}`}
								>
									{status === 'loading' ? 'Confirming...' : 'Confirm Email'}
								</button>
							</form>
							{status === 'error' && message !== '' && (
								<p className="text-sm text-accent text-center">{message}</p>
							)}
						</div>

						<div className="border border-border bg-card/80 p-5 sm:p-6 space-y-4">
							<div>
								<h2 className="text-xs font-mono uppercase tracking-widest text-muted">Send a new code</h2>
								<p className="text-sm text-muted mt-1">
									{currentUser !== null
										? 'We will send a new code to your email.'
										: 'Enter your email and we will send a new code.'}
								</p>
							</div>
							<form className="space-y-4" onSubmit={handleResendSubmit}>
								{currentUser === null && (
									<div className="space-y-2">
										<label htmlFor="resendEmail" className="block text-xs font-mono uppercase tracking-widest text-muted">
											Email
										</label>
										<input
											type="email"
											id="resendEmail"
											name="resendEmail"
											value={resendEmail}
											onChange={(e) => { setResendEmail(e.target.value) }}
											placeholder="Enter your email"
											autoComplete="email"
											className="block w-full px-3 py-2 text-foreground bg-card border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm"
										/>
									</div>
								)}
								<button
									type="submit"
									disabled={resendStatus === 'loading'}
									className={`w-full px-4 py-2 font-mono text-sm uppercase tracking-widest transition-opacity
										${resendStatus === 'loading' ? 'bg-surface text-muted cursor-not-allowed' : 'bg-surface text-foreground hover:opacity-90 cursor-pointer'}`}
								>
									{resendStatus === 'loading' ? 'Sending...' : 'Send new code'}
								</button>
							</form>
							{resendMessage !== '' && (
								<p className={`text-sm text-center ${resendStatus === 'error' ? 'text-accent' : 'text-foreground'}`}>
									{resendMessage}
								</p>
							)}
						</div>
					</div>
				)}
			</main>
		</div>
	)
}
