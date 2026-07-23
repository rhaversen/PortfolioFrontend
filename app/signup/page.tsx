'use client'

import { AxiosError } from 'axios'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import React, { type ReactElement, Suspense, useCallback, useEffect, useState } from 'react'

import PasswordInput from '@/app/components/PasswordInput'
import { useError } from '@/app/contexts/ErrorContext/ErrorContext'
import { useUser } from '@/app/contexts/UserProvider'
import { VisibilityOffIcon, VisibilityIcon } from '@/app/components/icons'
import api from '@/app/lib/api'
import { type UserType } from '@/app/types/backendDataTypes'

function SignupContent (): ReactElement {
	const router = useRouter()
	const searchParams = useSearchParams()
	const initialEmail = searchParams.get('email') ?? ''
	const { addError } = useError()
	const { refetchUser } = useUser()
	const [formError, setFormError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isChecking, setIsChecking] = useState(false)
	const [showPasswords, setShowPasswords] = useState(false)
	const [step, setStep] = useState<1 | 2>(1)
	const [formData, setFormData] = useState({
		email: initialEmail,
		password: '',
		confirmPassword: '',
		username: ''
	})
	const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null)
	const isCredentialsValid = formData.email.length > 0 && formData.password.length >= 4 && (passwordsMatch ?? false)

	const login = useCallback(async (credentials: { email: string, password: string }) => {
		const response = await api.post<{ auth: boolean, user: UserType }>('/v1/auth/login-user-local', {
			email: credentials.email,
			password: credentials.password
		})
		await refetchUser()
		router.push(`/accounts/${response.data.user._id}`)
	}, [router, refetchUser])

	const createAccount = useCallback(async () => {
		await api.post<UserType>('/v1/users', {
			email: formData.email,
			password: formData.password,
			confirmPassword: formData.confirmPassword,
			username: formData.username
		})
		await login({ email: formData.email, password: formData.password })
	}, [formData, login])

	useEffect(() => {
		api.get('/v1/auth/is-authenticated')
			.then(() => { router.push('/') })
			.catch(() => { /* Not authenticated */ })
	}, [router])

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

	const handleCredentialsSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFormError('')

		if (!(passwordsMatch ?? false)) {
			setFormError(formData.password.length < 4
				? 'Password must be at least 4 characters long'
				: 'Passwords do not match')
			return
		}

		setIsChecking(true)
		login({ email: formData.email, password: formData.password })
			.catch((error) => {
				const axiosError = error as AxiosError
				if (axiosError.response?.status === 401) {
					setStep(2)
				} else {
					setFormError('Something went wrong. Please try again.')
					addError(error)
				}
			})
			.finally(() => {
				setIsChecking(false)
			})
	}, [passwordsMatch, formData.email, formData.password, login, addError])

	const handleUsernameSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFormError('')
		setIsSubmitting(true)

		createAccount()
			.catch((error) => {
				const axiosError = error as AxiosError
				if (axiosError.response?.status === 409) {
					setFormError('An account with that email already exists. Try logging in instead.')
					setStep(1)
				} else {
					setFormError('Failed to create account. Please try again.')
					addError(error)
				}
			})
			.finally(() => {
				setIsSubmitting(false)
			})
	}, [createAccount, addError])

	return (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums]">
			<section className="w-full border-y border-border bg-card/80">
				<div className="max-w-4xl mx-auto px-6 py-4 sm:py-6">
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.01em] leading-tight">Create Account</h1>
					<p className="text-sm text-muted mt-3 max-w-md leading-relaxed">
						Much of this site can be used without an account, but some side-project apps require signing up to save your progress or access their features.
					</p>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 relative">
				<div className="border border-border bg-card/80 p-5 sm:p-6 max-w-md">
					{step === 1
						? (
							<form className="space-y-6" onSubmit={handleCredentialsSubmit}>
								<div className="space-y-2">
									<label htmlFor="email" className="block text-xs font-mono uppercase tracking-widest text-muted">
										Email
									</label>
									<input
										type="email"
										id="email"
										name="email"
										value={formData.email}
										onChange={handleInputChange}
										autoComplete="email"
										className="block w-full px-3 py-2 text-foreground bg-card border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm"
										required />
								</div>
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<label htmlFor="password" className="block text-xs font-mono uppercase tracking-widest text-muted">
											Password (min 4 chars)
										</label>
										<button
											type="button"
											onClick={() => { setShowPasswords(!showPasswords) }}
											className="cursor-pointer text-muted hover:text-foreground transition-colors"
											aria-label="Toggle password visibility"
										>
											{showPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
										</button>
									</div>
									<PasswordInput
										name="password"
										value={formData.password}
										placeholder="Password"
										onChange={handleInputChange}
										inputType={showPasswords ? 'text' : 'password'}
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
										placeholder="Confirm password"
										onChange={handleInputChange}
										inputType={showPasswords ? 'text' : 'password'}
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

								<button
									type="submit"
								disabled={!isCredentialsValid || isChecking}
								className={`w-full px-4 py-2 font-mono text-sm uppercase tracking-widest transition-colors
										${(!isCredentialsValid || isChecking) ? 'bg-surface text-muted cursor-not-allowed' : 'bg-accent text-white hover:opacity-90 cursor-pointer'}`}
							>
								{isChecking ? 'Checking...' : 'Continue'}
								</button>
							</form>
						)
						: (
							<form className="space-y-6" onSubmit={handleUsernameSubmit}>
								<div className="space-y-2">
									<label htmlFor="username" className="block text-xs font-mono uppercase tracking-widest text-muted">
										Username (optional)
									</label>
									<input
										type="text"
										id="username"
										name="username"
										value={formData.username}
										onChange={handleInputChange}
										placeholder="Pick a display name"
										autoComplete="off"
										maxLength={50}
										className="block w-full px-3 py-2 text-foreground bg-card border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm" />
									<p className="text-xs text-muted">Leave empty to skip — you can set it later from your account page.</p>
								</div>

								<div className="flex gap-2">
									<button
										type="button"
								onClick={() => { setStep(1); setIsSubmitting(false) }}
										className="cursor-pointer flex-1 px-4 py-2 border border-border bg-surface text-foreground font-mono text-sm uppercase tracking-widest transition-colors hover:bg-card hover:border-accent/60"
									>
										Back
									</button>
									<button
										type="submit"
										disabled={isSubmitting}
										className={`cursor-pointer flex-1 px-4 py-2 font-mono text-sm uppercase tracking-widest transition-colors
												${isSubmitting ? 'bg-surface text-muted cursor-not-allowed' : 'bg-accent text-white hover:opacity-90'}`}
									>
										{isSubmitting ? 'Signing Up...' : 'Sign up'}
									</button>
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
					<p className="text-sm text-muted">
						Already have an account?{' '}
					<Link href={`/login${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ''}`}
							className="font-mono text-accent decoration-transparent transition-colors duration-150 hover:decoration-current">
							Log in
						</Link>
					</p>
			<Link href={`/reset-password${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ''}`}
						className="text-sm text-muted decoration-transparent transition-colors duration-150 hover:decoration-current">
						Forgot password?
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
			<SignupContent />
		</Suspense>
	)
}
