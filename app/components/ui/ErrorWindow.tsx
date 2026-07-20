import { AxiosError } from 'axios'
import React, { type ReactElement, useCallback, useEffect, useState } from 'react'

const ErrorWindow = ({
	error,
	onClose
}: {
	error: unknown
	onClose: () => void
}): ReactElement => {
	const renderDelay = 50
	const deRenderDelay = 200
	const timeOut = 5000 + renderDelay
	const errorBounceIn = 100

	const [timeoutAnimation, setTimeoutAnimation] = useState(false)
	const [showError, setShowError] = useState(false)

	const errorMessage = ((): string => {
		if (error === undefined || error === null) { return '' }
		if (typeof error === 'string') { return error }
		if (typeof error === 'object') {
			if (error instanceof AxiosError) {
				if (error.response?.data !== undefined && error.response?.data !== '') { return error.response.data.error }
				if (error.message !== undefined && error.message !== '') { return error.message }
				return JSON.stringify(error)
			}
			if (error instanceof Error) { return error.message }
		}
		return JSON.stringify(error)
	})()

	const handleClose = useCallback((): void => {
		setShowError(false)
		setTimeout(() => {
			onClose()
		}, errorBounceIn + deRenderDelay)
	}, [onClose, setShowError, errorBounceIn])

	const handleStartTimeout = useCallback((): () => void => {
		setTimeoutAnimation(true)
		const timeoutId = setTimeout(handleClose, timeOut)
		return () => {
			clearTimeout(timeoutId)
		}
	}, [timeOut, handleClose, setTimeoutAnimation])

	useEffect(() => {
		const timeoutId = setTimeout((): void => {
			setShowError(true)
			handleStartTimeout()
		}, renderDelay)

		return () => {
			clearTimeout(timeoutId)
		}
	}, [handleStartTimeout, setShowError, renderDelay])

	return (
		<div
			className={`mb-2 border border-border bg-card shadow-lg z-50 origin-right transition-transform duration-[${errorBounceIn}ms] ${showError ? 'translate-x-0 ease-out' : 'translate-x-full ease-in'}`}
			role="alert"
		>
			<div className="right-0 top-5 flex flex-row p-3">
				<div className="flex flex-col justify-center items-start gap-1">
					<h1 className="text-xs font-mono uppercase tracking-widest text-accent">Error</h1>
					<p className="text-sm text-foreground">{errorMessage}</p>
			</div>
				<button
					type="button"
					className="text-xl px-3 text-muted hover:text-foreground transition-colors"
					onClick={handleClose}
					aria-label="Close error"
				>
					&times;
				</button>
			</div>
			<div
				className={`ml-1 h-1 bg-accent transition-transform ${timeoutAnimation ? 'duration-5000' : 'duration-0'} origin-right ease-linear transform ${timeoutAnimation !== false && 'translate-x-full'}`}
			/>
		</div>
	)
}

export default ErrorWindow
