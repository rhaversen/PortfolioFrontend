'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import React, { type ReactElement, Suspense, useCallback, useState } from 'react'

import api from '@/app/lib/api'

function ForgotPasswordContent (): ReactElement {
	const searchParams = useSearchParams()
	const initialEmail = searchParams.get('email') ?? ''
	const [email, setEmail] = useState(initialEmail)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [successMessage, setSuccessMessage] = useState('')

	const isFormValid = email.length > 0

	const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setIsSubmitting(true)
		setSuccessMessage('')

		api.post('/v1/auth/forgot-password', { email })
			.then(() => {
				setSuccessMessage('If an account with that email exists, a password reset link has been sent.')
				setEmail('')
			})
			.catch((error) => {
				console.error(error)
				setSuccessMessage('If an account with that email exists, a password reset link has been sent.')
			})
			.finally(() => {
				setIsSubmitting(false)
			})
	}, [email])

	return (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums]">
			<section className="w-full border-y border-border bg-card/80">
				<div className="max-w-4xl mx-auto px-6 py-4 sm:py-6">
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.01em] leading-tight">Forgot Password</h1>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 relative">
				<div className="border border-border bg-card/80 p-5 sm:p-6 max-w-md">
					<p className="text-sm text-foreground/90 leading-relaxed mb-6">
						Enter your email address and we&apos;ll send you a link to reset your password.
					</p>
					<form className="space-y-6" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<label htmlFor="email" className="block text-xs font-mono uppercase tracking-widest text-muted">
								Email
							</label>
							<input type="email"
								id="email"
								name="email"
								value={email}
								onChange={(e) => { setEmail(e.target.value) }}
								autoComplete="email"
								className="block w-full px-3 py-2 text-foreground bg-card border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm"
								required
							/>
						</div>
						<div>
							<button
								type="submit"
								disabled={isSubmitting || !isFormValid}
								className={`w-full px-4 py-2 font-mono text-sm uppercase tracking-widest transition-colors
									${(isSubmitting || !isFormValid) ? 'bg-surface text-muted cursor-not-allowed' : 'bg-accent text-white hover:opacity-90 cursor-pointer'}`}
							>
								{isSubmitting ? 'Sending...' : 'Send reset link'}
							</button>
						</div>
					</form>

					{successMessage.length > 0 && (
						<div className="border-t border-border pt-4 mt-6">
							<p className="text-sm text-foreground text-center">{successMessage}</p>
						</div>
					)}
				</div>
				<div className="flex flex-col items-start mt-5 space-y-2 max-w-md">
				<Link href={`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`}
						className="text-sm text-muted decoration-transparent transition-colors duration-150 hover:decoration-current">
						Back to login
					</Link>
				</div>
			</main>
		</div>
	)
}

export default function Page (): ReactElement {
	return (
		<Suspense fallback={
			<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums]">
				<section className="w-full border-y border-border bg-card/80">
					<div className="max-w-4xl mx-auto px-6 py-5 sm:py-8">
						<p className="text-sm text-muted font-mono">Loading...</p>
					</div>
				</section>
			</div>
		}>
			<ForgotPasswordContent />
		</Suspense>
	)
}
