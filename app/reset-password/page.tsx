'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import React, { type ReactElement, Suspense, useCallback, useState } from 'react'

import PasswordInput from '@/app/components/PasswordInput'
import { useUser } from '@/app/contexts/UserProvider'
import { useError } from '@/app/contexts/ErrorContext/ErrorContext'
import { VisibilityOffIcon, VisibilityIcon } from '@/app/components/icons'
import api from '@/app/lib/api'

function ResetPasswordContent (): ReactElement {
	const router = useRouter()
	const searchParams = useSearchParams()
	const queryCode = searchParams.get('code') ?? ''
	const queryEmail = searchParams.get('email') ?? ''
	const { addError } = useError()
	const { currentUser } = useUser()

	const [email, setEmail] = useState(queryEmail)
	const [code, setCode] = useState(queryCode)
	const [formData, setFormData] = useState({
		password: '',
		confirmPassword: ''
	})
	const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isSendingCode, setIsSendingCode] = useState(false)
	const [formError, setFormError] = useState('')
	const [infoMessage, setInfoMessage] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [step, setStep] = useState<'request' | 'reset'>(queryCode !== '' ? 'reset' : 'request')

	const isFormValid = code.length > 0 && formData.password.length >= 4 && (passwordsMatch ?? false)

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const newFormData = {
			...formData,
			[e.target.name]: e.target.value
		}
		setFormData(newFormData)

		if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
			if (newFormData.password === '' && newFormData.confirmPassword === '') {
				setPasswordsMatch(null)
			} else {
				const isLongEnough = newFormData.password.length >= 4
				const doPasswordsMatch = newFormData.password === newFormData.confirmPassword
				setPasswordsMatch(isLongEnough && doPasswordsMatch)
			}
		}
	}

	const handleSendCode = useCallback((event: React.SyntheticEvent) => {
		event.preventDefault()
		setFormError('')
		setInfoMessage('')
		setIsSendingCode(true)

		api.post('/v1/auth/forgot-password', { email })
			.then(() => {
				setStep('reset')
				setInfoMessage('If an account with that email exists, a reset code has been sent. Enter it below to set a new password.')
			})
			.catch((error) => {
				setStep('reset')
				setInfoMessage('If an account with that email exists, a reset code has been sent. Enter it below to set a new password.')
				console.error(error)
			})
			.finally(() => {
				setIsSendingCode(false)
			})
	}, [email])

	const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFormError('')
		setIsSubmitting(true)

		if (!(passwordsMatch ?? false)) {
			setFormError(formData.password.length < 4
				? 'Password must be at least 4 characters long'
				: 'Passwords do not match')
			setIsSubmitting(false)
			return
		}

		api.post('/v1/auth/reset-password', {
			passwordResetCode: code,
			newPassword: formData.password,
			confirmPassword: formData.confirmPassword
		})
			.then(() => {
				if (currentUser !== null) {
					const canGoBack = () => {
						try {
							if (!document.referrer) { return false }
							const referrerUrl = new URL(document.referrer)
							return window.location.href !== document.referrer &&
								referrerUrl.origin === window.location.origin &&
								referrerUrl.pathname !== '/reset-password'
						} catch {
							return false
						}
					}
					if (canGoBack()) {
						router.back()
					} else {
						router.push(`/accounts/${currentUser._id}`)
					}
				} else {
					router.push('/login')
				}
			})
			.catch((error) => {
				setFormError(error.response?.data?.error ?? 'Invalid or expired reset code')
				addError(error)
				setIsSubmitting(false)
			})
	}, [code, formData, passwordsMatch, router, addError, currentUser])

	const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setCode(e.target.value)
		setFormError('')
	}

	return (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums]">
			<section className="w-full border-y border-border bg-card/80">
				<div className="max-w-4xl mx-auto px-6 pt-12 sm:pt-14 pb-4 sm:pb-6">
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.01em] leading-tight">Reset Password</h1>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 relative">
				<div className="border border-border bg-card/80 p-5 sm:p-6 max-w-md">
					{infoMessage.length > 0 && (
						<p className="text-sm text-foreground/90 leading-relaxed mb-6">{infoMessage}</p>
					)}

					{step === 'request' && (
						<form className="space-y-6" onSubmit={handleSendCode}>
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
									disabled={isSendingCode || email.length === 0}
									className={`w-full px-4 py-2 font-mono text-sm uppercase tracking-widest transition-colors
										${(isSendingCode || email.length === 0) ? 'bg-surface text-muted cursor-not-allowed' : 'bg-accent text-white hover:opacity-90 cursor-pointer'}`}
								>
									{isSendingCode ? 'Sending...' : 'Get reset code'}
								</button>
							</div>
							<div className="border-t border-border pt-4">
								<button
									type="button"
									onClick={() => { setStep('reset') }}
									className="w-full text-sm text-muted hover:text-accent transition-colors text-center cursor-pointer"
								>
									I already have a code
								</button>
							</div>
						</form>
					)}

					{step === 'reset' && (
						<form className="space-y-6" onSubmit={handleSubmit}>
							<div className="space-y-2">
								<label htmlFor="code" className="block text-xs font-mono uppercase tracking-widest text-muted">
									Reset Code
								</label>
								<input type="text"
									id="code"
									name="code"
									value={code}
									onChange={handleCodeChange}
									placeholder="Enter your reset code"
									autoComplete="one-time-code"
									className="block w-full px-3 py-2 text-foreground bg-card border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm"
									required
								/>
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<label htmlFor="password" className="block text-xs font-mono uppercase tracking-widest text-muted">
										New Password (min 4 chars)
									</label>
									<button
										type="button"
										onClick={() => { setShowPassword(!showPassword) }}
										className="text-muted hover:text-foreground transition-colors"
										aria-label="Toggle password visibility"
									>
										{showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
									</button>
								</div>
								<PasswordInput
									name="password"
									value={formData.password}
									placeholder="New password"
									onChange={handleInputChange}
									inputType={showPassword ? 'text' : 'password'}
									autoComplete="new-password"
									borderColor={
										passwordsMatch === false
											? 'border-accent'
											: passwordsMatch === true ? 'border-accent' : ''
									}
								/>
							</div>
							<div className="space-y-2">
								<label htmlFor="confirmPassword" className="block text-xs font-mono uppercase tracking-widest text-muted">
									Confirm Password
								</label>
								<PasswordInput
									name="confirmPassword"
									value={formData.confirmPassword}
									placeholder="Confirm new password"
									onChange={handleInputChange}
									inputType={showPassword ? 'text' : 'password'}
									autoComplete="new-password"
									borderColor={
										passwordsMatch === false
											? 'border-accent'
											: passwordsMatch === true ? 'border-accent' : ''
									}
								/>
								{passwordsMatch === false && (
									<span className="text-sm text-accent">
										{formData.password.length < 4
											? 'Password must be at least 4 characters'
											: 'Passwords do not match'}
									</span>
								)}
							</div>
							<div>
								<button
									type="submit"
									disabled={isSubmitting || !isFormValid}
									className={`w-full px-4 py-2 font-mono text-sm uppercase tracking-widest transition-colors
										${(isSubmitting || !isFormValid) ? 'bg-surface text-muted cursor-not-allowed' : 'bg-accent text-white hover:opacity-90 cursor-pointer'}`}
								>
									{isSubmitting ? 'Resetting...' : 'Reset password'}
								</button>
							</div>
							<div className="border-t border-border pt-4">
								{email.length > 0
									? (
										<button
											type="button"
											onClick={handleSendCode}
											disabled={isSendingCode}
											className={`w-full text-sm text-muted hover:text-accent transition-colors text-center
												${isSendingCode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
										>
											{isSendingCode ? 'Sending...' : 'Resend code'}
										</button>
									)
									: (
										<button
											type="button"
											onClick={() => { setStep('request') }}
											className="w-full text-sm text-muted hover:text-accent transition-colors text-center cursor-pointer"
										>
											Get a reset code
										</button>
									)}
							</div>
						</form>
					)}

					{formError.length > 0 && (
						<div className="border-t border-border pt-4 mt-6">
							<p className="text-sm text-accent text-center">{formError}</p>
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
				<div className="max-w-4xl mx-auto px-6 pt-12 sm:pt-14 pb-5 sm:pb-8">
						<p className="text-sm text-muted font-mono">Loading...</p>
					</div>
				</section>
			</div>
		}>
			<ResetPasswordContent />
		</Suspense>
	)
}