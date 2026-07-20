'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import React, { type ReactElement, Suspense, useCallback, useState } from 'react'

import PasswordInput from '@/app/components/PasswordInput'
import { useError } from '@/app/contexts/ErrorContext/ErrorContext'
import { MailIcon, VisibilityOffIcon, VisibilityIcon } from '@/app/components/icons'
import api from '@/app/lib/api'

function ResetPasswordContent (): ReactElement {
	const router = useRouter()
	const searchParams = useSearchParams()
	const queryCode = searchParams.get('code') ?? ''
	const queryEmail = searchParams.get('email') ?? ''
	const { addError } = useError()
	const [code, setCode] = useState(queryCode)
	const [formData, setFormData] = useState({
		password: '',
		confirmPassword: ''
	})
	const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [formError, setFormError] = useState('')
	const [showPassword, setShowPassword] = useState(false)

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
				router.push('/login')
			})
			.catch((error) => {
				setFormError(error.response?.data?.error ?? 'Invalid or expired reset code')
				addError(error)
				setIsSubmitting(false)
			})
	}, [code, formData, passwordsMatch, router, addError])

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
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.01em] leading-tight mt-4">Reset Password</h1>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 relative">
				<div className="border border-border bg-card/80 p-5 sm:p-6 max-w-md">
					<form className="space-y-6" onSubmit={handleSubmit}>
						{queryCode === '' && (
							<div className="space-y-2">
								<label htmlFor="code" className="block text-xs font-mono uppercase tracking-widest text-muted">
									Reset Code
								</label>
								<div className="flex">
									<input type="text"
										id="code"
										name="code"
										value={code}
										onChange={(e) => { setCode(e.target.value) }}
										placeholder="Enter your reset code"
										className="flex-1 min-w-0 px-3 py-2 text-foreground bg-card border border-border border-r-0 focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm"
										required
									/>
									<Link
									href={`/forgot-password${queryEmail ? `?email=${encodeURIComponent(queryEmail)}` : ''}`}
										className="shrink-0 flex items-center justify-center px-3 py-2 border border-border bg-surface text-muted hover:text-accent hover:bg-card transition-colors"
										aria-label="Get reset code"
										title="Get reset code"
									>
										<MailIcon />
									</Link>
								</div>
							</div>
						)}
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
					</form>

					{formError.length > 0 && (
						<div className="border-t border-border pt-4 mt-6">
							<p className="text-sm text-accent text-center">{formError}</p>
						</div>
					)}
				</div>
				<div className="flex flex-col items-start mt-5 space-y-2 max-w-md">
				<Link href={`/login${queryEmail ? `?email=${encodeURIComponent(queryEmail)}` : ''}`}
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
			<ResetPasswordContent />
		</Suspense>
	)
}