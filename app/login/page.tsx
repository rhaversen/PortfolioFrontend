'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import React, { type ReactElement, useCallback, useEffect, useState } from 'react'

import PasswordInput from '@/app/components/PasswordInput'
import { useUser } from '@/app/contexts/UserProvider'
import { VisibilityOffIcon, VisibilityIcon } from '@/app/components/icons'
import api from '@/app/lib/api'
import { type UserType } from '@/app/types/backendDataTypes'

export default function Page (): ReactElement {
	const router = useRouter()
	const { refetchUser } = useUser()
	const [formError, setFormError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [formData, setFormData] = useState({
		email: '',
		password: ''
	})

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		})
	}

	const isFormValid = formData.email.length > 0 && formData.password.length >= 4

	const login = useCallback(async (credentials: { email: string, password: string, stayLoggedIn: boolean }) => {
		await api.post<{ auth: boolean, user: UserType }>('/v1/auth/login-user-local', credentials)
		await refetchUser()

		const canGoBack = () => {
			try {
				if (!document.referrer) { return false }
				const referrerUrl = new URL(document.referrer)
				return window.location.href !== document.referrer &&
					referrerUrl.origin === window.location.origin
			} catch {
				return false
			}
		}

		if (canGoBack()) {
			router.back()
		} else {
			router.push('/')
		}
	}, [router, refetchUser])

	useEffect(() => {
		api.get('/v1/auth/is-authenticated')
			.then(() => { router.push('/') })
			.catch(() => { /* Not authenticated */ })
	}, [router])

	const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setFormError('')
		setIsSubmitting(true)

		const formData = new FormData(event.currentTarget)
		const credentials = {
			email: formData.get('email') as string,
			password: formData.get('password') as string,
			stayLoggedIn: formData.get('stayLoggedIn') === 'on'
		}
		login(credentials)
			.catch((error) => {
				console.error(error)
				setFormError('Invalid email or password')
				setIsSubmitting(false)
			})
	}, [login])

	return (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums]">
			<section className="w-full border-y border-border bg-card/80">
				<div className="max-w-4xl mx-auto px-6 py-4 sm:py-6">
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.01em] leading-tight">Log In</h1>
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 relative">
				<div className="border border-border bg-card/80 p-5 sm:p-6 max-w-md">
					<form className="space-y-6" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<label htmlFor="email" className="block text-xs font-mono uppercase tracking-widest text-muted">
								Email
							</label>
							<input type="email"
								id="email"
								name="email"
								value={formData.email}
								onChange={handleInputChange}
								autoComplete="username"
								className="block w-full px-3 py-2 text-foreground bg-card border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm"
								required
							/>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<label htmlFor="password" className="block text-xs font-mono uppercase tracking-widest text-muted">
									Password
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
								placeholder="Password"
								onChange={handleInputChange}
								inputType={showPassword ? 'text' : 'password'}
							/>
						</div>
						<div className="space-y-2">
							<label htmlFor="stayLoggedIn" className="flex items-center">
								<input type="checkbox" id="stayLoggedIn" name="stayLoggedIn"
									className="h-4 w-4 accent-accent border-border" />
								<span className="ml-2 block text-sm text-foreground">
									Stay logged in
								</span>
							</label>
						</div>
						<div>
							<button
								type="submit"
								disabled={isSubmitting || !isFormValid}
								className={`w-full px-4 py-2 font-mono text-sm uppercase tracking-widest transition-colors
									${(isSubmitting || !isFormValid) ? 'bg-surface text-muted cursor-not-allowed' : 'bg-accent text-white hover:opacity-90 cursor-pointer'}`}
							>
								{isSubmitting ? 'Logging in...' : 'Log in'}
							</button>
						</div>
					</form>

					{formError.length > 0 && (
						<div className="border-t border-border pt-4 mt-6 space-y-3">
							<p className="text-sm text-accent text-center">{formError}</p>
							<div className="flex flex-col gap-2">
							<Link href={`/forgot-password${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ''}`}
								className="block w-full px-4 py-2 font-mono text-sm uppercase tracking-widest bg-surface text-foreground text-center decoration-transparent hover:opacity-90 hover:decoration-current transition-opacity">
								Forgot password?
							</Link>
							<Link href={`/signup${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ''}`}
								className="block w-full px-4 py-2 font-mono text-sm uppercase tracking-widest bg-accent text-white text-center decoration-transparent hover:opacity-90 hover:decoration-current transition-opacity">
								Create an account
								</Link>
							</div>
						</div>
					)}
				</div>
				<div className="flex flex-col items-start mt-5 space-y-2 max-w-md">
					<p className="text-sm text-muted">
						Don&apos;t have an account?{' '}
					<Link href={`/signup${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ''}`}
							className="font-mono text-accent decoration-transparent transition-colors duration-150 hover:decoration-current">
							Sign up
						</Link>
					</p>
				<Link href={`/forgot-password${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ''}`}
						className="text-sm text-muted decoration-transparent transition-colors duration-150 hover:decoration-current">
						Forgot password?
					</Link>
				</div>
			</main>
		</div>
	)
}
