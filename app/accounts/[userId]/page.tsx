'use client'

import Link from 'next/link'
import React, { type ReactElement, useEffect, useState, use } from 'react'

import PasswordInput from '@/app/components/PasswordInput'
import { LastfmIcon, SpotifyIcon, VisibilityOffIcon, VisibilityIcon } from '@/app/components/icons'
import { useUser } from '@/app/contexts/UserProvider'
import api from '@/app/lib/api'
import { type LastfmStatusType, type SpotifyStatusType, type UserType } from '@/app/types/backendDataTypes'

const formatDate = (date: string): string => {
	const d = new Date(date)
	return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Page(props: { params: Promise<{ userId: string }> }): ReactElement {
	const params = use(props.params)
	const { currentUser, refetchUser } = useUser()
	const [userData, setUserData] = useState<UserType | null>(null)
	const isOwnProfile = currentUser?._id === params.userId
	const [isLoading, setIsLoading] = useState(true)
	const [fetchError, setFetchError] = useState(false)
	const [isEditingUsername, setIsEditingUsername] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [formData, setFormData] = useState({
		username: '',
		password: '',
		confirmPassword: ''
	})
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')
	const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null)
	const [isRequestingDeletion, setIsRequestingDeletion] = useState(false)
	const [spotifyStatus, setSpotifyStatus] = useState<SpotifyStatusType | null>(null)
	const [isConnectingSpotify, setIsConnectingSpotify] = useState(false)
	const [isDisconnectingSpotify, setIsDisconnectingSpotify] = useState(false)
	const [lastfmStatus, setLastfmStatus] = useState<LastfmStatusType | null>(null)
	const [lastfmUsernameInput, setLastfmUsernameInput] = useState('')
	const [isConnectingLastfm, setIsConnectingLastfm] = useState(false)
	const [isDisconnectingLastfm, setIsDisconnectingLastfm] = useState(false)

	useEffect(() => {
		let cancelled = false
		const fetchUser = async (): Promise<void> => {
			try {
				const response = await api.get<UserType>(`/v1/users/${params.userId}`)
				if (!cancelled) {
					setUserData(response.data)
					setFetchError(false)
				}
			} catch (error) {
				console.error('Error fetching user:', error)
				if (!cancelled) { setFetchError(true) }
			} finally {
				if (!cancelled) { setIsLoading(false) }
			}
		}
		void fetchUser()
		return () => { cancelled = true }
	}, [params.userId])

	useEffect(() => {
		if (!isOwnProfile) return
		let cancelled = false
		const fetchSpotifyStatus = async (): Promise<void> => {
			try {
				const response = await api.get<SpotifyStatusType>('/v1/spotify/status')
				if (!cancelled) {
					setSpotifyStatus(response.data)
				}
			} catch (error) {
				console.error('Error fetching Spotify status:', error)
				if (!cancelled) { setSpotifyStatus(null) }
			}
		}
		void fetchSpotifyStatus()
		return () => { cancelled = true }
	}, [isOwnProfile])

	useEffect(() => {
		if (!isOwnProfile) return
		let cancelled = false
		const fetchLastfmStatus = async (): Promise<void> => {
			try {
				const response = await api.get<LastfmStatusType>('/v1/lastfm/status')
				if (!cancelled) {
					setLastfmStatus(response.data)
				}
			} catch (error) {
				console.error('Error fetching Last.fm status:', error)
				if (!cancelled) { setLastfmStatus(null) }
			}
		}
		void fetchLastfmStatus()
		return () => { cancelled = true }
	}, [isOwnProfile])

	useEffect(() => {
		const searchParams = new URLSearchParams(window.location.search)
		const spotifyResult = searchParams.get('spotify')
		if (spotifyResult === null) return
		const processSpotifyResult = async (): Promise<void> => {
			if (spotifyResult === 'connected') {
				setSuccess('Spotify account connected successfully.')
			} else if (spotifyResult === 'error') {
				setError('Failed to connect Spotify account. Please try again.')
			}
			const url = new URL(window.location.href)
			url.searchParams.delete('spotify')
			window.history.replaceState(null, '', url.toString())
		}
		void processSpotifyResult()
	}, [])

	const handleConnectSpotify = async (): Promise<void> => {
		setError('')
		setSuccess('')
		setIsConnectingSpotify(true)
		try {
			const { data } = await api.get<{ url: string }>('/v1/spotify/auth')
			window.location.href = data.url
		} catch (error) {
			setError('Failed to start Spotify connection. Please try again.')
			console.error('Error starting Spotify connection:', error)
			setIsConnectingSpotify(false)
		}
	}

	const handleDisconnectSpotify = async (): Promise<void> => {
		setError('')
		setSuccess('')
		setIsDisconnectingSpotify(true)
		try {
			await api.post('/v1/spotify/disconnect')
			setSpotifyStatus({ connected: false, connectedAt: null, scopes: null })
			setSuccess('Spotify account disconnected.')
		} catch (error) {
			setError('Failed to disconnect Spotify account. Please try again.')
			console.error('Error disconnecting Spotify:', error)
		} finally {
			setIsDisconnectingSpotify(false)
		}
	}

	const handleConnectLastfm = async (): Promise<void> => {
		setError('')
		setSuccess('')
		const username = lastfmUsernameInput.trim()
		if (username === '') {
			setError('Enter your Last.fm username.')
			return
		}
		setIsConnectingLastfm(true)
		try {
			const { data } = await api.post<{ connected: boolean, lastfmUsername: string, playcount: number }>('/v1/lastfm/connect', { lastfmUsername: username })
			setLastfmStatus({ connected: true, lastfmUsername: data.lastfmUsername })
			setLastfmUsernameInput('')
			setSuccess(`Last.fm account connected (${data.playcount.toLocaleString()} scrobbles). Backfilling history in the background...`)
		} catch (error) {
			setError('Failed to connect Last.fm account. Check your username and try again.')
			console.error('Error connecting Last.fm:', error)
		} finally {
			setIsConnectingLastfm(false)
		}
	}

	const handleDisconnectLastfm = async (): Promise<void> => {
		setError('')
		setSuccess('')
		setIsDisconnectingLastfm(true)
		try {
			await api.post('/v1/lastfm/disconnect')
			setLastfmStatus({ connected: false, lastfmUsername: null })
			setSuccess('Last.fm account disconnected.')
		} catch (error) {
			setError('Failed to disconnect Last.fm account. Please try again.')
			console.error('Error disconnecting Last.fm:', error)
		} finally {
			setIsDisconnectingLastfm(false)
		}
	}

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

	const handleSubmit = async (field: 'username' | 'password'): Promise<void> => {
		setError('')
		setSuccess('')

		try {
			const updateData: Record<string, string> = {}

			if (field === 'username' && (formData.username.length > 0)) {
				updateData.username = formData.username
			} else if (field === 'password' && (formData.password.length > 0)) {
				if (formData.password !== formData.confirmPassword) {
					setError('Passwords do not match')
					return
				}
				updateData.password = formData.password
				updateData.confirmPassword = formData.confirmPassword
			}

			const response = await api.patch<UserType>(`/v1/users/${params.userId}`, updateData)
			setUserData(response.data)
			await refetchUser()
			setSuccess(`${field === 'username' ? 'Username' : 'Password'} updated successfully`)
			if (field === 'username') {
				setIsEditingUsername(false)
			} else {
				setPasswordsMatch(null)
			}
			setFormData({ username: '', password: '', confirmPassword: '' })
		} catch (error) {
			setError('Failed to update profile. Please try again.')
			console.error('Error updating user:', error)
		}
	}

	const handleRequestDeletion = async (): Promise<void> => {
		setError('')
		setSuccess('')
		setIsRequestingDeletion(true)
		try {
			await api.post('/v1/auth/request-deletion')
			setSuccess('A deletion confirmation link has been sent to your email.')
		} catch (error) {
			setError('Failed to request account deletion. Please try again.')
			console.error('Error requesting deletion:', error)
		} finally {
			setIsRequestingDeletion(false)
		}
	}

	const pageShell = (content: ReactElement): ReactElement => (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums] [&_a]:decoration-transparent [&_a]:transition-colors [&_a]:duration-150 [&_a:hover]:decoration-current">
			<section className="w-full border-y border-border bg-card/80">
				<div className="max-w-4xl mx-auto px-6 pt-20 sm:pt-24 pb-16 sm:pb-20">
					<Link
						href="/"
						className="text-[0.94rem] leading-7 font-mono uppercase tracking-[0.24em] text-foreground/90"
					>
						← Back To Portfolio
					</Link>
					<p className="text-xs font-mono uppercase tracking-[0.24em] text-muted mt-6">Account</p>
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight mt-4">
						{content}
					</h1>
				</div>
			</section>
		</div>
	)

	if (isLoading) {
		return pageShell(<>Loading...</>)
	}

	if (fetchError || userData === null) {
		return pageShell(<>User not found</>)
	}

	return (
		<div className="min-h-screen text-foreground antialiased [font-variant-numeric:tabular-nums] [&_a]:decoration-transparent [&_a]:transition-colors [&_a]:duration-150 [&_a:hover]:decoration-current">
			<section className="w-full border-y border-border bg-card/80">
				<div className="max-w-4xl mx-auto px-6 pt-14 sm:pt-16 pb-8 sm:pb-10">
					<Link
						href="/accounts"
						className="text-[0.94rem] leading-7 font-mono uppercase tracking-[0.24em] text-foreground/90"
					>
						← All Accounts
					</Link>
					<p className="text-xs font-mono uppercase tracking-[0.24em] text-muted mt-6">Account</p>
					<h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight mt-4">
						{isOwnProfile ? 'Your Profile' : (userData?.username ?? 'User')}
					</h1>
					<div className="mt-5 h-px w-56 bg-border" />
				</div>
			</section>

			<main className="max-w-4xl mx-auto px-6 py-10 space-y-10 relative">
				{userData !== null && (
					<section>
						<h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-6">Details</h2>
						<div className="border border-border bg-card/80 p-5">
							<div className="grid grid-cols-1 sm:grid-cols-[120px,1fr] gap-y-3 text-sm">
								{isOwnProfile && (
									<>
										<div className="font-mono text-muted uppercase tracking-widest text-xs self-center">Display Name</div>
										<div className="flex items-center gap-3">
											{isEditingUsername
												? (
													<div className="w-full flex flex-col sm:flex-row gap-2">
														<input
															type="text"
															name="username"
															value={formData.username}
															onChange={handleInputChange}
															placeholder={userData.username ?? 'Enter a username'}
															className="w-full px-3 py-2 text-foreground bg-card border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm"
														/>
														<div className="flex gap-2 sm:shrink-0">
															<button
																onClick={() => { void handleSubmit('username') }}
																className="cursor-pointer flex-1 sm:flex-initial px-3 py-1.5 border border-accent bg-accent text-white font-mono text-xs uppercase tracking-widest shadow-sm transition-all duration-150 hover:bg-accent/90 active:translate-y-px active:shadow-none"
															>
																Save
															</button>
															<button
																onClick={() => {
																	setIsEditingUsername(false)
																	setFormData({ ...formData, username: '' })
																}}
																className="cursor-pointer flex-1 sm:flex-initial px-3 py-1.5 border border-border bg-surface text-foreground font-mono text-xs uppercase tracking-widest shadow-sm transition-all duration-150 hover:bg-card hover:border-accent/60 active:translate-y-px active:shadow-none"
															>
																Cancel
															</button>
														</div>
													</div>
												)
												: (
													<div className="flex items-center gap-3">
														<span className="text-foreground">{(userData.username === '') ? 'No display name' : userData.username}</span>
														<button
															onClick={() => { setIsEditingUsername(true) }}
															className="cursor-pointer px-2 py-0.5 border border-border bg-surface text-foreground font-mono text-xs uppercase tracking-widest shadow-sm transition-all duration-150 hover:bg-card hover:border-accent/60 hover:text-accent active:translate-y-px active:shadow-none"
														>
															Edit
														</button>
													</div>
												)
											}
										</div>

										<div className="font-mono text-muted uppercase tracking-widest text-xs self-center">Email</div>
										<div className="text-foreground">{userData.email}</div>

									</>
								)}

								<div className="font-mono text-muted uppercase tracking-widest text-xs self-center">Member since</div>
								<div className="text-foreground">{formatDate(userData.createdAt)}</div>
							</div>
						</div>
					</section>
				)}

			{isOwnProfile && (
				<section>
					<h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-6">Security</h2>
					<div className="border border-border bg-card/80 p-5">
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<label className="text-xs font-mono uppercase tracking-widest text-muted">New Password</label>
								<button
									onClick={() => { setShowPassword(!showPassword) }}
									className="cursor-pointer text-muted hover:text-foreground transition-colors"
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
							<label className="text-xs font-mono uppercase tracking-widest text-muted">Confirm Password</label>
							<PasswordInput
								name="confirmPassword"
								value={formData.confirmPassword}
								placeholder="Confirm password"
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
							<div className="flex gap-2">
								<button
									onClick={() => { void handleSubmit('password') }}
									disabled={!(passwordsMatch ?? false)}
									className={`cursor-pointer flex-1 px-4 py-2 border font-mono text-xs uppercase tracking-widest shadow-sm transition-all duration-150
										${(passwordsMatch ?? false) ? 'border-accent bg-accent text-white hover:bg-accent/90 active:translate-y-px active:shadow-none' : 'border-border bg-surface text-muted cursor-not-allowed'}`}
								>
									Update Password
								</button>
								<button
									onClick={() => {
										setPasswordsMatch(null)
										setFormData({ ...formData, password: '', confirmPassword: '' })
									}}
									className="cursor-pointer px-4 py-2 border border-border bg-surface text-foreground font-mono text-xs uppercase tracking-widest shadow-sm transition-all duration-150 hover:bg-card hover:border-accent/60 active:translate-y-px active:shadow-none"
								>
									Clear
								</button>
							</div>
						</div>
					</div>
				</section>
			)}

			{isOwnProfile && (
				<section>				<h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-6">Spotify</h2>
				<div className="border border-border bg-card/80 p-5">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<SpotifyIcon />
							<div>
								<p className="text-sm text-foreground font-medium">Spotify Connection</p>
								<p className="text-xs text-muted mt-1">
									{spotifyStatus === null
										? 'Checking connection...'
										: spotifyStatus.connected
											? `Connected${spotifyStatus.connectedAt !== null ? ` on ${formatDate(spotifyStatus.connectedAt)}` : ''}`
											: 'Not connected. Connect to pull your listening stats.'}
								</p>
							</div>
						</div>
						{spotifyStatus !== null && (
							spotifyStatus.connected
								? (
									<button
										type="button"
										onClick={() => { void handleDisconnectSpotify() }}
										disabled={isDisconnectingSpotify}
										className="cursor-pointer shrink-0 px-4 py-2 border border-border bg-surface text-foreground font-mono text-xs uppercase tracking-widest shadow-sm transition-all duration-150 hover:bg-card hover:border-accent/60 hover:text-accent active:translate-y-px active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isDisconnectingSpotify ? 'Disconnecting...' : 'Disconnect'}
									</button>
								)
								: (
									<button
										type="button"
										onClick={() => { void handleConnectSpotify() }}
										disabled={isConnectingSpotify}
										className="cursor-pointer shrink-0 px-4 py-2 border border-accent bg-accent text-white font-mono text-xs uppercase tracking-widest shadow-sm transition-all duration-150 hover:bg-accent/90 active:translate-y-px active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isConnectingSpotify ? 'Redirecting...' : 'Connect Spotify'}
									</button>
								)
						)}
					</div>
				</div>
			</section>
		)}

		{isOwnProfile && (
			<section>
				<h2 className="text-xs font-mono uppercase tracking-widest text-muted mb-6">Last.fm</h2>
				<div className="border border-border bg-card/80 p-5">
					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-3">
							<LastfmIcon />
							<div>
								<p className="text-sm text-foreground font-medium">Last.fm Connection</p>
								<p className="text-xs text-muted mt-1">
									{lastfmStatus === null
										? 'Checking connection...'
										: lastfmStatus.connected
											? `Connected as ${lastfmStatus.lastfmUsername}`
											: 'Not connected. Enter your Last.fm username to import your scrobble history.'}
								</p>
							</div>
						</div>
						{lastfmStatus !== null && !lastfmStatus.connected && (
							<div className="flex flex-col sm:flex-row gap-2">
								<input
									type="text"
									value={lastfmUsernameInput}
									onChange={(e) => { setLastfmUsernameInput(e.target.value) }}
									onKeyDown={(e) => { if (e.key === 'Enter') { void handleConnectLastfm() } }}
									placeholder="Last.fm username"
									className="w-full px-3 py-2 text-foreground bg-card border border-border focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm"
								/>
								<button
									type="button"
									onClick={() => { void handleConnectLastfm() }}
									disabled={isConnectingLastfm || lastfmUsernameInput.trim() === ''}
									className="cursor-pointer shrink-0 px-4 py-2 border border-accent bg-accent text-white font-mono text-xs uppercase tracking-widest shadow-sm transition-all duration-150 hover:bg-accent/90 active:translate-y-px active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isConnectingLastfm ? 'Connecting...' : 'Connect'}
								</button>
							</div>
						)}
						{lastfmStatus !== null && lastfmStatus.connected && (
							<div className="flex flex-col sm:flex-row gap-2">
								<button
									type="button"
									onClick={() => { void handleDisconnectLastfm() }}
									disabled={isDisconnectingLastfm}
									className="cursor-pointer shrink-0 px-4 py-2 border border-border bg-surface text-foreground font-mono text-xs uppercase tracking-widest shadow-sm transition-all duration-150 hover:bg-card hover:border-accent/60 hover:text-accent active:translate-y-px active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isDisconnectingLastfm ? 'Disconnecting...' : 'Disconnect'}
								</button>
							</div>
						)}
					</div>
				</div>
			</section>
		)}

		{isOwnProfile && (
			<section>
				<h2 className="text-xs font-mono uppercase tracking-widest text-accent mb-6">Danger Zone</h2>
					<div className="border border-accent/40 bg-card/80 p-5">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<div>
								<p className="text-sm text-foreground font-medium">Delete Account</p>
								<p className="text-xs text-muted mt-1">
									Permanently delete your account and all associated data. A confirmation link will be sent to your email.
								</p>
							</div>
							<button
								type="button"
								onClick={() => { void handleRequestDeletion() }}
								disabled={isRequestingDeletion}
								className="cursor-pointer shrink-0 px-4 py-2 border border-accent bg-accent text-white font-mono text-xs uppercase tracking-widest shadow-sm transition-all duration-150 hover:bg-accent/90 active:translate-y-px active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isRequestingDeletion ? 'Sending...' : 'Delete Account'}
							</button>
						</div>
					</div>
				</section>
			)}

			{((error.length > 0) || (success.length > 0)) && (
				<div className="border-t border-border pt-4">
					{error.length > 0 && <p className="text-sm text-accent text-center">{error}</p>}
					{success.length > 0 && <p className="text-sm text-foreground text-center">{success}</p>}
				</div>
			)}
		</main>
	</div>
	)
}
